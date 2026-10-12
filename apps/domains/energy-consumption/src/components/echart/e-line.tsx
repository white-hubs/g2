import * as echarts from "echarts";
import type { EChartsOption, LegendComponentOption, SeriesOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getDays, getHour, getMonth } from "@/utils/getTime";

/** 折线图封装，对齐旧仓 eLine */
export const ELine = defineComponent({
  name: "ELine",
  props: {
    xData: {
      type: [String, Array] as PropType<"year" | "month" | "day" | string[]>,
      default: "year",
    },
    series: {
      type: [Array, Object] as PropType<SeriesOption | SeriesOption[]>,
      default: () => [],
    },
    title: { type: String, default: "" },
    legend: { type: Object as PropType<LegendComponentOption>, default: undefined },
    rotate: { type: Number, default: 0 },
  },
  setup(props, { expose }) {
    const line = ref<HTMLDivElement>();
    let myChart: echarts.ECharts | null = null;

    const resolveXData = () => {
      if (props.xData === "year") return getMonth();
      if (props.xData === "month") return getDays();
      if (props.xData === "day") return getHour();
      return props.xData;
    };

    const clear = () => {
      if (myChart) {
        myChart.clear();
        echarts.dispose(myChart);
        myChart = null;
      }
    };

    const render = () => {
      if (!line.value) return;
      if (myChart) {
        echarts.dispose(myChart);
        myChart = null;
      }
      const option: EChartsOption = {
        title: {
          show: !!props.title,
          subtext: props.title,
        },
        tooltip: {
          trigger: "axis",
          formatter: props.title === "" ? undefined : `${props.title}: {c0}`,
        },
        legend: props.legend ?? {},
        grid: {
          left: 16,
          right: 16,
          bottom: 28,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          axisLabel: {
            show: true,
            interval: 0,
            rotate: props.rotate,
          },
          data: resolveXData(),
        },
        yAxis: { type: "value" },
        series: props.series,
      };
      myChart = echarts.init(line.value);
      myChart.setOption(option, true);
    };

    onMounted(render);
    watch(() => props.series, render, { deep: true });
    watch(() => props.xData, render, { deep: true });
    onBeforeUnmount(clear);

    expose({ clear, render });

    return () => <div ref={line} style={{ width: "100%", height: "100%" }} />;
  },
});
