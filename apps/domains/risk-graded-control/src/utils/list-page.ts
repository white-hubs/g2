/**
 * 列表页分页状态：与隐患治理 createListPageState 对齐，供 PcLayout + Page + usePcTable 使用。
 */
export interface ListPageState {
  pageNumber: number;
  pageSize: number;
  total: number;
}

export function createListPageState(pageSize = 10): ListPageState {
  return {
    pageNumber: 1,
    pageSize,
    total: 0,
  };
}
