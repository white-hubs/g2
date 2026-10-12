import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

type PcChartModule = typeof import("@g2-platform/pc-chart");

export default defineComponent({
  name: "GemChartPanel",
  props: {
    option: { type: Object as PropType<PcChartOption>, required: true },
    height: { type: Number, default: 260 },
  },
  setup(props) {
    const element = ref<HTMLElement>();
    const chartError = ref("");
    let chart: PcChartHandle | undefined;
    let chartModule: PcChartModule | undefined;
    let chartModulePromise: Promise<PcChartModule> | undefined;
    let themeListenerRegistered = false;
    const loadChartModule = (): Promise<PcChartModule> =>
      (chartModulePromise ??= loadRuntimeCommon<PcChartModule>("pcChart", "index").then((module) => {
        chartModule = module;
        return module;
      }));

    const render = async (): Promise<void> => {
      await nextTick();
      if (!element.value) return;
      try {
        const module = await loadChartModule();
        if (!themeListenerRegistered) {
          window.addEventListener(module.CHART_THEME_EVENT, refreshTheme);
          themeListenerRegistered = true;
        }
        chart ??= module.createPcChart(element.value);
        chart.setOption(props.option);
        chartError.value = "";
      } catch (error) {
        chart?.dispose();
        chart = undefined;
        chartError.value = error instanceof Error ? error.message : String(error);
      }
    };
    const resize = (): void => chart?.resize();
    const refreshTheme = (): void => {
      void render();
    };

    watch(() => props.option, render, { deep: true });
    onMounted(() => {
      void render();
      window.addEventListener("resize", resize);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resize);
      if (chartModule) window.removeEventListener(chartModule.CHART_THEME_EVENT, refreshTheme);
      chart?.dispose();
    });

    return () =>
      chartError.value ? (
        <div role="alert" style={{ width: "100%", height: `${props.height}px`, display: "grid", placeItems: "center" }}>
          公共图表模块加载失败：{chartError.value}
        </div>
      ) : (
        <div ref={element} style={{ width: "100%", height: `${props.height}px` }} />
      );
  },
});
