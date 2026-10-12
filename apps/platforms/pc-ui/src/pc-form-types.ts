import type { Component } from "vue";

export interface PcFormSchemaProp {
  component: string | Component;
  fieldName: string;
  label: string;
  componentProps?: Record<string, unknown>;
  defaultValue?: unknown;
  rules?: unknown;
  style?: Record<string, unknown>;
}

export interface PcFormState {
  layout: "horizontal" | "vertical" | "inline";
  labelCol?: Record<string, unknown>;
  schema: PcFormSchemaProp[];
  submitText?: string;
  resetText?: string;
  showButton?: boolean;
  /** 将查询、重置按钮放入筛选项流，并紧跟最后一个可见筛选项。 */
  actionsInline?: boolean;
  /** 默认按实际换行高度自动展示；false 显式关闭，true 保持旧调用兼容。 */
  showCollapseButton?: boolean;
  /** 收起时展示的筛选项数量（不含查询/重置按钮）；未设置时按容器宽度计算 */
  collapsedVisibleCount?: number;
  isCollapsed?: boolean;
}

export interface PcFormApiOptions extends PcFormState {
  handleSubmit: (values: Record<string, unknown>) => void;
  handleReset?: () => void;
  handleValuesChange?: (values: Record<string, unknown>, changedValues?: Record<string, unknown>, meta?: PcFormValueChangeMeta) => void;
  /** 是否在当前路由持久化查询值，默认开启。 */
  cache?: boolean;
  /** 限制持久化字段，默认使用全部 schema 字段。 */
  cacheFields?: string[];
  /** 控件变化时即持久化，而非仅点击查询时持久化，默认开启。 */
  cacheOnChange?: boolean;
  /** 页面请求使用的对象；恢复后的表单值会写入其中。 */
  syncStateRef?: Record<string, unknown>;
  syncStateFields?: string[];
  syncMap?: (values: Record<string, unknown>) => Record<string, unknown>;
  /** 已有页面状态对象，作为同步后的请求状态使用。 */
  queryState?: Record<string, unknown>;
  /** 从路由恢复值后仅触发一次。 */
  onHydratedQuery?: () => void;
  autoQueryPageNumberField?: string;
  autoQueryPageSizeField?: string;
  autoQueryDefaultPageNumber?: number;
  autoQueryDefaultPageSize?: number;
}

export interface PcFormValueChangeMeta {
  fieldName: string;
  component: string;
  trigger: "change" | "enter";
  hasCustomOnChange?: boolean;
}
