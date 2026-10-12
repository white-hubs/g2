import type {
  DeviceAlarmRecord,
  DeviceConfig,
  DeviceControlRecord,
  DeviceMaintenanceRecord,
  DeviceRealtimeProperties,
  ElectricalDeviceTypeParameterConfig,
} from "@g2-contract/electrical-safety";
import {
  Button,
  type ColumnType,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PcIcon,
  Select,
  Spin,
  TabPane,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  message,
} from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import type { EChartsCoreOption } from "echarts/core";
import { computed, defineComponent, reactive, shallowRef, watch } from "vue";

import { DeviceRecordTable } from "./device-record-table";
import {
  controlDeviceProperty,
  getDeviceAiAnalysis,
  getDeviceConfig,
  getDeviceRealtimeProperties,
  getMonitoringDevice,
  invokeDeviceMethod,
  listDeviceAlarmRecords,
  listDeviceControlRecords,
  listDeviceMaintenanceRecords,
  listElectricalDeviceTypeParameterConfigs,
} from "@/api/electrical-safety";
import { useDeviceRealtime } from "@/composables/use-device-realtime";
import { EchartsChart } from "@/views/shared/echarts-chart";
import { ScadaPlaceholder } from "@/views/shared/scada-placeholder";

type DetailTab = "basic" | "params" | "control" | "alarm" | "maintenance" | "ai";
type DeviceMethod = DeviceRealtimeProperties["methods"][number];
type DeviceProperty = DeviceRealtimeProperties["properties"][number];
type RecordTab = "control" | "alarm" | "maintenance";
type PropertyValue = string | number | undefined;

const PAGE_SIZE = 10;
const DETAIL_TABS: DetailTab[] = ["basic", "params", "control", "alarm", "maintenance", "ai"];
const isDetailTab = (value: string): value is DetailTab => DETAIL_TABS.includes(value as DetailTab);

const displayText = (value: unknown): string => {
  if (value == null || value === "") {
    return "--";
  }
  return String(value);
};

const hasDisplayValue = (value: unknown): boolean => value != null && value !== "";

interface DeviceConfigDisplayItem {
  name: string;
  value: unknown;
}

const getDeviceConfigDisplayItems = (
  typeConfigs: ElectricalDeviceTypeParameterConfig[],
  deviceConfig: DeviceConfig,
): DeviceConfigDisplayItem[] => {
  const typeConfig = typeConfigs.find((item) => item.deviceType === deviceConfig.deviceType);
  const parameterMap = new Map((typeConfig?.parameters ?? []).map((parameter) => [parameter.parameterCode, parameter]));
  return Object.entries(deviceConfig.config)
    .filter(([, value]) => hasDisplayValue(value))
    .flatMap(([code, value]) => {
      const parameter = parameterMap.get(code);
      return parameter ? [{ name: parameter.parameterName, value, sort: parameter.sort ?? 0 }] : [];
    })
    .toSorted((left, right) => left.sort - right.sort)
    .map(({ name, value }) => ({ name, value }));
};

const clampScore = (value: number | null | undefined): number => Math.min(100, Math.max(0, value ?? 0));

const riskText = (value: string): string => ({ LOW: "低", MEDIUM: "中", HIGH: "高" })[value] ?? displayText(value);

const riskClassName = (value: string): string => `is-${value.toLowerCase()}`;

const scoreColor = (score: number | null): string => {
  if (score == null) {
    return "#d9dee8";
  }
  if (score >= 80) {
    return "#f53f3f";
  }
  if (score >= 65) {
    return "#ff7d00";
  }
  return "#00b42a";
};

const renderAiTip = (label: string, description: string): JSX.Element => (
  <span class="device-ai-label-with-tip">
    {label}
    <Tooltip title={description}>
      <button type="button" class="device-ai-tip" aria-label={`${label}说明`}>
        ?
      </button>
    </Tooltip>
  </span>
);

const formatDateTime = (value: unknown): string => {
  if (value == null || value === "") {
    return "--";
  }
  let normalized: string | number = typeof value === "number" || typeof value === "string" ? value : String(value);
  if (typeof normalized === "string" && /^\d{10,13}$/.test(normalized)) {
    normalized = Number(normalized);
  }
  if (typeof normalized === "number" && normalized > 0 && normalized < 1_000_000_000_000) {
    normalized *= 1000;
  }
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : String(value);
};

const maintenanceStatusText = (value: unknown): string => {
  const code = displayText(value);
  if (code === "--") {
    return code;
  }
  return (
    (
      {
        EXECUTING: "待巡检",
        OVER: "已完成",
        OVERTIME: "已完成",
        EXPIRE: "已过期",
        STOP: "已终止",
        WAIT_REPAIR: "待修复",
        CANCEL_REPAIR: "取消修复",
        CANCEL_INSPECT: "取消巡检",
      } as Record<string, string>
    )[code.toUpperCase()] ?? code
  );
};

const maintenanceResultText = (value: unknown): string => {
  const code = displayText(value);
  if (code === "--") {
    return code;
  }
  return (
    (
      {
        NORMAL: "正常",
        ABNORMAL: "异常",
        PASS: "通过",
        FAIL: "不通过",
        QUALIFIED: "合格",
        UNQUALIFIED: "不合格",
        PENDING: "待确认",
      } as Record<string, string>
    )[code.toUpperCase()] ?? code
  );
};

const alarmLevelColor = (record: DeviceAlarmRecord): string => {
  const level = `${record.levelName ?? ""}${record.levelCode ?? ""}`;
  if (level.includes("一级") || /(^|[_-])1($|[_-])/.test(level)) {
    return "red";
  }
  if (level.includes("二级") || /(^|[_-])2($|[_-])/.test(level)) {
    return "orange";
  }
  if (level.includes("三级") || /(^|[_-])3($|[_-])/.test(level)) {
    return "gold";
  }
  return "default";
};

const controlResult = (value: unknown): { text: string; color?: string } => {
  const code = displayText(value).toUpperCase();
  const labels: Record<string, { text: string; color?: string }> = {
    SUCCESS: { text: "成功", color: "green" },
    ACCEPTED: { text: "已受理", color: "blue" },
    PENDING: { text: "待下发", color: "gold" },
    PROCESSING: { text: "下发中", color: "blue" },
    FAIL: { text: "失败", color: "red" },
    FAILED: { text: "失败", color: "red" },
    TIMEOUT: { text: "超时", color: "orange" },
    CANCELLED: { text: "已取消", color: "default" },
  };
  return labels[code] ?? { text: displayText(value) };
};

export const DeviceDetailModal = defineComponent({
  name: "DeviceDetailModal",
  props: { open: { type: Boolean, required: true }, deviceId: { type: String, default: "" } },
  emits: { close: (): boolean => true },
  setup: (props, { emit }) => {
    const activeKey = shallowRef<DetailTab>("basic");
    const detail = shallowRef<Awaited<ReturnType<typeof getMonitoringDevice>> | null>(null);
    const deviceConfigDisplayItems = shallowRef<DeviceConfigDisplayItem[]>([]);
    const realtime = shallowRef<Awaited<ReturnType<typeof getDeviceRealtimeProperties>> | null>(null);
    const analysis = shallowRef<Awaited<ReturnType<typeof getDeviceAiAnalysis>> | null>(null);
    const controlRecords = shallowRef<DeviceControlRecord[]>([]);
    const alarmRecords = shallowRef<DeviceAlarmRecord[]>([]);
    const maintenanceRecords = shallowRef<DeviceMaintenanceRecord[]>([]);
    const loading = reactive<Record<DetailTab, boolean>>({
      basic: false,
      params: false,
      control: false,
      alarm: false,
      maintenance: false,
      ai: false,
    });
    const recordPages = reactive<Record<RecordTab, { pageNumber: number; pageSize: number; total: number }>>({
      control: { pageNumber: 1, pageSize: PAGE_SIZE, total: 0 },
      alarm: { pageNumber: 1, pageSize: PAGE_SIZE, total: 0 },
      maintenance: { pageNumber: 1, pageSize: PAGE_SIZE, total: 0 },
    });
    const loadedTabs = new Set<DetailTab>();
    const methodModalOpen = shallowRef(false);
    const method = shallowRef<DeviceMethod | null>(null);
    const methodInput = shallowRef("{}");
    const methodLoading = shallowRef(false);
    const propertyModalOpen = shallowRef(false);
    const property = shallowRef<DeviceProperty | null>(null);
    const propertyValue = shallowRef<PropertyValue>();
    const propertyLoading = shallowRef(false);
    let deviceVersion = 0;

    const { setTargets: setRealtimeTargets } = useDeviceRealtime((updates) => {
      if (!realtime.value) {
        return;
      }
      const deviceUpdates = new Map(
        updates.filter((update) => update.deviceId === props.deviceId).map((update) => [update.propertyCode, update]),
      );
      if (deviceUpdates.size === 0) {
        return;
      }
      let changed = false;
      const properties = realtime.value.properties.map((current) => {
        const update = deviceUpdates.get(current.propertyCode);
        if (!update) {
          return current;
        }
        changed = true;
        return {
          ...current,
          value: update.value,
          ...(update.status ? { status: update.status } : {}),
          ...(update.collectTime !== undefined ? { collectTime: update.collectTime } : {}),
        };
      });
      if (changed) {
        realtime.value = { ...realtime.value, properties };
      }
    });

    watch(
      () => [props.open ? props.deviceId : "", ...(realtime.value?.properties.map((item) => item.propertyCode).toSorted() ?? [])].join("|"),
      () => {
        setRealtimeTargets(
          props.open && props.deviceId
            ? (realtime.value?.properties ?? []).map((item) => ({ deviceId: props.deviceId, propertyCode: item.propertyCode }))
            : [],
        );
      },
      { immediate: true },
    );

    const aiTrendOption = computed<EChartsCoreOption>(() => {
      const trend = analysis.value?.healthScoreTrend ?? [];
      return {
        animation: false,
        grid: { top: 0, right: 0, bottom: 0, left: 0 },
        tooltip: {
          trigger: "axis",
          confine: true,
          formatter: (params: { value?: unknown; axisValue?: unknown } | { value?: unknown; axisValue?: unknown }[]) => {
            const point = Array.isArray(params) ? params[0] : params;
            const score = point?.value == null ? "暂无数据" : `${point.value}`;
            return `${point?.axisValue ?? ""}<br />健康度评分：${score}`;
          },
        },
        xAxis: {
          type: "category",
          data: trend.map((point) => point.date),
          show: false,
        },
        yAxis: { type: "value", min: 0, max: 100, show: false },
        series: [
          {
            type: "bar",
            data: trend.map((point) => ({ value: point.healthScore, itemStyle: { color: scoreColor(point.healthScore) } })),
            barCategoryGap: "5%",
            itemStyle: { borderRadius: [2, 2, 0, 0] },
          },
        ],
      };
    });

    const reset = (): void => {
      deviceVersion += 1;
      activeKey.value = "basic";
      detail.value = null;
      deviceConfigDisplayItems.value = [];
      realtime.value = null;
      analysis.value = null;
      controlRecords.value = [];
      alarmRecords.value = [];
      maintenanceRecords.value = [];
      loadedTabs.clear();
      DETAIL_TABS.forEach((tab) => (loading[tab] = false));
      (Object.keys(recordPages) as RecordTab[]).forEach((tab) => {
        recordPages[tab].pageNumber = 1;
        recordPages[tab].pageSize = PAGE_SIZE;
        recordPages[tab].total = 0;
      });
      methodModalOpen.value = false;
      method.value = null;
      propertyModalOpen.value = false;
      property.value = null;
      propertyValue.value = undefined;
    };

    const loadTab = async (tab: DetailTab, force = false): Promise<void> => {
      if (!props.open || !props.deviceId || loading[tab] || (!force && loadedTabs.has(tab))) {
        return;
      }
      const version = deviceVersion;
      loading[tab] = true;
      try {
        if (tab === "basic") {
          const result = await getMonitoringDevice(props.deviceId);
          if (version !== deviceVersion) {
            return;
          }
          detail.value = result;
          const [typeConfigs, deviceConfig] = await Promise.all([
            listElectricalDeviceTypeParameterConfigs(),
            getDeviceConfig(result.facilityId, props.deviceId),
          ]);
          if (version !== deviceVersion) {
            return;
          }
          deviceConfigDisplayItems.value = getDeviceConfigDisplayItems(typeConfigs, deviceConfig);
        } else if (tab === "params") {
          const result = await getDeviceRealtimeProperties(props.deviceId);
          if (version !== deviceVersion) {
            return;
          }
          realtime.value = result;
        } else if (tab === "control") {
          const page = recordPages.control;
          const result = await listDeviceControlRecords(props.deviceId, { pageNumber: page.pageNumber, pageSize: page.pageSize });
          if (version !== deviceVersion) {
            return;
          }
          controlRecords.value = result.records ?? [];
          page.total = result.total ?? 0;
        } else if (tab === "alarm") {
          const page = recordPages.alarm;
          const result = await listDeviceAlarmRecords(props.deviceId, { pageNumber: page.pageNumber, pageSize: page.pageSize });
          if (version !== deviceVersion) {
            return;
          }
          alarmRecords.value = result.records ?? [];
          page.total = result.total ?? 0;
        } else if (tab === "maintenance") {
          const page = recordPages.maintenance;
          const result = await listDeviceMaintenanceRecords(props.deviceId, { pageNumber: page.pageNumber, pageSize: page.pageSize });
          if (version !== deviceVersion) {
            return;
          }
          maintenanceRecords.value = result.records ?? [];
          page.total = result.total ?? 0;
        } else {
          const result = await getDeviceAiAnalysis(props.deviceId);
          if (version !== deviceVersion) {
            return;
          }
          analysis.value = result;
        }
        if (version === deviceVersion) {
          loadedTabs.add(tab);
        }
      } catch {
        // 网关已展示当前 Tab 对应的接口错误，保留未加载状态以便再次切换重试。
      } finally {
        if (version === deviceVersion) {
          loading[tab] = false;
        }
      }
    };

    watch(
      () => [props.open, props.deviceId] as const,
      ([open, deviceId]) => {
        reset();
        if (open && deviceId) {
          void loadTab("basic");
        }
      },
      { immediate: true },
    );

    const changeTab = (key: string): void => {
      if (!isDetailTab(key)) {
        return;
      }
      activeKey.value = key;
      void loadTab(key);
    };

    const changeRecordPage = (tab: RecordTab, pageNumber: number, pageSize: number): void => {
      recordPages[tab].pageNumber = pageNumber;
      recordPages[tab].pageSize = pageSize;
      void loadTab(tab, true);
    };

    const renderEmpty = (description: string, copy: string): JSX.Element => (
      <div class="device-detail-placeholder">
        <ScadaPlaceholder description={description} copy={copy} />
      </div>
    );

    const renderLoading = (tab: DetailTab, content: () => JSX.Element): JSX.Element => (
      <Spin spinning={loading[tab]}>
        {loading[tab] && !loadedTabs.has(tab) ? renderEmpty("数据加载中", "正在获取当前页签数据") : content()}
      </Spin>
    );

    const controlColumns: ColumnType<DeviceControlRecord>[] = [
      { title: "时间", dataIndex: "operateTime", customRender: ({ text }: { text: unknown }) => formatDateTime(text) },
      { title: "操作类型", dataIndex: "actionName", customRender: ({ record }) => displayText(record.actionName || record.actionCode) },
      { title: "操作人", dataIndex: "operatorName", customRender: ({ text }: { text: unknown }) => displayText(text) },
      {
        title: "下发结果",
        dataIndex: "resultName",
        customRender: ({ record }) => {
          const result = controlResult(record.resultName || record.resultCode);
          return <Tag color={result.color}>{result.text}</Tag>;
        },
      },
    ];

    const alarmColumns: ColumnType<DeviceAlarmRecord>[] = [
      { title: "报警事件", dataIndex: "eventName", customRender: ({ text }: { text: unknown }) => displayText(text) },
      {
        title: "级别",
        dataIndex: "levelName",
        customRender: ({ record }) => <Tag color={alarmLevelColor(record)}>{displayText(record.levelName || record.levelCode)}</Tag>,
      },
      { title: "时间", dataIndex: "occurTime", customRender: ({ text }: { text: unknown }) => formatDateTime(text) },
      {
        title: "超时状态",
        dataIndex: "timeoutStatusName",
        customRender: ({ record }) => <Tag>{displayText(record.timeoutStatusName || record.timeoutStatusCode)}</Tag>,
      },
      {
        title: "处理结果",
        dataIndex: "handleResultName",
        customRender: ({ record }) => displayText(record.handleResultName || record.handleResultCode),
      },
      { title: "处理人", dataIndex: "handlerName", customRender: ({ text }: { text: unknown }) => displayText(text) },
    ];

    const maintenanceColumns: ColumnType<DeviceMaintenanceRecord>[] = [
      { title: "任务名称", dataIndex: "taskName", customRender: ({ text }: { text: unknown }) => displayText(text) },
      { title: "巡检计划", dataIndex: "planName", customRender: ({ text }: { text: unknown }) => displayText(text) },
      { title: "巡检人员", dataIndex: "inspectorName", customRender: ({ text }: { text: unknown }) => displayText(text) },
      { title: "巡检时间", dataIndex: "inspectionTime", customRender: ({ text }: { text: unknown }) => formatDateTime(text) },
      {
        title: "状态",
        dataIndex: "statusName",
        customRender: ({ record }) => maintenanceStatusText(record.statusName || record.statusCode),
      },
      {
        title: "巡检结果",
        dataIndex: "resultName",
        customRender: ({ record }) => maintenanceResultText(record.resultName || record.resultCode),
      },
    ];

    const openMethod = (current: DeviceMethod): void => {
      method.value = current;
      methodInput.value = "{}";
      methodModalOpen.value = true;
    };

    const propertyConfig = (current: DeviceProperty | null): unknown[] => (Array.isArray(current?.dataConfig) ? current.dataConfig : []);

    const isNumericProperty = (current: DeviceProperty | null): boolean =>
      ["int", "long", "float", "double"].includes(current?.dataType?.toLowerCase() ?? "");

    const isFloatProperty = (current: DeviceProperty | null): boolean =>
      ["float", "double"].includes(current?.dataType?.toLowerCase() ?? "");

    const isEnumProperty = (current: DeviceProperty | null): boolean =>
      ["enum", "boolean"].includes(current?.dataType?.toLowerCase() ?? "");

    const enumOptions = (current: DeviceProperty | null): { label: string; value: string | number }[] =>
      propertyConfig(current).flatMap((item) => {
        if (!item || typeof item !== "object" || !("value" in item)) {
          return [];
        }
        const option = item as { value: unknown; label?: unknown; name?: unknown; text?: unknown };
        if (typeof option.value !== "string" && typeof option.value !== "number") {
          return [];
        }
        const label = option.label ?? option.name ?? option.text ?? option.value;
        return [{ value: option.value, label: String(label) }];
      });

    const numericRange = (current: DeviceProperty | null): { min?: number; max?: number } => {
      const config = propertyConfig(current);
      const first = config[0];
      if (first && typeof first === "object" && !Array.isArray(first)) {
        const range = first as { min?: unknown; max?: unknown };
        return {
          ...(Number.isFinite(Number(range.min)) ? { min: Number(range.min) } : {}),
          ...(Number.isFinite(Number(range.max)) ? { max: Number(range.max) } : {}),
        };
      }
      return {
        ...(Number.isFinite(Number(config[0])) ? { min: Number(config[0]) } : {}),
        ...(Number.isFinite(Number(config[1])) ? { max: Number(config[1]) } : {}),
      };
    };

    const openPropertyControl = (current: DeviceProperty): void => {
      property.value = current;
      propertyValue.value = undefined;
      propertyModalOpen.value = true;
    };

    const normalizePropertyValue = (current: DeviceProperty, value: PropertyValue): string | null => {
      if (value == null || value === "") {
        return null;
      }
      if (!isNumericProperty(current)) {
        return String(value);
      }
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        return null;
      }
      const { min, max } = numericRange(current);
      if ((min != null && numberValue < min) || (max != null && numberValue > max)) {
        return null;
      }
      if (isFloatProperty(current) && typeof current.precision === "number") {
        return String(Number(numberValue.toFixed(current.precision)));
      }
      return String(Math.trunc(numberValue));
    };

    const submitPropertyControl = async (): Promise<void> => {
      const current = property.value;
      if (!current) {
        return;
      }
      const propValue = normalizePropertyValue(current, propertyValue.value);
      if (propValue == null) {
        const { min, max } = numericRange(current);
        message.warning(
          isNumericProperty(current) && (min != null || max != null)
            ? `请输入 ${min ?? "-∞"} 至 ${max ?? "∞"} 的有效数值`
            : "请输入有效属性值",
        );
        return;
      }
      propertyLoading.value = true;
      try {
        const result = await controlDeviceProperty(props.deviceId, current.propertyCode, { propValue });
        message.success(result.message || "指令已受理");
        propertyModalOpen.value = false;
        loadedTabs.delete("control");
        await Promise.all([loadTab("params", true), loadTab("control", true)]);
      } catch {
        // 网关已提示具体失败原因，保留弹窗供用户修正后重试。
      } finally {
        propertyLoading.value = false;
      }
    };

    const submitMethod = async (): Promise<void> => {
      if (!method.value) {
        return;
      }
      let inputParams: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(methodInput.value || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("输入参数必须是 JSON 对象");
        }
        inputParams = parsed as Record<string, unknown>;
      } catch (error) {
        message.warning(error instanceof Error ? error.message : "请输入合法的 JSON 对象");
        return;
      }
      methodLoading.value = true;
      try {
        const result = await invokeDeviceMethod(props.deviceId, method.value!.methodCode, { inputParams });
        if (result.message) {
          message.info(result.message);
        } else {
          message.success(`${method.value.methodName}指令已受理`);
        }
        methodModalOpen.value = false;
        loadedTabs.delete("control");
        await loadTab("params", true);
      } catch {
        // 网关已提示具体失败原因，保留弹窗供用户重试。
      } finally {
        methodLoading.value = false;
      }
    };

    return (): JSX.Element => (
      <>
        <Modal
          okText="确定"
          cancelText="取消"
          open={props.open}
          title={detail.value ? `${detail.value.deviceName} - 设备详情` : "设备详情"}
          width="1180px"
          wrapClassName="electrical-viewport-modal"
          v-slots={{
            footer: () => (
              <Button type="primary" onClick={() => emit("close")}>
                确定
              </Button>
            ),
          }}
          onCancel={() => emit("close")}
          onOk={() => emit("close")}
        >
          <Tabs activeKey={activeKey.value} onUpdate:activeKey={(value) => changeTab(String(value))}>
            <TabPane key="basic" tab="基本信息">
              {renderLoading("basic", () =>
                detail.value ? (
                  <Descriptions column={2}>
                    <DescriptionsItem label="设备编码">{displayText(detail.value.deviceCode)}</DescriptionsItem>
                    <DescriptionsItem label="设备名称">{displayText(detail.value.deviceName)}</DescriptionsItem>
                    <DescriptionsItem label="产品">{displayText(detail.value.productName)}</DescriptionsItem>
                    <DescriptionsItem label="产品品类">{displayText(detail.value.productCategoryName)}</DescriptionsItem>
                    <DescriptionsItem label="设施">{displayText(detail.value.facilityName)}</DescriptionsItem>
                    <DescriptionsItem label="品牌型号">
                      {[detail.value.brandName, detail.value.model].filter(Boolean).join(" · ") || "--"}
                    </DescriptionsItem>
                    <DescriptionsItem label="维保单位">{displayText(detail.value.maintenanceCompany)}</DescriptionsItem>
                    <DescriptionsItem label="投用日期">{displayText(detail.value.commissioningDate)}</DescriptionsItem>
                    {deviceConfigDisplayItems.value.map((item) => (
                      <DescriptionsItem key={item.name} label={item.name}>
                        {displayText(item.value)}
                      </DescriptionsItem>
                    ))}
                    {deviceConfigDisplayItems.value.length === 0 && detail.value.deviceConfigDisplay && (
                      <DescriptionsItem label={detail.value.deviceConfigDisplay.name}>
                        {displayText(detail.value.deviceConfigDisplay.value)}
                      </DescriptionsItem>
                    )}
                    <DescriptionsItem label="在线状态">
                      <Tag color={detail.value.onlineStatus === "ONLINE" ? "green" : "default"}>
                        {detail.value.onlineStatus === "ONLINE" ? "在线" : "离线"}
                      </Tag>
                    </DescriptionsItem>
                  </Descriptions>
                ) : (
                  renderEmpty("暂无设备详情", "设备详情暂时无法展示")
                ),
              )}
            </TabPane>
            <TabPane key="params" tab="实时参数">
              {renderLoading("params", () => (
                <>
                  {realtime.value?.properties.length ? (
                    <div class="detail-metric-grid">
                      {realtime.value.properties.map((item) => (
                        <div class={["detail-metric", `is-${item.status.toLowerCase()}`]} key={item.propertyCode}>
                          <span class="detail-metric-label">
                            <PcIcon iconClass="icon-dianqishebei" size={16} />
                            {item.propertyName}
                          </span>
                          <div class="detail-metric-value">
                            <strong>
                              {displayText(item.value)}
                              {hasDisplayValue(item.value) && isNumericProperty(item) && item.unit ? <small>{item.unit}</small> : null}
                            </strong>
                            <i aria-hidden="true" />
                          </div>
                          {item.dataWrite == 1 ? (
                            <Button class="detail-metric-setting" type="link" size="small" onClick={() => openPropertyControl(item)}>
                              设置
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    renderEmpty("暂无实时参数", "当前设备没有可展示的实时检测点位")
                  )}
                  {realtime.value?.methods.length ? (
                    <div class="device-method-list">
                      <div class="config-section-title">可调用方法</div>
                      {realtime.value.methods.map((current) => (
                        <div class="device-method-item" key={current.methodCode}>
                          <div>
                            <strong>{current.methodName}</strong>
                            <span>{current.description || current.methodCode}</span>
                          </div>
                          <Button type="primary" size="small" onClick={() => openMethod(current)}>
                            调用
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ))}
            </TabPane>
            <TabPane key="control" tab="控制记录">
              <DeviceRecordTable
                records={controlRecords.value}
                columns={controlColumns}
                loading={loading.control}
                pageNumber={recordPages.control.pageNumber}
                pageSize={recordPages.control.pageSize}
                total={recordPages.control.total}
                emptyText="暂无控制记录"
                rowKey={(_record: unknown, index = 0) => `control-${recordPages.control.pageNumber}-${index}`}
                onPageChange={(pageNumber: number, pageSize: number) => changeRecordPage("control", pageNumber, pageSize)}
              />
            </TabPane>
            <TabPane key="alarm" tab="历史事件">
              <DeviceRecordTable
                records={alarmRecords.value}
                columns={alarmColumns}
                loading={loading.alarm}
                pageNumber={recordPages.alarm.pageNumber}
                pageSize={recordPages.alarm.pageSize}
                total={recordPages.alarm.total}
                emptyText="该设备近期无报警记录"
                rowKey={(_record: unknown, index = 0) => `alarm-${recordPages.alarm.pageNumber}-${index}`}
                onPageChange={(pageNumber: number, pageSize: number) => changeRecordPage("alarm", pageNumber, pageSize)}
              />
            </TabPane>
            <TabPane key="maintenance" tab="运维记录">
              <DeviceRecordTable
                records={maintenanceRecords.value}
                columns={maintenanceColumns}
                loading={loading.maintenance}
                pageNumber={recordPages.maintenance.pageNumber}
                pageSize={recordPages.maintenance.pageSize}
                total={recordPages.maintenance.total}
                emptyText="暂无运维记录"
                rowKey={(_record: unknown, index = 0) => `maintenance-${recordPages.maintenance.pageNumber}-${index}`}
                onPageChange={(pageNumber: number, pageSize: number) => changeRecordPage("maintenance", pageNumber, pageSize)}
              />
            </TabPane>
            <TabPane key="ai" tab="AI分析">
              {renderLoading("ai", () =>
                analysis.value ? (
                  <div class="device-ai-analysis">
                    <div class="device-ai-summary">
                      <div class="device-ai-summary-card is-health">
                        <strong>{displayText(analysis.value.healthScore)}</strong>
                        <span>健康度评分</span>
                        <div class="device-ai-progress">
                          <i style={{ width: `${clampScore(analysis.value.healthScore)}%` }} />
                        </div>
                      </div>
                      <div class="device-ai-summary-card is-life">
                        <strong>
                          {displayText(analysis.value.remainingLifeMonths)}
                          <small>月</small>
                        </strong>
                        {renderAiTip(
                          "预计剩余寿命(月)",
                          "根据设备当前健康状态、同类设备历史运行寿命及所处环境综合评估得出的预计可使用月数。健康评分越高、运行环境越好，设备可用年限越长。",
                        )}
                      </div>
                      <div class={["device-ai-summary-card", "is-risk", riskClassName(analysis.value.future7dRisk)]}>
                        <strong>{riskText(analysis.value.future7dRisk)}</strong>
                        {renderAiTip(
                          "未来7天风险",
                          "综合设备近期健康走势、告警情况、参数异常程度和维保状况，评估未来7天内发生故障的可能性。低风险表示设备状态良好，中风险建议加强巡检，高风险需尽快安排检修。",
                        )}
                      </div>
                      <div class="device-ai-summary-card">
                        <strong>
                          {displayText(analysis.value.sameProductRank)}/{displayText(analysis.value.sameProductTotal)}
                        </strong>
                        {renderAiTip(
                          "同类设备排名",
                          "在所有同类型设备中按健康度从高到低排列，展示当前设备所处位置。排名越靠前说明设备状态越好，排名靠后建议重点关注。",
                        )}
                      </div>
                    </div>
                    <section class="device-ai-section">
                      <h4>
                        {renderAiTip(
                          "健康度维度",
                          "从运行年限、参数稳定性、告警频次、维保及时性和环境因素五个方面，对设备健康度进行综合评分。",
                        )}
                      </h4>
                      <div class="device-ai-dimensions">
                        {[
                          [
                            "运行年限",
                            analysis.value.serviceAgeScore,
                            "根据设备已投入使用的时间长短，与同类设备的正常使用年限对比评估。运行时间越久，设备自然老化程度越高，需要更频繁的巡检和维护。",
                          ],
                          [
                            "参数稳定性",
                            analysis.value.parameterStabilityScore,
                            "监测设备核心运行参数近期的波动情况和超标次数。参数越平稳说明设备运行越稳定；频繁波动或超标则表明设备可能存在隐患，需要排查原因。",
                          ],
                          [
                            "告警频次",
                            analysis.value.alarmFrequencyScore,
                            "统计近30天内该设备产生的告警次数和严重程度。告警越少说明设备越稳定；告警频繁尤其是一、二级告警增多，说明设备可靠性在下降，需要引起重视。",
                          ],
                          [
                            "维保及时性",
                            analysis.value.maintenanceTimelinessScore,
                            "根据设备是否按计划定期巡检保养来评估。按时维保的设备可靠性更高；长期未保养或保养记录不完整的设备，故障风险会显著增加。",
                          ],
                          [
                            "环境因素",
                            analysis.value.environmentScore,
                            "根据设备所在配电房的温度、湿度、水浸、烟感等环境传感器数据综合评估。高温、高湿、积水、烟雾等恶劣环境会加速设备老化和故障，环境全部达标时设备运行最安全。",
                          ],
                        ].map(([label, score, description]) => (
                          <div class="device-ai-dimension" key={String(label)}>
                            {renderAiTip(String(label), String(description))}
                            <div class="device-ai-progress">
                              <i style={{ width: `${clampScore(score as number)}%` }} />
                            </div>
                            <strong>{displayText(score)}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section class="device-ai-section">
                      <h4>
                        {renderAiTip(
                          "变化趋势",
                          "展示近7天设备健康评分的变化走势。红色柱表示高风险、橙色需关注、绿色正常。若柱子持续变矮，说明设备健康度正在下滑，需提前安排检修。",
                        )}
                      </h4>
                      {analysis.value.healthScoreTrend.length > 0 ? (
                        <div class="device-ai-trend" aria-label="最近七日健康评分趋势">
                          <EchartsChart option={aiTrendOption.value} height={80} />
                        </div>
                      ) : (
                        <p class="device-ai-empty">暂无近七日健康评分趋势</p>
                      )}
                    </section>
                    <section class="device-ai-section device-ai-root-cause">
                      <h4>
                        {renderAiTip(
                          "AI根因分析",
                          "当设备健康度偏低时，系统自动分析最近的告警记录和参数异常模式，结合历史运维案例，智能推断最可能的故障原因并给出处置建议。如系统判断把握较大，会直接推荐方案；若存在不确定性，会提醒人工复核确认。",
                        )}
                      </h4>
                      <p>{displayText(analysis.value.aiAnalysis)}</p>
                    </section>
                  </div>
                ) : (
                  renderEmpty("暂无 AI 分析", "当前设备还没有可用的健康分析数据")
                ),
              )}
            </TabPane>
          </Tabs>
        </Modal>
        <Modal
          okText="确定"
          cancelText="取消"
          open={methodModalOpen.value}
          title={method.value ? `调用设备方法 · ${method.value.methodName}` : "调用设备方法"}
          width="620px"
          wrapClassName="electrical-viewport-modal"
          confirmLoading={methodLoading.value}
          destroyOnClose
          onCancel={() => (methodModalOpen.value = false)}
          onOk={() => void submitMethod()}
        >
          <Form layout="vertical">
            <div class="device-method-description">{method.value?.description || "请确认操作后下发设备指令。"}</div>
            <label class="device-method-input-label">输入参数 JSON</label>
            <Textarea
              value={methodInput.value}
              rows={8}
              onUpdate:value={(inputValue) => {
                const value = inputValue as string;
                return (methodInput.value = value);
              }}
            />
            <small class="device-method-input-tip">无输入参数时请输入 {"{}"}；参数名以设备物模型定义为准。</small>
          </Form>
        </Modal>
        <Modal
          okText="确定"
          cancelText="取消"
          open={propertyModalOpen.value}
          title={property.value ? `设置实时参数 · ${property.value.propertyName}` : "设置实时参数"}
          width="520px"
          wrapClassName="electrical-viewport-modal"
          confirmLoading={propertyLoading.value}
          destroyOnClose
          onCancel={() => (propertyModalOpen.value = false)}
          onOk={() => void submitPropertyControl()}
        >
          <Form layout="vertical">
            <FormItem label="属性标识">{property.value?.propertyCode || "--"}</FormItem>
            <FormItem label="属性值">
              {isEnumProperty(property.value) ? (
                <Select
                  v-model:value={propertyValue.value as string | number}
                  options={enumOptions(property.value)}
                  placeholder="请选择属性值"
                  allowClear
                />
              ) : isNumericProperty(property.value) ? (
                <InputNumber
                  v-model:value={propertyValue.value as number}
                  placeholder="请输入属性值"
                  style={{ width: "100%" }}
                  {...numericRange(property.value)}
                  {...(typeof property.value?.precision === "number" ? { precision: property.value.precision } : {})}
                  {...(isFloatProperty(property.value) && typeof property.value?.precision === "number"
                    ? { step: 1 / 10 ** property.value.precision }
                    : {})}
                />
              ) : (
                <Input v-model:value={propertyValue.value as string} placeholder="请输入属性值" allowClear />
              )}
              {hasDisplayValue(property.value?.value) && isNumericProperty(property.value) && property.value?.unit ? (
                <span class="device-property-unit">{property.value.unit}</span>
              ) : null}
            </FormItem>
            {property.value?.remark ? <p class="device-method-input-tip">{property.value.remark}</p> : null}
          </Form>
        </Modal>
      </>
    );
  },
});
