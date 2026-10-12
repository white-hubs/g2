/** 当前页无数据且页码 > 1 时回退到有效页（删光末页后避免仍请求空页） */
export function resolvePageNumberWhenCurrentEmpty(currentPage: number, recordCount: number, total: number, pageSize: number): number {
  if (recordCount > 0) return currentPage;
  if (currentPage <= 1) return currentPage;
  if (total <= 0) return 1;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(currentPage - 1, lastPage);
}
