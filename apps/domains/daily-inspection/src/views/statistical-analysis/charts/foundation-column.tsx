import { computed, defineComponent, type PropType } from "vue";

import { useEcharts } from "./use-echarts";

/** 任务耗时柱状图（对齐旧 foundation-column.vue）。 */
export const FoundationColumnChart = defineComponent({
  name: "FoundationColumnChart",
  props: {
    xData: { type: Array as PropType<string[]>, default: () => [] },
    yData: { type: Array as PropType<Array<string | number>>, default: () => [] },
  },
  setup(props) {
    const { chartRef } = useEcharts(
      () => ({
        title: { text: "任务耗时统计", textStyle: { color: "#333", fontSize: 14 } },
        tooltip: { trigger: "item" },
        grid: { left: 50, right: 50 },
        xAxis: { type: "category", data: props.xData ?? [] },
        yAxis: { type: "value" },
        series: [
          {
            data: props.yData ?? [],
            type: "bar",
            barWidth: "3%",
            color: "#1890FF",
          },
        ],
      }),
      () => [props.xData, props.yData],
    );
    const style = computed(() => ({ width: "100%", minHeight: "200px", height: "100%" }));
    return () => <div ref={chartRef} style={style.value} />;
  },
});
