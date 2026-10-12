/** 费用设置相关表单类型（对齐旧仓 Fee 命名空间） */
export interface PeriodPricesState {
  periodType: string | number | undefined;
  price: number | undefined;
}

export interface PeriodDefinesState {
  periodType: string | number | undefined;
  startTime?: string | number | null | undefined;
  endTime?: string | number | null | undefined;
  time?: [string, string] | null | undefined;
}

export interface UsagePricesState {
  startUsage?: number | undefined;
  endUsage?: number | undefined;
  price?: number | undefined;
}

export interface TabPaneState {
  key: string | number;
  name: string;
}

export interface TabState {
  list: TabPaneState[];
  activeKey: string;
}

export interface TreeState {
  areaName: string;
  id: number | string;
  parentId: number | string;
  level?: number;
  children?: TreeState[];
}

export interface TrendState {
  amount?: number;
  timeFlag?: number | undefined;
}
