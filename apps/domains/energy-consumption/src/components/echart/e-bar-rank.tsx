import * as echarts from "echarts";
import type { EChartsOption, LegendComponentOption, XAXisComponentOption, YAXisComponentOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

/** 横向排名柱状图，对齐旧仓 e-bar-rank */
export const EBarRank = defineComponent({
  name: "EBarRank",
  props: {
    Xdata: { type: Array as PropType<Array<string | number>>, default: () => [] },
    series: { type: [Array, Object] as PropType<any>, default: () => [] },
    legend: { type: Object as PropType<LegendComponentOption>, default: () => ({}) },
    xAxis: { type: Object as PropType<XAXisComponentOption>, default: () => ({}) },
    yAxis: {
      type: [Object, Array] as PropType<YAXisComponentOption | YAXisComponentOption[]>,
      default: () => ({}),
    },
    tooltip: { type: Boolean, default: true },
    name: { type: String, default: "" },
    showtrigger: { type: Boolean, default: false },
    customTooltip: { type: [Object, Boolean] as PropType<any>, default: false },
  },
  setup(props, { expose }) {
    const bar = ref<HTMLDivElement>();
    let myChart: echarts.ECharts | null = null;

    const clear = () => {
      if (myChart) {
        echarts.dispose(myChart);
        myChart = null;
      }
    };

    const render = () => {
      if (!bar.value) return;
      clear();
      const option: EChartsOption = {
        xAxis: props.xAxis,
        yAxis: props.yAxis,
        title: { subtext: props.name },
        legend: props.legend,
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: "{b}: {c}",
        },
        grid: {
          top: "50px",
          right: "20px",
          left: "20px",
          bottom: "20px",
          containLabel: true,
        },
        series: props.series as EChartsOption["series"],
      };
      option.xAxis = Object.assign({}, option.xAxis, {
        axisLabel: {
          show: true,
          interval: 0,
          rotate: 0,
        },
      });
      myChart = echarts.init(bar.value);
      myChart.setOption(option);
    };

    onMounted(render);
    watch(() => props.series, render, { deep: true });
    watch(() => props.Xdata, render, { deep: true });
    onBeforeUnmount(clear);

    expose({ render });

    return () => <div ref={bar} style={{ width: "100%", height: "100%" }} />;
  },
});
