import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { onBeforeUnmount, onMounted, ref, watch, type Ref, type WatchSource } from "vue";

/** 通用 echarts 生命周期：挂载初始化、依赖变更重绘、卸载 dispose、窗口 resize。 */
export function useEcharts(
  getOption: () => EChartsOption | null | undefined,
  deps: WatchSource,
): {
  chartRef: Ref<HTMLElement | null>;
} {
  const chartRef = ref<HTMLElement | null>(null);
  let chart: echarts.ECharts | null = null;

  const render = (): void => {
    const el = chartRef.value;
    if (!el) return;
    const option = getOption();
    if (!option) return;
    if (!chart) chart = echarts.init(el);
    chart.clear();
    chart.setOption(option, true);
  };

  const handleResize = (): void => chart?.resize();

  onMounted(() => {
    render();
    window.addEventListener("resize", handleResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize);
    chart?.dispose();
    chart = null;
  });

  watch(deps, () => render(), { deep: true });

  return { chartRef };
}
