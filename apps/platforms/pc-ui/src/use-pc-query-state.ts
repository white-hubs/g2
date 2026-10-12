import { reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

export type PcQueryState = Record<string, unknown>;

export interface PcQueryStateOptions<T extends PcQueryState> {
  initialState: T;
  cacheFields?: string[];
  storage?: "url" | "memory";
  resolveValue?: (field: string, raw: unknown) => unknown;
  page?: { pageNumberField?: string; pageSizeField?: string };
}

export interface PcQueryStateApi<T extends PcQueryState> {
  state: T;
  setPage: (pageNumber: number, pageSize: number) => void;
  resetPage: () => void;
  update: (patch: Partial<T>) => void;
  getSnapshot: () => T;
}

/** 查询状态与 URL 同步；用于表单、分页共享同一个请求参数对象。 */
export function usePcQueryState<T extends PcQueryState>(options: PcQueryStateOptions<T>): PcQueryStateApi<T> {
  const route = useRoute();
  const router = useRouter();
  const state = reactive({ ...options.initialState }) as T;
  const fields = options.cacheFields ?? Object.keys(options.initialState);
  const pageNumberField = options.page?.pageNumberField ?? "pageNumber";
  const pageSizeField = options.page?.pageSizeField ?? "pageSize";

  if (options.storage === "url") {
    for (const field of fields) {
      const raw = route.query[field];
      if (raw === undefined || raw === null || raw === "") continue;
      const value = Array.isArray(raw) ? raw[0] : raw;
      (state as Record<string, unknown>)[field] = options.resolveValue ? options.resolveValue(field, value) : value;
    }
  }

  const syncToUrl = (): void => {
    if (options.storage !== "url") return;
    const query = { ...route.query } as Record<string, string>;
    for (const field of fields) {
      const value = (state as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === "") delete query[field];
      else query[field] = String(value);
    }
    void router.replace({ query });
  };

  const update = (patch: Partial<T>): void => {
    Object.assign(state, patch);
    syncToUrl();
  };
  const resetPage = (): void => {
    state[pageNumberField as keyof T] = options.initialState[pageNumberField as keyof T];
    state[pageSizeField as keyof T] = options.initialState[pageSizeField as keyof T];
    syncToUrl();
  };
  const setPage = (pageNumber: number, pageSize: number): void => {
    state[pageNumberField as keyof T] = pageNumber as T[keyof T];
    state[pageSizeField as keyof T] = pageSize as T[keyof T];
    syncToUrl();
  };
  return { state, setPage, resetPage, update, getSnapshot: () => ({ ...state }) };
}
