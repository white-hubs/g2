import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getSecurityOuaaClient, getVideoMonitorClient } from "../domain-context";
import { formatInspectionExecutionPlan } from "./ai-inspection-format";
import { callSecurityPcUi, defineAsyncSecurityPcUiComponent, securityPcUiMessage as message } from "./pc-ui-runtime";
import {
  type CameraOption,
  type InspectionActionRule,
  type InspectionAlgorithm,
  type InspectionEvent,
  type InspectionPlan,
  type InspectionPlanCamera,
  type InspectionTask,
  type InspectionTaskCamera,
  type RecordMap,
  asArray,
  asPage,
  asRecord,
  displayDateTime,
  safeText,
} from "./video-monitor-types";

const Button = defineAsyncSecurityPcUiComponent("Button");
const DatePicker = defineAsyncSecurityPcUiComponent("DatePicker");
const Form = defineAsyncSecurityPcUiComponent("Form");
const FormItem = defineAsyncSecurityPcUiComponent("FormItem");
const Image = defineAsyncSecurityPcUiComponent("Image");
const Input = defineAsyncSecurityPcUiComponent("Input");
const InputNumber = defineAsyncSecurityPcUiComponent("InputNumber");
const Modal = defineAsyncSecurityPcUiComponent("Modal");
const Page = defineAsyncSecurityPcUiComponent("Page");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const RangePicker = defineAsyncSecurityPcUiComponent("RangePicker");
const Select = defineAsyncSecurityPcUiComponent("Select");
const Space = defineAsyncSecurityPcUiComponent("Space");
const Steps = defineAsyncSecurityPcUiComponent("Steps");
const Switch = defineAsyncSecurityPcUiComponent("Switch");
const Table = defineAsyncSecurityPcUiComponent("Table");
const Tag = defineAsyncSecurityPcUiComponent("Tag");
const TimePicker = defineAsyncSecurityPcUiComponent("TimePicker");

import styles from "./security-monitor.module.css";

const SNAPSHOT_PREVIEW_TIMEOUT_MS = 8000;
const STATIC_RESOURCE_BASE_KEY = "__G2_STATIC_RESOURCE_BASE__";

type GlobalStaticResourceConfig = typeof globalThis & {
  [STATIC_RESOURCE_BASE_KEY]?: string;
};

function resolveSecurityMonitorResourceUrl(path: string): string {
  const base = (globalThis as GlobalStaticResourceConfig)[STATIC_RESOURCE_BASE_KEY]?.replace(/\/+$/u, "");
  if (!base || !path.startsWith("/resource/")) {
    return path;
  }
  return `${base}${path.slice("/resource".length)}`;
}

const EXECUTION_TYPE_LABEL: Record<string, string> = {
  SCHEDULE: "定时",
  IMMEDIATE: "保存后立即执行",
  MANUAL: "手动执行",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: "待执行",
  RUNNING: "执行中",
  COMPLETED: "已完成",
  PARTIAL_FAILED: "部分失败",
  FAILED: "失败",
  TIMEOUT: "超时",
};
const CAMERA_STATUS_LABEL: Record<string, string> = {
  PENDING: "待执行",
  RUNNING: "执行中",
  QUALIFIED: "正常",
  ABNORMAL: "异常",
  FAILED: "失败",
};
const ACTION_STATUS_LABEL: Record<string, string> = {
  NONE: "未处理",
  PENDING: "处理中",
  SUCCESS: "处理成功",
  FAILED: "处理失败",
  IGNORED: "已忽略",
};

function statusColor(status?: string): string {
  if (status === "COMPLETED" || status === "QUALIFIED" || status === "SUCCESS") {
    return "success";
  }
  if (status === "RUNNING" || status === "PENDING") {
    return "processing";
  }
  if (status === "ABNORMAL" || status === "PARTIAL_FAILED") {
    return "warning";
  }
  if (status === "FAILED" || status === "TIMEOUT") {
    return "error";
  }
  return "default";
}

function idOf(value: RecordMap): string {
  return safeText(value.id, "");
}
function nameOf(value: RecordMap): string {
  return safeText(value.name ?? value.userName, safeText(value.id));
}

export const AiInspectionPlanListPage = defineComponent({
  name: "AiInspectionPlanListPage",
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const rows = ref<InspectionPlan[]>([]);
    const tableViewportRef = ref<HTMLElement>();
    const tableBodyHeight = ref(480);
    const query = reactive({
      keyword: "",
      enabled: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const updateTableBodyHeight = (): void => {
      const tableViewport = tableViewportRef.value;
      const layoutContent = tableViewport?.closest("#pc-layout-content");
      if (!(tableViewport instanceof HTMLElement) || !(layoutContent instanceof HTMLElement)) {
        return;
      }
      const availableHeight = layoutContent.getBoundingClientRect().bottom - tableViewport.getBoundingClientRect().top;
      tableBodyHeight.value = Math.max(240, Math.floor(availableHeight - 56));
    };
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const page = asPage<InspectionPlan>(
          await (
            await getVideoMonitorClient()
          ).listAiInspectionPlans({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: query.keyword.trim() || undefined,
            enabled: query.enabled === "" ? undefined : query.enabled === "true",
          }),
        );
        rows.value = page.records;
        query.total = page.total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载巡检计划失败");
      } finally {
        loading.value = false;
        await nextTick();
        updateTableBodyHeight();
      }
    };
    const toggleEnabled = async (row: InspectionPlan, enabled: boolean): Promise<void> => {
      try {
        await (await getVideoMonitorClient()).updateAiInspectionPlanEnabled(row.id, enabled);
        message.success(enabled ? "已启用" : "已停用");
        await load();
      } catch {
        message.error("操作失败");
      }
    };
    const remove = (row: InspectionPlan): void => {
      void callSecurityPcUi("Modal", "confirm", {
        title: `确认删除巡检计划“${row.name}”？`,
        async onOk() {
          await (await getVideoMonitorClient()).deleteAiInspectionPlan(row.id);
          message.success("删除成功");
          await load();
        },
      });
    };
    const columns = [
      { title: "计划名称", dataIndex: "name", width: 220, ellipsis: true },
      { title: "负责人", dataIndex: "principalUserName", width: 130 },
      {
        title: "执行方式",
        width: 260,
        customRender: ({ record }: { record: InspectionPlan }) => formatInspectionExecutionPlan(record),
      },
      {
        title: "摄像头数量",
        dataIndex: "cameraNum",
        width: 110,
        align: "center" as const,
      },
      {
        title: "下次执行时间",
        width: 180,
        customRender: ({ record }: { record: InspectionPlan }) => displayDateTime(record.nextExecuteTime),
      },
      {
        title: "上次执行时间",
        width: 180,
        customRender: ({ record }: { record: InspectionPlan }) => displayDateTime(record.lastExecuteTime),
      },
      {
        title: "启用状态",
        width: 110,
        customRender: ({ record }: { record: InspectionPlan }) => (
          <Switch
            checked={Boolean(record.enabled)}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(value: unknown) => void toggleEnabled(record, value === true)}
          />
        ),
      },
      {
        title: "创建时间",
        width: 180,
        customRender: ({ record }: { record: InspectionPlan }) => displayDateTime(record.createTime),
      },
      {
        title: "操作",
        dataIndex: "actions",
        width: 300,
        align: "center" as const,
        fixed: "right" as const,
        customRender: ({ record }: { record: InspectionPlan }) => (
          <Space class={styles.planActions} size={4}>
            <Button type="link" size="small" onClick={() => router.push(`/d/security-monitor/ai-inspection/plans/${record.id}/edit`)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              onClick={async () => {
                await (await getVideoMonitorClient()).runAiInspectionPlanOnce(record.id);
                message.success("已提交，结果稍后查看");
              }}
            >
              立即执行
            </Button>
            <Button type="link" size="small" onClick={() => router.push(`/d/security-monitor/ai-inspection/tasks?planId=${record.id}`)}>
              查看任务
            </Button>
            <Button type="link" size="small" danger onClick={() => remove(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];
    onMounted(async () => {
      await nextTick();
      updateTableBodyHeight();
      window.addEventListener("resize", updateTableBodyHeight);
      void load();
    });
    onBeforeUnmount(() => window.removeEventListener("resize", updateTableBodyHeight));
    return () => {
      const slots = {
        "layout-header": () => (
          <Button type="primary" onClick={() => router.push("/d/security-monitor/ai-inspection/plans/create")}>
            新增
          </Button>
        ),
        "layout-content": () => (
          <div class={styles.planListContent}>
            <div class={styles.filterBar}>
              <Input
                class={styles.search}
                value={query.keyword}
                allowClear
                placeholder="请输入计划名称"
                onUpdate:value={(value: string) => (query.keyword = value)}
                onPressEnter={() => void load()}
              />
              <Select
                style={{ width: "160px" }}
                value={query.enabled}
                options={[
                  { label: "全部状态", value: "" },
                  { label: "启用", value: "true" },
                  { label: "停用", value: "false" },
                ]}
                onUpdate:value={(value: unknown) => (query.enabled = typeof value === "string" ? value : "")}
              />
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  query.keyword = "";
                  query.enabled = "";
                  query.pageNumber = 1;
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <div ref={tableViewportRef} class={styles.planListTable}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows.value}
                loading={loading.value}
                scroll={{ x: 1620, y: tableBodyHeight.value }}
                pagination={false}
              />
            </div>
          </div>
        ),
        "footer-page": () => (
          <Page
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={query.total}
            showQuickJumper={false}
            showSizeChanger
            showTotal={(total: number) => `共 ${total} 条`}
            pageSizeOptions={["10", "20", "50", "100"]}
            onPageChange={(page: number, size: number) => {
              query.pageNumber = page;
              query.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return <PageLayout title="巡检计划" v-slots={slots} />;
    };
  },
});

export const AiInspectionPlanEditorPage = defineComponent({
  name: "AiInspectionPlanEditorPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
    const currentStep = ref(0);
    const loading = ref(false);
    const cameraLoading = ref(false);
    const saving = ref(false);
    const cameraPickerOpen = ref(false);
    const cameras = ref<CameraOption[]>([]);
    const cameraRows = ref<CameraOption[]>([]);
    const pickerSelectedIds = ref<string[]>([]);
    const batchAlgorithmId = ref("");
    const cameraQuery = reactive({
      keyword: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const existingCameras = ref<InspectionPlanCamera[]>([]);
    const algorithms = ref<InspectionAlgorithm[]>([]);
    const users = ref<{ label: string; value: string }[]>([]);
    const emergencyRules = ref<{ label: string; value: string }[]>([]);
    const workOrderTemplates = ref<{ label: string; value: string }[]>([]);
    const selectedCameraIds = ref<string[]>([]);
    const cameraAlgorithms = reactive<Record<string, string>>({});
    const cameraActions = reactive<Record<string, { actionType: string; targetId: string; confidencePercent: number }>>({});
    const existingActionDeviceIds = ref<string[]>([]);
    const form = reactive({
      name: "",
      principalUserId: "",
      executionMode: "CYCLE",
      cycleType: "EVERY_DAY",
      cycleValues: "",
      executeTime: "09:00:00",
      startTime: "",
      endTime: "",
      enabled: true,
      immediateExecute: false,
      taskLimitMinutes: 60,
      remark: "",
      version: "",
    });

    const loadCameraOptions = async (): Promise<void> => {
      if (cameraLoading.value) {
        return;
      }
      cameraLoading.value = true;
      try {
        const page = asPage<CameraOption>(
          await (
            await getVideoMonitorClient()
          ).listAiInspectionCameraOptions({
            pageNumber: cameraQuery.pageNumber,
            pageSize: cameraQuery.pageSize,
            keyword: cameraQuery.keyword.trim() || undefined,
          }),
        );
        const records = page.records;
        cameraRows.value = records;
        cameraQuery.total = page.total;
        const byId = new Map(cameras.value.map((item) => [item.id, item]));
        records.forEach((item) => byId.set(item.id, item));
        cameras.value = [...byId.values()];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载摄像头失败");
      } finally {
        cameraLoading.value = false;
      }
    };

    const loadWorkOrderTemplates = async (): Promise<void> => {
      if (workOrderTemplates.value.length > 0) {
        return;
      }
      try {
        workOrderTemplates.value = asPage<RecordMap>(
          await (
            await getVideoMonitorClient()
          ).listAiInspectionWorkOrderTemplates({
            pageNumber: 1,
            pageSize: 1000,
            status: "ENABLED",
          }),
        )
          .records.map((item) => ({ label: nameOf(item), value: idOf(item) }))
          .filter((item) => item.value);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载隐患单模板失败");
      }
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const api = await getVideoMonitorClient();
        const [algorithmResult, userResult, emergencyResult] = await Promise.all([
          api.listAiInspectionAlgorithms(),
          getSecurityOuaaClient().then((ouaa) => ouaa.listUsers({ pageNumber: 1, pageSize: 100 })),
          api.listAiInspectionEmergencyRules({
            pageNumber: 1,
            pageSize: 100,
            applicationCode: "SECURITY_MONITORING",
          }),
        ]);
        algorithms.value = asArray<InspectionAlgorithm>(algorithmResult).filter((item) => item.enabled !== false);
        batchAlgorithmId.value = algorithms.value[0]?.id ?? "";
        users.value = asArray<RecordMap>(asRecord(userResult).records ?? userResult)
          .map((item) => ({ label: nameOf(item), value: idOf(item) }))
          .filter((item) => item.value);
        emergencyRules.value = asPage<RecordMap>(emergencyResult)
          .records.map((item) => ({ label: nameOf(item), value: idOf(item) }))
          .filter((item) => item.value);
        if (!id.value) {
          return;
        }
        const [baseResult, selectedResult] = await Promise.all([
          api.getAiInspectionPlan(id.value),
          api.pageAiInspectionPlanCameras(id.value, {
            pageNumber: 1,
            pageSize: 1000,
          }),
        ]);
        const detail = asRecord(baseResult) as unknown as InspectionPlan;
        Object.assign(form, {
          name: detail.name ?? "",
          principalUserId: detail.principalUserId ?? "",
          executionMode: detail.executionMode ?? "CYCLE",
          cycleType: detail.cycleType ?? "EVERY_DAY",
          cycleValues: detail.cycleValues ?? "",
          executeTime: detail.executeTime ?? "09:00:00",
          startTime: typeof detail.startTime === "string" ? detail.startTime : "",
          endTime: typeof detail.endTime === "string" ? detail.endTime : "",
          enabled: detail.enabled !== false,
          taskLimitMinutes: detail.taskLimitMinutes ?? 60,
          remark: detail.remark ?? "",
          version: detail.version ?? "",
        });
        existingCameras.value = asPage<InspectionPlanCamera>(selectedResult).records;
        selectedCameraIds.value = existingCameras.value.map((item) => item.deviceId);
        if (selectedCameraIds.value.length > 0) {
          const selectedOptions = asArray<CameraOption>(
            await api.getAiInspectionCameraOptionsByIds({
              deviceIds: selectedCameraIds.value,
            }),
          );
          cameras.value = selectedOptions;
        }
        for (const item of existingCameras.value) {
          cameraAlgorithms[item.deviceId] = item.algorithmId;
        }
        const actionRules = asArray<InspectionActionRule>(
          await api.listAiInspectionPlanActionRules(id.value, {
            deviceIds: selectedCameraIds.value,
          }),
        );
        existingActionDeviceIds.value = actionRules.map((item) => item.deviceId);
        for (const rule of actionRules) {
          cameraActions[rule.deviceId] = {
            actionType: rule.enabled === false ? "" : (rule.actionType ?? ""),
            targetId: rule.emergencyRuleId ?? rule.workOrderTemplateId ?? "",
            confidencePercent: Math.round((rule.confidenceThreshold ?? 0.8) * 100),
          };
        }
        if (actionRules.some((rule) => rule.actionType === "WORK_ORDER")) {
          void loadWorkOrderTemplates();
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "巡检计划加载失败");
      } finally {
        loading.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (!validateBasicStep()) {
        currentStep.value = 0;
        return;
      }
      if (!validateCameraStep()) {
        currentStep.value = 1;
        return;
      }
      if (!validateActionStep()) {
        currentStep.value = 2;
        return;
      }
      const defaultAlgorithm = algorithms.value[0]?.id;
      if (!defaultAlgorithm) {
        return void message.warning("当前没有可用的 AI 算法");
      }
      const selected = selectedCameraIds.value.map((deviceId, sort) => ({
        deviceId,
        algorithmId: cameraAlgorithms[deviceId] || defaultAlgorithm,
        sort,
      }));
      const actionRules = selectedCameraIds.value.flatMap((deviceId) => {
        const action = cameraActions[deviceId];
        if (!action?.actionType) {
          return [];
        }
        return [
          {
            deviceId,
            enabled: true,
            actionType: action.actionType,
            confidenceThreshold: action.confidencePercent / 100,
            emergencyRuleId: action.actionType === "ALARM" ? action.targetId || undefined : undefined,
            workOrderTemplateId: action.actionType === "WORK_ORDER" ? action.targetId || undefined : undefined,
          },
        ];
      });
      const base = {
        name: form.name.trim(),
        principalUserId: form.principalUserId,
        executionMode: form.executionMode,
        cycleType: form.executionMode === "CYCLE" ? form.cycleType : undefined,
        cycleValues: form.executionMode === "CYCLE" ? form.cycleValues || undefined : undefined,
        executeTime: form.executeTime || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        enabled: form.enabled,
        taskLimitMinutes: form.taskLimitMinutes,
        remark: form.remark.trim() || undefined,
      };
      saving.value = true;
      try {
        const api = await getVideoMonitorClient();
        if (!id.value) {
          await api.createAiInspectionPlan({
            ...base,
            immediateExecute: form.immediateExecute,
            cameras: selected,
            actionRules,
          });
        } else {
          const existingByDevice = new Map(existingCameras.value.map((item) => [item.deviceId, item]));
          const selectedIds = new Set(selectedCameraIds.value);
          await api.patchAiInspectionPlan(id.value, {
            base,
            cameraChanges: {
              add: selected.filter((item) => !existingByDevice.has(item.deviceId)),
              update: selected.flatMap((item) => {
                const previous = existingByDevice.get(item.deviceId);
                return previous?.id
                  ? [
                      {
                        id: previous.id,
                        algorithmId: item.algorithmId,
                        sort: item.sort,
                      },
                    ]
                  : [];
              }),
              removeIds: existingCameras.value
                .filter((item) => !selectedIds.has(item.deviceId) && item.id)
                .map((item) => item.id as string),
            },
            actionRuleChanges: {
              upsert: actionRules.map(({ enabled: _enabled, ...rule }) => rule),
              removeDeviceIds: [
                ...new Set(existingActionDeviceIds.value.filter((deviceId) => !actionRules.some((rule) => rule.deviceId === deviceId))),
              ],
            },
            version: form.version || undefined,
          });
        }
        message.success("保存成功");
        await router.push("/d/security-monitor/ai-inspection/plans");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const selectedCameras = computed(() => {
      const selected = new Set(selectedCameraIds.value);
      return cameras.value.filter((camera) => selected.has(camera.id));
    });

    const cameraColumns = [
      { title: "摄像头名称", dataIndex: "name", width: 220 },
      { title: "摄像头编码", dataIndex: "code", width: 160 },
      { title: "区域", dataIndex: "areaName", width: 180 },
      {
        title: "在线状态",
        width: 100,
        customRender: ({ record }: { record: CameraOption }) => record.onlineStatus || "--",
      },
      {
        title: "关联算法",
        width: 220,
        customRender: ({ record }: { record: CameraOption }) => (
          <Select
            disabled={!selectedCameraIds.value.includes(record.id)}
            style={{ width: "190px" }}
            value={cameraAlgorithms[record.id]}
            options={algorithms.value.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
            onUpdate:value={(value: unknown) => (cameraAlgorithms[record.id] = typeof value === "string" ? value : "")}
            placeholder="请选择算法"
          />
        ),
      },
      {
        title: "操作",
        width: 90,
        customRender: ({ record }: { record: CameraOption }) => (
          <Button
            type="link"
            danger
            onClick={() => {
              selectedCameraIds.value = selectedCameraIds.value.filter((cameraId) => cameraId !== record.id);
            }}
          >
            移除
          </Button>
        ),
      },
    ];

    const actionColumns = [
      { title: "摄像头名称", dataIndex: "name", width: 220 },
      {
        title: "识别算法",
        width: 180,
        customRender: ({ record }: { record: CameraOption }) =>
          algorithms.value.find((item) => item.id === cameraAlgorithms[record.id])?.name ?? "--",
      },
      {
        title: "异常处置",
        width: 150,
        customRender: ({ record }: { record: CameraOption }) => (
          <Select
            disabled={!selectedCameraIds.value.includes(record.id)}
            style={{ width: "120px" }}
            value={cameraActions[record.id]?.actionType ?? ""}
            options={[
              { label: "不处置", value: "" },
              { label: "生成报警", value: "ALARM" },
              { label: "生成工单", value: "WORK_ORDER" },
            ]}
            onUpdate:value={(value: unknown) => {
              const previous = cameraActions[record.id] ?? {
                actionType: "",
                targetId: "",
                confidencePercent: 80,
              };
              cameraActions[record.id] = {
                ...previous,
                actionType: typeof value === "string" ? value : "",
                targetId: "",
              };
              if (value === "WORK_ORDER") {
                void loadWorkOrderTemplates();
              }
            }}
          />
        ),
      },
      {
        title: "处置规则",
        width: 220,
        customRender: ({ record }: { record: CameraOption }) => {
          const action = cameraActions[record.id];
          if (!action?.actionType) {
            return "--";
          }
          const options = action.actionType === "ALARM" ? emergencyRules.value : workOrderTemplates.value;
          return (
            <Select
              disabled={!selectedCameraIds.value.includes(record.id)}
              style={{ width: "190px" }}
              value={action.targetId}
              options={options}
              onUpdate:value={(value: unknown) => (action.targetId = typeof value === "string" ? value : "")}
              placeholder={action.actionType === "ALARM" ? "请选择报警规则" : "请选择工单模板"}
            />
          );
        },
      },
      {
        title: "置信度阈值",
        width: 140,
        customRender: ({ record }: { record: CameraOption }) =>
          cameraActions[record.id]?.actionType ? (
            <InputNumber
              min={1}
              max={100}
              addonAfter="%"
              value={cameraActions[record.id].confidencePercent}
              onUpdate:value={(value: unknown) => (cameraActions[record.id].confidencePercent = Number(value) || 80)}
            />
          ) : (
            "--"
          ),
      },
    ];

    const validateBasicStep = (): boolean => {
      if (!form.name.trim()) {
        message.warning("请输入计划名称");
        return false;
      }
      if (!form.principalUserId) {
        message.warning("请选择负责人");
        return false;
      }
      if (form.executionMode === "ONCE" && !form.startTime) {
        message.warning("单次计划必须选择开始时间");
        return false;
      }
      if (form.startTime && form.endTime && form.endTime < form.startTime) {
        message.warning("结束时间必须晚于开始时间");
        return false;
      }
      if (form.executionMode === "CYCLE" && !form.executeTime) {
        message.warning("请选择执行时间");
        return false;
      }
      if (form.executionMode === "CYCLE" && form.cycleType !== "EVERY_DAY" && !form.cycleValues) {
        message.warning("请选择周期值");
        return false;
      }
      return true;
    };

    const validateCameraStep = (): boolean => {
      if (selectedCameraIds.value.length === 0) {
        message.warning("请至少选择一个摄像头");
        return false;
      }
      if (selectedCameraIds.value.some((cameraId) => !cameraAlgorithms[cameraId])) {
        message.warning("每个摄像头必须选择算法");
        return false;
      }
      return true;
    };

    const validateActionStep = (): boolean => {
      for (const cameraId of selectedCameraIds.value) {
        const action = cameraActions[cameraId];
        if (action?.actionType && !action.targetId) {
          message.warning(action.actionType === "ALARM" ? "请选择报警规则" : "请选择隐患单模板");
          return false;
        }
      }
      return true;
    };

    const nextStep = async (): Promise<void> => {
      if (currentStep.value === 0 && !validateBasicStep()) {
        return;
      }
      if (currentStep.value === 1 && !validateCameraStep()) {
        return;
      }
      currentStep.value += 1;
    };

    const openCameraPicker = async (): Promise<void> => {
      pickerSelectedIds.value = [...selectedCameraIds.value];
      cameraQuery.keyword = "";
      cameraQuery.pageNumber = 1;
      cameraPickerOpen.value = true;
      await loadCameraOptions();
    };

    const confirmCameraPicker = (): void => {
      selectedCameraIds.value = [...pickerSelectedIds.value];
      for (const cameraId of selectedCameraIds.value) {
        cameraAlgorithms[cameraId] ||= batchAlgorithmId.value || algorithms.value[0]?.id || "";
      }
      cameraPickerOpen.value = false;
    };

    const renderBasicStep = () => (
      <section class={styles.planWizardSection}>
        <h3>基础信息</h3>
        <Form layout="vertical" model={form}>
          <FormItem label="计划名称" required>
            <Input value={form.name} maxlength={100} onUpdate:value={(value: string) => (form.name = value)} />
          </FormItem>
          <FormItem label="负责人" required>
            <Select
              showSearch
              optionFilterProp="label"
              value={form.principalUserId}
              options={users.value}
              onUpdate:value={(value: unknown) => (form.principalUserId = typeof value === "string" ? value : "")}
              placeholder="请选择人员"
            />
          </FormItem>
          <div class={styles.planBasicRow}>
            <FormItem label="执行模式" required>
              <Select
                value={form.executionMode}
                options={[
                  { label: "单次", value: "ONCE" },
                  { label: "循环", value: "CYCLE" },
                ]}
                onUpdate:value={(value: unknown) => (form.executionMode = typeof value === "string" ? value : "CYCLE")}
              />
            </FormItem>
            <FormItem label="开始时间" required={form.executionMode === "ONCE"}>
              <DatePicker
                showTime
                valueFormat="YYYY-MM-DD HH:mm:ss"
                value={form.startTime || undefined}
                onUpdate:value={(value: unknown) => (form.startTime = typeof value === "string" ? value : "")}
              />
            </FormItem>
            <FormItem label="结束时间">
              <DatePicker
                showTime
                valueFormat="YYYY-MM-DD HH:mm:ss"
                value={form.endTime || undefined}
                onUpdate:value={(value: unknown) => (form.endTime = typeof value === "string" ? value : "")}
              />
            </FormItem>
            {form.executionMode === "CYCLE" ? (
              <FormItem label="循环周期" required>
                <Select
                  value={form.cycleType}
                  options={[
                    { label: "每日", value: "EVERY_DAY" },
                    { label: "每周", value: "EVERY_WEEK" },
                    { label: "每月", value: "EVERY_MONTH" },
                  ]}
                  onUpdate:value={(value: unknown) => {
                    form.cycleType = typeof value === "string" ? value : "EVERY_DAY";
                    form.cycleValues = "";
                  }}
                />
              </FormItem>
            ) : null}
            {form.executionMode === "CYCLE" ? (
              <FormItem label="执行时间" required>
                <TimePicker
                  format="HH:mm"
                  valueFormat="HH:mm:ss"
                  value={form.executeTime || undefined}
                  onUpdate:value={(value: unknown) => (form.executeTime = typeof value === "string" ? value : "")}
                />
              </FormItem>
            ) : null}
            <FormItem label="任务时限（分钟）">
              <InputNumber
                min={1}
                max={1440}
                value={form.taskLimitMinutes}
                onUpdate:value={(value: unknown) => (form.taskLimitMinutes = Number(value) || 60)}
              />
            </FormItem>
            <FormItem label="是否启用">
              <Switch checked={form.enabled} onUpdate:checked={(value: unknown) => (form.enabled = value === true)} />
            </FormItem>
            {!id.value ? (
              <FormItem label="保存后立即执行一次">
                <Switch checked={form.immediateExecute} onUpdate:checked={(value: unknown) => (form.immediateExecute = value === true)} />
              </FormItem>
            ) : null}
          </div>
          {form.executionMode === "CYCLE" && form.cycleType !== "EVERY_DAY" ? (
            <FormItem label={form.cycleType === "EVERY_WEEK" ? "执行星期" : "执行日期"} required>
              <Select
                mode="multiple"
                value={form.cycleValues ? form.cycleValues.split(",") : []}
                options={
                  form.cycleType === "EVERY_WEEK"
                    ? [
                        { label: "周日", value: "SUN" },
                        { label: "周一", value: "MON" },
                        { label: "周二", value: "TUE" },
                        { label: "周三", value: "WED" },
                        { label: "周四", value: "THU" },
                        { label: "周五", value: "FRI" },
                        { label: "周六", value: "SAT" },
                      ]
                    : Array.from({ length: 31 }, (_, index) => ({
                        label: `${index + 1}日`,
                        value: String(index + 1),
                      }))
                }
                onUpdate:value={(value: unknown) => (form.cycleValues = Array.isArray(value) ? value.map(String).join(",") : "")}
              />
            </FormItem>
          ) : null}
          <FormItem label="备注">
            <Input.TextArea rows={2} value={form.remark} maxlength={500} onUpdate:value={(value: string) => (form.remark = value)} />
          </FormItem>
        </Form>
      </section>
    );

    const renderCameraStep = () => (
      <section class={styles.planWizardSection}>
        <div class={styles.planWizardToolbar}>
          <h3>巡检内容</h3>
          <Space class={styles.planCameraActions} size={8}>
            <Select
              value={batchAlgorithmId.value || undefined}
              options={algorithms.value.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
              placeholder="批量应用算法"
              onUpdate:value={(value: unknown) => {
                batchAlgorithmId.value = typeof value === "string" ? value : "";
                if (batchAlgorithmId.value) {
                  selectedCameraIds.value.forEach((cameraId) => {
                    cameraAlgorithms[cameraId] = batchAlgorithmId.value;
                  });
                }
              }}
            />
            <Button type="primary" onClick={() => void openCameraPicker()}>
              选择摄像头
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          dataSource={selectedCameras.value}
          columns={cameraColumns}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "请选择摄像头" }}
        />
      </section>
    );

    const renderActionStep = () => (
      <section class={styles.planWizardSection}>
        <h3>自动处置</h3>
        <p class={styles.planWizardHint}>可按摄像头配置异常后的自动处置；不需要自动处置时保持“不处置”即可。</p>
        <Table
          rowKey="id"
          dataSource={selectedCameras.value}
          columns={actionColumns}
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "暂无已选摄像头" }}
        />
      </section>
    );

    onMounted(() => void load());
    return () => {
      const slots = {
        "layout-header": () => <Button onClick={() => router.push("/d/security-monitor/ai-inspection/plans")}>返回</Button>,
        "layout-content": () => (
          <>
            <div class={styles.planWizard}>
              <div class={styles.planWizardSteps}>
                <Steps current={currentStep.value} items={[{ title: "基础信息" }, { title: "巡检内容" }, { title: "自动处置" }]} />
              </div>
              <div class={styles.planWizardBody}>
                {loading.value ? <div class={styles.planWizardLoading}>加载中...</div> : null}
                {!loading.value && currentStep.value === 0 ? renderBasicStep() : null}
                {!loading.value && currentStep.value === 1 ? renderCameraStep() : null}
                {!loading.value && currentStep.value === 2 ? renderActionStep() : null}
              </div>
            </div>
            <Modal
              open={cameraPickerOpen.value}
              title="选择摄像头"
              width={880}
              okText="确定"
              cancelText="取消"
              onOk={confirmCameraPicker}
              onCancel={() => (cameraPickerOpen.value = false)}
            >
              <div class={styles.cameraPickerToolbar}>
                <Input
                  allowClear
                  value={cameraQuery.keyword}
                  placeholder="搜索摄像头名称或编码"
                  onUpdate:value={(value: string) => (cameraQuery.keyword = value)}
                  onPressEnter={() => {
                    cameraQuery.pageNumber = 1;
                    void loadCameraOptions();
                  }}
                />
                <Button
                  type="primary"
                  onClick={() => {
                    cameraQuery.pageNumber = 1;
                    void loadCameraOptions();
                  }}
                >
                  查询
                </Button>
              </div>
              <Table
                rowKey="id"
                loading={cameraLoading.value}
                dataSource={cameraRows.value}
                columns={[
                  { title: "摄像头名称", dataIndex: "name" },
                  { title: "摄像头编码", dataIndex: "code" },
                  { title: "区域", dataIndex: "areaName" },
                  { title: "在线状态", dataIndex: "onlineStatus" },
                ]}
                pagination={{
                  current: cameraQuery.pageNumber,
                  pageSize: cameraQuery.pageSize,
                  total: cameraQuery.total,
                  showSizeChanger: true,
                  onChange: (page: number, pageSize: number) => {
                    cameraQuery.pageNumber = page;
                    cameraQuery.pageSize = pageSize;
                    void loadCameraOptions();
                  },
                }}
                rowSelection={{
                  selectedRowKeys: pickerSelectedIds.value,
                  preserveSelectedRowKeys: true,
                  onChange: (keys: (string | number)[]) => (pickerSelectedIds.value = keys.map(String)),
                }}
              />
            </Modal>
          </>
        ),
        "footer-page": () => (
          <Space>
            {currentStep.value > 0 ? <Button onClick={() => (currentStep.value -= 1)}>上一步</Button> : null}
            {currentStep.value < 2 ? (
              <Button type="primary" onClick={() => void nextStep()}>
                下一步
              </Button>
            ) : (
              <Button type="primary" loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
            )}
          </Space>
        ),
      };
      return <PageLayout title={id.value ? "编辑巡检计划" : "新增巡检计划"} v-slots={slots} />;
    };
  },
});

export const AiInspectionTaskListPage = defineComponent({
  name: "AiInspectionTaskListPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const rows = ref<InspectionTask[]>([]);
    const tableViewportRef = ref<HTMLElement>();
    const tableBodyHeight = ref(480);
    const query = reactive({
      planId: typeof route.query.planId === "string" ? route.query.planId : "",
      keyword: "",
      status: "",
      period: [] as string[],
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const updateTableBodyHeight = (): void => {
      const tableViewport = tableViewportRef.value;
      if (!(tableViewport instanceof HTMLElement)) {
        return;
      }
      const tableHeaderHeight = 55;
      const horizontalScrollHeight = 18;
      const reservedGap = 8;
      const availableHeight = tableViewport.clientHeight;
      tableBodyHeight.value = Math.max(240, Math.floor(availableHeight - tableHeaderHeight - horizontalScrollHeight - reservedGap));
    };
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const page = asPage<InspectionTask>(
          await (
            await getVideoMonitorClient()
          ).listAiInspectionTasks({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            planId: query.planId || undefined,
            keyword: query.keyword.trim() || undefined,
            status: query.status || undefined,
            period: query.period.length === 2 ? query.period.join(",") : undefined,
          }),
        );
        rows.value = page.records;
        query.total = page.total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载巡检任务失败");
      } finally {
        loading.value = false;
      }
    };
    const columns = [
      { title: "任务ID", dataIndex: "id", width: 210, ellipsis: true },
      { title: "计划名称", dataIndex: "planName", width: 220, ellipsis: true },
      {
        title: "执行类型",
        width: 120,
        customRender: ({ record }: { record: InspectionTask }) => EXECUTION_TYPE_LABEL[record.executionType ?? ""] ?? "--",
      },
      {
        title: "应执行时间",
        width: 180,
        customRender: ({ record }: { record: InspectionTask }) => displayDateTime(record.scheduledTime),
      },
      {
        title: "开始时间",
        width: 180,
        customRender: ({ record }: { record: InspectionTask }) => displayDateTime(record.startTime),
      },
      {
        title: "结束时间",
        width: 180,
        customRender: ({ record }: { record: InspectionTask }) => displayDateTime(record.endTime),
      },
      {
        title: "状态",
        width: 110,
        customRender: ({ record }: { record: InspectionTask }) => (
          <Tag color={statusColor(record.status)}>{record.timeout ? "超时" : (TASK_STATUS_LABEL[record.status ?? ""] ?? "--")}</Tag>
        ),
      },
      { title: "摄像头数", dataIndex: "totalNum", width: 100 },
      { title: "正常", dataIndex: "normalNum", width: 80 },
      { title: "异常", dataIndex: "abnormalNum", width: 80 },
      { title: "失败", dataIndex: "failNum", width: 80 },
      {
        title: "操作",
        width: 90,
        fixed: "right" as const,
        customRender: ({ record }: { record: InspectionTask }) => (
          <Button type="link" onClick={() => router.push(`/d/security-monitor/ai-inspection/tasks/${record.id}`)}>
            详情
          </Button>
        ),
      },
    ];
    onMounted(async () => {
      await nextTick();
      updateTableBodyHeight();
      window.addEventListener("resize", updateTableBodyHeight);
      void load();
    });
    onBeforeUnmount(() => window.removeEventListener("resize", updateTableBodyHeight));
    return () => {
      const slots = {
        "layout-content": () => (
          <div class={styles.taskListContent}>
            <div class={styles.filterBar}>
              <Input
                class={styles.search}
                value={query.keyword}
                allowClear
                placeholder="请输入计划名称"
                onUpdate:value={(value: string) => (query.keyword = value)}
              />
              <Select
                style={{ width: "170px" }}
                value={query.status}
                options={[
                  { label: "全部状态", value: "" },
                  ...Object.entries(TASK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
                ]}
                onUpdate:value={(value: unknown) => (query.status = typeof value === "string" ? value : "")}
              />
              {h(RangePicker as Component, {
                value: query.period,
                "onUpdate:value": (value: unknown) => (query.period = Array.isArray(value) ? value.map(String) : []),
              })}
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  query.keyword = "";
                  query.status = "";
                  query.period = [];
                  query.planId = "";
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <div ref={tableViewportRef} class={styles.taskListTable}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows.value}
                loading={loading.value}
                scroll={{ x: 1600, y: tableBodyHeight.value }}
                pagination={false}
              />
            </div>
          </div>
        ),
        "footer-page": () => (
          <Page
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={query.total}
            showQuickJumper={false}
            showSizeChanger
            showTotal={(total: number) => `共 ${total} 条`}
            pageSizeOptions={["10", "20", "50", "100"]}
            onPageChange={(page: number, size: number) => {
              query.pageNumber = page;
              query.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return <PageLayout title="巡检任务" v-slots={slots} />;
    };
  },
});

export const AiInspectionTaskDetailPage = defineComponent({
  name: "AiInspectionTaskDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const task = ref<InspectionTask | null>(null);
    const events = ref<InspectionEvent[]>([]);
    const id = computed(() => (typeof route.params.id === "string" ? route.params.id : ""));
    const previewImageUrl = shallowRef("");
    const previewVisible = shallowRef(false);
    const previewLoadingUrl = shallowRef("");
    let previewRequestId = 0;
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const api = await getVideoMonitorClient();
        task.value = asRecord(await api.getAiInspectionTask(id.value)) as unknown as InspectionTask;
        events.value = asPage<InspectionEvent>(
          await api.listAiInspectionEvents({
            taskId: id.value,
            pageNumber: 1,
            pageSize: 1000,
          }),
        ).records;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "巡检任务详情加载失败");
      } finally {
        loading.value = false;
      }
    };
    const getSnapshotPreviewUrl = (url?: string): string => {
      const trimmed = url?.trim() ?? "";
      if (!trimmed) {
        return "";
      }
      if (/^(?:https?:|data:|blob:)/iu.test(trimmed)) {
        return trimmed;
      }
      if (trimmed.startsWith("/resource/")) {
        return resolveSecurityMonitorResourceUrl(trimmed);
      }
      if (trimmed.startsWith("resource/")) {
        return resolveSecurityMonitorResourceUrl(`/${trimmed}`);
      }
      if (trimmed.startsWith("v1/")) {
        return resolveSecurityMonitorResourceUrl(`/resource/${trimmed}`);
      }
      return trimmed;
    };
    const preloadSnapshotImage = (url: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const image = new window.Image();
        const timer = window.setTimeout(() => {
          image.onload = null;
          image.onerror = null;
          reject(new Error("snapshot preview timeout"));
        }, SNAPSHOT_PREVIEW_TIMEOUT_MS);

        image.onload = () => {
          window.clearTimeout(timer);
          resolve();
        };
        image.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error("snapshot preview failed"));
        };
        image.src = url;
      });
    const openSnapshotPreview = async (url?: string): Promise<void> => {
      console.log("openSnapshotPreview", url);
      const previewUrl = getSnapshotPreviewUrl(url);
      if (!previewUrl) {
        message.warning("暂无抓拍图");
        return;
      }

      const requestId = ++previewRequestId;
      previewLoadingUrl.value = previewUrl;

      try {
        await preloadSnapshotImage(previewUrl);
        if (requestId !== previewRequestId) {
          return;
        }
        previewImageUrl.value = previewUrl;
        previewVisible.value = true;
      } catch {
        if (requestId === previewRequestId) {
          message.warning("抓拍图无法访问");
        }
      } finally {
        if (requestId === previewRequestId) {
          previewLoadingUrl.value = "";
        }
      }
    };
    const handlePreviewVisibleChange = (visible: boolean): void => {
      previewVisible.value = visible;
      if (!visible) {
        previewImageUrl.value = "";
      }
    };
    onMounted(() => void load());
    const cameraColumns = [
      {
        title: "摄像头",
        width: 180,
        customRender: ({ record }: { record: InspectionTaskCamera }) => record.deviceNameSnapshot ?? record.deviceCodeSnapshot ?? "--",
      },
      { title: "编码", dataIndex: "deviceCodeSnapshot", width: 160 },
      { title: "区域", dataIndex: "areaNameSnapshot", width: 160 },
      { title: "算法", dataIndex: "algorithmNameSnapshot", width: 160 },
      {
        title: "置信度",
        width: 110,
        customRender: ({ record }: { record: InspectionTaskCamera }) =>
          record.confidence === undefined ? "--" : `${Math.round(record.confidence * (record.confidence <= 1 ? 100 : 1))}%`,
      },
      { title: "AI摘要", dataIndex: "aiSummary", width: 240, ellipsis: true },
      {
        title: "状态",
        width: 110,
        customRender: ({ record }: { record: InspectionTaskCamera }) => (
          <Tag color={statusColor(record.status)}>{CAMERA_STATUS_LABEL[record.status ?? ""] ?? "--"}</Tag>
        ),
      },
      { title: "失败原因", dataIndex: "errorMessage", ellipsis: true },
      {
        title: "抓拍图",
        width: 110,
        customRender: ({ record }: { record: InspectionTaskCamera }) => {
          const previewUrl = getSnapshotPreviewUrl(record.previewUrl);
          return previewUrl ? (
            <Button
              type="link"
              size="small"
              loading={previewLoadingUrl.value === previewUrl}
              onClick={() => void openSnapshotPreview(previewUrl)}
            >
              查看
            </Button>
          ) : (
            "--"
          );
        },
      },
    ];
    const eventColumns = [
      {
        title: "发生时间",
        width: 180,
        customRender: ({ record }: { record: InspectionEvent }) => displayDateTime(record.createTime),
      },
      { title: "摄像头", dataIndex: "deviceNameSnapshot", width: 180 },
      { title: "区域", dataIndex: "areaNameSnapshot", width: 160 },
      { title: "算法", dataIndex: "algorithmNameSnapshot", width: 160 },
      {
        title: "置信度",
        width: 110,
        customRender: ({ record }: { record: InspectionEvent }) =>
          record.confidence === undefined ? "--" : `${Math.round(record.confidence * (record.confidence <= 1 ? 100 : 1))}%`,
      },
      { title: "摘要", dataIndex: "aiSummary", width: 240, ellipsis: true },
      {
        title: "处置状态",
        width: 120,
        customRender: ({ record }: { record: InspectionEvent }) => (
          <Tag color={statusColor(record.actionStatus)}>{ACTION_STATUS_LABEL[record.actionStatus ?? ""] ?? "--"}</Tag>
        ),
      },
      {
        title: "忽略",
        width: 90,
        customRender: ({ record }: { record: InspectionEvent }) => (record.ignored ? <Tag color="warning">已忽略</Tag> : <Tag>否</Tag>),
      },
    ];
    return () => {
      const slots = {
        "layout-header": () => (
          <Space>
            <Button onClick={() => void load()}>刷新</Button>
            <Button onClick={() => router.push("/d/security-monitor/ai-inspection/tasks")}>返回</Button>
          </Space>
        ),
        "layout-content": () => (
          <div class={styles.taskDetailContent}>
            <div class={styles.taskDescription}>
              <div class={styles.taskDescriptionItem}>
                <span>任务ID</span>
                <strong>{task.value?.id ?? "--"}</strong>
              </div>
              <div class={styles.taskDescriptionItem}>
                <span>计划名称</span>
                <strong>{task.value?.planName ?? "--"}</strong>
              </div>
              <div class={styles.taskDescriptionItem}>
                <span>状态</span>
                <strong>
                  <Tag color={statusColor(task.value?.status)}>
                    {task.value?.timeout ? "超时" : (TASK_STATUS_LABEL[task.value?.status ?? ""] ?? "--")}
                  </Tag>
                </strong>
              </div>
              <div class={styles.taskDescriptionItem}>
                <span>应执行时间</span>
                <strong>{displayDateTime(task.value?.scheduledTime)}</strong>
              </div>
              <div class={styles.taskDescriptionItem}>
                <span>开始时间</span>
                <strong>{displayDateTime(task.value?.startTime)}</strong>
              </div>
              <div class={styles.taskDescriptionItem}>
                <span>结束时间</span>
                <strong>{displayDateTime(task.value?.endTime)}</strong>
              </div>
            </div>
            <div class={styles.taskStats}>
              {[
                ["总数", task.value?.totalNum ?? 0],
                ["正常", task.value?.normalNum ?? 0],
                ["异常", task.value?.abnormalNum ?? 0],
                ["失败", task.value?.failNum ?? 0],
              ].map(([label, value]) => (
                <div class={styles.taskStat}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <section class={styles.taskDetailSection}>
              <h3>摄像头执行结果</h3>
              <Table
                rowKey="id"
                loading={loading.value}
                columns={cameraColumns}
                dataSource={task.value?.cameras ?? []}
                scroll={{ x: 1450 }}
                pagination={false}
              />
            </section>
            <section class={styles.taskDetailSection}>
              <div class={styles.taskSectionHeader}>
                <h3>异常事件</h3>
                {events.value.length > 0 ? (
                  <Button type="link" onClick={() => router.push(`/d/security-monitor/ai-inspection/events?taskId=${id.value}`)}>
                    查看全部
                  </Button>
                ) : null}
              </div>
              <Table rowKey="id" columns={eventColumns} dataSource={events.value} scroll={{ x: 1250 }} pagination={{ pageSize: 10 }} />
            </section>
            {previewImageUrl.value ? (
              <Image
                style={{ display: "none" }}
                src={previewImageUrl.value}
                preview={{
                  visible: previewVisible.value,
                  onVisibleChange: handlePreviewVisibleChange,
                }}
              />
            ) : null}
          </div>
        ),
      };
      return <PageLayout title="巡检任务详情" v-slots={slots} showFooter={false} />;
    };
  },
});

export const AiInspectionEventListPage = defineComponent({
  name: "AiInspectionEventListPage",
  setup() {
    const route = useRoute();
    const loading = ref(false);
    const rows = ref<InspectionEvent[]>([]);
    const emergencyRules = ref<{ label: string; value: string }[]>([]);
    const workOrderTemplates = ref<{ label: string; value: string }[]>([]);
    const query = reactive({
      taskId: typeof route.query.taskId === "string" ? route.query.taskId : "",
      actionStatus: "",
      ignored: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const api = await getVideoMonitorClient();
        const [eventResult, emergencyResult, templateResult] = await Promise.all([
          api.listAiInspectionEvents({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            taskId: query.taskId || undefined,
            actionStatus: query.actionStatus || undefined,
            ignored: query.ignored === "" ? undefined : query.ignored === "true",
          }),
          api.listAiInspectionEmergencyRules({
            pageNumber: 1,
            pageSize: 1000,
            applicationCode: "SECURITY_MONITORING",
          }),
          api.listAiInspectionWorkOrderTemplates({
            pageNumber: 1,
            pageSize: 1000,
            status: "ENABLED",
          }),
        ]);
        const page = asPage<InspectionEvent>(eventResult);
        rows.value = page.records;
        query.total = page.total;
        emergencyRules.value = asPage<RecordMap>(emergencyResult)
          .records.map((item) => ({ label: nameOf(item), value: idOf(item) }))
          .filter((item) => item.value);
        workOrderTemplates.value = asPage<RecordMap>(templateResult)
          .records.map((item) => ({ label: nameOf(item), value: idOf(item) }))
          .filter((item) => item.value);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "异常事件加载失败");
      } finally {
        loading.value = false;
      }
    };
    const ignore = (row: InspectionEvent): void => {
      const reason = ref("");
      void callSecurityPcUi("Modal", "confirm", {
        title: "忽略异常事件",
        content: () => (
          <Input value={reason.value} onUpdate:value={(value: string) => (reason.value = value)} placeholder="请输入忽略原因" />
        ),
        async onOk() {
          await (
            await getVideoMonitorClient()
          ).ignoreAiInspectionEvent(row.id, {
            reason: reason.value.trim() || undefined,
          });
          message.success("已忽略");
          await load();
        },
      });
    };
    const generateAction = (row: InspectionEvent): void => {
      const action = reactive({ actionType: "ALARM", targetId: "" });
      void callSecurityPcUi("Modal", "confirm", {
        title: "生成异常处置",
        width: 520,
        content: () => (
          <Form layout="vertical">
            <FormItem label="处置方式" required>
              <Select
                value={action.actionType}
                options={[
                  { label: "生成报警", value: "ALARM" },
                  { label: "生成工单", value: "WORK_ORDER" },
                ]}
                onUpdate:value={(value: unknown) => {
                  action.actionType = typeof value === "string" ? value : "ALARM";
                  action.targetId = "";
                }}
              />
            </FormItem>
            <FormItem label={action.actionType === "ALARM" ? "报警规则" : "工单模板"} required>
              <Select
                value={action.targetId}
                options={action.actionType === "ALARM" ? emergencyRules.value : workOrderTemplates.value}
                onUpdate:value={(value: unknown) => (action.targetId = typeof value === "string" ? value : "")}
              />
            </FormItem>
          </Form>
        ),
        async onOk() {
          if (!action.targetId) {
            throw new Error(action.actionType === "ALARM" ? "请选择报警规则" : "请选择工单模板");
          }
          await (
            await getVideoMonitorClient()
          ).generateAiInspectionEventAction(row.id, {
            actionType: action.actionType,
            emergencyRuleId: action.actionType === "ALARM" ? action.targetId : undefined,
            workOrderTemplateId: action.actionType === "WORK_ORDER" ? action.targetId : undefined,
          });
          message.success("处置已生成");
          await load();
        },
      });
    };
    const columns = [
      {
        title: "抓拍",
        width: 110,
        customRender: ({ record }: { record: InspectionEvent }) =>
          record.previewUrl ? (
            <a href={record.previewUrl} target="_blank" rel="noreferrer">
              查看
            </a>
          ) : (
            "--"
          ),
      },
      { title: "摄像头", dataIndex: "deviceNameSnapshot", width: 180 },
      { title: "区域", dataIndex: "areaNameSnapshot", width: 160 },
      { title: "算法", dataIndex: "algorithmNameSnapshot", width: 140 },
      {
        title: "置信度",
        width: 100,
        customRender: ({ record }: { record: InspectionEvent }) =>
          record.confidence === undefined ? "--" : `${Math.round(record.confidence * (record.confidence <= 1 ? 100 : 1))}%`,
      },
      { title: "AI 分析", dataIndex: "aiSummary", width: 260, ellipsis: true },
      {
        title: "处理状态",
        width: 120,
        customRender: ({ record }: { record: InspectionEvent }) => (
          <Tag color={record.ignored ? "default" : statusColor(record.actionStatus)}>
            {record.ignored ? "已忽略" : (ACTION_STATUS_LABEL[record.actionStatus ?? ""] ?? "未处理")}
          </Tag>
        ),
      },
      {
        title: "发生时间",
        width: 180,
        customRender: ({ record }: { record: InspectionEvent }) => displayDateTime(record.createTime),
      },
      {
        title: "操作",
        width: 180,
        fixed: "right" as const,
        customRender: ({ record }: { record: InspectionEvent }) =>
          !record.ignored ? (
            <Space>
              <Button type="link" onClick={() => generateAction(record)}>
                生成处置
              </Button>
              <Button type="link" onClick={() => ignore(record)}>
                忽略
              </Button>
            </Space>
          ) : (
            "--"
          ),
      },
    ];
    onMounted(() => void load());
    return () => {
      const slots = {
        "layout-content": () => (
          <>
            <div class={styles.filterBar}>
              <Select
                style={{ width: "170px" }}
                value={query.actionStatus}
                options={[
                  { label: "全部处理状态", value: "" },
                  ...Object.entries(ACTION_STATUS_LABEL).map(([value, label]) => ({ value, label })),
                ]}
                onUpdate:value={(value: unknown) => (query.actionStatus = typeof value === "string" ? value : "")}
              />
              <Select
                style={{ width: "150px" }}
                value={query.ignored}
                options={[
                  { label: "全部事件", value: "" },
                  { label: "未忽略", value: "false" },
                  { label: "已忽略", value: "true" },
                ]}
                onUpdate:value={(value: unknown) => (query.ignored = typeof value === "string" ? value : "")}
              />
              <Button
                type="primary"
                onClick={() => {
                  query.pageNumber = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  query.actionStatus = "";
                  query.ignored = "";
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={rows.value}
              loading={loading.value}
              scroll={{ x: 1450 }}
              pagination={{
                current: query.pageNumber,
                pageSize: query.pageSize,
                total: query.total,
                showSizeChanger: true,
                onChange: (page: number, size: number) => {
                  query.pageNumber = page;
                  query.pageSize = size;
                  void load();
                },
              }}
            />
          </>
        ),
      };
      return <PageLayout title="异常事件" v-slots={slots} />;
    };
  },
});
