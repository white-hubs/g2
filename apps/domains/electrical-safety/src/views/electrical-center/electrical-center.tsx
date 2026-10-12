import type {
  ElectricalDeviceHealthDistribution,
  ElectricalDeviceOnlineRate,
  ElectricalFacilityOverview,
  ElectricalSafetyScore,
} from "@g2-contract/electrical-safety";
import type { AlarmLevelStatistic, AlarmRecord } from "@g2-contract/electrical-safety/references";
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Modal,
  PageLayout,
  PcIcon,
  Progress,
  Space,
  Spin,
  Tag,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import type { EChartsCoreOption } from "echarts/core";
import { computed, defineComponent, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { CenterFacilityBindingModal } from "./center-facility-binding-modal";
import { CenterScadaPageBindingModal } from "./center-scada-page-binding-modal";
import {
  deleteElectricalCenterScadaBinding,
  getDeviceHealthDistribution,
  getDeviceOnlineRate,
  getElectricalCenterScadaBinding,
  getHomeFacilityOverviews,
  getMonthlyLineLoss,
  getSafetyScore,
  saveElectricalCenterScadaBinding,
} from "@/api/electrical-safety";
import { getAlarmRecordPage, getAlarmStatisticsLevel } from "@/api/references";
import { usePageFullscreen } from "@/composables/use-page-fullscreen";
import {
  type ElectricalCenterFacilityBindingSelection,
  type ElectricalCenterScadaBinding,
  buildElectricalCenterRuntimeBindings,
  loadElectricalCenterScadaBindingFromServer,
  reconcileElectricalCenterScadaBinding,
  toElectricalCenterScadaBindingSaveRequest,
} from "@/utils/electrical-center-scada-binding";
import { usePageName } from "@/utils/page-name";
import { type ScadaPageSummary, fetchMultiDevicePages } from "@/utils/scada-pages";
import { EchartsChart } from "@/views/shared/echarts-chart";
import { ScadaPlaceholder } from "@/views/shared/scada-placeholder";
import { ScadaRuntimeView } from "@/views/shared/scada-runtime-view";

import "../shared/page.less";
import "./electrical-center.less";

const ALARM_PAGE_SIZE = 20;
const ALARM_LEVEL_COLORS = ["#ff4d4f", "#fa8c16", "#faad14", "#1677ff"];
const alarmLevelKey = (level: AlarmLevelStatistic): string => level.code || level.id;
const resolveLineLossRate = (value: unknown): string => {
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  if (!value || typeof value !== "object") {
    return "--";
  }
  const record = value as Record<string, unknown>;
  for (const key of ["lossRate", "lineLossRate", "rate"]) {
    if (typeof record[key] === "number" || typeof record[key] === "string") {
      return String(record[key]);
    }
  }
  return "--";
};
const facilityProperties = (facility: ElectricalFacilityOverview): ElectricalFacilityOverview["displayProperties"] =>
  facility.displayProperties.slice(0, 3);
const formatAlarmTime = (value?: string): string => {
  if (!value) {
    return "--";
  }
  const timestamp = Number(value);
  const date = Number.isFinite(timestamp) && timestamp > 0 ? dayjs(timestamp) : dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm") : value;
};
const alarmStatusMeta = (record: AlarmRecord): { label: string; className: string } => {
  const status = record.alarmStatus || "";
  if (status === "ALARM_HANDLER") {
    return { label: record.alarmStatusName || "已处理", className: "is-handled" };
  }
  if (status === "ALARM_PROGRESS_CONFIRMED") {
    return { label: record.alarmStatusName || "已派单", className: "is-dispatched" };
  }
  if (status === "ALARM_SUSPEND") {
    return { label: record.alarmStatusName || "已挂起", className: "is-suspended" };
  }
  return { label: record.alarmStatusName || "未确认", className: "is-pending" };
};

export const ElectricalCenter = defineComponent({
  name: "ElectricalCenter",
  setup: () => {
    const { pageTitle } = usePageName();
    const router = useRouter();
    const route = useRoute();
    const { isFullscreen, toggleFullscreen } = usePageFullscreen();
    const centerView = ref<"scada" | "dashboard">(route.query.view === "scada" ? "scada" : "dashboard");
    const facilities = shallowRef<ElectricalFacilityOverview[]>([]);
    const electricalCenterPages = shallowRef<ScadaPageSummary[]>([]);
    const electricalCenterLoading = shallowRef(route.query.view === "scada");
    const centerScadaBindingLoadFailed = shallowRef(false);
    const centerScadaBindingSaving = shallowRef(false);
    const centerPageBindingModalOpen = shallowRef(false);
    const centerFacilityBindingModalOpen = shallowRef(false);
    const centerScadaBinding = shallowRef<ElectricalCenterScadaBinding | null>(null);
    let centerScadaRequestId = 0;
    const boundElectricalCenterPage = computed(
      () => electricalCenterPages.value.find((page) => page.id === centerScadaBinding.value?.pageId) ?? null,
    );
    const centerBindableElements = computed(() => boundElectricalCenterPage.value?.bindableElements ?? []);
    const centerRuntimeBindings = computed(() => buildElectricalCenterRuntimeBindings(centerScadaBinding.value, facilities.value));
    const boundCenterFacilityCount = computed(
      () => centerBindableElements.value.filter((element) => Boolean(centerScadaBinding.value?.elementFacilityIds[element.id])).length,
    );
    const switchCenterView = (): void => {
      centerView.value = centerView.value === "scada" ? "dashboard" : "scada";
      void router.replace({
        query: {
          ...route.query,
          view: centerView.value === "dashboard" ? undefined : centerView.value,
        },
      });
    };

    const bindingEquals = (left: ElectricalCenterScadaBinding | null, right: ElectricalCenterScadaBinding | null): boolean =>
      JSON.stringify(left) === JSON.stringify(right);

    const persistElectricalCenterBinding = async (binding: ElectricalCenterScadaBinding | null, success?: string): Promise<void> => {
      if (binding) {
        await saveElectricalCenterScadaBinding(toElectricalCenterScadaBindingSaveRequest(binding));
      } else {
        await deleteElectricalCenterScadaBinding();
      }
      if (success) {
        message.success(success);
      }
    };

    const loadElectricalCenterData = async (): Promise<void> => {
      const requestId = ++centerScadaRequestId;
      electricalCenterLoading.value = true;
      centerScadaBindingLoadFailed.value = false;
      try {
        const [pagesResult, bindingResult] = await Promise.allSettled([
          fetchMultiDevicePages(),
          loadElectricalCenterScadaBindingFromServer({
            getBinding: getElectricalCenterScadaBinding,
            saveBinding: saveElectricalCenterScadaBinding,
          }),
        ]);
        if (requestId !== centerScadaRequestId) {
          return;
        }
        if (pagesResult.status === "rejected") {
          electricalCenterPages.value = [];
          message.error("电气中心组态列表加载失败");
        } else {
          electricalCenterPages.value = pagesResult.value;
        }
        if (bindingResult.status === "rejected") {
          centerScadaBinding.value = null;
          centerScadaBindingLoadFailed.value = true;
          return;
        }
        if (pagesResult.status === "rejected") {
          centerScadaBinding.value = bindingResult.value;
          return;
        }
        const reconciled = reconcileElectricalCenterScadaBinding(bindingResult.value, pagesResult.value);
        if (!bindingEquals(bindingResult.value, reconciled)) {
          try {
            await persistElectricalCenterBinding(reconciled);
          } catch {
            if (requestId === centerScadaRequestId) {
              centerScadaBinding.value = bindingResult.value;
              centerScadaBindingLoadFailed.value = true;
            }
            return;
          }
        }
        if (requestId === centerScadaRequestId) {
          centerScadaBinding.value = reconciled;
        }
      } finally {
        if (requestId === centerScadaRequestId) {
          electricalCenterLoading.value = false;
        }
      }
    };

    const bindElectricalCenterPage = async (pageId: string): Promise<void> => {
      if (centerScadaBindingSaving.value) {
        return;
      }
      const current = centerScadaBinding.value;
      const nextBinding: ElectricalCenterScadaBinding = {
        pageId,
        elementFacilityIds: current?.pageId === pageId ? current.elementFacilityIds : {},
        ...(current?.pageId === pageId && current.elementPropertyCodes ? { elementPropertyCodes: current.elementPropertyCodes } : {}),
      };
      centerScadaBindingSaving.value = true;
      try {
        await persistElectricalCenterBinding(nextBinding);
        centerScadaBinding.value = nextBinding;
        centerPageBindingModalOpen.value = false;
        centerFacilityBindingModalOpen.value = true;
      } catch {
        // 网关已展示失败信息，保留弹窗和服务器当前绑定。
      } finally {
        centerScadaBindingSaving.value = false;
      }
    };

    const bindElectricalCenterFacilities = async (selection: ElectricalCenterFacilityBindingSelection): Promise<void> => {
      if (centerScadaBindingSaving.value) {
        return;
      }
      const pageId = centerScadaBinding.value?.pageId;
      if (!pageId) {
        return;
      }
      const nextBinding = {
        pageId,
        elementFacilityIds: selection.elementFacilityIds,
        elementPropertyCodes: selection.elementPropertyCodes,
      };
      centerScadaBindingSaving.value = true;
      try {
        await persistElectricalCenterBinding(nextBinding, "电气中心设施房绑定已保存");
        centerScadaBinding.value = nextBinding;
        centerFacilityBindingModalOpen.value = false;
      } catch {
        // 网关已展示失败信息，保留弹窗和服务器当前绑定。
      } finally {
        centerScadaBindingSaving.value = false;
      }
    };

    const renderCenterScada = (): JSX.Element => {
      if (electricalCenterLoading.value) {
        return (
          <div class="scada-runtime-host">
            <Spin spinning tip="正在加载电气中心组态..." />
          </div>
        );
      }
      if (centerScadaBindingLoadFailed.value) {
        return (
          <ScadaPlaceholder
            title="电气中心组态图"
            description="二维组态绑定加载失败"
            copy="未读取到服务器绑定数据，为避免覆盖已有配置，请重新加载后再操作。"
          >
            <Button type="primary" onClick={() => void loadElectricalCenterData()}>
              重新加载
            </Button>
          </ScadaPlaceholder>
        );
      }
      if (electricalCenterPages.value.length === 0) {
        return (
          <ScadaPlaceholder
            title="电气中心组态图"
            description="尚未配置多设备二维组态"
            copy="请先在二维组态画布中配置至少两个需要运行端绑定的图元。"
            showConfigure
          />
        );
      }
      if (!boundElectricalCenterPage.value) {
        return (
          <ScadaPlaceholder
            title="电气中心组态图"
            description="尚未绑定二维组态"
            copy="在电气安全业务中选择一张多设备画面，然后将画面图元绑定到设施房。"
          >
            <Button type="primary" onClick={() => (centerPageBindingModalOpen.value = true)}>
              绑定二维组态
            </Button>
          </ScadaPlaceholder>
        );
      }
      return (
        <div class="center-scada-view">
          <div class="center-scada-toolbar">
            <span class="center-scada-bound">
              已绑定二维组态
              <strong>{boundElectricalCenterPage.value.name}</strong>
              <small>
                设施房 {boundCenterFacilityCount.value}/{centerBindableElements.value.length}
              </small>
            </span>
            <Space>
              <Button loading={overviewLoading.value} onClick={() => void loadOverview()}>
                刷新设施数据
              </Button>
              <Button onClick={() => (centerFacilityBindingModalOpen.value = true)}>设备绑定（设施房）</Button>
              <Button onClick={() => (centerPageBindingModalOpen.value = true)}>切换二维组态</Button>
            </Space>
          </div>
          <div class="center-scada-canvas">
            <ScadaRuntimeView pageId={boundElectricalCenterPage.value.id} elementBindings={centerRuntimeBindings.value} />
          </div>
        </div>
      );
    };
    const alarmFilter = shallowRef("all");
    const selectedAlarm = ref<AlarmRecord | null>(null);
    const alarmRecords = shallowRef<AlarmRecord[]>([]);
    const healthDistribution = shallowRef<ElectricalDeviceHealthDistribution | null>(null);
    const deviceOnlineRate = shallowRef<ElectricalDeviceOnlineRate | null>(null);
    const safetyScore = shallowRef<ElectricalSafetyScore | null>(null);
    const levelStatistics = shallowRef<AlarmLevelStatistic[]>([]);
    const lineLossRate = ref("--");
    const alarmLoading = ref(false);
    const overviewLoading = ref(false);
    const alarmUpdatedAt = ref("--");
    const totalDevices = computed(() => deviceOnlineRate.value?.totalCount ?? 0);
    const onlineDevices = computed(() => deviceOnlineRate.value?.onlineCount ?? 0);
    const onlineRate = computed(() => (deviceOnlineRate.value ? String(deviceOnlineRate.value.onlineRate) : "--"));
    const alarmTotal = computed(() => levelStatistics.value.reduce((sum, item) => sum + Number(item.alarmNum || 0), 0));
    const safetyScoreTrend = computed(() => {
      const difference = safetyScore.value?.difference;
      if (difference == null) {
        return;
      }
      return { direction: difference >= 0 ? ("up" as const) : ("down" as const), value: `${difference > 0 ? "+" : ""}${difference}` };
    });
    const alarmLevels = computed(() => levelStatistics.value.filter((level) => Boolean(alarmLevelKey(level))));
    const selectedAlarmLevel = computed(() =>
      alarmFilter.value === "all" ? undefined : alarmLevels.value.find((level) => alarmLevelKey(level) === alarmFilter.value),
    );
    const alarmLevelStatistic = (record: AlarmRecord): AlarmLevelStatistic | undefined =>
      alarmLevels.value.find(
        (level) =>
          (record.alarmLevelCode && level.code === record.alarmLevelCode) || (record.alarmLevelId && level.id === record.alarmLevelId),
      );
    const alarmLevelColor = (record: AlarmRecord): string => {
      const level = alarmLevelStatistic(record);
      const index = level ? alarmLevels.value.findIndex((item) => alarmLevelKey(item) === alarmLevelKey(level)) : -1;
      return ALARM_LEVEL_COLORS[Math.max(0, index) % ALARM_LEVEL_COLORS.length];
    };
    const healthChartOption = computed<EChartsCoreOption>(() => {
      const distribution = healthDistribution.value;
      const total = distribution?.totalCount ?? 0;
      return {
        animation: false,
        title: {
          text: String(total),
          subtext: "设备总数",
          left: "center",
          top: "35%",
          textStyle: { color: "#1f2937", fontSize: 26, fontWeight: 700 },
          subtextStyle: { color: "#8c95a3", fontSize: 12 },
        },
        tooltip: { trigger: "item", formatter: "{b}：{c} 台 ({d}%)", appendToBody: true },
        series: [
          {
            type: "pie",
            radius: ["58%", "78%"],
            label: { show: false },
            data: [
              { name: "健康（≥85）", value: distribution?.healthyCount ?? 0, itemStyle: { color: "#52c41a" } },
              { name: "关注（60-84）", value: distribution?.attentionCount ?? 0, itemStyle: { color: "#fa8c16" } },
              { name: "异常（<60）", value: distribution?.abnormalCount ?? 0, itemStyle: { color: "#ff4d4f" } },
              { name: "未评分", value: distribution?.unknownCount ?? 0, itemStyle: { color: "#d9d9d9" } },
            ],
          },
        ],
      };
    });
    const loadAlarms = async (): Promise<void> => {
      alarmLoading.value = true;
      try {
        const result = await getAlarmRecordPage({
          applicationCode: "ELECTRICAL_SAFETY",
          pageNumber: 1,
          pageSize: ALARM_PAGE_SIZE,
          ...(selectedAlarmLevel.value?.code
            ? { alarmLevelCode: selectedAlarmLevel.value.code }
            : selectedAlarmLevel.value?.id
              ? { alarmLevelId: selectedAlarmLevel.value.id }
              : {}),
        });
        alarmRecords.value = result.records.slice(0, ALARM_PAGE_SIZE);
        alarmUpdatedAt.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
      } catch {
        alarmRecords.value = [];
      } finally {
        alarmLoading.value = false;
      }
    };
    const loadOverview = async (): Promise<void> => {
      overviewLoading.value = true;
      try {
        const [facilityResult, alarmResult, lineLossResult, healthResult, onlineRateResult, safetyScoreResult] = await Promise.allSettled([
          getHomeFacilityOverviews(),
          getAlarmStatisticsLevel({ applicationCode: "ELECTRICAL_SAFETY" }),
          getMonthlyLineLoss(),
          getDeviceHealthDistribution(),
          getDeviceOnlineRate(),
          getSafetyScore(),
        ]);
        if (facilityResult.status === "fulfilled") {
          facilities.value = facilityResult.value;
        }
        if (alarmResult.status === "fulfilled") {
          levelStatistics.value = alarmResult.value;
          if (alarmFilter.value !== "all" && !alarmLevels.value.some((level) => alarmLevelKey(level) === alarmFilter.value)) {
            alarmFilter.value = "all";
          }
        }
        if (lineLossResult.status === "fulfilled") {
          lineLossRate.value = resolveLineLossRate(lineLossResult.value);
        }
        if (healthResult.status === "fulfilled") {
          healthDistribution.value = healthResult.value;
        }
        if (onlineRateResult.status === "fulfilled") {
          deviceOnlineRate.value = onlineRateResult.value;
        }
        if (safetyScoreResult.status === "fulfilled") {
          safetyScore.value = safetyScoreResult.value;
        }
      } finally {
        overviewLoading.value = false;
      }
    };
    const columns = [
      { title: "报警时间", width: 142, customRender: ({ record }: { record: AlarmRecord }) => formatAlarmTime(record.alarmTime) },
      {
        title: "等级",
        width: 72,
        customRender: ({ record }: { record: AlarmRecord }) => {
          const level = alarmLevelStatistic(record);
          return <Tag color={alarmLevelColor(record)}>{record.alarmLevelName || level?.name || "--"}</Tag>;
        },
      },
      {
        title: "报警设备",
        width: 150,
        customRender: ({ record }: { record: AlarmRecord }) => record.alarmTargetName || record.alarmTargetCode || "--",
      },
      {
        title: "报警事件",
        width: 150,
        customRender: ({ record }: { record: AlarmRecord }) => record.alarmEventName || record.alarmEvent || record.alarmTypeName || "--",
      },
      {
        title: "处理状态",
        width: 100,
        customRender: ({ record }: { record: AlarmRecord }) => {
          const status = alarmStatusMeta(record);
          return <span class={["alarm-status", status.className]}>{status.label}</span>;
        },
      },
    ];
    const [AlarmTable, alarmTableApi] = usePcTable({
      tableCode: "electrical-safety-electrical-center",
      rowKey: "id",
      columns,
      dataSource: [],
      pagination: false,
    });
    watch(alarmRecords, (records) => alarmTableApi.setDataSource(records), { immediate: true });
    onMounted(() => {
      void loadAlarms();
      void loadOverview();
      if (centerView.value === "scada") {
        void loadElectricalCenterData();
      }
    });
    watch(centerView, (view) => {
      if (view === "scada") {
        void loadElectricalCenterData();
      }
    });
    const renderKpi = (
      icon: JSX.Element,
      label: string,
      value: string,
      suffix: string,
      copy: JSX.Element | string,
      tone: string,
      trend?: "up" | "down",
      onClick?: () => void,
      trendValue = "--",
    ): JSX.Element => (
      <Card class="center-kpi-card" hoverable {...{ onClick }}>
        <div class="center-kpi-inner">
          <span class="center-kpi-icon">{icon}</span>
          <div class="center-kpi-body">
            <div class="center-kpi-label">{label}</div>
            <div class="center-kpi-value" style={{ color: tone }}>
              {value}
              <span>{suffix}</span>
            </div>
            <div class="center-kpi-copy">{copy}</div>
          </div>
          {trend ? (
            <span class={["center-kpi-trend", `is-${trend}`]}>
              <PcIcon iconClass={trend === "up" ? "icon-shangsheng" : "icon-xiajiang"} size={12} /> {trendValue}
            </span>
          ) : null}
        </div>
      </Card>
    );
    return () => (
      <>
        <PageLayout
          title={pageTitle.value}
          showFooter={false}
          v-slots={{
            "layout-header": () => (
              <Space>
                {centerView.value === "dashboard" ? (
                  <>
                    <span class="muted">{alarmUpdatedAt.value}</span>
                    <Button
                      loading={alarmLoading.value || overviewLoading.value}
                      onClick={() => void Promise.all([loadAlarms(), loadOverview()])}
                    >
                      刷新
                    </Button>
                    <Button type={isFullscreen.value ? "primary" : "default"} onClick={() => void toggleFullscreen()}>
                      {isFullscreen.value ? "退出全屏" : "全屏"}
                    </Button>
                  </>
                ) : null}
                <Button type="primary" onClick={switchCenterView}>
                  {centerView.value === "scada" ? "仪表盘" : "组态图"}
                </Button>
              </Space>
            ),
            "layout-content": () =>
              centerView.value === "scada" ? (
                <div class={["electrical-page electrical-center-page", "is-scada"]}>{renderCenterScada()}</div>
              ) : (
                <div class="electrical-page electrical-center-page">
                  <div class="center-kpi-grid">
                    {renderKpi(
                      <PcIcon iconClass="icon-anquanpingfen" size={32} />,
                      "安全评分",
                      safetyScore.value?.score == null ? "--" : String(safetyScore.value.score),
                      "分",
                      safetyScore.value?.score == null ? "暂无设备健康度数据" : "综合评分 / 100",
                      safetyScore.value?.score == null ? "#8c8c8c" : "#52c41a",
                      safetyScoreTrend.value?.direction,
                      () => void router.push("/device-monitoring?view=card"),
                      safetyScoreTrend.value?.value,
                    )}
                    {renderKpi(
                      <PcIcon iconClass="icon-huoyuegaojing" size={32} />,
                      "活跃告警",
                      String(alarmTotal.value),
                      "条",
                      <Space size={4}>
                        {alarmLevels.value.map((level, index) => (
                          <Tag key={alarmLevelKey(level)} color={ALARM_LEVEL_COLORS[index % ALARM_LEVEL_COLORS.length]}>
                            {level.name} {Number(level.alarmNum || 0)}
                          </Tag>
                        ))}
                      </Space>,
                      "#ff4d4f",
                    )}
                    {renderKpi(
                      <PcIcon iconClass="icon-shebeizaixianshuai" size={32} />,
                      "设备在线率",
                      onlineRate.value,
                      "%",
                      `${onlineDevices.value}/${totalDevices.value} 台在线`,
                      "#1677ff",
                      undefined,
                      () => void router.push("/device-monitoring?view=list"),
                    )}
                    {renderKpi(
                      <PcIcon iconClass="icon-benyuexiansunshuai" size={32} />,
                      "本月线损率",
                      lineLossRate.value,
                      "%",
                      "总进线与分配电",
                      "#262626",
                      "down",
                    )}
                  </div>
                  <div class="center-content-grid">
                    <Card
                      title="实时告警动态"
                      v-slots={{
                        extra: () => (
                          <Space size={12}>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => history.pushState({}, "", "/portal/genericEquipmentMonitor/alarmRecord")}
                            >
                              查看全部告警
                            </Button>
                          </Space>
                        ),
                      }}
                    >
                      <div class="alarm-filter-tabs">
                        <button
                          type="button"
                          class={alarmFilter.value === "all" ? "is-active" : ""}
                          onClick={() => {
                            alarmFilter.value = "all";
                            void loadAlarms();
                          }}
                        >
                          全部（{alarmTotal.value}）
                        </button>
                        {alarmLevels.value.map((level) => (
                          <button
                            type="button"
                            key={alarmLevelKey(level)}
                            class={alarmFilter.value === alarmLevelKey(level) ? "is-active" : ""}
                            onClick={() => {
                              alarmFilter.value = alarmLevelKey(level);
                              void loadAlarms();
                            }}
                          >
                            {level.name}（{Number(level.alarmNum || 0)}）
                          </button>
                        ))}
                      </div>
                      <Spin spinning={alarmLoading.value}>
                        <AlarmTable />
                      </Spin>
                    </Card>
                    <Card
                      title="设施运行总览"
                      v-slots={{
                        extra: () => (
                          <Button type="link" onClick={() => void router.push("/device-monitoring")}>
                            查看全部
                          </Button>
                        ),
                      }}
                    >
                      <Spin spinning={overviewLoading.value}>
                        <div class="center-facility-grid">
                          {facilities.value.map((item) => (
                            <div
                              class={["center-facility-item", item.hasActiveAlarm ? "is-alarm" : "is-normal"]}
                              key={String(item.facilityId)}
                              role="button"
                              tabindex={0}
                              onClick={() =>
                                void router.push({
                                  path: "/device-monitoring",
                                  query: { facilityId: String(item.facilityId), view: "card" },
                                })
                              }
                            >
                              <div class="facility-summary-head">
                                <strong>{item.facilityName}</strong>
                                <strong style={{ color: item.hasActiveAlarm ? "#ff4d4f" : "#52c41a" }}>
                                  {item.hasActiveAlarm ? "⚠ 有告警" : "● 正常"}
                                </strong>
                              </div>
                              <div class="facility-summary-values">
                                <span>
                                  <em>设备在线</em>
                                  <strong>
                                    {item.electricalDeviceOnline}/{item.electricalDeviceTotal}
                                  </strong>
                                </span>
                                {facilityProperties(item).map((property) => (
                                  <span key={`${property.deviceId}-${property.propertyCode}`}>
                                    <em>{property.propertyName}</em>
                                    <strong>
                                      {property.value ?? "--"}
                                      {property.unit ?? ""}
                                    </strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {facilities.value.length === 0 && !overviewLoading.value ? (
                            <Empty class="facility-empty" description="暂无配电房运行数据" />
                          ) : null}
                        </div>
                      </Spin>
                    </Card>
                    <Card
                      title="设备健康度分布"
                      v-slots={{
                        extra: () => (
                          <Button type="link" onClick={() => void router.push("/device-monitoring?view=card")}>
                            查看全部
                          </Button>
                        ),
                      }}
                    >
                      <Spin spinning={overviewLoading.value}>
                        {healthDistribution.value ? (
                          <div class="health-overview">
                            <div class="health-summary">
                              <EchartsChart option={healthChartOption.value} height={180} />
                              <div>
                                <span>
                                  <i class="health-dot is-healthy" />
                                  健康（≥85）<strong>{healthDistribution.value.healthyCount} 台</strong>
                                </span>
                                <span>
                                  <i class="health-dot is-concern" />
                                  关注（60-84）<strong>{healthDistribution.value.attentionCount} 台</strong>
                                </span>
                                <span>
                                  <i class="health-dot is-abnormal" />
                                  异常（&lt;60）<strong>{healthDistribution.value.abnormalCount} 台</strong>
                                </span>
                                <span>
                                  <i class="health-dot is-unknown" />
                                  未评分<strong>{healthDistribution.value.unknownCount} 台</strong>
                                </span>
                              </div>
                            </div>
                            <div>
                              <div class="subsection-title">需关注设备 Top5</div>
                              <div class="low-score-list">
                                {healthDistribution.value.attentionTop5.map((device) => (
                                  <button
                                    type="button"
                                    key={String(device.deviceId)}
                                    onClick={() =>
                                      void router.push({
                                        path: "/device-monitoring",
                                        query: { deviceId: String(device.deviceId), view: "card" },
                                      })
                                    }
                                  >
                                    <span>{device.deviceName}</span>
                                    <Progress percent={Math.max(0, Math.min(100, device.healthScore))} showInfo={false} size="small" />
                                    <strong>{device.healthScore}</strong>
                                  </button>
                                ))}
                                {healthDistribution.value.attentionTop5.length === 0 ? <Empty description="暂无需关注设备" /> : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Empty description="暂无设备健康度数据" />
                        )}
                      </Spin>
                    </Card>
                    <Card
                      title="隐患风险排行"
                      v-slots={{
                        extra: () => (
                          <Button type="link" onClick={() => void router.push("/deep-analysis")}>
                            查看详细分析
                          </Button>
                        ),
                      }}
                    >
                      <Empty description="暂无隐患风险数据" />
                    </Card>
                  </div>
                </div>
              ),
          }}
        />
        <CenterScadaPageBindingModal
          open={centerPageBindingModalOpen.value}
          submitting={centerScadaBindingSaving.value}
          pages={electricalCenterPages.value}
          currentPageId={centerScadaBinding.value?.pageId ?? ""}
          onCancel={() => (centerPageBindingModalOpen.value = false)}
          onSubmit={bindElectricalCenterPage}
        />
        <CenterFacilityBindingModal
          open={centerFacilityBindingModalOpen.value}
          submitting={centerScadaBindingSaving.value}
          elements={centerBindableElements.value}
          facilities={facilities.value}
          currentBindings={centerScadaBinding.value?.elementFacilityIds ?? {}}
          currentPropertyCodes={centerScadaBinding.value?.elementPropertyCodes ?? {}}
          onCancel={() => (centerFacilityBindingModalOpen.value = false)}
          onSubmit={bindElectricalCenterFacilities}
        />
        <Modal
          okText="确定"
          cancelText="取消"
          open={Boolean(selectedAlarm.value)}
          title="告警详情"
          width="680px"
          v-slots={{
            footer: () => (
              <Button type="primary" onClick={() => (selectedAlarm.value = null)}>
                确定
              </Button>
            ),
          }}
          onCancel={() => (selectedAlarm.value = null)}
          onOk={() => (selectedAlarm.value = null)}
        >
          {selectedAlarm.value && (
            <Descriptions bordered={false} column={2}>
              <DescriptionsItem label="告警级别">{selectedAlarm.value.alarmLevelName || "--"}</DescriptionsItem>
              <DescriptionsItem label="当前状态">{selectedAlarm.value.alarmStatusName || "--"}</DescriptionsItem>
              <DescriptionsItem label="告警内容">
                {selectedAlarm.value.alarmEventName || selectedAlarm.value.alarmTypeName || "--"}
              </DescriptionsItem>
              <DescriptionsItem label="发生时间">{selectedAlarm.value.alarmTime || "--"}</DescriptionsItem>
            </Descriptions>
          )}
        </Modal>
      </>
    );
  },
});
