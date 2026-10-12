import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

export interface ListPageState {
  pageNumber: number;
  pageSize: number;
  total: number;
}

export interface LocalPagination<T> {
  records: T[];
  total: number;
  pages: number;
}

export function createListPageState(): ListPageState {
  return {
    pageNumber: 1,
    pageSize: 10,
    total: 0,
  };
}

export function readPositiveInteger(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createListPageStateFromQuery(query: Record<string, unknown>): ListPageState {
  return {
    ...createListPageState(),
    pageNumber: readPositiveInteger(query.pageNumber, 1),
    pageSize: readPositiveInteger(query.pageSize, 10),
  };
}

export function syncListPageQuery(router: Router, route: RouteLocationNormalizedLoaded, pageNumber: number, pageSize: number): void {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      pageNumber: String(pageNumber),
      pageSize: String(pageSize),
    },
    hash: route.hash,
  });
}

export function paginateRecords<T>(records: T[], pageNumber: number, pageSize: number): LocalPagination<T> {
  const start = (pageNumber - 1) * pageSize;
  return {
    records: records.slice(start, start + pageSize),
    total: records.length,
    pages: Math.ceil(records.length / pageSize),
  };
}
