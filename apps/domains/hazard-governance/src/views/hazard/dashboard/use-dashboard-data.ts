import type { HazardDashboardChartsVO, HazardDashboardRankingVO, HazardDashboardSummaryVO } from "@g2-contract/hazard-governance";
import { computed, onMounted, ref, shallowRef } from "vue";

import type { TimeRangeFilterValue } from "../shared/time-range-filter";
import { useAuthRequest } from "@/api/request";
import { getHazardDashboardCharts, getHazardDashboardRankings, getHazardDashboardSummary } from "@/api/server";

export type DashboardDimension = "risk-object" | "risk-unit" | "responsible-user";
export type DashboardTimeRangePreset = "this-week" | "this-month" | "last-3-months" | "last-6-months" | "last-1-year";

export const dashboardTimeRangeOptions: Array<{ value: DashboardTimeRangePreset; label: string }> = [
  { value: "this-week", label: "本周" },
  { value: "this-month", label: "本月" },
  { value: "last-3-months", label: "近3月" },
  { value: "last-6-months", label: "近6月" },
  { value: "last-1-year", label: "近1年" },
];

export const normalizeDashboardPercent = (value?: number): number => {
  const percent = (value ?? 0) <= 1 ? (value ?? 0) * 100 : (value ?? 0);
  return Math.min(100, Math.max(0, Number(percent.toFixed(1))));
};

export function useHazardDashboardData() {
  const summary = ref<HazardDashboardSummaryVO>({});
  const charts = ref<HazardDashboardChartsVO>({});
  const rankings = ref<HazardDashboardRankingVO>({ items: [] });
  const dimension = shallowRef<DashboardDimension>("risk-object");
  const timeFilter = ref<TimeRangeFilterValue>({ timeRange: "last-6-months" });
  const rankingLoading = shallowRef(false);
  const chartsLoading = shallowRef(false);
  let summaryRequestId = 0;
  let chartsRequestId = 0;
  let rankingRequestId = 0;

  const closedRate = computed(() => normalizeDashboardPercent(summary.value.closedRate));
  const dashboardParams = computed(() => {
    const timeRange = timeFilter.value.timeRange ?? "last-6-months";
    if (timeFilter.value.startTime && timeFilter.value.endTime) {
      return { timeRange, startTime: timeFilter.value.startTime, endTime: timeFilter.value.endTime };
    }
    return { timeRange };
  });
  const trendTimeRange = computed<DashboardTimeRangePreset>(() => {
    const timeRange = timeFilter.value.timeRange;
    return dashboardTimeRangeOptions.some((option) => option.value === timeRange)
      ? (timeRange as DashboardTimeRangePreset)
      : "last-6-months";
  });
  const trendTimeLabel = computed(() => {
    if (timeFilter.value.startTime && timeFilter.value.endTime) return `${timeFilter.value.startTime} 至 ${timeFilter.value.endTime}`;
    return dashboardTimeRangeOptions.find((option) => option.value === timeFilter.value.timeRange)?.label ?? "近6月";
  });

  const loadRankings = async (): Promise<void> => {
    const requestId = ++rankingRequestId;
    rankingLoading.value = true;
    try {
      const result = await useAuthRequest(() =>
        getHazardDashboardRankings({
          ...dashboardParams.value,
          dimension: dimension.value,
          limit: 10,
        }),
      );
      if (requestId === rankingRequestId) rankings.value = result;
    } finally {
      if (requestId === rankingRequestId) rankingLoading.value = false;
    }
  };

  const loadSummary = async (): Promise<void> => {
    const requestId = ++summaryRequestId;
    const result = await useAuthRequest(() => getHazardDashboardSummary(dashboardParams.value));
    if (requestId === summaryRequestId) summary.value = result;
  };

  const loadCharts = async (): Promise<void> => {
    const requestId = ++chartsRequestId;
    chartsLoading.value = true;
    try {
      const result = await useAuthRequest(() => getHazardDashboardCharts(dashboardParams.value));
      if (requestId === chartsRequestId) charts.value = result;
    } finally {
      if (requestId === chartsRequestId) chartsLoading.value = false;
    }
  };

  const loadDashboard = async (): Promise<void> => {
    await Promise.all([loadSummary(), loadCharts(), loadRankings()]);
  };

  const changeDimension = (next: DashboardDimension): void => {
    if (dimension.value === next) return;
    dimension.value = next;
    void loadRankings();
  };

  const changeTimeFilter = (next: TimeRangeFilterValue): void => {
    if (
      timeFilter.value.timeRange === next.timeRange &&
      timeFilter.value.startTime === next.startTime &&
      timeFilter.value.endTime === next.endTime
    ) {
      return;
    }
    timeFilter.value = { ...next };
    void loadDashboard();
  };

  onMounted(() => {
    void loadDashboard();
  });

  return {
    summary,
    charts,
    rankings,
    dimension,
    timeFilter,
    rankingLoading,
    chartsLoading,
    closedRate,
    trendTimeRange,
    trendTimeLabel,
    changeDimension,
    changeTimeFilter,
  };
}
