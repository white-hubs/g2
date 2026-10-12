import { type PcChartHandle, type PcChartOption } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getSecureEduPcChart } from "../domain-context";
import { Empty } from "../pc-ui-runtime";

import styles from "./stat-chart.module.css";

export const StatChart = defineComponent({
  name: "SecureEduStatChart",
  props: {
    option: { type: Object as PropType<PcChartOption>, required: true },
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: "暂无数据" },
  },
  setup(props) {
    const host = ref<HTMLDivElement | null>(null);
    let chart: PcChartHandle | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const disposeChart = (): void => {
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      chart?.dispose();
      chart = undefined;
    };

    const renderChart = async (): Promise<void> => {
      await nextTick();
      disposeChart();
      if (props.empty || !host.value) {
        return;
      }
      chart = getSecureEduPcChart().createPcChart(host.value);
      chart.setOption(props.option);
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => chart?.resize());
        resizeObserver.observe(host.value);
      }
    };

    const resize = (): void => chart?.resize();

    watch([() => props.option, () => props.empty], () => void renderChart(), { deep: true, flush: "post" });
    onMounted(() => {
      window.addEventListener("resize", resize);
      void renderChart();
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resize);
      disposeChart();
    });

    return () =>
      props.empty ? (
        <div class={styles.empty}>
          <Empty description={props.emptyText} />
        </div>
      ) : (
        <div ref={host} class={styles.chart} role="img" aria-label="统计图表" />
      );
  },
});
