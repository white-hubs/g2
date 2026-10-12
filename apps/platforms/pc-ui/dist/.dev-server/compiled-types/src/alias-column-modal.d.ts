import { type PropType } from "vue";
import { type AliasColumnInput } from "./alias-table-storage";
/** 列别名配置弹窗：显隐 + 排序（localStorage） */
export declare const AliasColumnModal: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    open: {
        type: BooleanConstructor;
        default: boolean;
    };
    tableCode: {
        type: StringConstructor;
        default: string;
    };
    columns: {
        type: PropType<AliasColumnInput[]>;
        default: () => never[];
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:open" | "save")[], "update:open" | "save", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    open: {
        type: BooleanConstructor;
        default: boolean;
    };
    tableCode: {
        type: StringConstructor;
        default: string;
    };
    columns: {
        type: PropType<AliasColumnInput[]>;
        default: () => never[];
    };
}>> & Readonly<{
    "onUpdate:open"?: ((...args: any[]) => any) | undefined;
    onSave?: ((...args: any[]) => any) | undefined;
}>, {
    columns: AliasColumnInput[];
    tableCode: string;
    open: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=alias-column-modal.d.ts.map