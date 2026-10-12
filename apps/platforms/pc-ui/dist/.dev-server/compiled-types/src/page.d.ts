/**
 * 旧 cube-ui `Page`：Pagination + 可选 URL pageNumber/pageSize 同步。
 * 默认挂中文 Pagination locale，避免弹窗外挂或 locale 丢失时出现 `10 / page`。
 */
export declare const Page: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    current: {
        type: NumberConstructor;
        required: true;
    };
    pageSize: {
        type: NumberConstructor;
        required: true;
    };
    total: {
        type: NumberConstructor;
        required: true;
    };
    showQuickJumper: {
        type: BooleanConstructor;
        default: undefined;
    };
    showSizeChanger: {
        type: BooleanConstructor;
        default: undefined;
    };
    showTotal: {
        type: () => (total: number, range: [number, number]) => string;
        default: undefined;
    };
    pageSizeOptions: {
        type: () => string[];
        default: undefined;
    };
    /** 为 false 时不读写 URL（弹窗内分页等） */
    syncToUrl: {
        type: BooleanConstructor;
        default: undefined;
    };
    /** 显式控制旧版兼容缓存；`false` 时不再在路由中持久化 pageNumber/pageSize。 */
    cachePageQuery: {
        type: BooleanConstructor;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("pageChange" | "showSizeChange")[], "pageChange" | "showSizeChange", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    current: {
        type: NumberConstructor;
        required: true;
    };
    pageSize: {
        type: NumberConstructor;
        required: true;
    };
    total: {
        type: NumberConstructor;
        required: true;
    };
    showQuickJumper: {
        type: BooleanConstructor;
        default: undefined;
    };
    showSizeChanger: {
        type: BooleanConstructor;
        default: undefined;
    };
    showTotal: {
        type: () => (total: number, range: [number, number]) => string;
        default: undefined;
    };
    pageSizeOptions: {
        type: () => string[];
        default: undefined;
    };
    /** 为 false 时不读写 URL（弹窗内分页等） */
    syncToUrl: {
        type: BooleanConstructor;
        default: undefined;
    };
    /** 显式控制旧版兼容缓存；`false` 时不再在路由中持久化 pageNumber/pageSize。 */
    cachePageQuery: {
        type: BooleanConstructor;
        default: undefined;
    };
}>> & Readonly<{
    onPageChange?: ((...args: any[]) => any) | undefined;
    onShowSizeChange?: ((...args: any[]) => any) | undefined;
}>, {
    showQuickJumper: boolean;
    showSizeChanger: boolean;
    showTotal: (total: number, range: [number, number]) => string;
    pageSizeOptions: string[];
    syncToUrl: boolean;
    cachePageQuery: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=page.d.ts.map