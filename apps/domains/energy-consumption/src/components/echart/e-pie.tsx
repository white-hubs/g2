import * as echarts from "echarts";
import type { EChartsOption, LegendComponentOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

export const EPie = defineComponent({
  name: "EPie",
  props: {
    data: {
      type: Array as PropType<Array<{ value: number; name: string }>>,
      default: () => [],
    },
    legend: { type: Object as PropType<LegendComponentOption>, default: undefined },
    name: { type: String, default: "" },
    center: { type: Array as PropType<string[]>, default: () => ["50%", "50%"] },
    radius: { type: Array as PropType<string[]>, default: () => ["40%", "70%"] },
    label: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({ show: false, position: "center" }),
    },
  },
  setup(props, { expose }) {
    const pie = ref<HTMLDivElement>();
    let myChart: echarts.ECharts | null = null;

    const clear = () => {
      if (myChart) {
        echarts.dispose(myChart);
        myChart = null;
      }
    };

    const render = () => {
      if (!pie.value) return;
      clear();
      const total = props.data.reduce((a, b) => parseFloat(String(a)) + parseFloat(String(b.value)), 0);
      const option: EChartsOption = {
        tooltip: {
          formatter: (params: unknown) => {
            const name = params as { value?: number; name?: string };
            const value = Number(name.value ?? 0);
            return value === 0 ? String(name.name ?? "") : `${name.name} ${value} ${((value / total) * 100).toFixed(2)}%`;
          },
          trigger: "item",
        },
        legend: props.legend,
        title: {
          subtext: props.name,
        },
        series: [
          {
            name: props.name,
            type: "pie",
            radius: props.radius,
            avoidLabelOverlap: false,
            center: props.center,
            itemStyle: {
              borderRadius: 0,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: props.label as never,
            emphasis: {
              label: {
                show: true,
                fontSize: 20,
                fontWeight: "bold",
              },
            },
            labelLine: {
              show: false,
            },
            data: props.data,
          },
        ],
      };
      myChart = echarts.init(pie.value);
      myChart.setOption(option);
    };

    onMounted(() => {
      render();
    });

    watch(
      () => props.data,
      () => {
        render();
      },
      { deep: true },
    );

    onBeforeUnmount(() => {
      clear();
    });

    expose({ render });

    return () => <div ref={pie} style={{ width: "100%", height: "100%" }} />;
  },
});
