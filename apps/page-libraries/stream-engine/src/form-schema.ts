import { formatCurrentDateTime } from "./form-date";

export type FormSchemaItem = {
  id?: string;
  name?: string;
  title?: string;
  width?: number;
  labelWidth?: string;
  valueType?: string;
  baseOn?: string;
  value?: unknown;
  attr?: string;
  placeholder?: string;
  show?: boolean;
  props?: {
    required?: boolean;
    placeholder?: string | string[];
    options?: unknown;
    multiple?: boolean;
    api?: string;
    [key: string]: unknown;
  };
  children?: FormSchemaItem[];
};

export function parseSchema(raw?: unknown): FormSchemaItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as
      | FormSchemaItem[]
      | { list?: FormSchemaItem[]; children?: FormSchemaItem[] };
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.list)) {
      return parsed.list;
    }
    if (Array.isArray(parsed.children)) {
      return parsed.children;
    }
  } catch {
    return [];
  }
  return [];
}

/** 详情优先按任务快照渲染，避免流程配置更新后覆盖历史工单的表单版本。 */
export function resolveSchemaRaw(
  detail: boolean,
  task: { properties?: unknown; formJson?: unknown } | undefined,
  flow: { formJson?: unknown } | undefined,
): unknown {
  const properties =
    task?.properties && typeof task.properties === "object"
      ? (task.properties as Record<string, unknown>)
      : typeof task?.properties === "string"
        ? parseFormData(task.properties)
        : {};
  const candidates = [detail ? properties.formJson : undefined, task?.formJson, flow?.formJson];
  return candidates.find((candidate) => candidate != null && candidate !== "") ?? "";
}

/** 与旧 FormRender 一致：顶层按项渲染；GroupList 在控件内展开子项，不在此拍平。 */
export function topLevelSchema(items: FormSchemaItem[]): FormSchemaItem[] {
  return items.filter((item) => Boolean(item?.id || item?.name));
}

export function findFormItemById(items: FormSchemaItem[], id?: string): FormSchemaItem | undefined {
  for (const item of items) {
    if (String(item.id) === id) return item;
    const nested =
      item.name === "GroupList" && Array.isArray(item.props?.items)
        ? findFormItemById(item.props.items as FormSchemaItem[], id)
        : undefined;
    if (nested) return nested;
  }
  return undefined;
}

export function flattenFormItems(items: FormSchemaItem[]): FormSchemaItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.name === "GroupList" && Array.isArray(item.props?.items) ? flattenFormItems(item.props.items as FormSchemaItem[]) : []),
  ]);
}

export function formFieldPathOptions(items: FormSchemaItem[], excludeId?: string, separator = ">"): { label: string; value: string }[] {
  const visit = (fields: FormSchemaItem[], ancestors: FormSchemaItem[] = []): { label: string; value: string }[] =>
    fields.flatMap((item) => {
      const path = [...ancestors, item];
      const own =
        String(item.id) === excludeId
          ? []
          : [
              {
                label: path.map((field) => String(field.title ?? field.name)).join(">"),
                value: path.map(fieldKey).join(separator),
              },
            ];
      const nested = item.name === "GroupList" && Array.isArray(item.props?.items) ? visit(item.props.items as FormSchemaItem[], path) : [];
      return [...own, ...nested];
    });
  return visit(items);
}

/** 保留旧设计器发布前的选项、组合容器和预警关联校验。 */
export function validateDesignItems(items: FormSchemaItem[]): string[] {
  if (!items.length) return ["表单为空，请添加组件"];
  const errors: string[] = [];
  const flat = flattenFormItems(items);
  const names = new Set<string>();
  for (const item of flat) {
    const title = String(item.title ?? "");
    if (item.name !== "GroupList" && names.has(title)) errors.push(`表单 ${title} 名称重复`);
    names.add(title);
    if (["SelectInput", "MultipleSelect"].includes(String(item.name))) {
      const options = Array.isArray(item.props?.options) ? (item.props.options as unknown[]) : [];
      if (!options.length) errors.push(`${title} 未设置选项`);
      if (options.some((option) => !String(option ?? "").trim())) errors.push(`${title} 含有空选项`);
      if (new Set(options.map(String)).size !== options.length) errors.push(`${title} 选项重复`);
    }
    if (item.name === "GroupList" && (!Array.isArray(item.props?.items) || item.props.items.length === 0))
      errors.push("组合容器未添加组件");
    if (item.name === "AlarmRecords") {
      const devices = flat.filter((field) => field.name === "RelatedDeviceSelect").map((field) => String(field.id));
      const ranges = flat
        .filter((field) => ["DateTimeRange", "TimePickerRange"].includes(String(field.name)))
        .map((field) => String(field.id));
      if (!devices.length || !devices.includes(String(item.props?.params ?? ""))) errors.push(`${title} 必须关联设备组件`);
      if (item.props?.params2 && !ranges.includes(String(item.props.params2)))
        errors.push(`${title} 只能关联日期时间区间或时间选择区间组件`);
    }
  }
  return errors;
}

export function fieldKey(item: FormSchemaItem): string {
  return String(item.id ?? item.name ?? "");
}

export function initialFormValue(item: FormSchemaItem, currentUser: Record<string, unknown>, now = new Date()): unknown {
  const defaultValue = item.props?.defaultValue;
  if (item.name === "DateTime") {
    const format = String(item.props?.format ?? "yyyy-MM-dd HH:mm:ss");
    if (defaultValue) {
      const date =
        defaultValue instanceof Date
          ? defaultValue
          : typeof defaultValue === "number"
            ? new Date(defaultValue)
            : new Date(String(defaultValue).replace(" ", "T"));
      return Number.isFinite(date.getTime()) ? formatCurrentDateTime(format, date) : defaultValue;
    }
    if (item.props?.autoCurrentTime) return formatCurrentDateTime(format, now);
  }
  if (defaultValue === true && item.name === "UserPicker" && currentUser.id) {
    return [{ id: String(currentUser.id), name: String(currentUser.name ?? currentUser.userName ?? currentUser.id) }];
  }
  if (defaultValue === true && item.name === "DeptPicker" && Array.isArray(currentUser.organizations)) {
    const organization = asIdName(currentUser.organizations[0]);
    if (organization) return [organization];
  }
  return defaultValue !== undefined && typeof defaultValue !== "boolean" ? structuredClone(defaultValue) : null;
}

/** 组合行优先取本行附件，关联根表单附件时再取上层值。 */
export function syncAttachmentCounts(
  items: FormSchemaItem[],
  values: Record<string, unknown>,
  inheritedValues: Record<string, unknown> = {},
): boolean {
  let changed = false;
  for (const item of items) {
    if (item.name !== "NumberInput" || !item.props?.params) continue;
    const sourceKey = String(item.props.params);
    const source = Object.hasOwn(values, sourceKey) ? values[sourceKey] : inheritedValues[sourceKey];
    const count = Array.isArray(source) ? source.length : 0;
    const key = fieldKey(item);
    if (values[key] !== count) {
      values[key] = count;
      changed = true;
    }
  }
  return changed;
}

/** 旧版选择项关联以控件 id 为键，选择值不匹配时隐藏被关联控件。 */
export function matchesOptionRelation(item: FormSchemaItem, values: Record<string, unknown>): boolean {
  const relations = item.props?.relateParams;
  if (!relations || typeof relations !== "object" || Array.isArray(relations)) return true;
  const [sourceId, expected] = Object.entries(relations as Record<string, unknown>)[0] ?? [];
  if (!sourceId) return true;
  const actual = values[sourceId];
  if (Array.isArray(actual)) return actual.some((entry) => String(entry) === String(expected));
  return actual != null && String(actual) === String(expected);
}

export function parseFormData(raw: unknown): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function asIdName(value: unknown): { id: string; name: string } | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = record.id ?? record.value ?? record.key;
  if (id == null || id === "") {
    return undefined;
  }
  return { id: String(id), name: String(record.name ?? record.label ?? record.title ?? id) };
}

export function asIdNameList(value: unknown): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) {
    const single = asIdName(value);
    return single ? [single] : [];
  }
  return value.map(asIdName).filter((item): item is { id: string; name: string } => Boolean(item));
}
