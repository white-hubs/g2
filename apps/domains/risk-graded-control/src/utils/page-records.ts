type Pagination<T> = { records?: T[] };

/** 兼容分页对象与 options 接口直接返回数组 */
export function unwrapPageRecords<T>(page: Pagination<T> | T[] | null | undefined): T[] {
  if (Array.isArray(page)) {
    return page;
  }
  return page?.records ?? [];
}

/** 兼容数组、分页 records、measures/data 等列表响应 */
export function unwrapListRecords<T>(payload: T[] | Pagination<T> | { measures?: T[]; data?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if ("records" in payload && Array.isArray(payload.records)) {
    return payload.records;
  }
  if ("measures" in payload && Array.isArray(payload.measures)) {
    return payload.measures;
  }
  if ("data" in payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}
