import type { Overview } from "@g2-contract/asset-management";
import type { PcChartOption } from "@g2-platform/pc-chart";
import { computed, defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";

import { ChartPanel } from "./chart-panel";
import { getClient } from "./domain-context";
import { ASSET_STATUS, errorText } from "./model";
import { loadPcUi } from "./runtime-modules";
import { TimeFilter, datePeriod } from "./time-filter";

import styles from "./styles.module.css";
const { PageLayout, Spin, message } = await loadPcUi();
export const pieOption = (data: Overview["status"]): PcChartOption => ({
  tooltip: { trigger: "item" },
  legend: { type: "scroll", bottom: 0 },
  series: [
    {
      type: "pie",
      radius: ["40%", "67%"],
      center: ["50%", "43%"],
      label: { formatter: "{b}: {c}" },
      data: data.map((row) => ({ name: row.name, value: Number(row.value) })),
    },
  ],
});
export const OverviewPage = defineComponent({
  setup() {
    const query = reactive({ dimension: "TODAY", period: datePeriod("TODAY") });
    const data = ref<Overview>({
      counts: {},
      status: [],
      category: [],
      departments: { xdata: [], series: [] },
      trend: [],
      consumableDepartments: [],
      areas: [],
    });
    const loading = ref(false);
    let version = 0;
    const load = async () => {
      const current = ++version;
      loading.value = true;
      try {
        const result = await getClient().overview(query);
        if (current === version) {
          data.value = result;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          loading.value = false;
        }
      }
    };
    const bar = computed<PcChartOption>(() => ({
      tooltip: { trigger: "axis" },
      grid: { left: 45, right: 24, bottom: 48, top: 20, containLabel: true },
      xAxis: { type: "category", data: data.value.departments.xdata },
      yAxis: { type: "value", minInterval: 1 },
      series: data.value.departments.series.map((series) => ({
        name: series.name,
        type: "bar",
        data: Array.isArray(series.value) ? series.value : [series.value],
        barMaxWidth: 32,
      })),
    }));
    const trend = computed<PcChartOption>(() => ({
      tooltip: { trigger: "axis" },
      grid: { left: 45, right: 24, bottom: 45, top: 20, containLabel: true },
      xAxis: { type: "category", data: data.value.trend.map((row) => row.name), boundaryGap: false },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: "耗材出库数",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: data.value.trend.map((row) => Number(row.value)),
        },
      ],
    }));
    onMounted(() => void load());
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="数据总览"
        showFooter={false}
        class={styles.page}
        v-slots={{
          "layout-header": () => (
            <TimeFilter
              onChange={(value) => {
                Object.assign(query, value);
                void load();
              }}
            />
          ),
          "layout-content": () => (
            <div class={styles.scroll}>
              <Spin spinning={loading.value}>
                <div class={styles.stats}>
                  <div class={styles.metrics}>
                    {[
                      "资产总数量:propertyNumber",
                      "报修资产数:repairReportNumber",
                      "报废资产数:weedOutNumber",
                      "逾龄资产数:usageNumber",
                      "维保到期资产数:maintenanceNumber",
                    ].map((entry) => {
                      const [label, field] = entry.split(":");
                      return (
                        <div class={styles.metric}>
                          <span>{label}</span>
                          <strong>{data.value.counts[field] ?? 0}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <div class={styles.charts}>
                    <ChartPanel
                      title="资产状态分布"
                      option={pieOption(
                        data.value.status.map((row) => ({
                          ...row,
                          name: ASSET_STATUS.find((item) => item.value === row.name)?.label ?? row.name,
                        })),
                      )}
                      empty={data.value.status.length === 0}
                    />
                    <ChartPanel title="资产类别分布" option={pieOption(data.value.category)} empty={data.value.category.length === 0} />
                    <ChartPanel title="部门资产分布情况" option={bar.value} wide empty={data.value.departments.xdata.length === 0} />
                    <ChartPanel title="耗材出库趋势" option={trend.value} wide empty={data.value.trend.length === 0} />
                    <ChartPanel
                      title="部门领用耗材统计"
                      option={pieOption(data.value.consumableDepartments)}
                      empty={data.value.consumableDepartments.length === 0}
                    />
                    <ChartPanel title="区域资产分布" option={pieOption(data.value.areas)} empty={data.value.areas.length === 0} />
                  </div>
                </div>
              </Spin>
            </div>
          ),
        }}
      />
    );
  },
});
