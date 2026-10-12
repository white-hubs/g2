/** 分页结果（对齐旧 energymanagement 列表响应） */
export interface PageResult<T = unknown> {
  records: T[];
  total: number;
  pages?: number;
  current?: number;
  size?: number;
}

/** 通用查询参数 */
export type QueryParams = Record<string, unknown>;
