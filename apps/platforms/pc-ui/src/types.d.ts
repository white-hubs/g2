import type * as Antd from "ant-design-vue";

export type { FormInstance, TableColumnType as ColumnType } from "ant-design-vue";
export type { Rule as FormRule } from "ant-design-vue/es/form/interface";
export type { UploadRequestOption } from "ant-design-vue/es/vc-upload/interface";

type AntdRuntime = typeof Antd;
type RuntimeKeys =
  | "Alert"
  | "Button"
  | "Empty"
  | "Form"
  | "FormItem"
  | "Input"
  | "InputNumber"
  | "InputPassword"
  | "message"
  | "Modal"
  | "Pagination"
  | "Popconfirm"
  | "Popover"
  | "Select"
  | "Slider"
  | "Spin"
  | "Switch"
  | "Table"
  | "TreeSelect"
  | "Upload";

export type PcUiRuntime = Pick<AntdRuntime, RuntimeKeys> & {
  RangePicker: AntdRuntime["DatePicker"]["RangePicker"];
  dayjs: typeof import("dayjs");
  usePcQueryState: <T extends Record<string, unknown>>(options: {
    initialState: T;
    cacheFields?: string[];
    storage?: "url" | "memory";
    resolveValue?: (field: string, raw: unknown) => unknown;
    page?: { pageNumberField?: string; pageSizeField?: string };
  }) => {
    state: T;
    setPage: (pageNumber: number, pageSize: number) => void;
    resetPage: () => void;
    update: (patch: Partial<T>) => void;
    getSnapshot: () => T;
  };
};
