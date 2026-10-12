import type { PcChartHandle, PcChartOption } from "@g2-platform/pc-chart";
import { type PropType, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { getMeetRoomPcChart } from "../domain-context";

import styles from "../styles.module.css";

export const StatChart = defineComponent({
  name: "MeetRoomStatChart",
  props: { option: { type: Object as PropType<PcChartOption>, required: true } },
  setup(props) {
    const host = ref<HTMLDivElement>();
    let chart: PcChartHandle | undefined;
    const render = (): void => {
      if (!host.value) {
        return;
      }
      chart ??= getMeetRoomPcChart().createPcChart(host.value);
      chart.setOption(props.option);
    };
    const resize = (): void => chart?.resize();
    watch(() => props.option, render, { deep: true });
    onMounted(() => {
      render();
      window.addEventListener("resize", resize);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("resize", resize);
      chart?.dispose();
    });
    return () => <div ref={host} class={styles.chartHost} />;
  },
});
