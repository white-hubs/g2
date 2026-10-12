import type { ColumnType } from "ant-design-vue/es/table";
import type { Key } from "ant-design-vue/es/table/interface";

export interface PageResultVo {
  total: number;
  pages: number;
  records: unknown[];
}

export interface PcTableColumn {
  /** 考勤汇总等分组表头直接透传原生子列。 */
  children?: PcTableColumn[];
  align?: "left" | "center" | "right";
  dataIndex?: string | number | readonly (string | number)[];
  key?: string | number;
  title?: unknown;
  width?: string | number;
  fixed?: boolean | "left" | "right";
  ellipsis?: ColumnType["ellipsis"];
  /** 与实际 Ant Table 渲染签名保持一致。 */
  customRender?: ColumnType["customRender"];
  /** 与 Ant Table 列契约一致，供业务表格按相邻记录合并单元格。 */
  customCell?: ColumnType["customCell"];
}

export interface PcTableExpandedRowRenderArgs {
  record: unknown;
  index: number;
  indent: number;
  expanded: boolean;
}

export interface PcTableProps {
  dataSource?: unknown[];
  columns: PcTableColumn[];
  rowSelection?: "checkbox" | "radio";
  scrollY?: number;
  /** 列别名码：有值时启用表头齿轮（显隐 / 排序） */
  tableCode?: string;
  rowKey?: string;
  pagination?: boolean | Record<string, unknown>;
  /** 是否根据页面剩余高度自动启用表格纵向滚动；默认 true，使横向滚动条始终位于表格可视底边。 */
  autoScrollY?: boolean;
  autoFetch?: boolean;
  customRow?: (record: unknown, index: number) => unknown;
  rowClassName?: (record: unknown) => string;
  /** 受控展开行（单元清单等可展开列表） */
  expandedRowKeys?: Key[];
  /** 树形列表的子节点字段，保持旧 Cube Table 的 childrenColumnName 契约。 */
  childrenColumnName?: string;
  /** 树形展开按钮所在列索引；默认由 Ant Table 决定，业务可指定避免占用序号列。 */
  expandIconColumnIndex?: number;
}

export interface PcTableApiOptions extends PcTableProps {
  /** 日历与分组表头由业务渲染，保留原生 headerCell 契约。 */
  headerCell?: (args: { column: PcTableColumn; title: unknown }) => unknown;
  rowSelectionChange?: (selectedRowKeys: Key[], selectedRows: unknown[]) => void;
  fetchApi?: (params?: Record<string, unknown>) => Promise<PageResultVo>;
  fetchLoaded?: (params: PageResultVo) => void;
  getCheckboxProps?: (record: Record<string, unknown>) => { disabled: boolean };
  onExpand?: (expanded: boolean, record: unknown) => void;
  expandedRowRender?: (args: PcTableExpandedRowRenderArgs) => unknown;
}
