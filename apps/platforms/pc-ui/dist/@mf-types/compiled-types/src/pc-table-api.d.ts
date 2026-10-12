import type { Key } from "ant-design-vue/es/table/interface";
import { type Ref } from "vue";
import type { PcTableApiOptions, PcTableProps } from "./pc-table-types";
export declare class PcTableApi {
    state: PcTableProps;
    loading: Ref<boolean>;
    private readonly selectedRowKeys;
    private selectedRows;
    private readonly api;
    private autoFetchTimer;
    constructor(options: PcTableApiOptions);
    setColumns(columns: PcTableProps["columns"]): void;
    setDataSource(dataSource: PcTableProps["dataSource"]): void;
    getDataSource(): unknown[] | undefined;
    setSelectedRowKeys(selectedRowKeys: Key[]): void;
    getSelectedRowKeys(): Key[];
    setState(state: Partial<PcTableProps>): void;
    setSelectedRows(selectedRows: unknown[]): void;
    getSelectedRows(): unknown[];
    rowSelectionChange(): void;
    query(): void;
    resetFetch(): void;
    private checkDataIndexUnique;
    private cancelAutoFetch;
    private fetchData;
}
//# sourceMappingURL=pc-table-api.d.ts.map