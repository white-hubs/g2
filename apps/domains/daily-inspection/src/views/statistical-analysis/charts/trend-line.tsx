import { computed, defineComponent, type PropType } from "vue";

import { useEcharts } from "./use-echarts";

/** 巡检次数趋势折线图（对齐旧 line.vue）。 */
export const TrendLineChart = defineComponent({
  name: "TrendLineChart",
  props: {
    xData: { type: Array as PropType<string[]>, default: () => [] },
    yData1: { type: Array as PropType<number[]>, default: () => [] },
    yData2: { type: Array as PropType<number[]>, default: () => [] },
  },
  setup(props) {
    const { chartRef } = useEcharts(
      () => ({
        title: { text: "巡检次数趋势", textStyle: { color: "#333", fontSize: 14 } },
        tooltip: { trigger: "axis" },
        grid: { left: 50, right: 50 },
        xAxis: { type: "category", data: props.xData ?? [] },
        yAxis: { type: "value" },
        series: [
          { name: "巡检任务数", color: "#FD683E", data: props.yData1 ?? [], type: "line", smooth: true },
          { name: "巡检次数", color: "#1890FF", data: props.yData2 ?? [], type: "line", smooth: true },
        ],
      }),
      () => [props.xData, props.yData1, props.yData2],
    );
    const style = computed(() => ({ width: "100%", height: "100%", minHeight: "260px" }));
    return () => <div ref={chartRef} style={style.value} />;
  },
});
