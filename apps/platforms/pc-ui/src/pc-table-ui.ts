import type { Key } from "ant-design-vue/es/table/interface";
import { computed, defineComponent, h, type Component } from "vue";

import { AliasTable } from "./alias-table";
import type { PcTableApi } from "./pc-table-api";
import type { PcTableApiOptions } from "./pc-table-types";

import styles from "./pc-table.module.css";

export function createPcTableComponent(tableApi: PcTableApi, options: PcTableApiOptions): Component {
  return defineComponent({
    name: "PcTable",
    setup: () => {
      const rowSelection = computed(() => {
        if (tableApi.state.rowSelection) {
          return {
            type: tableApi.state.rowSelection,
            selectedRowKeys: tableApi.getSelectedRowKeys(),
            preserveSelectedRowKeys: true,
            onChange: (selectedRowKeys: Key[], selectedRows: unknown[]): void => {
              tableApi.setSelectedRowKeys(selectedRowKeys);
              tableApi.setSelectedRows(selectedRows);
              tableApi.rowSelectionChange();
            },
            getCheckboxProps: options.getCheckboxProps,
          };
        }
        return null;
      });

      return () =>
        h("div", { id: "pc-table", class: ["pc-table", styles.pcTable] }, [
          h(AliasTable, {
            rowKey: tableApi.state.rowKey ?? "id",
            scrollY: tableApi.state.scrollY,
            autoScrollY: tableApi.state.autoScrollY,
            pagination: tableApi.state.pagination === undefined ? false : tableApi.state.pagination,
            loading: tableApi.loading.value,
            rowSelection: rowSelection.value,
            columns: tableApi.state.columns,
            dataSource: tableApi.state.dataSource ?? [],
            tableCode: options.tableCode ?? "",
            customRow: options.customRow,
            rowClassName: options.rowClassName,
            expandedRowKeys: tableApi.state.expandedRowKeys,
            childrenColumnName: tableApi.state.childrenColumnName,
            expandIconColumnIndex: tableApi.state.expandIconColumnIndex,
            onExpand: options.onExpand,
            expandedRowRender: options.expandedRowRender,
            headerCell: options.headerCell,
            onChange: () => tableApi.query(),
          }),
        ]);
    },
  });
}
