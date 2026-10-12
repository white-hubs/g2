import { computed, defineComponent, type PropType } from "vue";

import { useEcharts } from "./use-echarts";

const COLORS = ["#5654F5", "#4CA8FF", "#F53F3F", "#FBA33F", "#F53F3F", "#FBA33F"];

export interface PlanTypeSlice {
  planType?: string;
  planNum?: number;
}

/** 计划类型占比环形图（对齐旧 bar.vue）。 */
export const PlanTypePieChart = defineComponent({
  name: "PlanTypePieChart",
  props: {
    data: { type: Array as PropType<PlanTypeSlice[]>, default: () => [] },
  },
  setup(props) {
    const { chartRef } = useEcharts(
      () => ({
        tooltip: { trigger: "item" },
        color: COLORS,
        series: [
          {
            type: "pie",
            radius: ["40%", "70%"],
            avoidLabelOverlap: true,
            label: { show: false, position: "center" },
            labelLine: { show: false },
            data: (props.data ?? []).map((item, index) => ({
              value: item.planNum ?? 0,
              name: item.planType ?? "",
              itemStyle: { color: COLORS[index % COLORS.length] },
            })),
          },
        ],
      }),
      () => props.data,
    );
    const style = computed(() => ({ width: "100%", minHeight: "159px", height: "100%" }));
    return () => <div ref={chartRef} style={style.value} />;
  },
});
