import type {
  WarehouseSafetyAreaTreeNode,
  WarehouseSafetyForkliftParam,
  WarehouseSafetyShelfParam,
  WarehouseSafetyWarehouse,
  WarehouseSafetyWarehouseParam,
} from "@g2-contract/warehouse-safety";
import { computed, defineComponent, nextTick, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AreaTreeSelect, CubeLayout, DeviceModalTable, UserSelectModal } from "@/compat/legacy-components";
import { Button, DatePicker, Form, FormItem, Input, InputNumber, Modal, Page, Select, Table, message } from "@/pc-ui-runtime";
import { warehouseSafetyApi } from "@/services/warehouse-safety-api";

import styles from "./resource-form.module.less";

type FormType = "warehouse" | "shelf" | "forklift";
const BASE = "/d/warehouse-safety";
type FormMode = "edit" | "detail";
type DevicePickerMode = "forkliftDevice" | "camera";
type SelectOption = { id: string; name: string };
type UserSelectExpose = { openModal: (keys?: string[]) => void };
type UserSelectItem = { id: string; name: string };
type DeviceSelectExpose = { openModal: () => void };
type DeviceSelectItem = { id: string; name?: string; deviceName?: string; code?: string; deviceId?: string };

const FORKLIFT_TYPE_OPTIONS = [
  { code: "ELECTRIC_FORKLIFT", name: "电动叉车" },
  { code: "MANUAL_FORKLIFT", name: "手动叉车" },
  { code: "STACKER", name: "堆高车" },
];

const FORKLIFT_TYPE_TEXT: Record<string, string> = Object.fromEntries(FORKLIFT_TYPE_OPTIONS.map((item) => [item.code, item.name]));

const ZONE_TYPE_OPTIONS = [
  { code: "SHELF_STORAGE", name: "货架存储区" },
  { code: "STACKING", name: "堆垛作业区" },
  { code: "FORKLIFT_CHANNEL", name: "叉车通道" },
  { code: "LOADING_DOCK", name: "装卸口" },
  { code: "FIRE_PASSAGE", name: "消防通道" },
];

const ZONE_TYPE_TEXT: Record<string, string> = Object.fromEntries(ZONE_TYPE_OPTIONS.map((item) => [item.code, item.name]));

export const ResourceFormPage = defineComponent({
  name: "ResourceFormPage",
  props: {
    type: { type: String as () => FormType, required: true },
    mode: { type: String as () => FormMode, default: "edit" },
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const id = computed(() => String(route.params.id ?? ""));
    const isDetail = computed(() => props.mode === "detail");
    const isEdit = computed(() => Boolean(id.value) && !isDetail.value);
    const saving = ref(false);
    const pickerMode = ref<DevicePickerMode>("forkliftDevice");
    const deviceDraft = ref<SelectOption[]>([]);
    const cameraDraft = ref<SelectOption[]>([]);
    const userSelectModalRef = ref<UserSelectExpose>();
    const deviceSelectModalRef = ref<DeviceSelectExpose>();
    const warehousePickerVisible = ref(false);
    const warehouseLoading = ref(false);
    const warehouseRows = ref<WarehouseSafetyWarehouse[]>([]);
    const warehouseKeyword = ref("");
    const warehousePageNumber = ref(1);
    const warehousePageSize = ref(10);
    const warehouseTotal = ref(0);
    const warehouseDraft = ref<WarehouseSafetyWarehouse | null>(null);
    const areaTree = ref<WarehouseSafetyAreaTreeNode[]>([]);

    const form = reactive<Record<string, unknown>>({
      status: "ACTIVE",
      capacityUnit: "㎡",
      loadCapacityUnit: "T",
      cameraDeviceIds: [],
      cameraDeviceNames: [],
    });

    const title = computed(() => {
      const name = props.type === "warehouse" ? "仓库" : props.type === "shelf" ? "区域" : "叉车";
      return `${isDetail.value ? "" : isEdit.value ? "编辑" : "新增"}${name}${isDetail.value ? "详情" : ""}`;
    });

    const back = (): void => {
      void router.push(`${BASE}/${props.type === "warehouse" ? "warehouses" : props.type === "shelf" ? "shelves" : "forklifts"}`);
    };

    const loadDetail = async (): Promise<void> => {
      if (!isEdit.value) {
        if (!id.value) {
          return;
        }
      }
      if (id.value) {
        const detail =
          props.type === "warehouse"
            ? await warehouseSafetyApi.getWarehouse(id.value)
            : props.type === "shelf"
              ? await warehouseSafetyApi.getShelf(id.value)
              : await warehouseSafetyApi.getForklift(id.value);
        Object.assign(form, detail);
        if ("cameraDeviceIds" in detail && Array.isArray(detail.cameraDeviceIds)) {
          form.cameraDeviceIds = [...detail.cameraDeviceIds];
        }
        if ("cameraDeviceNames" in detail && Array.isArray(detail.cameraDeviceNames)) {
          form.cameraDeviceNames = [...detail.cameraDeviceNames];
        }
        return;
      }
    };

    const loadWarehouses = async (): Promise<void> => {
      if (props.type !== "shelf") {
        return;
      }
      warehouseLoading.value = true;
      try {
        const result = await warehouseSafetyApi.pageWarehouses({
          pageNumber: warehousePageNumber.value,
          pageSize: warehousePageSize.value,
          keyword: warehouseKeyword.value.trim() || undefined,
          status: "ACTIVE",
        });
        warehouseRows.value = result.records ?? [];
        warehouseTotal.value = result.total ?? 0;
      } finally {
        warehouseLoading.value = false;
      }
    };

    const loadAreaTree = async (): Promise<void> => {
      if (props.type !== "forklift") {
        return;
      }
      areaTree.value = await warehouseSafetyApi.getAreaTree();
    };

    const findAreaName = (nodes: WarehouseSafetyAreaTreeNode[], areaId: string): string => {
      for (const node of nodes) {
        if (String(node.id) === areaId) {
          return node.name ?? "";
        }
        const childName = findAreaName(node.children ?? [], areaId);
        if (childName) {
          return childName;
        }
      }
      return "";
    };

    const syncAreaName = (value?: unknown): void => {
      const areaId = String(value ?? form.areaId ?? "");
      if (!areaId) {
        form.areaName = "";
        return;
      }
      form.areaName = findAreaName(areaTree.value, areaId) || form.areaName || "";
    };

    const requireValue = (key: string, label: string, action = "填写"): boolean => {
      if (form[key] === null || form[key] === undefined || form[key] === "") {
        message.warning(`请${action}${label}`);
        return false;
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (props.type === "warehouse") {
        if (
          !requireValue("code", "仓库编号") ||
          !requireValue("name", "仓库名称") ||
          !requireValue("address", "地址") ||
          !requireValue("capacity", "面积") ||
          !requireValue("managerUserId", "责任人", "选择")
        ) {
          return;
        }
      } else if (props.type === "shelf") {
        if (
          !requireValue("name", "区域名称") ||
          !requireValue("zoneType", "区域类型") ||
          !requireValue("warehouseId", "关联仓库") ||
          !requireValue("length", "长度") ||
          !requireValue("width", "宽度")
        ) {
          return;
        }
      } else {
        syncAreaName();
        if (
          !requireValue("code", "叉车编号") ||
          !requireValue("name", "叉车名称") ||
          !requireValue("forkliftType", "叉车类型") ||
          !requireValue("areaId", "所属区域") ||
          !requireValue("areaName", "所属区域名称") ||
          !requireValue("deviceId", "物联中心设备")
        ) {
          return;
        }
      }
      saving.value = true;
      try {
        if (props.type === "warehouse") {
          const payload: WarehouseSafetyWarehouseParam = { ...form, code: String(form.code), name: String(form.name) };
          if (isEdit.value) {
            await warehouseSafetyApi.updateWarehouse(id.value, payload);
          } else {
            await warehouseSafetyApi.createWarehouse(payload);
          }
        } else if (props.type === "shelf") {
          const payload: WarehouseSafetyShelfParam = { ...form, name: String(form.name) };
          if (isEdit.value) {
            await warehouseSafetyApi.updateShelf(id.value, payload);
          } else {
            await warehouseSafetyApi.createShelf(payload);
          }
        } else {
          const payload: WarehouseSafetyForkliftParam = { ...form, code: String(form.code), name: String(form.name) };
          if (isEdit.value) {
            await warehouseSafetyApi.updateForklift(id.value, payload);
          } else {
            await warehouseSafetyApi.createForklift(payload);
          }
        }
        message.success("保存成功");
        back();
      } finally {
        saving.value = false;
      }
    };

    const openDevicePicker = (mode: DevicePickerMode): void => {
      if (isDetail.value) {
        return;
      }
      pickerMode.value = mode;
      if (mode === "forkliftDevice") {
        deviceDraft.value = form.deviceId ? [{ id: String(form.deviceId), name: String(form.deviceName || form.deviceId) }] : [];
      } else {
        const ids = Array.isArray(form.cameraDeviceIds) ? form.cameraDeviceIds.map(String) : [];
        const names = Array.isArray(form.cameraDeviceNames) ? form.cameraDeviceNames.map(String) : [];
        cameraDraft.value = ids.map((item, index) => ({ id: item, name: names[index] ?? item }));
      }
      void nextTick(() => {
        deviceSelectModalRef.value?.openModal();
      });
    };

    const handleDeviceSelect = (values: DeviceSelectItem[]): void => {
      const selectedValues = values
        .map((item) => ({
          id: String(item.id || item.deviceId || ""),
          name: String(item.deviceName || item.name || item.code || item.id || ""),
        }))
        .filter((item) => item.id);
      if (pickerMode.value === "forkliftDevice") {
        const selected = selectedValues[0];
        deviceDraft.value = selected ? [selected] : [];
        form.deviceId = selected?.id ?? "";
        form.deviceName = selected?.name ?? "";
        form.deviceCode = values[0]?.code ?? "";
      } else {
        cameraDraft.value = selectedValues;
        form.cameraDeviceIds = selectedValues.map((item) => item.id);
        form.cameraDeviceNames = selectedValues.map((item) => item.name);
      }
    };

    const removeCamera = (deviceId: string): void => {
      const ids = Array.isArray(form.cameraDeviceIds) ? form.cameraDeviceIds.map(String) : [];
      const names = Array.isArray(form.cameraDeviceNames) ? form.cameraDeviceNames.map(String) : [];
      const nextIds: string[] = [];
      const nextNames: string[] = [];
      ids.forEach((item, index) => {
        if (item !== deviceId) {
          nextIds.push(item);
          nextNames.push(names[index] ?? item);
        }
      });
      form.cameraDeviceIds = nextIds;
      form.cameraDeviceNames = nextNames;
    };

    const openManagerPicker = (): void => {
      if (isDetail.value) {
        return;
      }
      userSelectModalRef.value?.openModal(form.managerUserId ? [String(form.managerUserId)] : []);
    };

    const openWarehousePicker = (): void => {
      if (isDetail.value) {
        return;
      }
      warehouseDraft.value = form.warehouseId
        ? ({
            id: String(form.warehouseId),
            code: String(form.warehouseCode ?? ""),
            name: String(form.warehouseName || form.warehouseId),
          } as WarehouseSafetyWarehouse)
        : null;
      warehousePageNumber.value = 1;
      warehousePickerVisible.value = true;
      void loadWarehouses();
    };

    const confirmWarehousePicker = (): void => {
      if (!warehouseDraft.value) {
        message.warning("请选择关联仓库");
        return;
      }
      form.warehouseId = warehouseDraft.value.id;
      form.warehouseCode = warehouseDraft.value.code ?? "";
      form.warehouseName = warehouseDraft.value.name ?? "";
      warehousePickerVisible.value = false;
    };

    const handleManagerSelect = (users: UserSelectItem[]): void => {
      const user = users[0];
      form.managerUserId = user?.id ?? "";
      form.managerName = user?.name ?? "";
    };

    onMounted(async () => {
      await Promise.all([loadDetail(), loadAreaTree()]);
      syncAreaName();
    });

    return (): JSX.Element => {
      const cameraIds = Array.isArray(form.cameraDeviceIds) ? form.cameraDeviceIds.map(String) : [];
      const cameraNames = Array.isArray(form.cameraDeviceNames) ? form.cameraDeviceNames.map(String) : [];
      return (
        <div class={styles.page}>
          <CubeLayout
            title={title.value}
            subTitle={
              props.type === "warehouse"
                ? "补齐仓库档案字段，用于区域分区和叉车管理"
                : props.type === "shelf"
                  ? "维护仓储监控区域、区域尺寸和摄像头绑定"
                  : "维护叉车档案，关联物联中心设备和摄像头"
            }
            v-slots={{
              "layout-content": () => (
                <div class={styles.content}>
                  <div class={styles.formCard}>
                    <Form model={form} labelCol={{ style: { width: "120px" } }}>
                      {props.type === "warehouse" ? (
                        <div class={styles.formGrid}>
                          <FormItem label="仓库编号" required>
                            <Input v-model:value={form.code} placeholder="如 WH-003" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="仓库名称" required>
                            <Input v-model:value={form.name} placeholder="如 仓储C区" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="地址" required>
                            <Input v-model:value={form.address} placeholder="如 C区105号" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="面积（㎡）" required>
                            <InputNumber v-model:value={form.capacity} style={{ width: "100%" }} min={0} disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="责任人" required>
                            <div class={styles.pickerRow}>
                              <div class={[styles.pickerDisplay, !form.managerName ? styles.placeholder : ""]}>
                                {String(form.managerName || "请选择责任人")}
                              </div>
                              {!isDetail.value && <Button onClick={openManagerPicker}>选择人员</Button>}
                            </div>
                          </FormItem>
                          <FormItem label="建成时间">
                            <DatePicker
                              v-model:value={form.builtTime}
                              valueFormat="YYYY-MM-DD"
                              style={{ width: "100%" }}
                              disabled={isDetail.value}
                            />
                          </FormItem>
                        </div>
                      ) : props.type === "shelf" ? (
                        <div class={styles.formGrid}>
                          <FormItem label="区域名称" required>
                            <Input v-model:value={form.name} placeholder="如 货架C区" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="区域类型" required>
                            <Select
                              v-model:value={form.zoneType}
                              options={ZONE_TYPE_OPTIONS}
                              fieldNames={{ label: "name", value: "code" }}
                              placeholder="请选择区域类型"
                              style={{ width: "100%" }}
                              disabled={isDetail.value}
                              onChange={(value) => {
                                form.zoneTypeName = ZONE_TYPE_TEXT[String(value ?? "")] ?? "";
                              }}
                            />
                          </FormItem>
                          <FormItem label="关联仓库" required>
                            <div class={styles.pickerRow}>
                              <div class={[styles.pickerDisplay, !form.warehouseName ? styles.placeholder : ""]}>
                                {String(form.warehouseName || "请选择关联仓库")}
                              </div>
                              {!isDetail.value && <Button onClick={openWarehousePicker}>选择仓库</Button>}
                            </div>
                          </FormItem>
                          <FormItem label="长度（m）" required>
                            <InputNumber v-model:value={form.length} style={{ width: "100%" }} min={0} disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="宽度（m）" required>
                            <InputNumber v-model:value={form.width} style={{ width: "100%" }} min={0} disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="货架排数">
                            <InputNumber v-model:value={form.shelfRows} style={{ width: "100%" }} min={0} disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="绑定摄像头" class={styles.full}>
                            {!isDetail.value && <Button onClick={() => openDevicePicker("camera")}>选择摄像头</Button>}
                            <div class={styles.selectedList}>
                              {cameraIds.map((cameraId, index) => (
                                <div class={styles.selectedItem} key={cameraId}>
                                  <span>{cameraNames[index] || cameraId}</span>
                                  {!isDetail.value && (
                                    <Button type="link" size="small" onClick={() => removeCamera(cameraId)}>
                                      移除
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </FormItem>
                        </div>
                      ) : (
                        <div class={styles.formGrid}>
                          <FormItem label="叉车编号" required>
                            <Input v-model:value={form.code} placeholder="如 FC-006" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="叉车名称" required>
                            <Input v-model:value={form.name} placeholder="如 电动叉车 #6" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="叉车类型" required>
                            <Select
                              v-model:value={form.forkliftType}
                              options={FORKLIFT_TYPE_OPTIONS}
                              fieldNames={{ label: "name", value: "code" }}
                              placeholder="请选择叉车类型"
                              style={{ width: "100%" }}
                              disabled={isDetail.value}
                              onChange={(value) => {
                                form.forkliftTypeName = FORKLIFT_TYPE_TEXT[String(value ?? "")] ?? "";
                              }}
                            />
                          </FormItem>
                          <FormItem label="所属区域" required>
                            <AreaTreeSelect
                              v-model:value={form.areaId}
                              placeholder="请选择区域"
                              multiple={false}
                              checkable={false}
                              style={{ width: "100%" }}
                              readonly={isDetail.value}
                              onChange={(value: string) => {
                                syncAreaName(value);
                              }}
                            />
                          </FormItem>
                          <FormItem label="物联中心设备" required class={styles.full}>
                            <div class={styles.pickerRow}>
                              <div class={[styles.pickerDisplay, !form.deviceName ? styles.placeholder : ""]}>
                                {String(form.deviceName || "请选择物联中心设备")}
                              </div>
                              {!isDetail.value && <Button onClick={() => openDevicePicker("forkliftDevice")}>选择设备</Button>}
                            </div>
                          </FormItem>
                          <FormItem label="载重（T）">
                            <InputNumber v-model:value={form.loadCapacity} style={{ width: "100%" }} min={0} disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="电池规格">
                            <Input v-model:value={form.batterySpec} placeholder="如 48V/600Ah" disabled={isDetail.value} />
                          </FormItem>
                          <FormItem label="绑定摄像头" class={styles.full}>
                            {!isDetail.value && <Button onClick={() => openDevicePicker("camera")}>选择摄像头</Button>}
                            <div class={styles.selectedList}>
                              {cameraIds.map((cameraId, index) => (
                                <div class={styles.selectedItem} key={cameraId}>
                                  <span>{cameraNames[index] || cameraId}</span>
                                  {!isDetail.value && (
                                    <Button type="link" size="small" onClick={() => removeCamera(cameraId)}>
                                      移除
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </FormItem>
                        </div>
                      )}
                    </Form>
                  </div>
                </div>
              ),
              "footer-page": () => (
                <div class={styles.footer}>
                  <Button onClick={back}>{isDetail.value ? "返回" : "取消"}</Button>
                  {!isDetail.value && (
                    <Button type="primary" loading={saving.value} onClick={() => void submit()}>
                      保存
                    </Button>
                  )}
                </div>
              ),
            }}
          />
          <DeviceModalTable
            ref={deviceSelectModalRef}
            title={pickerMode.value === "camera" ? "选择摄像头" : "选择物联中心设备"}
            value={pickerMode.value === "camera" ? cameraDraft.value : deviceDraft.value}
            searchParams={{}}
            multiple={pickerMode.value === "camera"}
            onOk={handleDeviceSelect}
          />
          <Modal
            v-model:open={warehousePickerVisible.value}
            title="选择关联仓库"
            width={860}
            okText="确定"
            cancelText="取消"
            onOk={confirmWarehousePicker}
          >
            <div class={styles.searchBar}>
              <Input
                v-model:value={warehouseKeyword.value}
                class={styles.searchInput}
                placeholder="搜索仓库编号、名称"
                showCount={false}
                onPressEnter={() => {
                  warehousePageNumber.value = 1;
                  void loadWarehouses();
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  warehousePageNumber.value = 1;
                  void loadWarehouses();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  warehouseKeyword.value = "";
                  warehousePageNumber.value = 1;
                  void loadWarehouses();
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey="id"
              loading={warehouseLoading.value}
              pagination={false}
              dataSource={warehouseRows.value}
              locale={{ emptyText: "暂无数据" }}
              columns={[
                { title: "仓库编号", dataIndex: "code", width: 160 },
                { title: "仓库名称", dataIndex: "name", width: 180 },
                { title: "地址", dataIndex: "address" },
                { title: "责任人", dataIndex: "managerName", width: 140 },
              ]}
              rowSelection={{
                type: "radio",
                selectedRowKeys: warehouseDraft.value?.id ? [warehouseDraft.value.id] : [],
                onChange: (_keys: unknown[], rows: WarehouseSafetyWarehouse[]) => {
                  warehouseDraft.value = rows[0] ?? null;
                },
              }}
            />
            <div class={styles.modalFooterPage}>
              <Page
                current={warehousePageNumber.value}
                pageSize={warehousePageSize.value}
                total={warehouseTotal.value}
                onPageChange={(page: number, size: number) => {
                  warehousePageNumber.value = page;
                  warehousePageSize.value = size;
                  void loadWarehouses();
                }}
              />
            </div>
          </Modal>
          <UserSelectModal ref={userSelectModalRef} title="选择责任人" multiple={false} onEnter={handleManagerSelect} />
        </div>
      );
    };
  },
});
