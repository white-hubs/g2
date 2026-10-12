export interface PageQueryRoute {
    path: string;
    query: Record<string, unknown>;
    hash?: string;
}
export interface PageQueryRouter {
    replace: (location: {
        path: string;
        query: Record<string, string | string[]>;
        hash?: string;
    }) => Promise<unknown>;
}
export declare const readPageQueryValue: (key: string, route?: PageQueryRoute) => number | undefined;
export declare const writePageQuery: (pageNumber: number, pageSize: number, router?: PageQueryRouter, route?: PageQueryRoute) => void;
//# sourceMappingURL=page-url-query.d.ts.map