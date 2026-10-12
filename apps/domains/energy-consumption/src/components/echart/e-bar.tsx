import * as echarts from "echarts";
import type { EChartsOption, LegendComponentOption, XAXisComponentOption, YAXisComponentOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getDays } from "@/utils/getTime";

/** 柱状图封装，对齐旧仓 eBar */
export const EBar = defineComponent({
  name: "EBar",
  props: {
    Xdata: { type: Array as PropType<Array<string | number>>, default: () => [] },
    ydata: { type: [Array, Object] as PropType<any>, default: () => [] },
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
      const xaxis = JSON.stringify(props.xAxis);
      const yaxis = JSON.stringify(props.yAxis);
      const option: EChartsOption = {
        xAxis:
          xaxis === "{}"
            ? {
                type: "category",
                axisTick: { alignWithLabel: true },
                data: props.Xdata?.length ? props.Xdata : getDays(),
              }
            : props.xAxis,
        yAxis: yaxis === "{}" ? { type: "value" } : props.yAxis,
        title: { subtext: props.name },
        legend: props.legend,
        tooltip: (props.customTooltip
          ? props.customTooltip
          : props.showtrigger
            ? {
                show: true,
                formatter: (params: unknown) => {
                  const name = params as { value?: number; name?: string };
                  return name.value === 0 ? name.name : `${name.name} ${Number(name.value) * 100} %`;
                },
              }
            : {
                show: props.tooltip,
                trigger: "axis",
              }) as EChartsOption["tooltip"],
        grid: {
          top: "50px",
          right: "20px",
          left: "20px",
          bottom: "20px",
          containLabel: true,
        },
        series: props.ydata as EChartsOption["series"],
      };
      option.xAxis = Object.assign({}, option.xAxis, {
        axisLabel: {
          show: true,
          interval: 0,
          rotate: 45,
        },
      });
      myChart = echarts.init(bar.value);
      myChart.setOption(option);
    };

    onMounted(render);
    watch(() => props.ydata, render, { deep: true });
    watch(() => props.Xdata, render, { deep: true });
    onBeforeUnmount(clear);

    expose({ render });

    return () => <div ref={bar} style={{ width: "100%", height: "100%" }} />;
  },
});
