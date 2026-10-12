/** @jsxImportSource vue */
import { createPcChart } from "@g2-platform/pc-chart";
import type { PcChartHandle as ECharts } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, onMounted, onUnmounted, ref, watch } from "vue";

import "./charts.css";

export const PieChart = defineComponent({
  props: {
    data: {
      type: Array as PropType<{ name: string; value: number }[]>,
      default: () => [],
    },
    title: { type: String, default: "" },
  },
  setup(props) {
    const chartRef = ref<HTMLDivElement>();
    let chart: ECharts | null = null;
    let observer: ResizeObserver | undefined;

    const render = (): void => {
      if (!chart) {
        return;
      }
      chart.setOption({
        tooltip: { trigger: "item" },
        legend: { orient: "vertical", right: "8%", top: "center" },
        series: [
          {
            type: "pie",
            radius: ["40%", "65%"],
            center: ["35%", "50%"],
            data: props.data,
          },
        ],
      });
    };

    onMounted(() => {
      if (chartRef.value) {
        chart = createPcChart(chartRef.value);
        render();
        observer = new ResizeObserver(() => chart?.resize());
        observer.observe(chartRef.value);
      }
    });
    watch(() => props.data, render, { deep: true });
    onUnmounted(() => {
      observer?.disconnect();
      chart?.dispose();
    });

    return () => <div class="chart-box" ref={chartRef} />;
  },
});
