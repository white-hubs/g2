import { BarChart, LineChart, PieChart, RadarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { type EChartsCoreOption, type EChartsType, init, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { PropType } from "vue";
import { defineComponent, markRaw, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

use([BarChart, LineChart, PieChart, RadarChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

export const EchartsChart = defineComponent({
  name: "EchartsChart",
  props: {
    option: { type: Object as PropType<EChartsCoreOption>, required: true },
    height: { type: Number, default: 240 },
  },
  setup: (props) => {
    const chartElement = shallowRef<HTMLDivElement | null>(null);
    const chart = shallowRef<EChartsType | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    const render = (): void => {
      if (!chartElement.value) {
        return;
      }
      if (!chart.value || chart.value.isDisposed()) {
        chart.value = markRaw(init(chartElement.value));
      }
      chart.value.setOption(props.option, { notMerge: true });
    };

    onMounted(() => {
      void nextTick(() => {
        render();
        if (chartElement.value) {
          resizeObserver = new ResizeObserver(() => chart.value?.resize());
          resizeObserver.observe(chartElement.value);
        }
      });
    });
    watch(() => props.option, render, { deep: true });
    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      chart.value?.dispose();
      chart.value = null;
    });

    return (): JSX.Element => <div ref={chartElement} class="electrical-echarts" style={{ height: `${props.height}px` }} />;
  },
});
