import Button from "ant-design-vue/es/button";
import Checkbox from "ant-design-vue/es/checkbox";
import Modal from "ant-design-vue/es/modal";
import { computed, defineComponent, h, ref, watch, type PropType } from "vue";

import { applyAliasTableColumn, clearAliasColumnConfig, saveAliasColumnConfig, type AliasColumnInput } from "./alias-table-storage";

import styles from "./alias-column-modal.module.css";

interface ColumnItem {
  title: string;
  code: string;
  visible: boolean;
  sort: number;
}

const IconClose = (): ReturnType<typeof h> =>
  h(
    "svg",
    { viewBox: "64 64 896 896", width: "1em", height: "1em", fill: "currentColor", "aria-hidden": true },
    h("path", {
      d: "M799.86 166.31c.02 0 .04.02.08.06l57.69 57.7c.04.03.05.05.06.08a.12.12 0 010 .06c0 .03-.02.05-.06.09L569.93 512l287.7 287.7c.04.04.05.06.06.09a.12.12 0 010 .07c0 .02-.02.04-.06.08l-57.7 57.69c-.03.04-.05.05-.07.06a.12.12 0 01-.07 0c-.03 0-.05-.02-.09-.06L512 569.93l-287.7 287.7c-.04.04-.06.05-.09.06a.12.12 0 01-.07 0c-.02 0-.04-.02-.08-.06l-57.69-57.7c-.04-.03-.05-.05-.06-.07a.12.12 0 010-.07c0-.03.02-.05.06-.09L454.07 512l-287.7-287.7c-.04-.04-.05-.06-.06-.09a.12.12 0 010-.07c0-.02.02-.04.06-.08l57.7-57.69c.03-.04.05-.05.07-.06a.12.12 0 01.07 0c.03 0 .05.02.09.06L512 454.07l287.7-287.7c.04-.04.06-.05.09-.06a.12.12 0 01.07 0z",
    }),
  );

const IconTop = (): ReturnType<typeof h> =>
  h(
    "svg",
    { viewBox: "64 64 896 896", width: "1em", height: "1em", fill: "currentColor", "aria-hidden": true },
    h("path", {
      d: "M859.9 168H164.1c-4.5 0-8.1 3.6-8.1 8v60c0 4.4 3.6 8 8.1 8h695.8c4.5 0 8.1-3.6 8.1-8v-60c0-4.4-3.6-8-8.1-8zM518.3 355a8 8 0 00-12.6 0l-112 141.7a7.98 7.98 0 006.3 12.9h73.9V848c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V509.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 355z",
    }),
  );

const IconUp = (): ReturnType<typeof h> =>
  h(
    "svg",
    { viewBox: "64 64 896 896", width: "1em", height: "1em", fill: "currentColor", "aria-hidden": true },
    h("path", {
      d: "M890.5 755.3L537.9 269.2c-12.8-17.6-39-17.6-51.7 0L133.5 755.3A8 8 0 00140 768h75c5.1 0 9.9-2.5 12.9-6.6L512 369.8l284.1 391.6c3 4.1 7.8 6.6 12.9 6.6h75c6.5 0 10.3-7.4 6.5-12.7z",
    }),
  );

const IconDown = (): ReturnType<typeof h> =>
  h(
    "svg",
    { viewBox: "64 64 896 896", width: "1em", height: "1em", fill: "currentColor", "aria-hidden": true },
    h("path", {
      d: "M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z",
    }),
  );

function cloneColumns(list: ColumnItem[]): ColumnItem[] {
  return list.map((item) => ({ ...item }));
}

function normalizeSort(list: ColumnItem[]): ColumnItem[] {
  const ordered = list.toSorted((a, b) => a.sort - b.sort);
  return ordered.map((item, index) => ({ ...item, sort: index }));
}

/** 列别名配置弹窗：显隐 + 排序（localStorage） */
export const AliasColumnModal = defineComponent({
  name: "AliasColumnModal",
  props: {
    open: { type: Boolean, default: false },
    tableCode: { type: String, default: "" },
    columns: {
      type: Array as PropType<AliasColumnInput[]>,
      default: () => [],
    },
  },
  emits: ["update:open", "save"],
  setup(props, { emit }) {
    const columnsList = ref<ColumnItem[]>([]);

    const visibleCount = computed(() => columnsList.value.filter((item) => item.visible).length);
    const sortedVisible = computed(() => [...columnsList.value].filter((item) => item.visible).sort((a, b) => a.sort - b.sort));

    const reload = (): void => {
      columnsList.value = applyAliasTableColumn({
        tableCode: props.tableCode,
        columns: props.columns,
        filter: false,
        sort: false,
      }).map((item) => ({
        title: item.title,
        code: item.code,
        visible: item.visible,
        sort: item.sort,
      }));
    };

    watch(
      () => props.open,
      (open) => {
        if (open) reload();
      },
    );

    const close = (): void => {
      emit("update:open", false);
    };

    const patchColumn = (code: string, patch: Partial<ColumnItem>): void => {
      columnsList.value = columnsList.value.map((item) => (item.code === code ? { ...item, ...patch } : item));
    };

    const handleSelect = (code: string, checked: boolean): void => {
      if (checked) {
        const maxSort = columnsList.value.reduce((max, item) => Math.max(max, item.sort), -1);
        patchColumn(code, { visible: true, sort: maxSort + 1 });
        return;
      }
      patchColumn(code, { visible: false });
    };

    const handleSelectAll = (checked: boolean): void => {
      columnsList.value = columnsList.value.map((item, index) => ({
        ...item,
        visible: checked,
        sort: checked ? index : item.sort,
      }));
    };

    const handleTopping = (code: string): void => {
      const next = cloneColumns(columnsList.value);
      const target = next.find((item) => item.code === code);
      if (!target || !target.visible) return;
      const minSort = next.reduce((min, item) => Math.min(min, item.sort), 0);
      target.sort = minSort - 1;
      columnsList.value = normalizeSort(next);
    };

    const move = (code: string, direction: -1 | 1): void => {
      const visible = sortedVisible.value;
      const index = visible.findIndex((item) => item.code === code);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= visible.length) return;
      const current = visible[index];
      const target = visible[swapIndex];
      if (!current || !target) return;
      const next = cloneColumns(columnsList.value).map((item) => {
        if (item.code === current.code) return { ...item, sort: target.sort };
        if (item.code === target.code) return { ...item, sort: current.sort };
        return item;
      });
      columnsList.value = normalizeSort(next);
    };

    const reset = (): void => {
      clearAliasColumnConfig(props.tableCode);
      reload();
    };

    const handleConfirm = (): void => {
      saveAliasColumnConfig(
        props.tableCode,
        columnsList.value.map((item) => ({
          code: item.code,
          sort: item.sort,
          visible: item.visible,
        })),
      );
      emit("save");
      close();
    };

    return () =>
      h(
        Modal,
        {
          open: props.open,
          title: "选择表头显示内容",
          width: 1040,
          destroyOnClose: true,
          centered: true,
          onCancel: close,
        },
        {
          footer: () =>
            h("div", { class: styles.footer }, [
              h(Button, { onClick: reset }, () => "恢复至默认设置"),
              h("div", { class: styles.footerActions }, [
                h(Button, { onClick: close }, () => "取 消"),
                h(Button, { type: "primary", onClick: handleConfirm }, () => "确 定"),
              ]),
            ]),
          default: () =>
            h("div", { class: styles.modalBody }, [
              h("div", { class: styles.selectArea }, [
                h("div", { class: styles.contentTitle }, `可选属性（共 ${props.columns.length} 个）`),
                h("div", { class: styles.border }, [
                  h(
                    Checkbox,
                    {
                      indeterminate: visibleCount.value > 0 && visibleCount.value < columnsList.value.length,
                      checked: visibleCount.value > 0 && visibleCount.value === columnsList.value.length,
                      "onUpdate:checked": (checked: boolean) => handleSelectAll(checked),
                    },
                    () => "全选",
                  ),
                  h(
                    "div",
                    { class: styles.tableColumnList },
                    columnsList.value.map((column) =>
                      h("div", { class: styles.tableColumnItem, key: column.code }, [
                        h(
                          Checkbox,
                          {
                            checked: column.visible,
                            "onUpdate:checked": (checked: boolean) => handleSelect(column.code, checked),
                          },
                          () => column.title,
                        ),
                      ]),
                    ),
                  ),
                ]),
              ]),
              h("div", { class: styles.sortArea }, [
                h("div", { class: styles.contentTitle }, `已选属性（共 ${visibleCount.value} 个）`),
                h(
                  "div",
                  { class: styles.border },
                  sortedVisible.value.map((column) =>
                    h("div", { class: styles.tableColumnSortItem, key: column.code }, [
                      h("div", { class: styles.sortItemTitle }, [
                        h("span", { class: styles.dragHandle, title: "拖拽排序" }, "⋮⋮"),
                        h("span", null, column.title),
                      ]),
                      h("div", { class: styles.columnSortOperate }, [
                        h(
                          Button,
                          {
                            type: "text",
                            size: "small",
                            title: "上移",
                            onClick: (event: MouseEvent) => {
                              event.preventDefault();
                              event.stopPropagation();
                              move(column.code, -1);
                            },
                          },
                          () => h(IconUp),
                        ),
                        h(
                          Button,
                          {
                            type: "text",
                            size: "small",
                            title: "下移",
                            onClick: (event: MouseEvent) => {
                              event.preventDefault();
                              event.stopPropagation();
                              move(column.code, 1);
                            },
                          },
                          () => h(IconDown),
                        ),
                        h(
                          Button,
                          {
                            type: "text",
                            size: "small",
                            title: "置顶",
                            onClick: (event: MouseEvent) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleTopping(column.code);
                            },
                          },
                          () => h(IconTop),
                        ),
                        h(
                          Button,
                          {
                            type: "text",
                            size: "small",
                            title: "移除",
                            danger: true,
                            onClick: (event: MouseEvent) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleSelect(column.code, false);
                            },
                          },
                          () => h(IconClose),
                        ),
                      ]),
                    ]),
                  ),
                ),
              ]),
            ]),
        },
      );
  },
});
