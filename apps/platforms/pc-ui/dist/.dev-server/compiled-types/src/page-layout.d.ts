/**
 * 旧 CubeLayout → PageLayout。slots: layout-header / layout-content / footer-btn / footer-page / default
 *
 * 横向滚动统一由表格 body（AliasTable scroll.x / scroll.y）承担。
 * 已删除 `showTableXScroll`：组件不声明、不处理；旧页面若仍传入会被忽略且不写入 DOM。
 */
export declare const PageLayout: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    title: {
        type: StringConstructor;
        default: string;
    };
    showFooter: {
        type: BooleanConstructor;
        default: boolean;
    };
    showHeader: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    title: {
        type: StringConstructor;
        default: string;
    };
    showFooter: {
        type: BooleanConstructor;
        default: boolean;
    };
    showHeader: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    title: string;
    showFooter: boolean;
    showHeader: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=page-layout.d.ts.map