import { computed, defineComponent } from "vue";

import { useEcharts } from "./use-echarts";

/** 占比环形图（对齐旧 pie.vue）：中心展示比例文案。 */
export const RatioPieChart = defineComponent({
  name: "RatioPieChart",
  props: {
    color: { type: String, default: "#1AD598" },
    data: { type: String, default: "0%" },
  },
  setup(props) {
    const parseRatio = (): number => {
      const raw = String(props.data ?? "0");
      const num = Number(raw.replace("%", "").trim());
      return Number.isFinite(num) ? num : 0;
    };
    const { chartRef } = useEcharts(
      () => {
        const value = parseRatio();
        return {
          backgroundColor: "#fff",
          color: [props.color, props.color, "#F1F4F9"],
          series: [
            {
              type: "pie",
              center: ["60%", "50%"],
              radius: ["80%", "40%"],
              hoverAnimation: false,
              data: [
                {
                  name: "",
                  value,
                  label: {
                    show: true,
                    position: "center",
                    color: "#000000",
                    fontSize: 16,
                    fontWeight: "bold",
                    formatter: () => props.data,
                  },
                },
                { name: "", value: 0, label: { show: false } },
                { name: "", value: Math.max(0, 100 - value), label: { show: false } },
              ],
            },
          ],
        };
      },
      () => [props.data, props.color],
    );
    const style = computed(() => ({ width: "100%", height: "100%", minHeight: "160px" }));
    return () => <div ref={chartRef} style={style.value} />;
  },
});
