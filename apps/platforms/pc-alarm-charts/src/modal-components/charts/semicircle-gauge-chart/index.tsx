import * as echarts from "echarts";
import type { ECharts } from "echarts";
import { defineComponent, onMounted, ref, watch } from "vue";

import { getUniqueId } from "../../../utils/index";

export const SemicircleChart = defineComponent({
  props: {
    id: {
      type: String,
      default: () => getUniqueId(),
    },
    label: {
      type: String,
      default: () => "A相电压",
    },
    width: {
      type: String,
      default: () => "200px",
    },
    height: {
      type: String,
      default: () => "200px",
    },
    value: {
      type: Number,
      default: () => 300,
    },
    min: {
      type: Number,
      default: () => 0,
    },
    unit: {
      type: String,
      default: () => "v",
    },
    max: {
      type: Number,
      default: () => 400,
    },
  },
  setup: (props) => {
    const myChart = ref<ECharts>();
    const renderCharts = (): void => {
      if (!myChart.value) return;
      const option = {
        series: [
          {
            type: "gauge",
            startAngle: 220,
            endAngle: -40,
            min: Math.min(props.value, props.min),
            radius: "100%",
            center: ["50%", "50%"],
            max: Math.max(props.value, props.max),
            itemStyle: {
              color: "#1890FF",
              shadowColor: "rgba(0,138,255,0.45)",
            },
            progress: {
              show: true,
              width: 8,
            },
            pointer: {
              icon: "triangle",
              length: "70%",
              width: 10,
              offsetCenter: [0, 0],
            },
            axisLine: {
              lineStyle: {
                width: 8,
              },
            },
            axisTick: {
              distance: 0,
              length: 5,
              lineStyle: {
                color: "#86909C",
                width: 1, // 刻度线线宽
              },
            },
            splitLine: {
              length: 12,
              distance: 0,
              lineStyle: {
                width: 1,
                color: "#EDF0F3",
              },
            },
            axisLabel: {
              color: "#999",
              distance: 10,
              fontSize: 8,
              show: true,
            },
            title: {
              show: false,
            },
            anchor: {
              show: true,
              icon: "circle",
              size: 30,
              showAbove: true,
              offsetCenter: [0, 0],
              itemStyle: {
                color: "#fff",
                borderWidth: 40,
                borderColor: "rgba(21,120,255,0.15)",
              },
            },
            detail: {
              width: "60%",
              lineHeight: 40,
              height: 40,
              offsetCenter: [0, "90%"],
              valueAnimation: true,
              formatter: function (value: number) {
                return "{label|" + props.label + "}" + "` `" + "{value|" + value + "}" + "{unit|" + props.unit + "}";
              },
              rich: {
                value: {
                  fontSize: 20,
                  fontWeight: "bolder",
                  color: "#fff",
                },
                label: {
                  fontSize: 16,
                  fontWeight: "bolder",
                  color: "#D6DADF",
                },
                unit: {
                  fontSize: 20,
                  fontWeight: "bolder",
                  color: "#fff",
                },
              },
            },
            data: [
              {
                value: props.value,
                name: "A相电压",
              },
            ],
          },
        ],
      };
      myChart.value.setOption(option);
    };
    watch(
      () => props.value,
      () => {
        renderCharts();
      },
    );
    onMounted(() => {
      myChart.value = echarts.init(document.getElementById(props.id) as HTMLDivElement);
      renderCharts();
    });
    return () => (
      <div class="container">
        <div id={props.id} style={{ width: props.width, height: props.height }} />
      </div>
    );
  },
});
