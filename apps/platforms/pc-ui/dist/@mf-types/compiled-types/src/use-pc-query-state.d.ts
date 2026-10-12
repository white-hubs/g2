export type PcQueryState = Record<string, unknown>;
export interface PcQueryStateOptions<T extends PcQueryState> {
    initialState: T;
    cacheFields?: string[];
    storage?: "url" | "memory";
    resolveValue?: (field: string, raw: unknown) => unknown;
    page?: {
        pageNumberField?: string;
        pageSizeField?: string;
    };
}
export interface PcQueryStateApi<T extends PcQueryState> {
    state: T;
    setPage: (pageNumber: number, pageSize: number) => void;
    resetPage: () => void;
    update: (patch: Partial<T>) => void;
    getSnapshot: () => T;
}
/** 查询状态与 URL 同步；用于表单、分页共享同一个请求参数对象。 */
export declare function usePcQueryState<T extends PcQueryState>(options: PcQueryStateOptions<T>): PcQueryStateApi<T>;
//# sourceMappingURL=use-pc-query-state.d.ts.map