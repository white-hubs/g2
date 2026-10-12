import type { SuppliesVO } from "@g2-contract/emergency-supplies";
import type { MapPickerResult } from "@g2-platform/pc-map";
import type { FormExpose } from "@g2-platform/pc-ui";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { PhotoUpload, type UploadedFile } from "@/components/photo-upload";
import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getEmergencySuppliesClient, statusLabel } from "@/shared";
import { downloadBlob } from "@/utils/download";

import styles from "./supplies-list.module.less";

const {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Page,
  PopConfirm,
  SearchOutlined,
  Select,
  Textarea,
  message,
  PageLayout,
  usePcTable,
} = getEmergencySuppliesPcUi();

type MapPickerModalComponent = (typeof import("@g2-platform/pc-map"))["MapPickerModal"];
const MapPickerModal = defineAsyncRuntimeCommonComponent<MapPickerModalComponent>(loadRuntimeCommon, "pcMap", "index", "MapPickerModal");

type Option = { label: string; value: string };
type ModalMode = "create" | "view" | "edit";
const EMERGENCY_SUPPLIES_PHOTO_SCENE_CODE = "EMERGENCY_SUPPLIES_PHOTO";

type SuppliesFormState = {
  id?: string;
  code: string;
  name: string;
  type?: string;
  specification: string;
  unit?: string;
  photoFileId: string;
  photoFiles: UploadedFile[];
  quantity?: number;
  safetyStockMin?: number;
  warehouseId?: string;
  locationDesc: string;
  longitude?: number;
  latitude?: number;
  productionDate: string;
  expiryDate: string;
  supplier: string;
  supplierContact: string;
  remark: string;
};

const unitOptions: Option[] = [
  { label: "个", value: "个" },
  { label: "件", value: "件" },
  { label: "套", value: "套" },
  { label: "箱", value: "箱" },
  { label: "包", value: "包" },
  { label: "米", value: "米" },
  { label: "吨", value: "吨" },
  { label: "瓶", value: "瓶" },
];

const createInitialForm = (): SuppliesFormState => ({
  id: undefined,
  code: "",
  name: "",
  type: undefined,
  specification: "",
  unit: undefined,
  photoFileId: "",
  photoFiles: [],
  quantity: undefined,
  safetyStockMin: undefined,
  warehouseId: undefined,
  locationDesc: "",
  longitude: undefined,
  latitude: undefined,
  productionDate: "",
  expiryDate: "",
  supplier: "",
  supplierContact: "",
  remark: "",
});

const normalizeNumber = (value?: number | string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const formatCoordinateValue = (longitude?: number | string, latitude?: number | string): string => {
  const lng = normalizeNumber(longitude);
  const lat = normalizeNumber(latitude);
  if (lng === undefined || lat === undefined) return "";
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
};

const statusClass = (status?: string): string[] => [
  styles.statusTag,
  status === "ENABLED" ? styles.statusEnabled : status === "DISABLED" || status === "SCRAPPED" ? styles.statusDisabled : "",
];

export const SuppliesList = defineComponent({
  name: "SuppliesList",
  setup: () => {
    const query = reactive({
      keyword: "",
      status: undefined as string | undefined,
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const modalVisible = ref(false);
    const modalMode = ref<ModalMode>("create");
    const submitLoading = ref(false);
    const importInputRef = ref<HTMLInputElement>();
    const formRef = ref<FormExpose>();
    const typeOptions = ref<Option[]>([]);
    const warehouseOptions = ref<Option[]>([]);
    const formState = reactive<SuppliesFormState>(createInitialForm());
    const mapVisible = ref(false);
    const readonly = computed(() => modalMode.value === "view");
    const modalTitle = computed(() => (modalMode.value === "create" ? "新增物资" : modalMode.value === "edit" ? "编辑物资" : "查看物资"));
    const coordinateText = computed(() => formatCoordinateValue(formState.longitude, formState.latitude));

    const loadOptions = async (): Promise<void> => {
      const [types, warehouses] = await Promise.all([
        getEmergencySuppliesClient().getSuppliesTypePage({
          pageNumber: 1,
          pageSize: 200,
          status: true,
        }),
        getEmergencySuppliesClient().getWarehousePage({
          pageNumber: 1,
          pageSize: 200,
          status: true,
        }),
      ]);
      typeOptions.value = types.records.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      warehouseOptions.value = warehouses.records.map((item) => ({
        label: item.name,
        value: item.id,
      }));
    };

    const resetForm = (): void => {
      Object.assign(formState, createInitialForm());
      formRef.value?.clearValidate();
    };

    const fillForm = (detail: SuppliesVO): void => {
      Object.assign(formState, {
        id: detail.id,
        code: detail.code ?? "",
        name: detail.name ?? "",
        type: detail.type ? String(detail.type) : undefined,
        specification: detail.specification ?? "",
        unit: detail.unit ?? undefined,
        photoFileId: detail.photoFileId ?? "",
        photoFiles: detail.photoFileId ? [{ id: detail.photoFileId } as UploadedFile] : [],
        quantity: detail.quantity ?? detail.totalQuantity,
        safetyStockMin: detail.safetyStockMin,
        warehouseId: detail.warehouseId ? String(detail.warehouseId) : undefined,
        locationDesc: detail.locationDesc ?? "",
        longitude: detail.longitude,
        latitude: detail.latitude,
        productionDate: detail.productionDate ?? "",
        expiryDate: detail.expiryDate ?? detail.earliestExpiryDate ?? "",
        supplier: detail.supplier ?? "",
        supplierContact: detail.supplierContact ?? "",
        remark: detail.remark ?? "",
      });
    };

    const openCreateModal = async (): Promise<void> => {
      resetForm();
      modalMode.value = "create";
      modalVisible.value = true;
      if (!typeOptions.value.length || !warehouseOptions.value.length) await loadOptions();
    };

    const openDetailModal = async (id: string, mode: ModalMode): Promise<void> => {
      resetForm();
      modalMode.value = mode;
      modalVisible.value = true;
      if (!typeOptions.value.length || !warehouseOptions.value.length) await loadOptions();
      try {
        fillForm(await getEmergencySuppliesClient().getSuppliesDetail(id));
      } catch (error) {
        modalVisible.value = false;
        message.error((error as Error)?.message ?? "物资详情加载失败");
      }
    };

    const openMapModal = (): void => {
      if (!readonly.value) {
        mapVisible.value = true;
      }
    };

    const selectMapPoint = (data: MapPickerResult): void => {
      formState.longitude = data.lng;
      formState.latitude = data.lat;
      formState.locationDesc = data.address;
    };

    const assertForm = (): void => {
      if (!formState.name) throw new Error("请输入物资名称");
      if (!formState.type) throw new Error("请选择类别");
      if (!formState.specification) throw new Error("请输入规格");
      if (!formState.unit) throw new Error("请选择单位");
      if (formState.quantity === undefined) throw new Error("请输入库存数量");
      if (!formState.warehouseId) throw new Error("请选择仓库");
      if (!formState.expiryDate) throw new Error("请选择有效期至");
    };

    const submitSupplies = async (): Promise<void> => {
      if (readonly.value) {
        modalVisible.value = false;
        return;
      }
      await formRef.value?.validate();
      try {
        assertForm();
      } catch (error) {
        message.warning((error as Error).message);
        return;
      }
      submitLoading.value = true;
      try {
        const photoFileId = formState.photoFiles[0]?.id ?? formState.photoFileId;
        const payload: Partial<SuppliesVO> = {
          code: formState.code || undefined,
          name: formState.name,
          type: formState.type,
          specification: formState.specification,
          unit: formState.unit,
          photoFileId: photoFileId || undefined,
          quantity: Number(formState.quantity),
          safetyStockMin: normalizeNumber(formState.safetyStockMin),
          warehouseId: formState.warehouseId,
          locationDesc: formState.locationDesc,
          longitude: normalizeNumber(formState.longitude),
          latitude: normalizeNumber(formState.latitude),
          productionDate: formState.productionDate || undefined,
          expiryDate: formState.expiryDate || undefined,
          supplier: formState.supplier,
          supplierContact: formState.supplierContact,
          remark: formState.remark,
        };
        if (modalMode.value === "create") {
          await getEmergencySuppliesClient().createSupplies({ ...payload, status: "ENABLED" });
        } else if (formState.id) {
          await getEmergencySuppliesClient().updateSupplies(formState.id, payload);
        }
        message.success("操作成功");
        modalVisible.value = false;
        tableApi.query();
      } finally {
        submitLoading.value = false;
      }
    };

    const changeStatus = async (id: string, status: string): Promise<void> => {
      await getEmergencySuppliesClient().changeSuppliesStatus(id, status);
      message.success("操作成功");
      tableApi.query();
    };

    const exportLedger = async (): Promise<void> => {
      const blob = await getEmergencySuppliesClient().exportSuppliesLedger(query);
      downloadBlob(blob, "应急物资台账.xlsx");
    };

    const downloadTemplate = async (): Promise<void> => {
      const blob = await getEmergencySuppliesClient().downloadSuppliesImportTemplate();
      downloadBlob(blob, "应急物资导入模板.xlsx");
    };

    const importLedger = async (event: Event): Promise<void> => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await getEmergencySuppliesClient().importSuppliesLedger(file);
        message.success("导入成功");
        tableApi.query();
      } catch (error) {
        message.error((error as Error)?.message ?? "导入失败");
      } finally {
        input.value = "";
      }
    };

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "EMERGENCY_SUPPLIES_LEDGER",
      columns: [
        { title: "物资编码", dataIndex: "code", width: 170 },
        { title: "物资名称", dataIndex: "name", width: 150 },
        { title: "类别", dataIndex: "typeName", width: 120 },
        { title: "规格", dataIndex: "specification", ellipsis: true },
        {
          title: "库存",
          dataIndex: "quantity",
          width: 110,
          customRender: ({ record }: { record: SuppliesVO }) => `${record.quantity ?? record.totalQuantity ?? 0} ${record.unit ?? ""}`,
        },
        {
          title: "安全库存下限",
          dataIndex: "safetyStockMin",
          width: 120,
          customRender: ({ record }: { record: SuppliesVO }) => (record.safetyStockMin != null ? String(record.safetyStockMin) : "--"),
        },
        { title: "单位", dataIndex: "unit", width: 80 },
        {
          title: "有效期至",
          dataIndex: "expiryDate",
          width: 130,
          customRender: ({ record }: { record: SuppliesVO }) => (
            <span
              class={[
                styles.statusTag,
                record.expiryWarningLevel === "RED" || record.expiryWarningLevel === "EXPIRED"
                  ? styles.statusDanger
                  : record.expiryWarningLevel === "ORANGE" || record.expiryWarningLevel === "YELLOW"
                    ? styles.statusWarn
                    : styles.statusEnabled,
              ]}
            >
              {record.expiryDate || record.earliestExpiryDate || "无库存"}
            </span>
          ),
        },
        {
          title: "仓库",
          dataIndex: "warehouseName",
          width: 180,
          ellipsis: true,
          customRender: ({ record }: { record: SuppliesVO }) => record.warehouseName ?? "--",
        },
        {
          title: "状态",
          dataIndex: "status",
          width: 100,
          customRender: ({ text }: { text?: string }) => <span class={statusClass(text)}>{statusLabel(text)}</span>,
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 220,
          fixed: "right",
          customRender: ({ record }: { record: SuppliesVO }) => (
            <>
              <Button type="link" size="small" onClick={() => openDetailModal(record.id, "view")}>
                查看
              </Button>
              <Button type="link" size="small" onClick={() => openDetailModal(record.id, "edit")}>
                编辑
              </Button>
              {record.status !== "SCRAPPED" &&
                (record.status === "ENABLED" ? (
                  <Button type="link" size="small" danger onClick={() => changeStatus(record.id, "DISABLED")}>
                    停用
                  </Button>
                ) : (
                  <Button type="link" size="small" onClick={() => changeStatus(record.id, "ENABLED")}>
                    启用
                  </Button>
                ))}
              {record.status !== "SCRAPPED" && (
                <PopConfirm title="确认报废该物资？" okText="确定" cancelText="取消" onConfirm={() => changeStatus(record.id, "SCRAPPED")}>
                  <Button type="link" size="small" danger>
                    报废
                  </Button>
                </PopConfirm>
              )}
            </>
          ),
        },
      ],
      fetchApi: async () =>
        getEmergencySuppliesClient().getSuppliesPage({
          ...query,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const search = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    onMounted(loadOptions);

    const slots = {
      "layout-header": () => (
        <div class={styles.headerActions}>
          <Button type="primary" onClick={openCreateModal}>
            新增物资
          </Button>
          <Button onClick={downloadTemplate}>下载模板</Button>
          <Button onClick={() => importInputRef.value?.click()}>导入</Button>
          <Button onClick={exportLedger}>导出</Button>
          <input ref={importInputRef} type="file" accept=".xlsx,.xls" class={styles.hiddenFileInput} onChange={importLedger} />
        </div>
      ),
      "layout-content": () => (
        <div class={styles.page}>
          <div class={styles.toolbar}>
            <div class={styles.filterItem}>
              <span class={styles.filterLabel}>关键字：</span>
              <Input
                class={styles.keyword}
                v-model:value={query.keyword}
                prefix={<SearchOutlined />}
                placeholder="物资名称/编码"
                allowClear
                onPressEnter={search}
              />
            </div>
            <Select
              class={styles.statusSelect}
              style={{ width: "120px" }}
              v-model:value={query.status}
              allowClear
              placeholder="全部状态"
              options={[
                { label: "启用", value: "ENABLED" },
                { label: "禁用", value: "DISABLED" },
                { label: "报废", value: "SCRAPPED" },
              ]}
              onChange={search}
            />
            <Button type="primary" onClick={search}>
              查询
            </Button>
            <Button
              onClick={() => {
                query.keyword = "";
                query.status = undefined;
                search();
              }}
            >
              重置
            </Button>
          </div>
          <PcTable />
          <Modal
            v-model:open={modalVisible.value}
            title={modalTitle.value}
            width="820px"
            destroyOnClose
            confirmLoading={submitLoading.value}
            okText={readonly.value ? "关闭" : "确定"}
            cancelText="取消"
            onOk={submitSupplies}
            onCancel={() => {
              modalVisible.value = false;
            }}
          >
            <Form ref={formRef} model={formState} labelCol={{ span: 24 }} wrapperCol={{ span: 24 }} class={styles.suppliesForm}>
              <div class={styles.formGrid}>
                <FormItem label="物资名称" required>
                  <Input v-model:value={formState.name} disabled={readonly.value} placeholder="请输入物资名称" maxlength={80} />
                </FormItem>
                <FormItem label="类别" required>
                  <Select v-model:value={formState.type} disabled={readonly.value} placeholder="请选择类别" options={typeOptions.value} />
                </FormItem>
                <FormItem label="物资编码">
                  <Input
                    v-model:value={formState.code}
                    disabled={readonly.value || modalMode.value === "edit"}
                    placeholder="不填则自动生成"
                    maxlength={64}
                  />
                </FormItem>
                <FormItem label="单位" required>
                  <Select v-model:value={formState.unit} disabled={readonly.value} placeholder="请选择单位" options={unitOptions} />
                </FormItem>
                <FormItem label="规格" required>
                  <Input v-model:value={formState.specification} disabled={readonly.value} placeholder="如：MFZ/ABC4 4kg" maxlength={80} />
                </FormItem>
                <FormItem label="库存数量" required>
                  <InputNumber
                    style={{ width: "100%" }}
                    v-model:value={formState.quantity}
                    disabled={readonly.value}
                    min={0}
                    placeholder="请输入库存数量"
                  />
                </FormItem>
                <FormItem label="安全库存下限">
                  <InputNumber
                    style={{ width: "100%" }}
                    v-model:value={formState.safetyStockMin}
                    disabled={readonly.value}
                    min={0}
                    precision={2}
                    placeholder="低于该值触发库存预警"
                  />
                </FormItem>
                <FormItem label="仓库" required>
                  <Select
                    v-model:value={formState.warehouseId}
                    disabled={readonly.value}
                    placeholder="请选择仓库"
                    options={warehouseOptions.value}
                  />
                </FormItem>
                <FormItem label="经纬度坐标">
                  <div class={styles.coordinateField}>
                    <Input value={coordinateText.value} placeholder="如：104.0657,30.6598" readonly showCount={false} />
                    <Button type="primary" disabled={readonly.value} onClick={openMapModal}>
                      选点
                    </Button>
                  </div>
                </FormItem>
                <FormItem label="位置描述">
                  <Input
                    v-model:value={formState.locationDesc}
                    disabled={readonly.value}
                    placeholder="如：A区-3号货架-2层"
                    maxlength={160}
                  />
                </FormItem>
                <FormItem label="有效期至" required>
                  <DatePicker
                    v-model:value={formState.expiryDate}
                    disabled={readonly.value}
                    valueFormat="YYYY-MM-DD"
                    format="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </FormItem>
                <FormItem label="生产日期">
                  <DatePicker
                    v-model:value={formState.productionDate}
                    disabled={readonly.value}
                    valueFormat="YYYY-MM-DD"
                    format="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </FormItem>
                <FormItem label="供应商">
                  <Input v-model:value={formState.supplier} disabled={readonly.value} placeholder="请输入供应商名称" maxlength={80} />
                </FormItem>
                <FormItem label="供应商联系方式">
                  <Input
                    v-model:value={formState.supplierContact}
                    disabled={readonly.value}
                    placeholder="如：025-85861234"
                    maxlength={40}
                  />
                </FormItem>
                <FormItem label="照片上传">
                  <PhotoUpload
                    readonly={readonly.value}
                    sceneCode={EMERGENCY_SUPPLIES_PHOTO_SCENE_CODE}
                    v-model:value={formState.photoFiles}
                    maxCount={1}
                  />
                </FormItem>
              </div>
              <FormItem label="备注">
                <Textarea
                  v-model:value={formState.remark}
                  disabled={readonly.value}
                  placeholder="请输入备注信息"
                  maxlength={200}
                  rows={3}
                />
              </FormItem>
            </Form>
          </Modal>
          <MapPickerModal
            v-model:open={mapVisible.value}
            title="选择物资位置"
            address={formState.locationDesc}
            center={
              formState.longitude !== undefined && formState.latitude !== undefined
                ? { lng: Number(formState.longitude), lat: Number(formState.latitude) }
                : undefined
            }
            onConfirm={selectMapPoint}
          />
        </div>
      ),
      "footer-page": () => (
        <Page
          cachePageQuery={false}
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(n, s) => {
            page.pageNumber = n;
            page.pageSize = s;
            tableApi.query();
          }}
        />
      ),
    };
    return () => <PageLayout title="物资台账" v-slots={slots} />;
  },
});
