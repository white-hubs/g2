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
    width: {
      type: String,
      default: () => "100px",
    },
    height: {
      type: String,
      default: () => "50px",
    },
    value: {
      type: Number,
      default: () => 300,
    },
    min: {
      type: Number,
      default: () => 0,
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
            startAngle: 200,
            endAngle: -20,
            min: Math.min(props.value, props.min),
            radius: "140%",
            center: ["50%", "70%"],
            max: Math.max(props.value, props.max),
            splitNumber: 12,
            itemStyle: {
              color: "#1890FF",
              shadowColor: "rgba(0,138,255,0.45)",
            },
            progress: {
              show: true,
              width: 4,
            },
            pointer: {
              icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
              length: "60%",
              width: 4,
              offsetCenter: [0, 0],
            },
            axisLine: {
              lineStyle: {
                width: 4,
              },
            },
            axisTick: {
              distance: 0,
              length: "10%",
              show: false,
            },
            splitLine: {
              length: 3,
              distance: 0,
              lineStyle: {
                width: 0.5,
                color: "#EDF0F3",
              },
            },
            axisLabel: {
              show: false,
            },
            title: {
              show: false,
            },
            anchor: {
              show: true,
              size: 20,
              offsetCenter: [0, 0],
              itemStyle: {
                color: "#fff",
              },
            },
            detail: {
              show: false,
              backgroundColor: "#fff",
              width: "60%",
              lineHeight: 40,
              height: 40,
              offsetCenter: [0, "-35%"],
              valueAnimation: true,
              formatter: function (value: number) {
                return "{value|" + value.toFixed(0) + "}" + "{unit|V}" + "\n" + "{label|A相电压}";
              },
              rich: {
                value: {
                  fontSize: 20,
                  fontWeight: "bolder",
                  color: "#777",
                },
                label: {
                  fontSize: 20,
                  fontWeight: "bolder",
                  color: "#777",
                },
                unit: {
                  fontSize: 20,
                  fontWeight: "bolder",
                  color: "#777",
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
