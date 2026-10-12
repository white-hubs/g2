import type {
  FireHostAlarmRecord,
  FireHostIndicatorLightConfigRecord,
  FireHostOverviewRecord,
  FirePointControlCommandRecord,
  FirePointControlDeviceRecord,
  FireUtilityMonitorCardRecord,
  FireUtilityPanelItemRecord,
  FireUtilityPanelItemParam,
} from "@g2-contract/fire-management";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";

import type {
  AttendanceRecord,
  ControlDevice,
  ControlDevicePanel,
  ControlAction,
  FireHostId,
  MonitorMetricDevice,
  MonitorPoint,
  RemoteControlTab,
} from "../models";
import { useEventRecords } from "./use-event-records";
import { useHostConfiguration } from "./use-host-configuration";
import { useOperationLogs } from "./use-operation-logs";
import {
  getFireHostIndicatorLightConfig,
  getFirePointControlCommandStatus,
  getFireUtilityPanel,
  listEvents,
  listFireControlPoints,
  listFireHostAlarmRecords,
  listFireHostOverviews,
  listFireUtilityDeviceProperties,
  listFireUtilityMonitorCards,
  saveFireUtilityPanel,
  saveFireUtilityDevices,
  sendFireHostControlCommand,
  sendFirePointControlCommand,
  updateFireUtilityRange,
} from "@/api/server";
import { message } from "@/pc-ui-runtime";
import { normalizeFireEventType } from "@/utils/fire-event";

const HOST_PAGE_SIZE = 20;
const CONTROL_POINT_PAGE_SIZE = 20;
const COMMAND_POLL_INTERVAL = 1000;
const COMMAND_POLL_LIMIT = 15;
const TERMINAL_COMMAND_STATUSES = new Set(["SUCCESS", "FAIL", "REJECT", "EXPIRED"]);
const DEFAULT_INDICATOR_BUTTONS = [
  { code: "", name: "启动反馈" },
  { code: "", name: "故障" },
  { code: "", name: "运行" },
];

const replaceDevice = (devices: ControlDevice[], id: string, patch: Partial<ControlDevice>): ControlDevice[] =>
  devices.map((device) => (device.id === id ? { ...device, ...patch } : device));

const mapHostOverview = (record: FireHostOverviewRecord): import("../models").FireHostOption => ({
  id: record.id,
  deviceName: record.deviceName || "未命名消防主机",
  deviceCode: record.deviceCode || "--",
  areaName: record.deviceLocation || "--",
  brandName: record.brandName || "--",
  online: Boolean(record.online),
  fireCount: Number(record.fireCount || 0),
  faultCount: Number(record.faultCount || 0),
  controlPasswordRequired: Boolean(record.controlPasswordRequired),
});

const mapControlPoint = (record: FirePointControlDeviceRecord): ControlDevice => {
  const statusMap: Record<FirePointControlDeviceRecord["controlStatus"], Pick<ControlDevice, "status" | "statusText">> = {
    RUNNING: { status: "run", statusText: "运行中" },
    STOPPED: { status: "stop", statusText: "已停止" },
    FAULT: { status: "flt", statusText: "设备故障" },
    UNKNOWN: { status: "unknown", statusText: record.online ? "状态未知" : "设备离线" },
  };
  return {
    id: String(record.id),
    name: record.pointName || record.pointCode || record.code || "未命名控制点",
    type: record.brandName || "未分类",
    panel: record.busType === "2" ? "multi" : "bus",
    location: record.location || "--",
    online: Boolean(record.online),
    controlReady: Boolean(record.controlReady),
    ...statusMap[record.controlStatus || "UNKNOWN"],
  };
};

const formatCollectedTime = (value?: number): string =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }).slice(5) : "--";

const formatEventTime = (value?: string): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replaceAll("/", "-");
};

const mapUtilityCard = (record: FireUtilityMonitorCardRecord): MonitorMetricDevice => ({
  id: String(record.relationId),
  relationId: String(record.relationId),
  deviceId: String(record.deviceId),
  name: record.deviceName || "未命名监测设备",
  icon: record.monitorType === "WATER" ? "💧" : "⚡",
  category: record.metricPropName || record.status,
  updatedAt: formatCollectedTime(record.collectionTime),
  selectedPointId: record.metricPropCode || "",
  points: [
    {
      id: record.metricPropCode || "metric",
      label: record.metricPropName || "未配置监测属性",
      value: Number(record.currentValue ?? 0),
      unit: record.metricUnit || "",
      min: Number(record.referenceMin ?? 0),
      max: Number(record.referenceMax ?? 100),
    },
  ],
});

const mapUtilityPanelItem = (record: FireUtilityPanelItemRecord, monitorType: "WATER" | "ELECTRIC"): MonitorMetricDevice => ({
  id: String(record.relationId),
  relationId: String(record.relationId),
  deviceId: record.deviceId == null ? undefined : String(record.deviceId),
  name: record.deviceName || "未命名监测设备",
  icon: monitorType === "WATER" ? "💧" : "⚡",
  category: record.metricPropName || "未配置监测属性",
  updatedAt: "--",
  selectedPointId: record.metricPropCode || "",
  points: [
    {
      id: record.metricPropCode || "unconfigured",
      label: record.metricPropName || "请在面板配置中选择监测属性",
      value: 0,
      unit: record.metricUnit || "",
      min: Number(record.referenceMin ?? 0),
      max: Number(record.referenceMax ?? 0),
    },
  ],
});

const mergeUtilityCards = (
  cards: FireUtilityMonitorCardRecord[],
  panelItems: FireUtilityPanelItemRecord[],
  monitorType: "WATER" | "ELECTRIC",
): MonitorMetricDevice[] => {
  const devices = new Map(cards.map((card) => [String(card.relationId), mapUtilityCard(card)]));
  panelItems.forEach((item) => {
    const relationId = String(item.relationId);
    if (!devices.has(relationId)) devices.set(relationId, mapUtilityPanelItem(item, monitorType));
  });
  return [...devices.values()];
};

const mapAttendanceRecord = (record: FireHostAlarmRecord): AttendanceRecord => ({
  id: String(record.id),
  type: record.alarmTypeName || record.alarmEventName || record.alarmEvent || "报警",
  level: record.alarmLevelName || "--",
  area: record.areaName || record.area || "--",
  location: record.alarmTargetAddress || "--",
  time: formatEventTime(record.alarmTime),
  deadline: record.timeoutProcessTimesName || "--",
  timeout: record.alarmHandlerTimeoutStatusName || (record.alarmHandlerTimeoutStatus === "TIMED_OUT" ? "超时" : "正常"),
  status: record.alarmStatusName || "--",
  handler: record.alarmHandlerName || "--",
  notifier: record.alarmConfirmedName || "--",
  rule: record.alarmEventName || record.alarmEvent || "--",
  alarmValue: record.alarmThreshold || "--",
  deviceName: record.alarmTargetName || "--",
});

const createRequestId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `fire-control-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const wait = async (milliseconds: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function useFireHostControl() {
  const activeTab = shallowRef<RemoteControlTab>("ctrl");
  const currentHostId = shallowRef<FireHostId>("");
  const preferredHostId = shallowRef("");
  const hostConfiguration = useHostConfiguration(currentHostId);
  const eventRecords = useEventRecords(currentHostId);
  const operationLogs = useOperationLogs(currentHostId);
  const hostList = ref<import("../models").FireHostOption[]>([]);
  const hostTotal = shallowRef(0);
  const hostPageNumber = shallowRef(0);
  const hostPages = shallowRef(0);
  const isHostLoading = shallowRef(false);
  const isHostLoadingMore = shallowRef(false);
  const devicesList = ref<ControlDevice[]>([]);
  const controlDevicePanel = shallowRef<ControlDevicePanel>("bus");
  const controlPointTotal = shallowRef(0);
  const controlPointPageNumber = shallowRef(0);
  const controlPointPages = shallowRef(0);
  const isControlPointLoading = shallowRef(false);
  const isControlPointLoadingMore = shallowRef(false);
  const indicatorLightConfig = shallowRef<FireHostIndicatorLightConfigRecord>({
    fireManageDeviceId: "",
    indicatorCount: 3,
    indicatorButtons: DEFAULT_INDICATOR_BUTTONS.map((button) => ({ ...button })),
  });
  const isIndicatorLightConfigLoading = shallowRef(false);
  const eventsList = ref<import("../models").FireEventViewModel[]>([]);
  const waterMetrics = ref<MonitorMetricDevice[]>([]);
  const electricMetrics = ref<MonitorMetricDevice[]>([]);
  const attendanceRecords = ref<AttendanceRecord[]>([]);
  const attendanceKeyword = shallowRef("");
  const attendanceAlarmEventName = shallowRef("");
  const attendancePeriod = shallowRef("");
  const attendancePageNumber = shallowRef(1);
  const attendancePageSize = shallowRef(10);
  const attendanceTotal = shallowRef(0);
  const isAttendanceLoading = shallowRef(false);

  const currentVideoIndex = shallowRef(0);
  const isFullScreenVideo = shallowRef(false);
  const isPasswordModalVisible = shallowRef(false);
  const passwordInput = shallowRef("");
  const showPassword = shallowRef(false);
  const passwordActionName = shallowRef("");
  const passwordIsDanger = shallowRef(false);
  const passwordErrorMessage = shallowRef("");
  const isPasswordSubmitting = shallowRef(false);
  const pendingAction = shallowRef<((password?: string) => Promise<void>) | null>(null);
  const isHostCommandPending = shallowRef(false);
  let isDisposed = false;
  let controlPointRequestVersion = 0;
  let attendanceRequestVersion = 0;

  const isDevicePickerVisible = shallowRef(false);
  const pickerTarget = shallowRef<"water" | "electric">("water");
  const selectedCandidateIds = ref<string[]>([]);
  const isMonitorConfigVisible = shallowRef(false);
  const isMonitorConfigSaving = shallowRef(false);
  const configTarget = shallowRef<"water" | "electric">("water");
  const editingMetric = shallowRef<MonitorMetricDevice | null>(null);
  const editingPoint = shallowRef<MonitorPoint | null>(null);
  const isAttendanceDetailVisible = shallowRef(false);
  const activeAttendance = shallowRef<AttendanceRecord | null>(null);

  const currentHost = computed(() => hostList.value.find((host) => String(host.id) === String(currentHostId.value)) || null);
  const hasMoreHosts = computed(() => hostPageNumber.value < hostPages.value);
  const hasMoreControlPoints = computed(() => controlPointPageNumber.value < controlPointPages.value);
  const currentVideo = computed(() => hostConfiguration.currentVideoFeeds.value[currentVideoIndex.value] || null);
  const monitorMetrics = computed(() => (configTarget.value === "water" ? waterMetrics.value : electricMetrics.value));
  const utilityMonitorType = (target: "water" | "electric"): "WATER" | "ELECTRIC" => (target === "water" ? "WATER" : "ELECTRIC");

  const loadUtilityCards = async (hostId: FireHostId): Promise<void> => {
    if (!hostId) return;
    try {
      const [water, electric] = await Promise.all([
        listFireUtilityMonitorCards(hostId, "WATER"),
        listFireUtilityMonitorCards(hostId, "ELECTRIC"),
      ]);
      if (isDisposed || String(hostId) !== String(currentHostId.value)) return;
      const [waterPanel, electricPanel] = await Promise.all([
        getFireUtilityPanel(hostId, "WATER").catch(() => null),
        getFireUtilityPanel(hostId, "ELECTRIC").catch(() => null),
      ]);
      if (isDisposed || String(hostId) !== String(currentHostId.value)) return;
      waterMetrics.value = mergeUtilityCards(water, waterPanel?.items || [], "WATER");
      electricMetrics.value = mergeUtilityCards(electric, electricPanel?.items || [], "ELECTRIC");
    } catch (error) {
      message.error((error as Error).message || "加载消防用水/用电监测数据失败");
    }
  };

  const loadIndicatorLightConfig = async (hostId: FireHostId): Promise<void> => {
    if (!hostId) return;
    indicatorLightConfig.value = {
      fireManageDeviceId: hostId,
      indicatorCount: 3,
      indicatorButtons: DEFAULT_INDICATOR_BUTTONS.map((button) => ({ ...button })),
    };
    isIndicatorLightConfigLoading.value = true;
    try {
      const config = await getFireHostIndicatorLightConfig(hostId);
      if (isDisposed || String(hostId) !== String(currentHostId.value)) return;
      const indicatorCount: 2 | 3 = Number(config.indicatorCount) === 2 ? 2 : 3;
      indicatorLightConfig.value = {
        fireManageDeviceId: config.fireManageDeviceId ?? hostId,
        indicatorCount,
        indicatorButtons: Array.from({ length: indicatorCount }, (_, index) => ({
          code: config.indicatorButtons?.[index]?.code?.trim() || "",
          name: config.indicatorButtons?.[index]?.name?.trim() || DEFAULT_INDICATOR_BUTTONS[index]?.name || `指示灯${index + 1}`,
        })),
      };
    } catch (error) {
      if (!isDisposed && String(hostId) === String(currentHostId.value)) {
        console.error("Failed to load multi-line indicator configuration:", error);
      }
    } finally {
      if (!isDisposed && String(hostId) === String(currentHostId.value)) isIndicatorLightConfigLoading.value = false;
    }
  };

  const loadEvents = async (hostId: FireHostId): Promise<void> => {
    if (!hostId) return;
    try {
      const page = await listEvents({ fireManageDeviceId: hostId, pageNumber: 1, pageSize: 6 });
      if (isDisposed || String(hostId) !== String(currentHostId.value)) return;
      eventsList.value = (page.records || []).map((record) => ({
        id: String(record.id ?? `${record.eventTime}-${record.deviceInfo}`),
        eventName: record.eventName || "--",
        eventType: normalizeFireEventType(record.eventType),
        deviceInfo: record.deviceInfo || "--",
        pointName: record.pointName || "--",
        time: formatEventTime(record.eventTime),
        location: record.location || "--",
        posX: record.coordinateX,
        posY: record.coordinateY,
      }));
    } catch (error) {
      message.error((error as Error).message || "加载最近事件失败");
    }
  };

  const loadAttendanceRecords = async (
    hostId: FireHostId,
    pageNumber = attendancePageNumber.value,
    pageSize = attendancePageSize.value,
  ): Promise<void> => {
    if (!hostId) return;
    attendanceRequestVersion += 1;
    const requestVersion = attendanceRequestVersion;
    isAttendanceLoading.value = true;
    try {
      const page = await listFireHostAlarmRecords({
        fireManageDeviceId: hostId,
        pageNumber,
        pageSize,
        applicationCode: "FIRECONTROL",
        ...(attendanceKeyword.value ? { keyword: attendanceKeyword.value } : {}),
        ...(attendanceAlarmEventName.value ? { alarmEventName: attendanceAlarmEventName.value } : {}),
        ...(attendancePeriod.value ? { period: attendancePeriod.value } : {}),
      });
      if (isDisposed || requestVersion !== attendanceRequestVersion || String(hostId) !== String(currentHostId.value)) return;
      attendanceRecords.value = (page.records || []).map(mapAttendanceRecord);
      attendancePageNumber.value = pageNumber;
      attendancePageSize.value = pageSize;
      attendanceTotal.value = Number(page.total || 0);
    } catch (error) {
      if (!isDisposed && requestVersion === attendanceRequestVersion) {
        attendanceRecords.value = [];
        attendanceTotal.value = 0;
        message.error((error as Error).message || "加载远程监管报警记录失败");
      }
    } finally {
      if (!isDisposed && requestVersion === attendanceRequestVersion) isAttendanceLoading.value = false;
    }
  };

  const loadControlPoints = async (hostId: FireHostId, reset = false): Promise<void> => {
    if (!hostId || (!reset && (isControlPointLoadingMore.value || !hasMoreControlPoints.value))) return;
    const requestVersion = reset ? ++controlPointRequestVersion : controlPointRequestVersion;
    const pageNumber = reset ? 1 : controlPointPageNumber.value + 1;
    if (reset) {
      isControlPointLoading.value = true;
      devicesList.value = [];
      controlPointPageNumber.value = 0;
      controlPointPages.value = 0;
      controlPointTotal.value = 0;
    } else {
      isControlPointLoadingMore.value = true;
    }
    try {
      const page = await listFireControlPoints(hostId, {
        pageNumber,
        pageSize: CONTROL_POINT_PAGE_SIZE,
        busType: controlDevicePanel.value === "multi" ? "2" : "1",
      });
      if (isDisposed || requestVersion !== controlPointRequestVersion || String(currentHostId.value) !== String(hostId)) return;
      const records = (page.records || []).map(mapControlPoint);
      devicesList.value = reset ? records : [...devicesList.value, ...records];
      controlPointPageNumber.value = pageNumber;
      controlPointPages.value = Number(page.pages || 0);
      controlPointTotal.value = Number(page.total || 0);
    } catch (error) {
      if (requestVersion === controlPointRequestVersion) message.error((error as Error).message || "加载控制设备失败");
    } finally {
      if (requestVersion === controlPointRequestVersion) {
        isControlPointLoading.value = false;
        isControlPointLoadingMore.value = false;
      }
    }
  };

  const changeControlDevicePanel = (panel: ControlDevicePanel): void => {
    if (controlDevicePanel.value === panel) return;
    controlDevicePanel.value = panel;
    if (currentHostId.value) void loadControlPoints(currentHostId.value, true);
  };

  const loadHosts = async (reset = false): Promise<void> => {
    if ((reset ? isHostLoading.value : isHostLoadingMore.value) || (!reset && !hasMoreHosts.value)) return;
    const pageNumber = reset ? 1 : hostPageNumber.value + 1;
    if (reset) isHostLoading.value = true;
    else isHostLoadingMore.value = true;
    try {
      const page = await listFireHostOverviews({ pageNumber, pageSize: HOST_PAGE_SIZE });
      if (isDisposed) return;
      let records = (page.records || []).map(mapHostOverview);
      let loadedPageNumber = pageNumber;
      const totalHostPages = Number(page.pages || 0);
      const requestedHostId = preferredHostId.value;
      if (reset && requestedHostId && !records.some((host) => String(host.id) === requestedHostId)) {
        while (loadedPageNumber < totalHostPages && !records.some((host) => String(host.id) === requestedHostId)) {
          loadedPageNumber += 1;
          const nextPage = await listFireHostOverviews({ pageNumber: loadedPageNumber, pageSize: HOST_PAGE_SIZE });
          if (isDisposed) return;
          records = [...records, ...(nextPage.records || []).map(mapHostOverview)];
        }
      }
      hostList.value = reset ? records : [...hostList.value, ...records];
      hostPageNumber.value = loadedPageNumber;
      hostPages.value = Number(page.pages || 0);
      hostTotal.value = Number(page.total || 0);
      if (reset && records.length) {
        const selectedHost = records.find((host) => String(host.id) === requestedHostId) || records[0];
        currentHostId.value = selectedHost.id;
        await Promise.all([
          loadControlPoints(selectedHost.id, true),
          loadIndicatorLightConfig(selectedHost.id),
          hostConfiguration.loadHostConfiguration(selectedHost.id),
          loadUtilityCards(selectedHost.id),
          loadEvents(selectedHost.id),
        ]);
      }
    } catch (error) {
      message.error((error as Error).message || "加载消防主机失败");
    } finally {
      isHostLoading.value = false;
      isHostLoadingMore.value = false;
    }
  };

  const changeHost = (hostId: FireHostId): void => {
    if (String(currentHostId.value) === String(hostId)) return;
    currentHostId.value = hostId;
    currentVideoIndex.value = 0;
    if (activeTab.value === "attendance") {
      attendancePageNumber.value = 1;
      void loadAttendanceRecords(hostId, 1);
      return;
    }
    void loadControlPoints(hostId, true);
    void Promise.all([
      loadIndicatorLightConfig(hostId),
      hostConfiguration.loadHostConfiguration(hostId),
      loadUtilityCards(hostId),
      loadEvents(hostId),
    ]);
  };

  const changeTab = (key: string | number): void => {
    const nextTab = String(key) as RemoteControlTab;
    if (activeTab.value === nextTab) return;
    activeTab.value = nextTab;
    const hostId = currentHostId.value;
    if (!hostId) return;
    if (nextTab === "ctrl") {
      void Promise.all([
        loadControlPoints(hostId, true),
        loadIndicatorLightConfig(hostId),
        loadEvents(hostId),
        hostConfiguration.loadHostConfiguration(hostId),
      ]);
      return;
    }
    if (nextTab === "water" || nextTab === "electric") {
      void loadUtilityCards(hostId);
      return;
    }
    if (nextTab === "attendance") {
      attendancePageNumber.value = 1;
      void loadAttendanceRecords(hostId, 1);
    }
  };

  const switchVideo = (step: number): void => {
    const total = hostConfiguration.currentVideoFeeds.value.length;
    if (!total) return;
    currentVideoIndex.value = (currentVideoIndex.value + step + total) % total;
  };

  const selectVideo = (index: number): void => {
    if (index >= 0 && index < hostConfiguration.currentVideoFeeds.value.length) currentVideoIndex.value = index;
  };

  const toggleVideoFullscreen = (): void => {
    isFullScreenVideo.value = !isFullScreenVideo.value;
  };

  const closePasswordModal = (): void => {
    if (isPasswordSubmitting.value) return;
    isPasswordModalVisible.value = false;
    passwordInput.value = "";
    passwordErrorMessage.value = "";
    pendingAction.value = null;
  };

  const requestAuthorization = (name: string, danger: boolean, action: (password?: string) => Promise<void>): void => {
    passwordActionName.value = name;
    passwordIsDanger.value = danger;
    passwordInput.value = "";
    showPassword.value = false;
    passwordErrorMessage.value = "";
    pendingAction.value = action;
    if (!currentHost.value?.controlPasswordRequired) {
      pendingAction.value = null;
      void action().catch((error) => message.error((error as Error).message || "控制指令下发失败"));
      return;
    }
    isPasswordModalVisible.value = true;
  };

  const verifyPassword = async (): Promise<void> => {
    if (passwordInput.value.length !== 6) {
      passwordErrorMessage.value = "请输入 6 位数字控制密码";
      return;
    }
    const action = pendingAction.value;
    if (!action) return;
    isPasswordSubmitting.value = true;
    passwordErrorMessage.value = "";
    try {
      await action(passwordInput.value);
      isPasswordModalVisible.value = false;
      passwordInput.value = "";
      pendingAction.value = null;
    } catch (error) {
      passwordErrorMessage.value = (error as Error).message || "控制指令下发失败，请检查密码后重试";
    } finally {
      isPasswordSubmitting.value = false;
    }
  };

  const controlHost = (action: ControlAction): void => {
    const host = currentHost.value;
    if (!host) return;
    if (!host.online) {
      message.warning("当前消防主机离线，无法下发控制指令");
      return;
    }
    if (isHostCommandPending.value) {
      message.warning("上一条主机指令正在下发，请稍候");
      return;
    }
    requestAuthorization(action.label, Boolean(action.danger), async (password) => {
      isHostCommandPending.value = true;
      try {
        const response = await sendFireHostControlCommand(host.id, {
          buttonId: action.buttonId,
          commandSeq: createRequestId(),
          inputParams: action.inputParams || {},
          ...(password ? { controlPassword: password } : {}),
        });
        if (response.statusCode && ["FAIL", "REJECT", "EXPIRED"].includes(response.statusCode)) {
          throw new Error(response.message || "主机拒绝执行当前指令");
        }
        message.success(`“${action.label}”指令已下发`);
      } finally {
        isHostCommandPending.value = false;
      }
    });
  };

  const pollPointCommand = async (
    hostId: FireHostId,
    pointId: string,
    initial: FirePointControlCommandRecord,
  ): Promise<FirePointControlCommandRecord> => {
    let latest = initial;
    if (latest.statusCode && TERMINAL_COMMAND_STATUSES.has(latest.statusCode)) return latest;
    if (!latest.commandHandle) throw new Error("指令已下发，但未返回状态查询凭证");
    for (let attempt = 0; attempt < COMMAND_POLL_LIMIT; attempt += 1) {
      if (isDisposed) throw new Error("页面已关闭，停止查询指令状态");
      if (attempt > 0) await wait(COMMAND_POLL_INTERVAL);
      latest = await getFirePointControlCommandStatus(hostId, pointId, latest.commandHandle);
      if (latest.statusCode && TERMINAL_COMMAND_STATUSES.has(latest.statusCode)) return latest;
    }
    throw new Error("指令执行超时，请稍后查看设备实际状态");
  };

  const controlDevice = (deviceId: string, action: "start" | "stop"): void => {
    const device = devicesList.value.find((item) => item.id === deviceId);
    if (!device) return;
    if (!device.online) {
      message.warning("当前控制点离线，无法下发指令");
      return;
    }
    if (!device.controlReady) {
      message.warning("当前点位尚未完成主机控制配置");
      return;
    }
    if (device.commandPending) {
      message.warning("当前点位正在执行控制指令，请稍候");
      return;
    }
    const actionName = `${device.name} ${action === "start" ? "启动" : "停止"}`;
    const hostId = currentHostId.value;
    const previousStatus = device.status;
    const previousStatusText = device.statusText;
    requestAuthorization(actionName, action === "stop", async (password) => {
      devicesList.value = replaceDevice(devicesList.value, deviceId, {
        commandPending: true,
        status: "processing",
        statusText: action === "start" ? "启动指令执行中" : "停止指令执行中",
      });
      try {
        const submitted = await sendFirePointControlCommand(hostId, deviceId, {
          action: action === "start" ? "START" : "STOP",
          requestId: createRequestId(),
          ...(password ? { controlPassword: password } : {}),
        });
        const result = await pollPointCommand(hostId, deviceId, submitted);
        if (result.statusCode !== "SUCCESS") throw new Error(result.message || "设备未能执行当前指令");
        devicesList.value = replaceDevice(devicesList.value, deviceId, {
          commandPending: false,
          status: action === "start" ? "run" : "stop",
          statusText: action === "start" ? "运行中" : "已停止",
        });
        message.success(`${actionName}成功`);
      } catch (error) {
        devicesList.value = replaceDevice(devicesList.value, deviceId, {
          commandPending: false,
          status: previousStatus,
          statusText: previousStatusText,
        });
        throw error;
      }
    });
  };

  const openDevicePicker = (target: "water" | "electric"): void => {
    pickerTarget.value = target;
    selectedCandidateIds.value = [];
    isDevicePickerVisible.value = true;
  };

  const confirmDevicePicker = async (): Promise<boolean> => {
    try {
      await saveFireUtilityDevices(currentHostId.value, utilityMonitorType(pickerTarget.value), { deviceIds: selectedCandidateIds.value });
      await loadUtilityCards(currentHostId.value);
      message.success("监测设备关联成功");
      isDevicePickerVisible.value = false;
      return true;
    } catch (error) {
      message.error((error as Error).message || "关联监测设备失败");
      return false;
    }
  };

  const openMonitorConfig = (target: "water" | "electric"): void => {
    const list = target === "water" ? waterMetrics : electricMetrics;
    if (list.value.length === 0) {
      message.warning("请先添加监测设备，再进行面板配置");
      return;
    }

    configTarget.value = target;
    isMonitorConfigVisible.value = true;
    void Promise.all(
      list.value.map(async (device) => {
        if (!device.relationId) return device;
        const properties = await listFireUtilityDeviceProperties(currentHostId.value, utilityMonitorType(target), device.relationId!);
        const points = properties.map((property) => ({
          id: property.propertyCode,
          label: property.propertyName || property.propertyCode,
          value: Number(property.currentValue ?? 0),
          unit: property.unit || "",
          min: device.points[0]?.min ?? 0,
          max: device.points[0]?.max ?? 0,
        }));
        return {
          ...device,
          points,
          selectedPointId: properties.find((property) => property.selected)?.propertyCode || device.selectedPointId,
        };
      }),
    )
      .then((devices) => {
        if (configTarget.value === target) list.value = devices;
      })
      .catch((error) => message.error((error as Error).message || "加载监测属性失败"));
  };

  const saveMonitorConfig = async (items: FireUtilityPanelItemParam[]): Promise<void> => {
    isMonitorConfigSaving.value = true;
    try {
      await saveFireUtilityPanel(currentHostId.value, utilityMonitorType(configTarget.value), { items });
      await loadUtilityCards(currentHostId.value);
      isMonitorConfigVisible.value = false;
      message.success("监测面板配置已保存");
    } catch (error) {
      message.error((error as Error).message || "保存监测面板配置失败");
    } finally {
      isMonitorConfigSaving.value = false;
    }
  };

  const openRangeEditor = (device: MonitorMetricDevice): void => {
    if (!device.relationId || !device.selectedPointId || device.selectedPointId === "unconfigured") {
      message.warning("请先在面板配置中为该设备选择监测属性，再设置参考范围");
      return;
    }
    editingMetric.value = device;
    editingPoint.value = { ...(device.points.find((point) => point.id === device.selectedPointId) || device.points[0]) };
  };

  const saveRange = async (min: number, max: number): Promise<void> => {
    const metric = editingMetric.value;
    const point = editingPoint.value;
    if (!metric || !point || min >= max) {
      message.warning("最小值必须小于最大值");
      return;
    }
    if (!metric.relationId || !metric.selectedPointId || metric.selectedPointId === "unconfigured") {
      message.warning("请先在面板配置中为该设备选择监测属性，再设置参考范围");
      return;
    }
    try {
      await updateFireUtilityRange(currentHostId.value, utilityMonitorType(configTarget.value), metric.relationId, {
        referenceMin: min,
        referenceMax: max,
      });
      await loadUtilityCards(currentHostId.value);
      editingMetric.value = null;
      editingPoint.value = null;
      message.success("参考范围已更新");
    } catch (error) {
      message.error((error as Error).message || "更新参考范围失败");
    }
  };

  const openAttendanceDetail = (record: AttendanceRecord): void => {
    activeAttendance.value = record;
    isAttendanceDetailVisible.value = true;
  };

  const formatAttendanceDay = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    if (typeof value === "object" && value !== null && "format" in value) {
      return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD");
    }
    return "";
  };

  const searchAttendanceRecords = (values: { keyword?: unknown; alarmEventName?: unknown; alarmDate?: unknown }): void => {
    attendanceKeyword.value = String(values.keyword ?? "").trim();
    attendanceAlarmEventName.value = String(values.alarmEventName ?? "").trim();
    const range = Array.isArray(values.alarmDate) ? values.alarmDate : [];
    const start = formatAttendanceDay(range[0]);
    const end = formatAttendanceDay(range[1]);
    attendancePeriod.value = start && end ? `(${start} 00:00:00,${end} 23:59:59)` : "";
    attendancePageNumber.value = 1;
    void loadAttendanceRecords(currentHostId.value, 1);
  };

  const changeAttendancePage = (pageNumber: number, pageSize: number): void => {
    void loadAttendanceRecords(currentHostId.value, pageNumber, pageSize);
  };

  const pushAttendance = (): void => {
    message.warning("当前接口文档未提供值班监管推送接口");
  };

  const setPreferredHost = (hostId: string): void => {
    preferredHostId.value = hostId;
  };

  onMounted(() => void loadHosts(true));

  onUnmounted(() => {
    isDisposed = true;
    controlPointRequestVersion += 1;
    attendanceRequestVersion += 1;
  });

  return {
    activeTab,
    currentHostId,
    hostList,
    currentHost,
    devicesList,
    controlDevicePanel,
    controlButtons: hostConfiguration.controlButtons,
    eventsList,
    operationLogs,
    waterMetrics,
    electricMetrics,
    attendanceRecords,
    attendancePageNumber,
    attendancePageSize,
    attendanceTotal,
    isAttendanceLoading,
    currentVideoIndex,
    currentVideoFeeds: hostConfiguration.currentVideoFeeds,
    currentVideo,
    isFullScreenVideo,
    isPasswordModalVisible,
    passwordInput,
    showPassword,
    passwordActionName,
    passwordIsDanger,
    passwordErrorMessage,
    isPasswordSubmitting,
    isHostCommandPending,
    isButtonConfigLoading: hostConfiguration.isButtonConfigLoading,
    isVideoConfigLoading: hostConfiguration.isVideoConfigLoading,
    hostTotal,
    isHostLoading,
    isHostLoadingMore,
    hasMoreHosts,
    controlPointTotal,
    isControlPointLoading,
    isControlPointLoadingMore,
    indicatorLightConfig,
    isIndicatorLightConfigLoading,
    hasMoreControlPoints,
    eventRecords,
    isDevicePickerVisible,
    pickerTarget,
    selectedCandidateIds,
    isMonitorConfigVisible,
    isMonitorConfigSaving,
    configTarget,
    monitorMetrics,
    editingMetric,
    editingPoint,
    isAttendanceDetailVisible,
    activeAttendance,
    loadHosts,
    loadControlPoints,
    changeControlDevicePanel,
    changeHost,
    changeTab,
    searchAttendanceRecords,
    changeAttendancePage,
    switchVideo,
    selectVideo,
    toggleVideoFullscreen,
    controlHost,
    controlDevice,
    closePasswordModal,
    verifyPassword,
    openDevicePicker,
    confirmDevicePicker,
    openMonitorConfig,
    saveMonitorConfig,
    openRangeEditor,
    saveRange,
    openAttendanceDetail,
    pushAttendance,
    setPreferredHost,
  };
}
