import type { DefineComponent } from "vue";
import { PcTableApi } from "./pc-table-api";
import type { PcTableApiOptions } from "./pc-table-types";
export type { PcTableApiOptions, PcTableColumn, PageResultVo } from "./pc-table-types";
export type { PcTableApi } from "./pc-table-api";
/**
 * 旧 `useCubeTable` → pc-ui：返回 [表格组件, tableApi]。
 * `tableCode` 启用列别名（显隐 / 排序，localStorage）。
 */
export declare function usePcTable(options?: PcTableApiOptions): [DefineComponent, PcTableApi];
//# sourceMappingURL=use-pc-table.d.ts.map