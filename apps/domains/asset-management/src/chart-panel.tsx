import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, onMounted, onUnmounted, ref, watch } from "vue";

import { loadPcChart, loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { CHART_THEME_EVENT, createPcChart } = await loadPcChart();
const { Empty } = await loadPcUi();
export const ChartPanel = defineComponent({
  props: { title: String, option: { type: Object as PropType<PcChartOption>, required: true }, wide: Boolean, empty: Boolean },
  emits: { select: (_index: number) => true },
  setup(props, { emit }) {
    const element = ref<HTMLElement>();
    let chart: PcChartHandle | undefined;
    let observer: ResizeObserver | undefined;
    let removeClick: (() => void) | undefined;
    let ready = false;
    let disposed = false;
    const update = () => {
      if (!ready || disposed || !element.value || !element.value.clientWidth || !element.value.clientHeight) {
        return;
      }
      if (!chart) {
        chart = createPcChart(element.value);
        removeClick = chart.onClick((event) => emit("select", event.dataIndex));
      }
      chart.setOption(props.option);
      chart.resize();
    };
    watch(() => props.option, update, { deep: true });
    onMounted(() => {
      ready = true;
      update();
      observer = new ResizeObserver(update);
      if (element.value) {
        observer.observe(element.value);
      }
      globalThis.addEventListener(CHART_THEME_EVENT, update);
    });
    onUnmounted(() => {
      disposed = true;
      observer?.disconnect();
      globalThis.removeEventListener(CHART_THEME_EVENT, update);
      removeClick?.();
      chart?.dispose();
    });
    return () => (
      <section class={[styles.chartPanel, props.wide && styles.wide]}>
        <h3>{props.title}</h3>
        <div style={{ position: "relative" }}>
          <div ref={element} class={styles.chart} style={{ visibility: props.empty ? "hidden" : undefined }} />
          {props.empty && <Empty description="暂无数据" style={{ position: "absolute", inset: "80px 0 0" }} />}
        </div>
      </section>
    );
  },
});
