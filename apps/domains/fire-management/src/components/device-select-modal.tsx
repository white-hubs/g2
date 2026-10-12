// @ts-nocheck — 设备选择弹窗，对齐 cube-app-design DeviceSelectModal。
import { defineComponent, nextTick, reactive, shallowRef, watch, type PropType } from "vue";

import { AreaTreeSelect, DeptCascaderSelect, DeviceTagSelect, IotProductCategoryTreeSelect, ProductSelect } from "./device-select-filters";
import { getDeviceCenterClient } from "@/domain-context";
import { Button, Modal, Page, PopOver, message, usePcForm, usePcTable } from "@/pc-ui-runtime";

import styles from "./device-select-modal.module.css";

export type DeviceSelectModalFilterField = "keyword" | "productId" | "categoryCode" | "brandName" | "areaId" | "departmentId" | "tagCodes";

export type DeviceSelectRecord = {
  id?: string | number;
  deviceId?: string | number;
  code?: string;
  name?: string;
  category?: string;
  product?: string;
  brand?: string;
  region?: string;
  lntAndLat?: string;
  fireManageDeviceId?: string | number;
  area?: { id?: string; name?: string; pathName?: string };
  department?: { name?: string };
  productInfo?: {
    id?: string | number;
    name?: string;
    brandCode?: string;
    brandName?: string;
    productCategory?: { code?: string; name?: string; pathCode?: string };
  };
  [key: string]: unknown;
};

export type DeviceSelectModalExpose = {
  openModal: (selectedDevices?: DeviceSelectRecord[]) => void;
  closeModal: () => void;
};

type DeviceSelectQuery = {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  tagCodes?: string[];
  departmentId?: string;
  areaId?: string;
  productId?: string;
  categoryCode?: string;
  brandName?: string;
};

const TABLE_ROW_HEIGHT = 39;
const TABLE_HEADER_HEIGHT = 40;
const displayText = (value?: string): string => value || "--";

const resolveTableBodyHeight = (pageSize: number): number => pageSize * TABLE_ROW_HEIGHT;
const resolveTableRegionMinHeight = (pageSize: number): number => resolveTableBodyHeight(pageSize) + TABLE_HEADER_HEIGHT;

function unwrapPage(raw: unknown): { records: unknown[]; total: number; pages?: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? nested.rows ?? data.records ?? data.list ?? raw) as unknown;
  return {
    records: Array.isArray(records) ? records : [],
    total: Number(nested.total ?? data.total ?? (Array.isArray(records) ? records.length : 0)),
    pages: Number(nested.pages ?? data.pages ?? 0) || undefined,
  };
}

function normalizeDeviceRecord(raw: Record<string, unknown>): DeviceSelectRecord {
  const productInfo = (raw.productInfo ?? raw.product ?? {}) as Record<string, unknown>;
  const area = (raw.area ?? {}) as Record<string, unknown>;
  const department = (raw.department ?? raw.maintainDepartment ?? {}) as Record<string, unknown>;
  const category = (productInfo.productCategory ?? raw.productCategory ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    id: (raw.id ?? raw.deviceId ?? raw.code) as string | number,
    deviceId: (raw.deviceId ?? raw.id ?? raw.code) as string | number,
    code: String(raw.code ?? raw.deviceCode ?? ""),
    name: String(raw.name ?? raw.deviceName ?? ""),
    category: String(category.name ?? raw.category ?? raw.deviceProdCategoryName ?? ""),
    product: String(productInfo.name ?? raw.productName ?? raw.deviceProdName ?? ""),
    brand: String(productInfo.brandName ?? raw.brandName ?? ""),
    region: String(area.pathName ?? area.name ?? raw.areaName ?? ""),
    area: {
      id: String(area.id ?? raw.areaId ?? ""),
      name: String(area.name ?? raw.areaName ?? ""),
      pathName: String(area.pathName ?? area.name ?? raw.areaName ?? ""),
    },
    department: {
      name: String(department.name ?? raw.departmentName ?? ""),
    },
    productInfo: {
      id: (productInfo.id ?? raw.deviceProdId ?? "") as string | number,
      name: String(productInfo.name ?? raw.deviceProdName ?? ""),
      brandCode: String(productInfo.brandCode ?? raw.brandCode ?? ""),
      brandName: String(productInfo.brandName ?? raw.brandName ?? ""),
      productCategory: {
        code: String(category.code ?? raw.deviceProdCategoryCode ?? ""),
        name: String(category.name ?? raw.deviceProdCategoryName ?? ""),
        pathCode: String(category.pathCode ?? raw.deviceProdCategoryCodeConcat ?? ""),
      },
    },
  };
}

export const DeviceSelectModal = defineComponent({
  name: "DeviceSelectModal",
  props: {
    visible: { type: Boolean, default: undefined },
    title: { type: String, default: "选择设备" },
    width: { type: String, default: "1280px" },
    multiple: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    selectedDevices: { type: Array as PropType<DeviceSelectRecord[]>, default: () => [] },
    pageSize: { type: Number, default: 10 },
    queryParams: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    filterFields: {
      type: Array as PropType<DeviceSelectModalFilterField[]>,
      default: () => ["productId", "categoryCode", "areaId", "departmentId", "tagCodes", "keyword"],
    },
    submit: { type: Function, default: undefined },
    requireSelection: { type: Boolean, default: false },
    footerTip: { type: String, default: "" },
    confirmText: { type: String, default: "确定" },
    cancelText: { type: String, default: "取消" },
  },
  emits: ["update:visible", "selectionChange", "closed", "confirm"],
  setup(props, { emit, expose }) {
    const open = shallowRef(false);
    const confirmLoading = shallowRef(false);
    const page = reactive({ pageNumber: 1, pageSize: props.pageSize ?? 10, total: 0 });
    const selectedDevices = shallowRef<DeviceSelectRecord[]>([]);
    const selectedRecordMap = shallowRef(new Map<string, DeviceSelectRecord>());
    const tableRegionRef = shallowRef<HTMLDivElement | null>(null);
    let tableResizeObserver: ResizeObserver | undefined;

    const searchFormSchema = {
      productId: {
        component: ProductSelect,
        label: "所属产品",
        fieldName: "productId",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "所属产品" },
      },
      categoryCode: {
        component: IotProductCategoryTreeSelect,
        label: "产品品类",
        fieldName: "categoryCode",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "产品品类" },
      },
      brandName: {
        component: "Input",
        label: "设备品牌",
        fieldName: "brandName",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "设备品牌" },
      },
      areaId: {
        component: AreaTreeSelect,
        label: "所在区域",
        fieldName: "areaId",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "所在区域" },
      },
      departmentId: {
        component: DeptCascaderSelect,
        label: "维护部门",
        fieldName: "departmentId",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "维护部门" },
      },
      tagCodes: {
        component: DeviceTagSelect,
        label: "设备标签",
        fieldName: "tagCodes",
        defaultValue: [],
        componentProps: { allowClear: true, placeholder: "设备标签", multiple: true, maxTagCount: 3 },
      },
      keyword: {
        component: "Input",
        label: "设备名称",
        fieldName: "keyword",
        defaultValue: "",
        componentProps: { allowClear: true, placeholder: "设备名称" },
      },
    };

    const syncSelection = (devices: DeviceSelectRecord[]): void => {
      selectedDevices.value = [...devices];
      selectedRecordMap.value = new Map(devices.map((device) => [String(device.id), device]));
      tableApi.setSelectedRowKeys(devices.map((device) => device.id as string | number));
    };

    const [SearchForm, formApi] = usePcForm({
      layout: "horizontal",
      showCollapseButton: true,
      collapsedVisibleCount: 2,
      schema: props.filterFields.map((field) => searchFormSchema[field]),
      handleSubmit: () => {
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        page.pageNumber = 1;
        tableApi.query();
      },
      handleValuesChange: (values, changedValues) => {
        const changedField = changedValues ? Object.keys(changedValues)[0] : undefined;
        const schema = props.filterFields.map((field) => searchFormSchema[field]).find((item) => item.fieldName === changedField);
        const isInput = schema?.component === "Input";
        if (changedField && !isInput) {
          page.pageNumber = 1;
          tableApi.query();
        }
      },
    });

    const columns = [
      {
        title: "设备编号",
        dataIndex: "code",
        width: 150,
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text?: string }) => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "设备名称",
        dataIndex: "name",
        width: 150,
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text?: string }) => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "所属产品",
        dataIndex: "productInfo",
        width: 150,
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: DeviceSelectRecord }) => {
          const text = displayText(record.productInfo?.name);
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "产品品类",
        dataIndex: "category",
        width: 150,
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: DeviceSelectRecord }) => {
          const text = displayText(record.productInfo?.productCategory?.name);
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "维护部门",
        dataIndex: "department",
        width: 120,
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: DeviceSelectRecord }) => {
          const text = displayText(record.department?.name);
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
      {
        title: "所在区域",
        dataIndex: "area",
        width: 150,
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: DeviceSelectRecord }) => {
          const text = displayText(record.area?.pathName || record.area?.name);
          return <PopOver content={text}>{text}</PopOver>;
        },
      },
    ];

    const [DeviceTable, tableApi] = usePcTable({
      autoFetch: false,
      columns,
      tableCode: "device-select-table",
      rowKey: "id",
      rowSelection: props.multiple ? "checkbox" : "radio",
      fetchApi: async () => {
        const query: DeviceSelectQuery = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: String(formApi.formValues.keyword ?? ""),
          tagCodes: (formApi.formValues.tagCodes as string[]) ?? [],
          departmentId: String(formApi.formValues.departmentId ?? ""),
          areaId: String(formApi.formValues.areaId ?? ""),
          productId: String(formApi.formValues.productId ?? ""),
          categoryCode: String(formApi.formValues.categoryCode ?? ""),
          brandName: String(formApi.formValues.brandName ?? ""),
        };
        const client = await getDeviceCenterClient();
        const pageData = unwrapPage(
          await client.getIotDeviceList({
            ...props.queryParams,
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: query.keyword,
            tagCodes: query.tagCodes,
            anyMatchedDepartmentId: query.departmentId,
            anyMatchedAreaId: query.areaId,
            productId: query.productId,
            categoryCode: query.categoryCode,
            brandName: query.brandName,
          }),
        );
        return {
          records: pageData.records.map((row) => normalizeDeviceRecord(row as Record<string, unknown>)),
          total: pageData.total,
          pages: pageData.pages ?? 0,
        };
      },
      fetchLoaded: (data) => {
        page.total = data.total;
        void nextTick().then(updateTableHeight);
      },
      getCheckboxProps: () => ({ disabled: Boolean(props.disabled) }),
      rowSelectionChange: (keys, rows) => {
        const nextRecordMap = new Map(selectedRecordMap.value);
        (rows as DeviceSelectRecord[]).forEach((record) => nextRecordMap.set(String(record.id), record));
        selectedRecordMap.value = nextRecordMap;
        const nextDevices = keys
          .map((key) => nextRecordMap.get(String(key)))
          .filter((record): record is DeviceSelectRecord => Boolean(record));
        selectedDevices.value = props.multiple ? nextDevices : nextDevices.slice(0, 1);
        emit("selectionChange", [...selectedDevices.value]);
      },
    });

    const updateTableHeight = (): void => {
      const pageSize = page.pageSize || props.pageSize || 10;
      tableApi.setState({ scrollY: resolveTableBodyHeight(pageSize) });
    };

    const observeTableRegion = (): void => {
      tableResizeObserver?.disconnect();
      if (!tableRegionRef.value) return;
      tableResizeObserver = new ResizeObserver(updateTableHeight);
      tableResizeObserver.observe(tableRegionRef.value);
      updateTableHeight();
    };

    watch(
      () => formApi.state.isCollapsed,
      () => {
        void nextTick().then(updateTableHeight);
      },
    );

    const closeModal = (): void => {
      open.value = false;
      tableResizeObserver?.disconnect();
      emit("update:visible", false);
      emit("closed");
    };

    const openModal = (initialDevices: DeviceSelectRecord[] = props.selectedDevices ?? []): void => {
      page.pageNumber = 1;
      page.pageSize = props.pageSize ?? 10;
      syncSelection(initialDevices);
      open.value = true;
      emit("update:visible", true);
      void nextTick().then(() => {
        observeTableRegion();
        tableApi.query();
      });
    };

    const confirmSelection = async (): Promise<void> => {
      if (props.requireSelection && selectedDevices.value.length === 0) {
        message.warning("请至少选择一个设备");
        return;
      }
      confirmLoading.value = true;
      try {
        const result = await props.submit?.([...selectedDevices.value]);
        if (result === false) return;
        emit("confirm", [...selectedDevices.value]);
        closeModal();
      } finally {
        confirmLoading.value = false;
      }
    };

    const changePage = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      void nextTick().then(updateTableHeight);
      tableApi.query();
    };

    expose({ openModal, closeModal });

    watch(
      () => props.visible,
      (visible) => {
        if (visible === undefined) return;
        if (visible) openModal();
        else if (open.value) closeModal();
      },
      { immediate: true },
    );

    watch(
      () => props.selectedDevices,
      (devices) => {
        if (open.value) syncSelection(devices ?? []);
      },
    );

    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={props.width}
        centered={false}
        destroyOnClose
        maskClosable={false}
        footer={null}
        wrapClassName={`fire-device-select-modal ${styles["device-select-modal"]}`}
        onCancel={closeModal}
      >
        <div class={styles["device-select-content"]}>
          <div class={styles["device-select-form"]}>
            <SearchForm />
          </div>
          <div
            ref={tableRegionRef}
            class={styles["device-select-table"]}
            style={{ minHeight: `${resolveTableRegionMinHeight(page.pageSize || props.pageSize || 10)}px` }}
          >
            <DeviceTable />
          </div>
          <div class={styles["device-select-pagination"]}>
            <span class={styles["device-select-summary"]}>已选 {selectedDevices.value.length} 项</span>
            <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} syncToUrl={false} onPageChange={changePage} />
          </div>
          <div class={styles["device-select-footer"]}>
            {props.footerTip ? <span class={styles["device-select-footer-tip"]}>{props.footerTip}</span> : null}
            <Button onClick={closeModal}>{props.cancelText}</Button>
            <Button type="primary" loading={confirmLoading.value} onClick={() => void confirmSelection()}>
              {props.confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    );
  },
});
