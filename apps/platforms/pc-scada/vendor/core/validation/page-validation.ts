import { registry } from "../registry";
import type { Action, ElementInstance, PageConnection, PageModel, TagDefinition } from "../types";

export interface PageValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  elementId?: string;
}

export interface PageValidationResult {
  errors: PageValidationIssue[];
  warnings: PageValidationIssue[];
}

function validateConnections(connections: PageConnection[] | undefined, ids: Set<string>, issues: PageValidationIssue[]) {
  if (!connections?.length) return;
  const connIds = new Map<string, number>();
  for (const c of connections) {
    if (!c.id) {
      issues.push({
        level: "error",
        code: "CONNECTION_ID_MISSING",
        message: "连线缺少 ID。",
      });
      continue;
    }
    connIds.set(c.id, (connIds.get(c.id) ?? 0) + 1);
    if (!ids.has(c.source.cellId)) {
      issues.push({
        level: "error",
        code: "CONNECTION_SOURCE_MISSING",
        message: `连线起点图元不存在: ${c.source.cellId}`,
        elementId: c.id,
      });
    }
    if (!ids.has(c.target.cellId)) {
      issues.push({
        level: "error",
        code: "CONNECTION_TARGET_MISSING",
        message: `连线终点图元不存在: ${c.target.cellId}`,
        elementId: c.id,
      });
    }
  }
  for (const [cid, n] of connIds.entries()) {
    if (n > 1) {
      issues.push({
        level: "error",
        code: "CONNECTION_ID_DUPLICATED",
        message: `连线 ID 重复: ${cid}`,
        elementId: cid,
      });
    }
  }
}

export function validatePageModel(page: PageModel): PageValidationResult {
  const issues: PageValidationIssue[] = [];
  const ids = new Set(page.elements.map((element) => element.id).filter(Boolean));
  const idCounts = new Map<string, number>();
  for (const element of page.elements) {
    if (!element.id) continue;
    idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
  }
  const globalKeys = new Set(Object.keys(page.globals ?? {}));
  const tagTypeMap = new Map<string, TagDefinition["type"]>((page.tags ?? []).map((t) => [t.name, t.type]));

  validateConnections(page.connections, ids, issues);

  for (const element of page.elements) {
    if (!element.id) {
      issues.push({
        level: "error",
        code: "ELEMENT_ID_MISSING",
        message: "图元缺少 ID。",
      });
    } else if ((idCounts.get(element.id) ?? 0) > 1) {
      issues.push({
        level: "error",
        code: "ELEMENT_ID_DUPLICATED",
        message: `图元 ID 重复: ${element.id}`,
        elementId: element.id,
      });
    }

    if (!element.type) {
      issues.push({
        level: "error",
        code: "ELEMENT_TYPE_MISSING",
        message: "图元缺少类型定义。",
        elementId: element.id,
      });
    }

    const def = registry.get(element.type);
    const propSchemaNames = new Set((def?.propsSchema ?? []).map((schema) => schema.name));
    const semanticValues = (def?.propsSchema ?? []).map((schema) => schema.semantic).filter((value): value is string => Boolean(value));
    const controlSchemas = (def?.propsSchema ?? []).filter((schema) => (schema.domain ?? "observe") === "control");
    const hasControlActions = element.eventHandlers.some((handler) => Array.isArray(handler.actions) && handler.actions.length > 0);

    validateDuplicateSemantics(semanticValues, issues, element.id);
    validateControlSchema(controlSchemas, issues, element.id, hasControlActions);
    validateBindings(element, issues, globalKeys, propSchemaNames, def?.propsSchema ?? [], tagTypeMap);
    validateEventHandlers(element, issues, ids, globalKeys);
  }

  return {
    errors: issues.filter((issue) => issue.level === "error"),
    warnings: issues.filter((issue) => issue.level === "warning"),
  };
}

const PROP_TYPE_TO_TAG_TYPE: Record<string, TagDefinition["type"][]> = {
  boolean: ["boolean"],
  number: ["number"],
  string: ["string"],
  color: ["string"],
  select: ["string", "number", "boolean"],
};

function validateBindings(
  element: ElementInstance,
  issues: PageValidationIssue[],
  globalKeys: Set<string>,
  propSchemaNames: Set<string>,
  propSchemas: Array<{ name: string; type: string }>,
  tagTypeMap: Map<string, TagDefinition["type"]>,
) {
  for (const binding of element.bindings) {
    if (!binding.propName) {
      issues.push({
        level: "error",
        code: "BINDING_PROP_MISSING",
        message: "绑定缺少属性字段 propName。",
        elementId: element.id,
      });
    }
    if (!binding.tagName) {
      issues.push({
        level: "error",
        code: "BINDING_TAG_MISSING",
        message: "绑定缺少点位字段 tagName。",
        elementId: element.id,
      });
    }
    if (binding.propName && propSchemaNames.size > 0 && !propSchemaNames.has(binding.propName)) {
      issues.push({
        level: "error",
        code: "BINDING_PROP_NOT_IN_SCHEMA",
        message: `绑定属性未在图元 schema 中声明: ${binding.propName}`,
        elementId: element.id,
      });
    }

    // Type compatibility check (only when tag is defined in page.tags and no transform)
    if (binding.propName && binding.tagName && !binding.transform) {
      const tagType = tagTypeMap.get(binding.tagName);
      const propSchema = propSchemas.find((s) => s.name === binding.propName);
      if (tagType && propSchema) {
        const compatible = PROP_TYPE_TO_TAG_TYPE[propSchema.type] ?? [];
        if (!compatible.includes(tagType)) {
          issues.push({
            level: "warning",
            code: "BINDING_TYPE_MISMATCH",
            message: `绑定类型不匹配：属性 "${binding.propName}" 期望 ${propSchema.type}，点位 "${binding.tagName}" 为 ${tagType} 类型，建议添加转换表达式。`,
            elementId: element.id,
          });
        }
      }
    }

    validateGlobalTokens(binding.tagName, globalKeys, issues, element.id, "BINDING_GLOBAL_UNDEFINED");
    if (binding.transform) {
      validateGlobalTokens(binding.transform, globalKeys, issues, element.id, "BINDING_GLOBAL_UNDEFINED");
    }
  }
}

function validateDuplicateSemantics(semanticValues: string[], issues: PageValidationIssue[], elementId: string) {
  if (semanticValues.length <= 1) return;
  const counts = new Map<string, number>();
  for (const semantic of semanticValues) {
    counts.set(semantic, (counts.get(semantic) ?? 0) + 1);
  }
  for (const [semantic, count] of counts.entries()) {
    if (count <= 1) continue;
    issues.push({
      level: "warning",
      code: "PROP_SEMANTIC_DUPLICATED",
      message: `图元存在重复语义标识: ${semantic}`,
      elementId,
    });
  }
}

function validateControlSchema(
  schemas: Array<{
    name: string;
    domain?: string;
    semantic?: string;
    type: string;
    min?: number;
    max?: number;
    controllable?: boolean;
  }>,
  issues: PageValidationIssue[],
  elementId: string,
  hasControlActions: boolean,
) {
  if (schemas.length > 0 && !hasControlActions) {
    issues.push({
      level: "warning",
      code: "CONTROL_PROP_WITHOUT_ACTION",
      message: "图元声明了控制属性，但未配置任何事件动作。",
      elementId,
    });
  }
  for (const schema of schemas) {
    if (!schema.semantic || !schema.semantic.startsWith("command.")) {
      issues.push({
        level: "warning",
        code: "CONTROL_PROP_SEMANTIC_RECOMMENDED",
        message: `控制属性「${schema.name}」建议使用 command.* 形式的语义标识（如 command.start）`,
        elementId,
      });
    }
    if (schema.controllable !== true) {
      issues.push({
        level: "warning",
        code: "CONTROL_PROP_CONTROLLABLE_RECOMMENDED",
        message: `控制属性「${schema.name}」建议在图元协议中设置 controllable="true"`,
        elementId,
      });
    }
    if (schema.type === "number" && (schema.min == null || schema.max == null)) {
      issues.push({
        level: "warning",
        code: "CONTROL_PROP_RANGE_RECOMMENDED",
        message: `数值型控制属性「${schema.name}」建议在图元协议中声明 min / max`,
        elementId,
      });
    }
  }
}

function validateEventHandlers(element: ElementInstance, issues: PageValidationIssue[], elementIds: Set<string>, globalKeys: Set<string>) {
  for (const handler of element.eventHandlers) {
    if (!handler.event) {
      issues.push({
        level: "error",
        code: "EVENT_NAME_MISSING",
        message: "事件处理器缺少 event 名称。",
        elementId: element.id,
      });
    }
    if (!Array.isArray(handler.actions) || handler.actions.length === 0) {
      issues.push({
        level: "warning",
        code: "EVENT_ACTION_EMPTY",
        message: "事件处理器未配置动作。",
        elementId: element.id,
      });
      continue;
    }
    for (const action of handler.actions) {
      validateAction(element.id, action, issues, elementIds, globalKeys);
    }
  }
}

function validateAction(
  elementId: string,
  action: Action,
  issues: PageValidationIssue[],
  elementIds: Set<string>,
  globalKeys: Set<string>,
) {
  validateActionParamsGlobals(elementId, action.params, issues, globalKeys);
  const targetElementId = action.params?.targetElementId;
  if (typeof targetElementId === "string" && targetElementId && !elementIds.has(targetElementId)) {
    issues.push({
      level: "error",
      code: "ACTION_TARGET_ELEMENT_NOT_FOUND",
      message: `动作目标图元不存在: ${targetElementId}`,
      elementId,
    });
  }

  switch (action.type) {
    case "navigate":
      if (!action.params?.pageId) {
        issues.push({
          level: "error",
          code: "ACTION_NAVIGATE_PAGE_ID_MISSING",
          message: "「跳转页面」动作缺少目标画面 ID（pageId）。",
          elementId,
        });
      }
      return;
    case "setTag":
      if (!action.params?.tag) {
        issues.push({
          level: "error",
          code: "ACTION_SETTAG_TAG_MISSING",
          message: "「写入点位」动作缺少点位名（tag）。",
          elementId,
        });
      }
      return;
    case "toggleTag":
      if (!action.params?.tag) {
        issues.push({
          level: "error",
          code: "ACTION_TOGGLETAG_TAG_MISSING",
          message: "「切换点位」动作缺少点位名（tag）。",
          elementId,
        });
      }
      return;
    case "callApi":
      if (!action.params?.url) {
        issues.push({
          level: "error",
          code: "ACTION_CALLAPI_URL_MISSING",
          message: "「调用接口」动作缺少请求地址（url）。",
          elementId,
        });
      }
      return;
    default:
      return;
  }
}

function validateActionParamsGlobals(
  elementId: string,
  params: Record<string, any>,
  issues: PageValidationIssue[],
  globalKeys: Set<string>,
) {
  visitValue(params, (value) => {
    if (typeof value !== "string") return;
    validateGlobalTokens(value, globalKeys, issues, elementId, "ACTION_GLOBAL_UNDEFINED");
  });
}

function visitValue(value: unknown, visitor: (value: unknown) => void) {
  visitor(value);
  if (Array.isArray(value)) {
    for (const item of value) visitValue(item, visitor);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      visitValue(nested, visitor);
    }
  }
}

function validateGlobalTokens(input: string, globalKeys: Set<string>, issues: PageValidationIssue[], elementId: string, code: string) {
  const regex = /\$\{global\.([a-zA-Z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const key = match[1];
    if (!globalKeys.has(key)) {
      issues.push({
        level: "error",
        code,
        message: `引用了未定义的全局变量: ${key}`,
        elementId,
      });
    }
  }
}
