import type { Cell } from "@antv/x6";
import { DeviceList, LineLossTrend } from "@g2-contract/electrical-safety/graph";
import { Button, Select, Table, Tooltip } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import * as echarts from "echarts";
import { type PropType, computed, defineComponent, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getElectricalSafetyClient } from "@/domain-context";

import "./line-loss-edge-panel.less";

function getNodeName(node: unknown): string {
  if (!node) {
    return "";
  }
  const data = (node as { getData?: () => Record<string, unknown> }).getData?.() || {};
  if (typeof data.nodeName === "string" && data.nodeName) {
    return data.nodeName;
  }
  const attrs = (node as { getAttrs?: () => Record<string, unknown> }).getAttrs?.() || {};
  const label = (attrs as { label?: { textWrap?: { text?: string }; text?: string } }).label || {};
  if (label.textWrap && typeof label.textWrap.text === "string") {
    return label.textWrap.text;
  }
  if (typeof label.text === "string") {
    return label.text;
  }
  return "";
}

type TrendPeriod = "WEEK" | "MONTH" | "YEAR";

interface TrendPoint {
  date: string;
  value: number;
}

interface WarningRow {
  key: string;
  time: string;
  level: string;
  desc: string;
  status: string;
}
interface LineLossEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  webStyle?: string;
  [key: string]: unknown;
  fromDeviceId?: string;
  toDeviceId?: string;
  lineLossRate?: number;
}
function renderTimeCell(value: string) {
  const text = typeof value === "string" ? value : "";
  const parts = text.split(" ");
  const date = parts[0] || text;
  const time = parts[1] || "";
  return (
    <div class="line-loss-time">
      <div class="line-loss-time__date">{date}</div>
      {time ? <div class="line-loss-time__clock">{time}</div> : null}
    </div>
  );
}

function renderEllipsisText(text: string) {
  const value = typeof text === "string" ? text : "";
  return (
    <Tooltip title={value} placement="topLeft">
      <span class="line-loss-ellipsis">{value}</span>
    </Tooltip>
  );
}

function alarmLevelColor(level: string): string {
  if (level === "一级") {
    return "#f5222d";
  }
  if (level === "二级" || level === "三级") {
    return "#fa8c16";
  }
  if (level === "四级") {
    return "#1890ff";
  }
  return "#333";
}

function statusColor(status: string): string {
  if (status === "已挂起") {
    return "#1890ff";
  }
  if (status === "待确认" || status === "处理中") {
    return "#fa8c16";
  }
  if (status === "已处理") {
    return "#52c41a";
  }
  return "#333";
}

/** 输入/输出设备下拉：按名称、编码模糊查询（兼容 fieldNames 映射后的 label） */
function filterLineLossDeviceOption(input: string, option: unknown): boolean {
  const q = input.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const o = option as DeviceList & { label?: string };
  const name = typeof o.name === "string" ? o.name : typeof o.label === "string" ? o.label : "";
  const code = typeof o.code === "string" ? o.code : "";
  return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
}

export const LineLossEdgePanel = defineComponent({
  name: "LineLossEdgePanel",
  props: {
    selectedCells: {
      type: Array as PropType<Cell[]>,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    onSaved: {
      type: Function as PropType<() => void | Promise<void>>,
      default: undefined,
    },
  },
  setup(props) {
    const graph = inject<{ value: { getCellById: (id: string) => unknown } }>("graph");

    const firstEdge = computed(() => {
      const cells = (props.selectedCells || []) as Cell[];
      const edge = cells.find((c) => (c as { isEdge?: () => boolean }).isEdge?.());
      return edge || null;
    });

    const basicInfo = ref<{
      name: string;
      inputDevice?: string;
      outputDevice?: string;
    } | null>(null);
    const trendData = ref<TrendPoint[]>([]);
    const tableData = ref<LineLossTrend[]>([]);
    const warningData = ref<WarningRow[]>([]);
    const detailLoading = ref(false);
    const trendPeriod = ref<TrendPeriod>("WEEK");
    const chartElRef = ref<HTMLDivElement | null>(null);
    const chartRef = ref<echarts.ECharts | null>(null);
    const resizeObserverRef = ref<ResizeObserver | null>(null);
    const lineId = ref("");
    let destroyed = false;
    let resizeRafId: number | null = null;
    let optionRafId: number | null = null;
    const chartError = ref<string>("");
    const fromDeviceList = ref<DeviceList[]>();
    const toDeviceList = ref<DeviceList[]>();
    const activeLineName = ref<string>("");

    const refreshLineName = (): void => {
      const edge = firstEdge.value as {
        getData?: () => { from?: string; to?: string };
        getSourceCellId?: () => string;
        getTargetCellId?: () => string;
        getSource?: () => { cell?: string };
        getTarget?: () => { cell?: string };
      } | null;
      if (!edge) {
        activeLineName.value = "";
        return;
      }
      const data = edge.getData?.() || {};
      const fromId = data.from || (edge.getSourceCellId && edge.getSourceCellId()) || edge.getSource?.()?.cell;
      const toId = data.to || (edge.getTargetCellId && edge.getTargetCellId()) || edge.getTarget?.()?.cell;

      let fromName = "";
      let toName = "";
      if (graph?.value) {
        const fromNode = fromId ? graph.value.getCellById(fromId) : null;
        const toNode = toId ? graph.value.getCellById(toId) : null;
        fromName = getNodeName(fromNode);
        toName = getNodeName(toNode);
      }

      const startText = fromName || fromId || "开始节点";
      const endText = toName || toId || "结束节点";
      activeLineName.value = `【${startText}】-【${endText}】`;
    };

    const mockFetchDetail = async (edge: Cell | null): Promise<void> => {
      const edgeData = (edge as unknown as { data?: LineLossEdge } | null)?.data;
      if (!edge || !edgeData) {
        basicInfo.value = null;
        trendData.value = [];
        tableData.value = [];
        warningData.value = [];
        return;
      }

      detailLoading.value = true;
      try {
        refreshLineName();
        basicInfo.value = {
          name: activeLineName.value,
          inputDevice: edgeData.fromDeviceId,
          outputDevice: edgeData.toDeviceId,
        };
        lineId.value = edgeData.id;
        getDeviceList();
        await getEchartsData();

        warningData.value = [
          { key: "1", time: "2026-3-4 12:00:00", level: "一级", desc: "线损超过8%预警", status: "已挂起" },
          { key: "2", time: "2026-3-4 12:00:00", level: "二级", desc: "线损超过8%预警", status: "待确认" },
          { key: "3", time: "2026-3-4 12:00:00", level: "三级", desc: "线损超过8%预警", status: "处理中" },
          { key: "4", time: "2026-3-4 12:00:00", level: "四级", desc: "线损超过8%预警", status: "已处理" },
          { key: "5", time: "2026-3-4 12:00:00", level: "四级", desc: "线损超过8%预警", status: "已处理" },
        ];
      } finally {
        detailLoading.value = false;
      }
    };
    const getDeviceList = async (): Promise<void> => {
      const res = await getElectricalSafetyClient().getLineLossDevice({
        lineId: lineId.value,
      });
      fromDeviceList.value = res.fromDeviceList;
      toDeviceList.value = res.toDeviceList;
    };
    const dateChanger = (timeRange: TrendPeriod) => {
      trendPeriod.value = timeRange;
      getEchartsData();
    };
    const getEchartsData = async (): Promise<void> => {
      const param = {
        lineId: lineId.value,
        timeRange: trendPeriod.value,
      };
      const data = await getElectricalSafetyClient().getLineLossTrend(param);
      trendData.value = data.map((item) => ({
        date: dayjs(item.collectTime).format("YYYY-MM-DD"),
        value: Number((item.lossRate * 100).toFixed(2)),
      }));
      tableData.value = data;
    };
    watch(
      firstEdge,
      async (edge) => {
        await mockFetchDetail(edge);
        nextTick(() => {
          renderChart();
        });
      },
      { immediate: true },
    );

    const renderChart = (): void => {
      if (destroyed) {
        return;
      }
      const el = chartElRef.value;
      if (!el) {
        return;
      }
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        if (optionRafId) {
          cancelAnimationFrame(optionRafId);
        }
        optionRafId = requestAnimationFrame(() => {
          optionRafId = null;
          renderChart();
        });
        return;
      }

      chartError.value = "";

      try {
        const existing = echarts.getInstanceByDom(el);
        const chart = existing || echarts.init(el, undefined, { renderer: "canvas" });
        chartRef.value = chart;

        const xData = (trendData.value || []).map((p) => p.date);
        const yData = (trendData.value || []).map((p) => p.value);

        chart.setOption(
          {
            animation: false,
            grid: { left: 36, right: 12, top: 12, bottom: 28, containLabel: true },
            tooltip: {
              trigger: "axis",
              axisPointer: { type: "line" },
              formatter: (params: unknown) => {
                const list = Array.isArray(params) ? (params as { axisValue?: string; data?: number }[]) : [];
                const first = list[0];
                const name = first?.axisValue || "";
                const value = typeof first?.data === "number" ? first.data : "";
                return `${name}<br/>线损率：${value}%`;
              },
            },
            xAxis: {
              type: "category",
              boundaryGap: false,
              data: xData,
              axisLine: { show: true, lineStyle: { color: "#e5e5e5" } },
              axisTick: { show: false },
              axisLabel: {
                color: "#999",
                fontSize: 10,
                formatter: (value: string) => String(value).slice(5),
              },
              splitLine: { show: false },
            },
            yAxis: {
              type: "value",
              min: 0,
              max: 100,
              interval: 20,
              axisLine: { show: true, lineStyle: { color: "#e5e5e5" } },
              axisTick: { show: false },
              axisLabel: { color: "#999", fontSize: 10 },
              splitLine: { show: true, lineStyle: { color: "#f0f0f0" } },
            },
            series: [
              {
                name: "线损率",
                type: "line",
                data: yData,
                smooth: false,
                symbol: "none",
                animation: false,
                lineStyle: { color: "#1890ff", width: 2 },
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(24,144,255,0.20)" },
                    { offset: 1, color: "rgba(24,144,255,0.02)" },
                  ]),
                },
              },
            ],
          },
          { notMerge: true, lazyUpdate: true },
        );
        chart.resize();
      } catch (error) {
        chartError.value = String(error);
      }
    };

    onMounted(() => {
      nextTick(() => {
        renderChart();
        resizeObserverRef.value = new ResizeObserver(() => {
          if (resizeRafId) {
            cancelAnimationFrame(resizeRafId);
          }
          resizeRafId = requestAnimationFrame(() => {
            renderChart();
          });
        });
        if (chartElRef.value) {
          resizeObserverRef.value.observe(chartElRef.value);
        }
      });
    });

    onBeforeUnmount(() => {
      destroyed = true;
      if (resizeRafId) {
        cancelAnimationFrame(resizeRafId);
        resizeRafId = null;
      }
      if (optionRafId) {
        cancelAnimationFrame(optionRafId);
        optionRafId = null;
      }
      resizeObserverRef.value?.disconnect();
      resizeObserverRef.value = null;
      try {
        chartRef.value?.dispose();
      } catch {
        // ignore
      }
      chartRef.value = null;
    });

    watch([trendData, trendPeriod], () => {
      nextTick(() => {
        renderChart();
      });
    });

    // 注意：渲染时机交由上面的 watch(firstEdge, async ...) + renderChart 统一处理

    const readonly = ref(true);
    const handleEdit = () => {
      readonly.value = false;
    };
    const handleCancel = () => {
      readonly.value = true;
    };
    const handleSave = async () => {
      readonly.value = true;
      const params = {
        id: lineId.value,
        fromDeviceId: basicInfo.value?.inputDevice,
        toDeviceId: basicInfo.value?.outputDevice,
      };

      await getElectricalSafetyClient().updateLineLossDevice(params);
      // await props.onSaved?.();
    };
    return () => {
      if (!firstEdge.value) {
        return (
          <div class="electrical-property-panel">
            <div class="electrical-property-panel__empty">
              <p class="electrical-property-panel__empty-text">请选择线路</p>
              <p class="electrical-property-panel__empty-hint">点击画布中的连线以查看线损详情</p>
            </div>
          </div>
        );
      }

      return (
        <div class="electrical-property-panel electrical-property-panel--form line-loss-panel">
          <div class="electrical-property-panel__scroll">
            <section class="line-loss-section">
              <div class="line-loss-section__head">
                <span class="line-loss-section__title">基本信息</span>
                {readonly.value ? (
                  <Button type="primary" size="small" onClick={handleEdit}>
                    编辑
                  </Button>
                ) : (
                  <div>
                    <Button size="small" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button type="primary" size="small" style={{ marginLeft: "10px" }} onClick={handleSave}>
                      保存
                    </Button>
                  </div>
                )}
              </div>
              {detailLoading.value ? (
                <div class="line-loss-section__loading">加载中...</div>
              ) : basicInfo.value ? (
                <div class="line-loss-form">
                  <div class="line-loss-field">
                    <label class="line-loss-field__label">
                      <span class="line-loss-field__required">*</span>
                      线路
                    </label>
                    <span>{basicInfo.value.name}</span>
                    {/* <Input value={basicInfo.value.name} readonly class="line-loss-field__input" /> */}
                  </div>
                  <div class="line-loss-field">
                    <label class="line-loss-field__label">输入设备</label>
                    <Select
                      v-model:value={basicInfo.value.inputDevice}
                      options={fromDeviceList.value}
                      style={{ width: "70%" }}
                      fieldNames={{ label: "name", value: "id" }}
                      disabled={readonly.value}
                      showSearch
                      filterOption={filterLineLossDeviceOption}
                    />
                  </div>
                  <div class="line-loss-field">
                    <label class="line-loss-field__label">输出设备</label>
                    <Select
                      disabled={readonly.value}
                      fieldNames={{ label: "name", value: "id" }}
                      style={{ width: "70%" }}
                      options={toDeviceList.value}
                      v-model:value={basicInfo.value.outputDevice}
                      showSearch
                      filterOption={filterLineLossDeviceOption}
                    />
                  </div>
                </div>
              ) : (
                <div class="line-loss-section__empty">请选择左侧图中的线路查看详情</div>
              )}
            </section>

            <section class="line-loss-section">
              <div class="line-loss-section__head">
                <span class="line-loss-section__title">线损信息</span>
              </div>

              <div class="line-loss-trend">
                <div class="line-loss-trend__head">
                  <span class="line-loss-section__title">线损趋势</span>
                  <div class="line-loss-trend__tabs">
                    <Button
                      type={trendPeriod.value === "WEEK" ? "primary" : "default"}
                      size="small"
                      onClick={() => {
                        dateChanger("WEEK");
                      }}
                    >
                      本周
                    </Button>
                    <Button
                      type={trendPeriod.value === "MONTH" ? "primary" : "default"}
                      size="small"
                      onClick={() => {
                        dateChanger("MONTH");
                      }}
                    >
                      本月
                    </Button>
                    <Button
                      type={trendPeriod.value === "YEAR" ? "primary" : "default"}
                      size="small"
                      onClick={() => {
                        dateChanger("YEAR");
                      }}
                    >
                      本年
                    </Button>
                  </div>
                </div>
                <div class="line-loss-chart-wrap">
                  <div ref={chartElRef} class="line-loss-echarts" />
                </div>
              </div>

              <div class="line-loss-data">
                <div class="line-loss-section__head">
                  <span class="line-loss-section__title">线损数据</span>
                </div>
                <Table
                  size="small"
                  class="line-loss-table"
                  pagination={{
                    pageSize: 5,
                    size: "small",
                    showSizeChanger: false,
                    showTotal: () => null,
                  }}
                  dataSource={tableData.value}
                  columns={[
                    {
                      title: "时间",
                      dataIndex: "collectTime",
                      width: 110,
                      key: "collectTime",
                      customRender: ({ text }: { text: string }) => renderTimeCell(dayjs(text).format("YYYY-MM-DD HH:mm:ss")),
                    },
                    { title: "输入电量 (kwh)", dataIndex: "inputEnergy", key: "inputEnergy" },
                    { title: "输出电量 (kwh)", dataIndex: "outputEnergy", key: "outputEnergy" },
                    {
                      title: "线损率 (%)",
                      dataIndex: "lossRate",
                      key: "lossRate",

                      customRender: ({ record }: { record: LineLossTrend }) => (
                        <span class="line-loss-rate" style={{ color: record.lossRate >= 3.5 ? "#f5222d" : "#333" }}>
                          {(record.lossRate * 100).toFixed(2)}%
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </section>

            <section class="line-loss-section">
              <div class="line-loss-section__head">
                <span class="line-loss-section__title">预警信息</span>
              </div>
              <Table
                size="small"
                class="line-loss-table"
                pagination={{
                  pageSize: 5,
                  size: "small",
                  showSizeChanger: false,
                  showTotal: () => null,
                }}
                dataSource={warningData.value}
                columns={[
                  {
                    title: "报警时间",
                    dataIndex: "time",
                    key: "time",
                    width: 110,
                    customRender: ({ text }: { text: string }) => renderTimeCell(text),
                  },
                  {
                    title: "报警事件",
                    dataIndex: "desc",
                    key: "desc",
                    ellipsis: true,
                    customRender: ({ text }: { text: string }) => renderEllipsisText(text),
                  },
                  {
                    title: "报警级别",
                    dataIndex: "level",
                    key: "level",

                    customRender: ({ text }: { text: string }) => <span style={{ color: alarmLevelColor(text) }}>{text}</span>,
                  },
                  {
                    title: "处理状态",
                    dataIndex: "status",
                    key: "status",

                    customRender: ({ text }: { text: string }) => <span style={{ color: statusColor(text) }}>{text}</span>,
                  },
                ]}
              />
            </section>
          </div>
        </div>
      );
    };
  },
});

export default LineLossEdgePanel;
