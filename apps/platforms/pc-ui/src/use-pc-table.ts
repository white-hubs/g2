import type { DefineComponent } from "vue";

import { PcTableApi } from "./pc-table-api";
import type { PcTableApiOptions } from "./pc-table-types";
import { createPcTableComponent } from "./pc-table-ui";

export type { PcTableApiOptions, PcTableColumn, PageResultVo } from "./pc-table-types";
export type { PcTableApi } from "./pc-table-api";

/**
 * 旧 `useCubeTable` → pc-ui：返回 [表格组件, tableApi]。
 * `tableCode` 启用列别名（显隐 / 排序，localStorage）。
 */
export function usePcTable(options: PcTableApiOptions = { columns: [], dataSource: [] }): [DefineComponent, PcTableApi] {
  const tableApi = new PcTableApi(options);
  const PcTable = createPcTableComponent(tableApi, options) as DefineComponent;
  return [PcTable, tableApi];
}
