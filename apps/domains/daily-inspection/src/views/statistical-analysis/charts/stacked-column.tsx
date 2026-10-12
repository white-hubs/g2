import { computed, defineComponent, type PropType } from "vue";

import { useEcharts } from "./use-echarts";

export interface StackedSeries {
  color?: string;
  name?: string;
  data?: string[];
}

/** 堆叠柱状图（对齐旧 stacked-column.vue）。 */
export const StackedColumnChart = defineComponent({
  name: "StackedColumnChart",
  props: {
    title: { type: String, default: "部门任务完成情况" },
    xData: { type: Array as PropType<string[]>, default: () => [] },
    yData: { type: Array as PropType<StackedSeries[]>, default: () => [] },
  },
  setup(props) {
    const { chartRef } = useEcharts(
      () => ({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        title: { text: props.title, textStyle: { color: "#333", fontSize: 14 } },
        legend: {
          itemGap: 30,
          itemHeight: 8,
          itemWidth: 8,
          textStyle: { fontSize: 14, lineHeight: 14 },
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: [{ type: "category", data: props.xData ?? [] }],
        yAxis: [{ type: "value" }],
        series: (props.yData ?? []).map((item) => ({
          name: item.name,
          type: "bar" as const,
          color: item.color,
          barWidth: 20,
          stack: "Search Engine",
          emphasis: { focus: "series" as const },
          data: item.data,
        })),
      }),
      () => [props.title, props.xData, props.yData],
    );
    const style = computed(() => ({ width: "100%", height: "100%", minHeight: "260px" }));
    return () => <div ref={chartRef} style={style.value} />;
  },
});
