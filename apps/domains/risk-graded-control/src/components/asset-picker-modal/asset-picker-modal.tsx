import { defineComponent, nextTick, type PropType, ref, watch } from "vue";

import { pagePropertyAssets, type PropertyAsset } from "@/api/assets";
import { LIST_SEARCH_INPUT_PROPS, TABLE_PAGE_SIZE, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { usePickerTableScroll } from "@/hooks/use-picker-table-scroll";
import { Modal, Table, Input, Empty, Button, Page } from "@/pc-ui-runtime";
import { showApiError } from "@/utils/api-error";
import { resolvePageNumberWhenCurrentEmpty } from "@/utils/pagination";

import styles from "./asset-picker-modal.module.less";

const PICKER_TABLE_CLASS = "asset-picker-table";

export interface AssetPickerOption {
  id: string;
  name: string;
  typeName?: string;
  receiveDepName?: string;
  areaName?: string;
}

function mapAssetRow(row: PropertyAsset): AssetPickerOption {
  const areaName =
    (row as PropertyAsset & { areaName?: string }).areaName ??
    row.area
      ?.map((item) => item.name)
      .filter(Boolean)
      .join("、");
  return {
    id: String(row.id ?? ""),
    name: row.name ?? "",
    typeName: row.typeName,
    receiveDepName: row.receiveDepName,
    areaName,
  };
}

export const AssetPickerModal = defineComponent({
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: "选择关联资产" },
    initialSelected: {
      type: Object as PropType<AssetPickerOption | null>,
      default: null,
    },
  },
  emits: ["update:visible", "confirm"],
  setup(props, { emit }) {
    const keyword = ref("");
    const loading = ref(false);
    const selectedKey = ref<string>("");
    const selectedAsset = ref<AssetPickerOption | null>(null);
    const records = ref<AssetPickerOption[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const tableWrapRef = ref<HTMLElement | null>(null);
    const { scrollY: tableScrollY, recalc: recalcTableScroll } = usePickerTableScroll(tableWrapRef);

    const scheduleRecalcTableScroll = (): void => {
      void nextTick(() => {
        recalcTableScroll();
        setTimeout(recalcTableScroll, 0);
        setTimeout(recalcTableScroll, 150);
      });
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pagePropertyAssets({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            keyword: keyword.value.trim(),
            status: "",
            areaId: "",
            typeId: "",
            sourceId: "",
            receiveDepId: "",
            usageDate: "",
          }),
        );
        records.value = page.records.map(mapAssetRow);
        total.value = page.total ?? 0;
        const nextPage = resolvePageNumberWhenCurrentEmpty(pageNumber.value, records.value.length, total.value, pageSize.value);
        if (nextPage !== pageNumber.value) {
          pageNumber.value = nextPage;
          await load();
          return;
        }
      } catch (e) {
        showApiError(e);
        records.value = [];
        total.value = 0;
      } finally {
        loading.value = false;
        scheduleRecalcTableScroll();
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      void load();
    };

    const onReset = (): void => {
      keyword.value = "";
      onSearch();
    };

    const applyInitialSelection = (): void => {
      const selected = props.initialSelected;
      if (selected?.id) {
        selectedKey.value = selected.id;
        selectedAsset.value = selected;
        return;
      }
      selectedKey.value = "";
      selectedAsset.value = null;
    };

    watch(
      () => props.visible,
      (open) => {
        if (open) {
          keyword.value = "";
          pageNumber.value = 1;
          pageSize.value = TABLE_PAGE_SIZE;
          applyInitialSelection();
          void load();
          scheduleRecalcTableScroll();
        }
      },
    );

    const columns = [
      { title: "名称", dataIndex: "name", ellipsis: true },
      { title: "类别", dataIndex: "typeName", width: 120, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
      {
        title: "部门",
        dataIndex: "receiveDepName",
        width: 120,
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => text || "--",
      },
      { title: "区域", dataIndex: "areaName", width: 120, ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
    ];

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void load();
    };

    const onOk = (): void => {
      if (!selectedAsset.value) return;
      emit("confirm", selectedAsset.value);
      emit("update:visible", false);
    };

    return (): JSX.Element => (
      <Modal
        wrapClassName="risk-modal"
        bodyStyle={RISK_MODAL_BODY_STYLE}
        open={props.visible}
        title={props.title}
        width={860}
        destroyOnClose
        footer={
          <div class={styles.modalFooter}>
            <Button onClick={() => emit("update:visible", false)}>取消</Button>
            <Button type="primary" disabled={!selectedAsset.value} loading={loading.value} onClick={onOk}>
              确定
            </Button>
          </div>
        }
        onCancel={() => emit("update:visible", false)}
      >
        <div class={styles.modalBody}>
          <div class={styles.toolbar}>
            <Input
              class={styles.keywordInput}
              {...LIST_SEARCH_INPUT_PROPS}
              placeholder="请输入资产名称"
              value={keyword.value}
              onUpdate:value={(v: string) => {
                keyword.value = v;
              }}
              allowClear
              onPressEnter={onSearch}
            />
            <Button type="primary" onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </div>
          <div class={styles.tableWrap} ref={tableWrapRef}>
            <Table
              class={PICKER_TABLE_CLASS}
              rowKey="id"
              columns={columns}
              dataSource={records.value}
              loading={loading.value}
              pagination={false}
              tableLayout="fixed"
              scroll={{ y: tableScrollY.value }}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedKey.value ? [selectedKey.value] : [],
                onChange: (keys: (string | number)[], rows: AssetPickerOption[]) => {
                  const id = keys.length ? String(keys[0]) : "";
                  selectedKey.value = id;
                  if (!id) {
                    selectedAsset.value = null;
                    return;
                  }
                  selectedAsset.value = rows[0] ?? records.value.find((row) => row.id === id) ?? selectedAsset.value;
                },
              }}
              locale={{ emptyText: <Empty description="暂无可选资产" /> }}
            />
          </div>
          <div class={styles.pagination}>
            <Page total={total.value} current={pageNumber.value} pageSize={pageSize.value} syncToUrl={false} onPageChange={onPageChange} />
          </div>
        </div>
      </Modal>
    );
  },
});
