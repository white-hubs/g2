import { showApiError } from "../../../utils/api-error";

import layoutStyles from "../../../layout.module.css";
/** @jsxImportSource vue */
import { dayjs } from "@g2-platform/pc-ui";
import { Spin } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";

import { cubeAlarmCenterService } from "../../../api/alarm-center-service";
import {
  getKeyPersonAreaHighRiskStats,
  getKeyPersonAreaSupervisorStats,
  getKeyPersonStatisticsDashboard,
} from "../../../api/safety-personnel";
import { BarChart } from "../../../components/key-personnel/charts/bar-chart";
import { LineChart } from "../../../components/key-personnel/charts/line-chart";
import { PieChart } from "../../../components/key-personnel/charts/pie-chart";
import { PageShell } from "../../../components/page-shell/page-shell";
import { KEY_PERSON_APPLICATION_CODE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { usePageName } from "../../../utils/page-name";

import styles from "./index.module.css";

function top5(items: { areaName: string; count: number }[]): { name: string; value: number }[] {
  return items
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((i) => ({ name: i.areaName, value: i.count }));
}

export const KeyPersonnelStatisticsPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const loading = ref(true);
    const stats = ref({
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
    const supervisorPie = ref<{ name: string; value: number }[]>([]);
    const highRiskPie = ref<{ name: string; value: number }[]>([]);
    const trendCategories = ref<string[]>([]);
    const trendSeries = ref<number[]>([]);
    const areaCategories = ref<string[]>([]);
    const areaSeries = ref<number[]>([]);

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const start = dayjs().subtract(6, "day").startOf("day").format("YYYY-MM-DD HH:mm:ss");
        const end = dayjs().endOf("day").format("YYYY-MM-DD HH:mm:ss");
        const period = `${start},${end}`;

        const [dashboard, supervisors, highRisk, trend, area] = await Promise.all([
          useAuthRequest(() => getKeyPersonStatisticsDashboard()),
          useAuthRequest(() => getKeyPersonAreaSupervisorStats()),
          useAuthRequest(() => getKeyPersonAreaHighRiskStats()),
          cubeAlarmCenterService.getTrendAnalysis({
            applicationCode: KEY_PERSON_APPLICATION_CODE,
            period,
          }),
          cubeAlarmCenterService.getAreaAnalysis({
            applicationCode: KEY_PERSON_APPLICATION_CODE,
            period,
          }),
        ]);

        stats.value = {
          total: dashboard.totalCount ?? 0,
          high: dashboard.highRiskCount ?? 0,
          medium: dashboard.mediumRiskCount ?? 0,
          low: dashboard.lowRiskCount ?? 0,
        };
        supervisorPie.value = top5(supervisors);
        highRiskPie.value = top5(highRisk);

        const trendList = trend.alarmTrendStatisticsVOS ?? [];
        trendCategories.value = trendList.map((t) => t.period);
        trendSeries.value = trendList.map((t) => t.alarmNum ?? 0);

        const areaList = area.alarmCurrencyStatisticsVOS ?? [];
        areaCategories.value = areaList.map((a) => a.name);
        areaSeries.value = areaList.map((a) => a.totalNum ?? 0);
      } catch (error) {
        showApiError(error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    const layoutSlots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.pageContent}>
            <div class={styles.cards}>
              <div class={styles.statCard}>
                <div class={styles.statValue}>{stats.value.total}</div>
                <div class={styles.statLabel}>重点人员总数</div>
              </div>
              <div class={styles.statCard}>
                <div class={styles.statValue}>{stats.value.high}</div>
                <div class={styles.statLabel}>高风险人员</div>
              </div>
              <div class={styles.statCard}>
                <div class={styles.statValue}>{stats.value.medium}</div>
                <div class={styles.statLabel}>中风险人员</div>
              </div>
              <div class={styles.statCard}>
                <div class={styles.statValue}>{stats.value.low}</div>
                <div class={styles.statLabel}>低风险人员</div>
              </div>
            </div>

            <div class={styles.chartsRow}>
              <div>
                <div class={styles.chartTitle}>报警趋势（近7天）</div>
                <LineChart categories={trendCategories.value} series={trendSeries.value} />
              </div>
              <div>
                <div class={styles.chartTitle}>报警点位统计</div>
                <BarChart categories={areaCategories.value} series={areaSeries.value} />
              </div>
            </div>

            <div class={styles.pieRow}>
              <div>
                <div class={styles.pieTitle}>各区域监管人员数量分布（TOP5）</div>
                <PieChart data={supervisorPie.value} />
              </div>
              <div>
                <div class={styles.pieTitle}>各区域高风险人员数量分布（TOP5）</div>
                <PieChart data={highRiskPie.value} />
              </div>
            </div>
          </div>
        </Spin>
      ),
    };

    return () => (
      <div class={layoutStyles.route}>
        <PageShell title={pageTitle.value} showFooter={false} v-slots={layoutSlots} />
      </div>
    );
  },
});
