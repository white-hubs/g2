import { Empty } from "@g2-platform/pc-ui";
import { computed, defineComponent, type PropType } from "vue";

import { useEcharts } from "./use-echarts";

export interface HorizontalBarSeries {
  color?: string;
  name?: string;
  data?: Array<number | string>;
}

/** 横向柱状图（对齐旧 bar-chart.vue）。 */
export const HorizontalBarChart = defineComponent({
  name: "HorizontalBarChart",
  props: {
    title: { type: String, default: "" },
    data: { type: Array as PropType<HorizontalBarSeries[]>, default: () => [] },
    xData: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup(props) {
    const isLast = computed(() => props.title === "对象巡检任务数Last10" || props.title === "部门巡检任务last5");
    const { chartRef } = useEcharts(
      () => {
        const categories = [...(props.xData ?? [])];
        const series = (props.data ?? []).map((item) => {
          const values = (item.data ?? []).map((v) => Number(v));
          return {
            type: "bar" as const,
            data: isLast.value ? values : [...values].reverse(),
            color: item.color,
            name: item.name,
            barWidth: 10,
          };
        });
        return {
          title: { text: props.title, textStyle: { color: "#333", fontSize: 14 } },
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          legend: {},
          grid: { left: 180, right: 50 },
          xAxis: { type: "value", boundaryGap: [0, 0.01] },
          yAxis: {
            type: "category",
            axisLabel: {
              formatter: (value: string) => (value.length > 10 ? `${value.slice(0, 10)}...` : value),
            },
            data: isLast.value ? categories : [...categories].reverse(),
          },
          series,
        };
      },
      () => [props.title, props.xData, props.data],
    );
    return () =>
      (props.xData?.length ?? 0) > 0 ? <div style={{ width: "100%", height: "100%", minHeight: "250px" }} ref={chartRef} /> : <Empty />;
  },
});
