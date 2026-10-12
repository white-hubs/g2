// @ts-nocheck — ECharts option shape intentionally remains data-driven for legacy API compatibility.
import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import { getSecurityMonitorPcChart } from "../domain-context";

export default defineComponent({
  name: "SecurityMonitorChartPanel",
  props: {
    option: { type: Object as PropType<PcChartOption>, required: true },
    height: { type: Number, default: 260 },
  },
  setup(props) {
    const el = ref<HTMLElement>();
    let chart: PcChartHandle | undefined;
    const render = async (): Promise<void> => {
      await nextTick();
      if (!el.value) return;
      const { createPcChart } = getSecurityMonitorPcChart();
      chart ??= createPcChart(el.value);
      chart.setOption(props.option);
    };
    const resize = (): void => chart?.resize();
    const refreshTheme = (): void => {
      void render();
    };
    watch(() => props.option, render, { deep: true });
    onMounted(() => {
      void render();
      window.addEventListener("resize", resize);
      window.addEventListener(getSecurityMonitorPcChart().CHART_THEME_EVENT, refreshTheme);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resize);
      window.removeEventListener(getSecurityMonitorPcChart().CHART_THEME_EVENT, refreshTheme);
      chart?.dispose();
    });
    return () => <div ref={el} style={{ width: "100%", height: `${props.height}px` }} />;
  },
});
