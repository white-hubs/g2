import { Button, DatePicker, Form, FormItem, Input, InputNumber, Select, Space, Spin, Tag, Textarea, message } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { computed, defineComponent, nextTick, onMounted, reactive, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { FUMIGATION_ATTACHMENT_SCENE_CODE } from "./attachment-utils";
import { EmptyBlock, SectionTitle } from "./components";
import { loadGrainVarietiesByWarehouse, loadWarehousesFromIntelligentGrain } from "./data-source";
import {
  upsertFumigationWork,
  type FumigationAttachment,
  type FumigationWork,
  type GrainVarietyOption,
  type WarehouseOption,
  type WorkerOption,
} from "./state";
import {
  createFumigationWork,
  listFumigationApplicationMethods,
  listFumigationPesticideTypes,
  listFumigationWorkers,
} from "@/api/fumigation-client";
import { CubeLayout, FileUpload, UserSelectModal } from "@/compat/app-design";
import { DeviceModalTable } from "@/compat/app-design";

import "./fumigation.less";

type UserSelectExpose = { openModal: (keys?: string[]) => void };
type DeviceSelectExpose = { openModal: () => void };
type UserSelectItem = {
  id?: string | number;
  personId?: string | number;
  userId?: string | number;
  name?: string;
  personName?: string;
  userName?: string;
  mobile?: string;
  phone?: string;
  organization?: { name?: string };
  deptName?: string;
  department?: string;
  postName?: string;
};
type DeviceSelectItem = {
  id?: string | number;
  name?: string;
  deviceName?: string;
  code?: string;
  deviceId?: string;
};
type DeviceDraftOption = { id: string; name: string };

interface CreateFormState {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainVarietyName: string;
  grainQuantity?: number;
  pesticideTypeCode: string;
  pesticideDosage: string;
  applicationMethodCode: string;
  sealedDays?: number;
  expectedVentilationAt: string;
  expectedDurationHours?: number;
  safetyMeasures: string;
  workerIds: string[];
  actualWorkerCount: number;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  attachments: FumigationAttachment[];
}

const asString = (value: unknown): string => (value == null ? "" : String(value));

const asNumber = (value: unknown): number => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const uploadedFiles = (files: FumigationAttachment[]): FumigationAttachment[] =>
  files.map((file) => {
    const next: FumigationAttachment = {
      id: asString(file.id),
      name: asString(file.name),
      sceneCode: file.sceneCode ?? FUMIGATION_ATTACHMENT_SCENE_CODE,
    };
    if (file.path != null) {
      next.path = file.path;
    }
    if (file.suffix != null) {
      next.suffix = file.suffix;
    }
    if (file.size != null) {
      next.size = file.size;
    }
    return next;
  });

export const FumigationWorkCreate = defineComponent({
  name: "FumigationWorkCreate",
  setup: () => {
    const router = useRouter();
    const loading = shallowRef(false);
    const submitting = shallowRef(false);
    const deviceSelectModalRef = shallowRef<DeviceSelectExpose>();
    const deviceDraft = shallowRef<DeviceDraftOption[]>([]);
    const userSelectModalRef = shallowRef<UserSelectExpose>();
    const warehouseList = shallowRef<WarehouseOption[]>([]);
    const grainVarietyList = shallowRef<GrainVarietyOption[]>([]);
    const grainVarietyLoading = shallowRef(false);
    const workerList = shallowRef<WorkerOption[]>([]);
    const selectedWorkerCache = shallowRef<WorkerOption[]>([]);
    const pesticideOptions = shallowRef<Array<{ label: string; value: string }>>([]);
    const applicationMethodOptions = shallowRef<Array<{ label: string; value: string }>>([]);

    const form = reactive<CreateFormState>({
      warehouseId: "",
      warehouseCode: "",
      warehouseName: "",
      grainVarietyName: "",
      pesticideTypeCode: "",
      pesticideDosage: "",
      applicationMethodCode: "",
      expectedVentilationAt: "",
      expectedDurationHours: 2,
      safetyMeasures: "",
      workerIds: [],
      actualWorkerCount: 0,
      deviceId: "",
      deviceCode: "",
      deviceName: "",
      attachments: [],
    });

    const warehouseOptions = computed(() =>
      warehouseList.value.map((item) => ({
        label: `${item.name}（${item.code}）`,
        value: asString(item.id),
      })),
    );

    const findWarehouse = (warehouseId: string): WarehouseOption | undefined =>
      warehouseList.value.find((item) => asString(item.id) === warehouseId);

    const grainVarietyOptions = computed(() =>
      grainVarietyList.value.map((item: GrainVarietyOption) => ({
        label: item.name,
        value: item.name,
      })),
    );

    const selectedWorkers = computed(() =>
      form.workerIds
        .map((id) => selectedWorkerCache.value.find((item) => item.id === id) ?? workerList.value.find((item) => item.id === id))
        .filter((item): item is WorkerOption => item != null),
    );

    const selectedPesticideName = computed(() => pesticideOptions.value.find((item) => item.value === form.pesticideTypeCode)?.label ?? "");

    const selectedPesticideText = computed(() => [selectedPesticideName.value, form.pesticideDosage.trim()].filter(Boolean).join(" "));

    const back = (): void => {
      void router.push({ name: "fumigation-work-list" });
    };

    const loadGrainVarieties = async (warehouseId: string): Promise<void> => {
      if (warehouseId === "") {
        grainVarietyList.value = [];
        return;
      }
      const warehouse = findWarehouse(warehouseId);
      const fallbackName = warehouse?.grainVarieties[0]?.name ?? "未维护品种";
      grainVarietyLoading.value = true;
      try {
        grainVarietyList.value = await loadGrainVarietiesByWarehouse(warehouseId, fallbackName);
        if (grainVarietyList.value.length === 1) {
          form.grainVarietyName = grainVarietyList.value[0].name;
        }
      } catch (error) {
        grainVarietyList.value = warehouse?.grainVarieties ?? [];
        if (grainVarietyList.value.length === 1) {
          form.grainVarietyName = grainVarietyList.value[0].name;
        }
        message.error((error as Error).message || "获取粮食品种失败");
      } finally {
        grainVarietyLoading.value = false;
      }
    };

    const handleWarehouseChange = (warehouseId: string | number | undefined): void => {
      const normalizedWarehouseId = asString(warehouseId);
      const warehouse = findWarehouse(normalizedWarehouseId);
      form.warehouseId = normalizedWarehouseId;
      form.warehouseCode = warehouse?.code ?? "";
      form.warehouseName = warehouse?.name ?? "";
      form.grainVarietyName = "";
      grainVarietyList.value = [];
      if (normalizedWarehouseId !== "") {
        void loadGrainVarieties(normalizedWarehouseId);
      }
    };

    const normalizeSelectedUser = (user: UserSelectItem | undefined | null): WorkerOption | undefined => {
      if (user == null) {
        return undefined;
      }
      const id = asString(user.id ?? user.personId ?? user.userId);
      if (id === "") {
        return undefined;
      }
      const existed = workerList.value.find((item) => item.id === id);
      if (existed != null) {
        return existed;
      }
      return {
        id,
        name: user.name ?? user.personName ?? user.userName ?? id,
        role: user.postName ?? "作业人员",
        department: user.organization?.name ?? user.deptName ?? user.department ?? "",
        phone: user.mobile ?? user.phone ?? "",
        certificates: [],
        source: "security-personnel-service",
      };
    };

    const handleWorkerSelect = (users: Array<UserSelectItem | undefined | null> = []): void => {
      const nextWorkers = users.map(normalizeSelectedUser).filter((item): item is WorkerOption => item != null);
      const nextIds = unique(nextWorkers.map((item) => item.id));
      selectedWorkerCache.value = nextIds
        .map((id) => nextWorkers.find((item) => item.id === id) ?? selectedWorkerCache.value.find((item) => item.id === id))
        .filter((item): item is WorkerOption => item != null);
      form.workerIds = nextIds;
      form.actualWorkerCount = nextIds.length;
    };

    const openDevicePicker = (): void => {
      deviceDraft.value = form.deviceId ? [{ id: form.deviceId, name: form.deviceName || form.deviceCode || form.deviceId }] : [];
      void nextTick(() => {
        deviceSelectModalRef.value?.openModal();
      });
    };

    const handleDeviceSelect = (values: DeviceSelectItem[]): void => {
      const selectedValues = values
        .map((item) => ({
          id: asString(item.id ?? item.deviceId),
          name: asString(item.deviceName ?? item.name ?? item.code ?? item.id ?? item.deviceId),
        }))
        .filter((item) => item.id !== "");
      const selected = selectedValues[0];
      deviceDraft.value = selected != null ? [selected] : [];
      form.deviceId = selected?.id ?? "";
      form.deviceName = selected?.name ?? "";
      form.deviceCode = asString(values[0]?.code ?? selected?.id);
    };

    const validateBusiness = (): string => {
      if (form.warehouseId === "") {
        return "请选择仓房";
      }
      if (asString(form.grainVarietyName).trim() === "") {
        return "请选择粮食品种";
      }
      if (asNumber(form.grainQuantity) <= 0) {
        return "请填写粮食数量";
      }
      if (form.pesticideTypeCode === "") {
        return "请选择药剂种类";
      }
      if (form.pesticideDosage.trim() === "") {
        return "请填写药剂用量";
      }
      if (form.applicationMethodCode === "") {
        return "请选择施药方式";
      }
      if (asNumber(form.sealedDays) <= 0) {
        return "请填写密闭时间";
      }
      if (form.expectedVentilationAt === "") {
        return "请选择预计散气时间";
      }
      if (asNumber(form.expectedDurationHours) <= 0 || asNumber(form.expectedDurationHours) > 8) {
        return "预计作业时长需大于 0 且不超过 8 小时";
      }
      if (form.safetyMeasures.trim() === "") {
        return "请填写安全措施";
      }
      if (form.workerIds.length < 2 || form.actualWorkerCount < 2) {
        return "作业人员不能少于 2 人";
      }
      if (form.deviceId === "") {
        return "请选择关联设备";
      }
      return "";
    };

    const submit = async (): Promise<void> => {
      const validationError = validateBusiness();
      if (validationError !== "") {
        message.warning(validationError);
        return;
      }
      submitting.value = true;
      try {
        const work = (await createFumigationWork({
          warehouseId: form.warehouseId,
          warehouseCode: form.warehouseCode,
          warehouseName: form.warehouseName,
          grainVarietyId: form.grainVarietyName,
          grainVarietyName: form.grainVarietyName,
          deviceId: form.deviceId,
          deviceCode: form.deviceCode,
          deviceName: form.deviceName,
          expectedDurationHours: asNumber(form.expectedDurationHours),
          plannedStartAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
          plannedDosage: selectedPesticideText.value,
          grainQuantity: asNumber(form.grainQuantity),
          pesticideTypeCode: form.pesticideTypeCode,
          pesticideDosage: form.pesticideDosage.trim(),
          applicationMethodCode: form.applicationMethodCode,
          sealedDays: asNumber(form.sealedDays),
          expectedVentilationAt: form.expectedVentilationAt,
          safetyMeasures: form.safetyMeasures.trim(),
          safetyDisclosure: form.safetyMeasures.trim(),
          emergencyPlan: "",
          siteLeader: selectedWorkers.value[0]?.name ?? "",
          workerIds: form.workerIds,
          actualWorkerCount: form.actualWorkerCount,
          attachmentsSceneCode: FUMIGATION_ATTACHMENT_SCENE_CODE,
          attachments: uploadedFiles(form.attachments),
        })) as FumigationWork;
        upsertFumigationWork(work);
        message.success("已新增熏蒸作业");
        void router.push({ name: "fumigation-work-list" });
      } catch (caughtError) {
        message.error((caughtError as Error).message || "新增熏蒸作业失败");
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      loading.value = true;
      void Promise.all([
        loadWarehousesFromIntelligentGrain(),
        listFumigationWorkers() as Promise<WorkerOption[]>,
        listFumigationPesticideTypes(),
        listFumigationApplicationMethods(),
      ])
        .then(([warehouses, workers, pesticideTypes, applicationMethods]) => {
          warehouseList.value = warehouses;
          workerList.value = workers;
          pesticideOptions.value = pesticideTypes.map((item) => ({ label: item.name, value: item.code }));
          applicationMethodOptions.value = applicationMethods.map((item) => ({ label: item.name, value: item.code }));
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "获取新增作业基础数据失败");
        })
        .finally(() => {
          loading.value = false;
        });
    });

    const renderPickerDisplay = (text: string, placeholder: string): JSX.Element => (
      <div class={["fumigation-picker-display", text === "" ? "is-placeholder" : ""]}>{text || placeholder}</div>
    );

    const renderSelectedWorkers = (): JSX.Element =>
      selectedWorkers.value.length === 0 ? (
        <EmptyBlock text="请选择作业人员，至少 2 人" />
      ) : (
        <div class="fumigation-selected-list">
          {selectedWorkers.value.map((worker) => (
            <div class="fumigation-selected-item" key={worker.id}>
              <span>{worker.name}</span>
              <Tag>{worker.department || worker.role || "作业人员"}</Tag>
            </div>
          ))}
        </div>
      );

    return (): JSX.Element => (
      <CubeLayout
        title="新增熏蒸"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class="fumigation-create-content">
                <Form layout="vertical" model={form}>
                  <div class="fumigation-panel">
                    <SectionTitle title="仓房信息" />
                    <div class="fumigation-form-grid">
                      <FormItem label="选择仓房" required>
                        <Select
                          v-model:value={form.warehouseId}
                          options={warehouseOptions.value}
                          placeholder="请选择仓房"
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          onChange={(value: unknown) => handleWarehouseChange(value as string | number | undefined)}
                        />
                      </FormItem>
                      <FormItem label="粮食品种" required>
                        <Select
                          v-model:value={form.grainVarietyName}
                          options={grainVarietyOptions.value}
                          loading={grainVarietyLoading.value}
                          placeholder={form.warehouseId === "" ? "请先选择仓房" : "请选择粮食品种"}
                          disabled={form.warehouseId === "" || grainVarietyLoading.value}
                          allowClear
                        />
                      </FormItem>
                      <FormItem label="粮食数量（吨）" required>
                        <InputNumber
                          value={form.grainQuantity}
                          min={0}
                          precision={2}
                          style={{ width: "100%" }}
                          placeholder="请输入粮食数量"
                          onChange={(value: string | number | null) => {
                            form.grainQuantity = asNumber(value);
                          }}
                        />
                      </FormItem>
                    </div>
                  </div>

                  <div class="fumigation-panel">
                    <SectionTitle title="熏蒸方案" />
                    <div class="fumigation-form-grid">
                      <FormItem label="药剂种类" required>
                        <Select
                          value={form.pesticideTypeCode}
                          options={pesticideOptions.value}
                          placeholder="请选择药剂种类"
                          onChange={(value: unknown) => {
                            form.pesticideTypeCode = asString(value);
                          }}
                        />
                      </FormItem>
                      <FormItem label="药剂用量" required>
                        <Input
                          value={form.pesticideDosage}
                          placeholder="如：18kg"
                          onUpdate:value={(value: string) => {
                            form.pesticideDosage = value;
                          }}
                        />
                      </FormItem>
                      <FormItem label="施药方式" required>
                        <Select
                          value={form.applicationMethodCode}
                          options={applicationMethodOptions.value}
                          placeholder="请选择施药方式"
                          onChange={(value: unknown) => {
                            form.applicationMethodCode = asString(value);
                          }}
                        />
                      </FormItem>
                      <FormItem label="密闭时间（天）" required>
                        <InputNumber
                          value={form.sealedDays}
                          min={1}
                          precision={0}
                          style={{ width: "100%" }}
                          placeholder="请输入密闭时间"
                          onChange={(value: string | number | null) => {
                            form.sealedDays = asNumber(value);
                          }}
                        />
                      </FormItem>
                      <FormItem label="预计散气时间" required>
                        <DatePicker
                          value={form.expectedVentilationAt}
                          showTime
                          valueFormat="YYYY-MM-DD HH:mm:ss"
                          format="YYYY-MM-DD HH:mm:ss"
                          placeholder="请选择预计散气时间"
                          style={{ width: "100%" }}
                          onUpdate:value={(value: unknown) => {
                            form.expectedVentilationAt = asString(value);
                          }}
                        />
                      </FormItem>
                      <FormItem label="预计作业时长（小时）" required>
                        <InputNumber
                          value={form.expectedDurationHours}
                          min={1}
                          max={8}
                          precision={1}
                          step={0.5}
                          style={{ width: "100%" }}
                          placeholder="请输入预计作业时长"
                          onChange={(value: string | number | null) => {
                            form.expectedDurationHours = asNumber(value);
                          }}
                        />
                        <div class="fumigation-field-help">常规投药操作约1-2小时，最长不超过8小时</div>
                      </FormItem>
                      <FormItem label="安全措施" required class="fumigation-form-field is-full">
                        <Textarea
                          value={form.safetyMeasures}
                          rows={4}
                          placeholder="请输入现场安全措施"
                          onUpdate:value={(value: string) => {
                            form.safetyMeasures = value;
                          }}
                        />
                      </FormItem>
                    </div>
                  </div>

                  <div class="fumigation-panel">
                    <SectionTitle
                      title="作业人员"
                      extra={<Tag color={form.actualWorkerCount >= 2 ? "green" : "orange"}>{form.actualWorkerCount} 人</Tag>}
                    />
                    <div class="fumigation-picker-row">
                      {renderPickerDisplay(selectedWorkers.value.map((worker) => worker.name).join("、"), "请选择作业人员")}
                      <Button
                        onClick={() => {
                          userSelectModalRef.value?.openModal(form.workerIds);
                        }}
                      >
                        选择人员
                      </Button>
                    </div>
                    {renderSelectedWorkers()}
                  </div>

                  <div class="fumigation-panel">
                    <SectionTitle title="关联设备" />
                    <div class="fumigation-picker-row">
                      {renderPickerDisplay(form.deviceName || form.deviceCode, "请选择关联设备")}
                      <Button onClick={openDevicePicker}>选择设备</Button>
                    </div>
                  </div>

                  <div class="fumigation-panel">
                    <SectionTitle title="附件上传" />
                    <FileUpload
                      v-model:value={form.attachments}
                      multiple
                      showText
                      maxCount={10}
                      type="text"
                      size={100}
                      sceneCode={FUMIGATION_ATTACHMENT_SCENE_CODE}
                      customText="支持PDF、Word、图片等附件，单个附件最大支持100MB"
                      typeList={[
                        ".pdf",
                        ".doc",
                        ".docx",
                        ".xls",
                        ".xlsx",
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".PDF",
                        ".DOC",
                        ".DOCX",
                        ".XLS",
                        ".XLSX",
                        ".PNG",
                        ".JPG",
                        ".JPEG",
                      ]}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.PDF,.DOC,.DOCX,.XLS,.XLSX,.PNG,.JPG,.JPEG"
                    />
                  </div>
                </Form>
              </div>
            </Spin>
          ),
          "footer-page": () => (
            <div class="fumigation-footer-actions is-fixed-actions">
              <Space>
                <Button onClick={back}>返回</Button>
                <Button type="primary" loading={submitting.value} onClick={() => void submit()}>
                  提交
                </Button>
              </Space>
            </div>
          ),
        }}
      >
        <UserSelectModal ref={userSelectModalRef} title="选择作业人员" multiple onEnter={handleWorkerSelect} />
        <DeviceModalTable
          ref={deviceSelectModalRef}
          title="选择物联中心设备"
          value={deviceDraft.value}
          searchParams={{}}
          multiple={false}
          onOk={handleDeviceSelect}
        />
      </CubeLayout>
    );
  },
});
