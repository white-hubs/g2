import Table from "ant-design-vue/es/table";
import type { Key } from "ant-design-vue/es/table/interface";
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component, type PropType } from "vue";

import { AliasColumnModal } from "./alias-column-modal";
import { applyAliasTableColumn, type AliasColumnInput } from "./alias-table-storage";
import type { PcTableApiOptions, PcTableColumn } from "./pc-table-types";

const SettingIcon = (): ReturnType<typeof h> =>
  h(
    "svg",
    {
      viewBox: "64 64 896 896",
      width: "1em",
      height: "1em",
      fill: "currentColor",
      "aria-hidden": true,
      style: { cursor: "pointer", flexShrink: 0 },
    },
    h("path", {
      d: "M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.91 443.91 0 00-79.7-137.9l-1.8-2.1a32.08 32.08 0 00-35.2-9.3l-79.7 30.5a288.5 288.5 0 00-100-58.2L660.8 120a32.09 32.09 0 00-27.1-20H390.3a32.09 32.09 0 00-27.1 20l-22.5 79.5a288.5 288.5 0 00-100 58.2l-79.7-30.5a32.08 32.08 0 00-35.2 9.3l-1.8 2.1a443.9 443.9 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l65.5 56a289.62 289.62 0 000 115.6l-65.5 56a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.3 96.9 79.7 137.9l1.8 2.1a32.08 32.08 0 0035.2 9.3l79.7-30.5a288.5 288.5 0 00100 58.2l22.5 79.5a32.09 32.09 0 0027.1 20h243.4a32.09 32.09 0 0027.1-20l22.5-79.5a288.5 288.5 0 00100-58.2l79.7 30.5a32.08 32.08 0 0035.2-9.3l1.8-2.1a443.9 443.9 0 0079.7-137.9l.9-2.6c4.5-12.5.8-26.5-9.3-35.2zM512 704c-105.9 0-192-86.1-192-192s86.1-192 192-192 192 86.1 192 192-86.1 192-192 192z",
    }),
  );

function toAliasInputs(columns: PcTableColumn[]): AliasColumnInput[] {
  return columns.map((column) => ({
    ...column,
    code: String(column.dataIndex ?? column.key ?? ""),
    title: String(column.title ?? ""),
  }));
}

function resolveHeaderTitleJustify(align: PcTableColumn["align"] | undefined): string {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

/**
 * 表格数据接口经常以 null、undefined 或空字符串表达“未维护”。统一在数据列展示 --，
 * 保留 0 和 false，避免业务页面各自遗漏空值处理。
 */
export function renderTableEmptyValue(value: unknown): unknown {
  return value === undefined || value === null || value === "" ? "--" : value;
}

/** 树表仅对真实含有子节点的行渲染展开按钮，空数组不占用交互控件。 */
export function hasTreeChildren(record: Record<string, unknown>, childrenColumnName: string | undefined): boolean {
  if (!childrenColumnName) return false;
  const children = record[childrenColumnName];
  return Array.isArray(children) && children.length > 0;
}

function withEmptyValueFallback(column: PcTableColumn): PcTableColumn {
  // 操作列和业务自定义渲染列不能被覆盖，避免把有意留空的按钮区误渲染成 --。
  if (column.customRender || column.dataIndex === undefined) return column;
  return { ...column, customRender: ({ text }) => renderTableEmptyValue(text) };
}

function renderSettingsHeaderCell(title: unknown, column: PcTableColumn, onOpen: () => void): ReturnType<typeof h> {
  return h(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        paddingRight: "24px",
      },
    },
    [
      h(
        "div",
        {
          style: {
            display: "flex",
            width: "100%",
            minWidth: 0,
            alignItems: "center",
            justifyContent: resolveHeaderTitleJustify(column.align),
          },
        },
        h(
          "span",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          title as string,
        ),
      ),
      h(
        "span",
        {
          role: "button",
          title: "自定义列",
          style: {
            position: "absolute",
            top: "50%",
            right: "4px",
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            lineHeight: 0,
          },
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            onOpen();
          },
        },
        h(SettingIcon),
      ),
    ],
  );
}

/** 自定义日期表头与列设置共存，回调缺省时保留原生标题。 */
export function renderPcTableHeader(
  args: { column: PcTableColumn; title: unknown },
  options: {
    headerCell?: PcTableApiOptions["headerCell"];
    showSettings?: boolean;
    onOpen: () => void;
  },
): unknown {
  const title = options.headerCell?.(args) ?? args.title;
  return options.showSettings ? renderSettingsHeaderCell(title, args.column, options.onOpen) : title;
}

/** 对齐旧表格的尺寸、滚动和列别名设置。 */
export const AliasTable = defineComponent({
  name: "PcAliasTable",
  props: {
    rowKey: { type: String, default: "id" },
    rowSelection: { type: Object as PropType<Record<string, unknown> | null>, default: null },
    loading: { type: Boolean, default: false },
    dataSource: { type: Array as PropType<unknown[]>, default: () => [] },
    tableCode: { type: String, default: "" },
    columns: { type: Array as PropType<PcTableColumn[]>, default: () => [] },
    scrollX: { type: Number, default: undefined },
    scrollY: { type: Number, default: undefined },
    autoScrollY: { type: Boolean, default: true },
    pagination: {
      type: [Boolean, Object] as PropType<boolean | Record<string, unknown>>,
      default: false,
    },
    customRow: { type: Function as PropType<(record: unknown, index: number) => unknown>, default: undefined },
    rowClassName: { type: Function as PropType<(record: unknown) => string>, default: undefined },
    expandedRowKeys: { type: Array as PropType<Key[]>, default: undefined },
    childrenColumnName: { type: String, default: undefined },
    expandIconColumnIndex: { type: Number, default: undefined },
    onExpand: { type: Function as PropType<(expanded: boolean, record: unknown) => void>, default: undefined },
    headerCell: { type: Function as PropType<NonNullable<PcTableApiOptions["headerCell"]>>, default: undefined },
    expandedRowRender: {
      type: Function as PropType<(args: { record: unknown; index: number; indent: number; expanded: boolean }) => unknown>,
      default: undefined,
    },
  },
  emits: ["change"],
  setup(props, { emit }) {
    const visible = ref(false);
    const aliasColumns = ref<PcTableColumn[]>([]);
    const autoScrollY = ref<number | undefined>(undefined);
    let queryFormObserver: ResizeObserver | undefined;

    const refreshColumns = (): void => {
      if (!props.tableCode) {
        aliasColumns.value = props.columns;
        return;
      }
      const merged = applyAliasTableColumn({
        tableCode: props.tableCode,
        columns: toAliasInputs(props.columns),
      });
      aliasColumns.value = merged.map(({ visible: _v, sort: _s, code: _c, ...rest }) => rest as PcTableColumn);
    };

    const calcScrollY = (): void => {
      const layoutContent = document.getElementById("pc-layout-content") ?? document.getElementById("cube-layout-content");
      const tableElement = document.getElementById("pc-table") ?? document.getElementById("cube-table");
      if (!layoutContent || !tableElement) {
        autoScrollY.value = undefined;
        return;
      }
      const overhead = Math.max(tableElement.getBoundingClientRect().top - layoutContent.getBoundingClientRect().top, 0);
      autoScrollY.value = Math.max(layoutContent.clientHeight - overhead - 40, 120);
    };

    onMounted(() => {
      refreshColumns();
      window.addEventListener("resize", calcScrollY);
      // 查询区展开/收起不会触发 window resize；监听其高度变化，避免页面和表格 body 出现双纵向滚动条。
      const queryForm = document.querySelector(
        "#pc-layout-content .pc-query-form-container, #cube-layout-content .pc-query-form-container",
      );
      if (queryForm && typeof ResizeObserver !== "undefined") {
        queryFormObserver = new ResizeObserver(() => void nextTick(calcScrollY));
        queryFormObserver.observe(queryForm);
      }
      setTimeout(calcScrollY, 100);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", calcScrollY);
      queryFormObserver?.disconnect();
    });

    watch(
      () => props.dataSource.length,
      () => {
        void nextTick(() => calcScrollY());
      },
    );

    watch(
      () => props.columns,
      () => refreshColumns(),
      { deep: true },
    );

    watch(
      () => props.tableCode,
      () => refreshColumns(),
    );

    const calcScrollX = computed(() => {
      if (props.scrollX !== undefined) return props.scrollX;
      return aliasColumns.value.reduce<number>((acc, cur) => {
        let width = cur.width;
        if (typeof width === "string") {
          width = Number(String(width).replace(/[^\d]/g, "")) || 180;
        }
        return acc + Number(width ?? 180);
      }, 0);
    });

    const hasVerticalScroll = computed(() => (props.scrollY ?? autoScrollY.value) !== undefined);
    const treeDataSource = computed(() => {
      if (!props.childrenColumnName) return props.dataSource;
      const childrenColumnName = props.childrenColumnName;
      const normalize = (rows: unknown[]): unknown[] =>
        rows.map((row) => {
          if (!row || typeof row !== "object") return row;
          const item = row as Record<string, unknown>;
          const children = item[childrenColumnName];
          if (!hasTreeChildren(item, childrenColumnName)) {
            const { [childrenColumnName]: _children, ...rest } = item;
            return rest;
          }
          return { ...item, [childrenColumnName]: normalize(children as unknown[]) };
        });
      return normalize(props.dataSource);
    });

    return () =>
      h(
        "div",
        {
          class: [
            hasVerticalScroll.value ? "pc-alias-table--scroll-y" : undefined,
            props.childrenColumnName ? "pc-alias-table--tree-expand" : undefined,
          ],
        },
        [
          h(
            Table as Component,
            {
              rowKey: props.rowKey,
              rowSelection: props.rowSelection,
              columns: aliasColumns.value.map(withEmptyValueFallback),
              loading: props.loading,
              dataSource: treeDataSource.value,
              pagination: props.pagination ?? false,
              size: "small",
              bordered: true,
              customRow: props.customRow,
              rowClassName: props.rowClassName,
              expandedRowKeys: props.expandedRowKeys,
              childrenColumnName: props.childrenColumnName,
              // 直接透传 Ant Design Vue 树表格；框架会在第 1 列自动生成独立展开列。
              expandIconColumnIndex: props.expandIconColumnIndex,
              onExpand: props.onExpand,
              scroll: {
                x: calcScrollX.value || true,
                ...(props.scrollY !== undefined ? { y: props.scrollY } : props.autoScrollY ? { y: autoScrollY.value } : {}),
              },
              onChange: (...args: unknown[]) => emit("change", ...args),
            },
            {
              headerCell: ({ column, title }: { column: PcTableColumn; title: unknown }) => {
                const isLast =
                  props.tableCode &&
                  aliasColumns.value.length > 0 &&
                  (aliasColumns.value[aliasColumns.value.length - 1]?.key ??
                    aliasColumns.value[aliasColumns.value.length - 1]?.dataIndex) === (column.key ?? column.dataIndex);
                return renderPcTableHeader(
                  { column, title },
                  {
                    headerCell: props.headerCell,
                    showSettings: Boolean(isLast),
                    onOpen: () => {
                      visible.value = true;
                    },
                  },
                );
              },
              ...(props.expandedRowRender
                ? {
                    expandedRowRender: (args: { record: unknown; index: number; indent: number; expanded: boolean }) =>
                      props.expandedRowRender?.(args),
                  }
                : {}),
            },
          ),
          props.tableCode
            ? h(AliasColumnModal, {
                open: visible.value,
                "onUpdate:open": (open: boolean) => {
                  visible.value = open;
                },
                tableCode: props.tableCode,
                columns: toAliasInputs(props.columns),
                onSave: () => {
                  refreshColumns();
                  emit("change", aliasColumns.value);
                },
              })
            : null,
        ],
      );
  },
});

export type { Key };
