import * as echarts from "echarts";
import { defineComponent, onBeforeUnmount, onMounted, reactive, nextTick, watch, ref } from "vue";

import "./line.less";

interface LineChartProps {
  lineStyleColor?: string;
  areaStyleColor?: string;
  chartData?: { name: string; value: number }[];
  type?: string;
  yName?: string;
  yAxisMinInterval?: number;
}

interface LineChartState {
  id: number;
}

export default defineComponent({
  name: "LineChart",
  props: {
    lineStyleColor: {
      type: String,
      default: "rgba(0, 186, 139,1)",
    },
    areaStyleColor: {
      type: String,
      default: "rgba(0, 186, 139, 0.05)",
    },
    chartData: {
      type: Array<{ name: string; value: number }>,
      default: () => [],
    },
    type: {
      type: String,
      default: "line",
    },
    yName: {
      type: String,
      default: "",
    },
    yAxisMinInterval: {
      type: Number,
      default: 0,
    },
  },
  setup(props: LineChartProps) {
    const chartRef = ref();
    let myCharts1: echarts.ECharts | null = null;
    let chartResizeObserver: ResizeObserver | undefined;
    const handleResize = (): void => myCharts1?.resize();
    const state = reactive<LineChartState>({
      id: Math.random() * 100,
    });

    const panelData = reactive({
      options: {
        grid: {
          left: 50,
          right: 10,
          bottom: 50,
          top: 30,
          containLabel: false,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            label: {
              backgroundColor: "#6a7985",
            },
          },
        },
        xAxis: {
          type: "category",
          data: [] as string[],
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
        },
        yAxis: {
          type: "value",
          name: props.yName,
          minInterval: props.yAxisMinInterval,
          splitLine: {
            lineStyle: {
              type: "dashed",
              color: "#F3F3F3",
            },
          },
        },
        series: [
          {
            data: [] as number[],
            type: props.type,
            symbol: "circle",
            barWidth: 10,
            itemStyle: {
              normal: {
                color: props.lineStyleColor,
              },
            },
            lineStyle: {
              color: props.lineStyleColor,
            },
            areaStyle: {
              color: props.areaStyleColor,
            },
            smooth: true,
          },
        ],
      },
    });

    const updateChartData = (): void => {
      const xAxisData = props.chartData?.map((item) => item.name) || [];
      const seriesData = props.chartData?.map((item) => item.value) || [];

      panelData.options.xAxis.data = xAxisData;
      panelData.options.yAxis.name = props.yName;
      panelData.options.series[0].data = seriesData;

      myCharts1?.setOption(panelData.options);
    };

    watch(() => props.chartData, updateChartData);

    onMounted(() => {
      if (props.chartData?.length) {
        updateChartData();
      }

      nextTick(() => {
        const chartElement = document.getElementById("line" + state.id);
        if (chartElement) {
          myCharts1 = echarts.init(chartElement);
          myCharts1.setOption(panelData.options);
          chartResizeObserver = new ResizeObserver(handleResize);
          chartResizeObserver.observe(chartElement);
        }
      });

      window.addEventListener("resize", handleResize);
    });

    onBeforeUnmount(() => {
      chartResizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      myCharts1?.dispose();
    });

    return () => <div class="line-chart" id={`line${state.id}`} ref={chartRef} />;
  },
});
