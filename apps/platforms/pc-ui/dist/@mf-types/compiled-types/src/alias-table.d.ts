import type { Key } from "ant-design-vue/es/table/interface";
import { type PropType } from "vue";
import type { PcTableApiOptions, PcTableColumn } from "./pc-table-types";
/**
 * 表格数据接口经常以 null、undefined 或空字符串表达“未维护”。统一在数据列展示 --，
 * 保留 0 和 false，避免业务页面各自遗漏空值处理。
 */
export declare function renderTableEmptyValue(value: unknown): unknown;
/** 树表仅对真实含有子节点的行渲染展开按钮，空数组不占用交互控件。 */
export declare function hasTreeChildren(record: Record<string, unknown>, childrenColumnName: string | undefined): boolean;
/** 自定义日期表头与列设置共存，回调缺省时保留原生标题。 */
export declare function renderPcTableHeader(args: {
    column: PcTableColumn;
    title: unknown;
}, options: {
    headerCell?: PcTableApiOptions["headerCell"];
    showSettings?: boolean;
    onOpen: () => void;
}): unknown;
/** 对齐旧表格的尺寸、滚动和列别名设置。 */
export declare const AliasTable: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    rowKey: {
        type: StringConstructor;
        default: string;
    };
    rowSelection: {
        type: PropType<Record<string, unknown> | null>;
        default: null;
    };
    loading: {
        type: BooleanConstructor;
        default: boolean;
    };
    dataSource: {
        type: PropType<unknown[]>;
        default: () => never[];
    };
    tableCode: {
        type: StringConstructor;
        default: string;
    };
    columns: {
        type: PropType<PcTableColumn[]>;
        default: () => never[];
    };
    scrollX: {
        type: NumberConstructor;
        default: undefined;
    };
    scrollY: {
        type: NumberConstructor;
        default: undefined;
    };
    autoScrollY: {
        type: BooleanConstructor;
        default: boolean;
    };
    pagination: {
        type: PropType<boolean | Record<string, unknown>>;
        default: boolean;
    };
    customRow: {
        type: PropType<(record: unknown, index: number) => unknown>;
        default: undefined;
    };
    rowClassName: {
        type: PropType<(record: unknown) => string>;
        default: undefined;
    };
    expandedRowKeys: {
        type: PropType<Key[]>;
        default: undefined;
    };
    childrenColumnName: {
        type: StringConstructor;
        default: undefined;
    };
    expandIconColumnIndex: {
        type: NumberConstructor;
        default: undefined;
    };
    onExpand: {
        type: PropType<(expanded: boolean, record: unknown) => void>;
        default: undefined;
    };
    headerCell: {
        type: PropType<NonNullable<PcTableApiOptions["headerCell"]>>;
        default: undefined;
    };
    expandedRowRender: {
        type: PropType<(args: {
            record: unknown;
            index: number;
            indent: number;
            expanded: boolean;
        }) => unknown>;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "change"[], "change", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    rowKey: {
        type: StringConstructor;
        default: string;
    };
    rowSelection: {
        type: PropType<Record<string, unknown> | null>;
        default: null;
    };
    loading: {
        type: BooleanConstructor;
        default: boolean;
    };
    dataSource: {
        type: PropType<unknown[]>;
        default: () => never[];
    };
    tableCode: {
        type: StringConstructor;
        default: string;
    };
    columns: {
        type: PropType<PcTableColumn[]>;
        default: () => never[];
    };
    scrollX: {
        type: NumberConstructor;
        default: undefined;
    };
    scrollY: {
        type: NumberConstructor;
        default: undefined;
    };
    autoScrollY: {
        type: BooleanConstructor;
        default: boolean;
    };
    pagination: {
        type: PropType<boolean | Record<string, unknown>>;
        default: boolean;
    };
    customRow: {
        type: PropType<(record: unknown, index: number) => unknown>;
        default: undefined;
    };
    rowClassName: {
        type: PropType<(record: unknown) => string>;
        default: undefined;
    };
    expandedRowKeys: {
        type: PropType<Key[]>;
        default: undefined;
    };
    childrenColumnName: {
        type: StringConstructor;
        default: undefined;
    };
    expandIconColumnIndex: {
        type: NumberConstructor;
        default: undefined;
    };
    onExpand: {
        type: PropType<(expanded: boolean, record: unknown) => void>;
        default: undefined;
    };
    headerCell: {
        type: PropType<NonNullable<PcTableApiOptions["headerCell"]>>;
        default: undefined;
    };
    expandedRowRender: {
        type: PropType<(args: {
            record: unknown;
            index: number;
            indent: number;
            expanded: boolean;
        }) => unknown>;
        default: undefined;
    };
}>> & Readonly<{
    onChange?: ((...args: any[]) => any) | undefined;
}>, {
    scrollX: number;
    scrollY: number;
    pagination: boolean | Record<string, unknown>;
    columns: PcTableColumn[];
    dataSource: unknown[];
    headerCell: (args: {
        column: PcTableColumn;
        title: unknown;
    }) => unknown;
    onExpand: (expanded: boolean, record: unknown) => void;
    expandedRowRender: (args: {
        record: unknown;
        index: number;
        indent: number;
        expanded: boolean;
    }) => unknown;
    rowSelection: Record<string, unknown> | null;
    tableCode: string;
    rowKey: string;
    autoScrollY: boolean;
    customRow: (record: unknown, index: number) => unknown;
    rowClassName: (record: unknown) => string;
    expandedRowKeys: Key[];
    childrenColumnName: string;
    expandIconColumnIndex: number;
    loading: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export type { Key };
//# sourceMappingURL=alias-table.d.ts.map