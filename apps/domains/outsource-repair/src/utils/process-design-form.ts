/**
 * 旧流程任务表单里的自定义表单设计（`ProcessTaskForm.definition`）解析与提交转换。
 *
 * 旧页用 `AntdGenerateForm` 渲染 `definition.list`，提交时把每个字段拍成与 App 端约定的
 * `formData` 结构（见 `repairList/details.vue` 的 `submit`）。G2 没有对应的表单设计器渲染器，
 * 这里只保留旧页实际使用的字段类型与提交契约。
 */

export interface DesignFieldOption {
  label?: string;
  value?: string | number;
}

export interface DesignFieldOptions {
  defaultValue?: unknown;
  options?: DesignFieldOption[];
  mode?: string;
  remote?: boolean;
  remoteFunc?: string;
  placeholder?: string;
  required?: boolean;
  maxlength?: number;
}

export interface DesignField {
  type?: string;
  label?: string;
  model?: string;
  controlType?: string;
  options?: DesignFieldOptions;
}

export interface DesignFormDataItem {
  label: string;
  key: string;
  value: string | number | boolean;
  formItemType: string;
  options: string;
  mode: string;
  remoteFunc: string;
  remote: boolean;
  controlType: string;
}

/** `definition` 是 JSON 字符串；解析失败按「无自定义表单」处理。 */
export function parseDesignFields(definition?: string): DesignField[] {
  if (!definition) {
    return [];
  }
  try {
    const parsed = JSON.parse(definition) as { list?: DesignField[] } | DesignField[];
    const list = Array.isArray(parsed) ? parsed : parsed.list;
    return Array.isArray(list) ? list.filter((item) => Boolean(item?.model)) : [];
  } catch {
    return [];
  }
}

/** 多选与复选框的初值是数组，开关是布尔，其余沿用设计器默认值。 */
export function initialDesignValues(fields: DesignField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const key = String(field.model);
    if (field.options?.defaultValue !== undefined && field.options.defaultValue !== null) {
      values[key] = field.options.defaultValue;
      continue;
    }
    if (field.type === "checkbox" || field.options?.mode === "multiple") {
      values[key] = [];
    } else if (field.type === "switch") {
      values[key] = false;
    } else if (field.type === "rate" || field.type === "number") {
      values[key] = undefined;
    } else {
      values[key] = undefined;
    }
  }
  return values;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** 旧 `timeFormat(value, false)`：日期字段只提交 `YYYY-MM-DD`。 */
function toDateText(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const date = new Date(typeof value === "string" ? value.replace(" ", "T") : (value as number));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 按旧页与 App 端约定的结构提交单个自定义字段。 */
export function designFieldPayload(field: DesignField, raw: unknown): DesignFormDataItem {
  const isMulti = field.options?.mode === "multiple" || field.type === "checkbox";
  let value: string | number | boolean;
  if (isMulti) {
    value = JSON.stringify(Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]);
  } else if (field.type === "date") {
    value = toDateText(raw);
  } else if (field.type === "rate") {
    value = typeof raw === "number" ? raw : Number(raw ?? 0) || 0;
  } else if (typeof raw === "boolean" || typeof raw === "number") {
    value = raw;
  } else {
    const text = raw === undefined || raw === null ? "" : String(raw);
    value = text;
  }
  return {
    label: String(field.label ?? ""),
    key: String(field.model ?? ""),
    value,
    formItemType: String(field.type ?? ""),
    options: field.options?.options ? JSON.stringify(field.options.options) : "",
    mode: field.options?.mode ?? "",
    remoteFunc: field.options?.remoteFunc ?? "",
    remote: field.options?.remoteFunc ? Boolean(field.options.remote) : false,
    controlType: field.controlType ?? "BUSINESS_CONTROL",
  };
}

export function designFormData(fields: DesignField[], values: Record<string, unknown>): DesignFormDataItem[] {
  return fields.map((field) => designFieldPayload(field, values[String(field.model)]));
}

/** 必填校验：设计器 `options.required` 为真时值不能为空。 */
export function missingDesignField(fields: DesignField[], values: Record<string, unknown>): DesignField | undefined {
  return fields.find((field) => {
    if (!field.options?.required) {
      return false;
    }
    const value = values[String(field.model)];
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return value === undefined || value === null || value === "";
  });
}
