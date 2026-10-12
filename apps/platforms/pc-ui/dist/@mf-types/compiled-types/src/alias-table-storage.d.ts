export interface AliasColumnConfig {
    code: string;
    sort: number;
    visible: boolean;
}
export interface AliasColumnInput {
    code: string;
    title: string;
    fixed?: boolean | string;
    defaultVisible?: boolean;
    [key: string]: unknown;
}
export declare function loadAliasColumnConfig(tableCode: string): AliasColumnConfig[];
export declare function saveAliasColumnConfig(tableCode: string, config: AliasColumnConfig[]): void;
export declare function clearAliasColumnConfig(tableCode: string): void;
/** 合并别名配置：排序 + 显隐（对齐 cube getAliasTableColumn） */
export declare function applyAliasTableColumn(payload: {
    tableCode: string;
    columns: AliasColumnInput[];
    filter?: boolean;
    sort?: boolean;
}): (AliasColumnInput & {
    visible: boolean;
    sort: number;
})[];
//# sourceMappingURL=alias-table-storage.d.ts.map