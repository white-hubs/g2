import type { BusinessFieldItem, FormFlowBusiness } from "@g2-client/stream-engine/client";

export interface FormControlMapNode {
  controlId: string;
  title: string;
  businessField: string;
  controlType?: "RECEPTACLE";
  children?: FormControlMapNode[];
}

export interface BusinessFieldRow extends BusinessFieldItem {
  formItemId?: string[];
}

function schemaItems(formJson?: string): unknown[] {
  if (!formJson) return [];
  try {
    const schema: unknown = JSON.parse(formJson);
    if (Array.isArray(schema)) return schema;
    if (schema && typeof schema === "object") {
      const record = schema as { list?: unknown; children?: unknown };
      if (Array.isArray(record.list)) return record.list;
      if (Array.isArray(record.children)) return record.children;
    }
  } catch {
    /* Invalid legacy JSON has no selectable controls. */
  }
  return [];
}

export function formControlTree(formJson?: string): FormControlMapNode[] {
  const walk = (items: unknown[]): FormControlMapNode[] =>
    items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const controlId = record.id ?? record.controlId;
      if (controlId == null) return [];
      const props = record.props && typeof record.props === "object" ? (record.props as { items?: unknown }) : {};
      const group = record.name === "GroupList";
      const nested = group && Array.isArray(props.items) ? props.items : Array.isArray(record.children) ? record.children : [];
      const children = walk(nested);
      return [
        {
          controlId: String(controlId),
          title: String(record.title ?? record.label ?? record.name ?? controlId),
          businessField: "",
          ...(group || children.length ? { children, controlType: "RECEPTACLE" as const } : {}),
        },
      ];
    });
  return walk(schemaItems(formJson));
}

export function controlOptions(
  tree: FormControlMapNode[],
): Array<{ controlId: string; title: string; children?: ReturnType<typeof controlOptions> }> {
  return tree.map(({ controlId, title, children }) => ({
    controlId,
    title,
    ...(children?.length ? { children: controlOptions(children) } : {}),
  }));
}

function mappedPaths(
  nodes: FormControlMapNode[],
  mapList: NonNullable<FormFlowBusiness["formBizFieldMapList"]>,
  parent: string[] = [],
): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  for (const node of nodes) {
    const path = [...parent, node.controlId];
    const mapped = mapList.find((entry) => String(entry.controlId) === node.controlId);
    if (mapped?.businessField != null) paths.set(String(mapped.businessField), path);
    for (const [businessField, childPath] of mappedPaths(node.children ?? [], mapList, path)) {
      paths.set(businessField, childPath);
    }
  }
  return paths;
}

export function restoreBusinessFields(
  fields: BusinessFieldItem[],
  tree: FormControlMapNode[],
  mapList: NonNullable<FormFlowBusiness["formBizFieldMapList"]>,
): BusinessFieldRow[] {
  const paths = mappedPaths(tree, mapList);
  return fields.map((field) => ({
    ...field,
    formItemId: paths.get(String(field.id ?? field.businessField ?? "")),
  }));
}

export function buildFieldMapList(tree: FormControlMapNode[], rows: BusinessFieldRow[]): FormControlMapNode[] {
  const selected = new Map<string, string>();
  for (const row of rows) {
    const path = row.formItemId;
    const fieldId = row.id ?? row.businessField;
    if (path?.length && fieldId != null) selected.set(String(path[path.length - 1]), String(fieldId));
  }
  const walk = (nodes: FormControlMapNode[]): FormControlMapNode[] =>
    nodes.map((node) => ({
      controlId: node.controlId,
      title: node.title,
      businessField: selected.get(node.controlId) ?? "",
      ...(node.children ? { controlType: "RECEPTACLE" as const, children: walk(node.children) } : {}),
    }));
  return walk(tree);
}
