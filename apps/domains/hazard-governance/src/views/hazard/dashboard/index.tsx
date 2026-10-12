import { defineComponent, shallowRef } from "vue";

import { useLayoutTitle } from "../shared/page";
import { TimeRangeFilter } from "../shared/time-range-filter";
import { DashboardCharts, DashboardMetrics, HazardRankingTable, HazardSourceDistribution, OverdueBanner } from "./components";
import { dashboardTimeRangeOptions, useHazardDashboardData } from "./use-dashboard-data";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";

import "./index.less";

export const HazardDashboard = defineComponent({
  name: "HazardDashboard",
  setup: () => {
    const dashboard = useHazardDashboardData();
    const overdueExpanded = shallowRef(false);

    const toggleOverdue = (): void => {
      overdueExpanded.value = !overdueExpanded.value;
    };

    const slots = {
      "layout-header": () => (
        <TimeRangeFilter value={dashboard.timeFilter.value} options={dashboardTimeRangeOptions} onChange={dashboard.changeTimeFilter} />
      ),
      "layout-content": () => (
        <div class="hazard-dashboard">
          <DashboardMetrics summary={dashboard.summary.value} closedRate={dashboard.closedRate.value} />
          <OverdueBanner summary={dashboard.summary.value} expanded={overdueExpanded.value} onToggle={toggleOverdue} />
          <DashboardCharts
            total={dashboard.summary.value.totalCount ?? 0}
            charts={dashboard.charts.value}
            loading={dashboard.chartsLoading.value}
            timeLabel={dashboard.trendTimeLabel.value}
          />
          <HazardSourceDistribution charts={dashboard.charts.value} loading={dashboard.chartsLoading.value} />
          <HazardRankingTable
            dimension={dashboard.dimension.value}
            items={dashboard.rankings.value.items ?? []}
            loading={dashboard.rankingLoading.value}
            onDimensionChange={dashboard.changeDimension}
          />
        </div>
      ),
    };

    return () => <PcLayout title={useLayoutTitle("隐患看板")} v-slots={slots} showFooter={false} />;
  },
});
