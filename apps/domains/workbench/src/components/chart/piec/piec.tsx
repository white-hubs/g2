import * as echarts from "echarts";
import { defineComponent, onBeforeUnmount, onMounted, reactive, nextTick, watch, ref } from "vue";

import "./piec.less";

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartProps {
  total?: number;
  lineStyleColor?: string;
  areaStyleColor?: string;
  chartData?: ChartDataItem[];
  type?: string;
  yName?: string;
}

interface PieChartState {
  id: number;
  total: number;
  objData: Record<string, ChartDataItem>;
}

export default defineComponent({
  name: "PieChart",
  props: {
    total: {
      type: Number,
      default: 0,
    },
    lineStyleColor: {
      type: String,
      default: "rgba(0, 186, 139,1)",
    },
    areaStyleColor: {
      type: String,
      default: "rgba(0, 186, 139, 0.05)",
    },
    chartData: {
      type: Array<ChartDataItem>,
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
  },
  setup(props: PieChartProps) {
    let myCharts1: echarts.ECharts | null = null;
    let chartResizeObserver: ResizeObserver | undefined;
    const handleResize = (): void => myCharts1?.resize();
    const totalRef = ref(2);
    const state = reactive<PieChartState>({
      id: Math.random() * 100,
      total: 0,
      objData: {},
    });

    const formatNumber = (value: number): string => {
      const abs = Math.abs(value);
      const formatter = new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      if (abs >= 1e8) {
        return `${formatter.format(value / 1e8)}亿`;
      }
      if (abs >= 1e4) {
        return `${formatter.format(value / 1e4)}万`;
      }
      return formatter.format(value);
    };

    const getTitleFontSize = (text: string): number => {
      if (text.length > 12) {
        return 18;
      }
      if (text.length > 8) {
        return 22;
      }
      return 30;
    };

    const array2obj = (array: ChartDataItem[], key: string): Record<string, ChartDataItem> => {
      const resObj: Record<string, ChartDataItem> = {};
      state.total = array.reduce((sum, item) => sum + item.value, 0);
      array.forEach((item) => {
        resObj[item[key]] = item;
      });
      return resObj;
    };

    const panelData = reactive({
      options: {
        legend: {
          top: "center",
          left: "10%",
          right: "10%",
          icon: "circle",
          orient: "vertical",
          itemGap: 25,
          selectedMode: false,
          formatter: (name: string) => {
            if (!name || !state.objData[name]) return name;
            const value = state.objData[name].value;
            return `${name}  ${formatNumber(value)}`;
          },
        },
        title: {
          text: formatNumber(totalRef.value),
          subtext: "总数",
          left: "24%",
          top: "40%",
          textAlign: "center",
          textStyle: {
            color: "black",
            fontSize: getTitleFontSize(String(totalRef.value)),
            fontWeight: "normal",
          },
          subtextStyle: {
            color: "black",
            fontSize: 14,
            fontWeight: "normal",
            textAlign: "center",
          },
        },
        series: [
          {
            name: "",
            type: "pie",
            radius: ["50%", "60%"],
            center: ["25%", "50%"],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: "#fff",
              borderWidth: 2,
            },
            label: {
              show: false,
              position: "center",
            },
            emphasis: {
              label: {
                show: false,
                fontSize: "40",
                fontWeight: "bold",
              },
            },
            labelLine: {
              show: false,
            },
            data: props.chartData,
          },
        ],
      },
    });

    watch(
      () => props.chartData,
      () => {
        totalRef.value = props.chartData?.reduce((sum, item) => sum + item.value, 0) || 0;
        state.total = 0;
        array2obj(props.chartData || [], "value");
        state.objData = array2obj(props.chartData || [], "name");
        const formattedTotal = formatNumber(totalRef.value);
        panelData.options.title.text = formattedTotal;
        panelData.options.title.textStyle.fontSize = getTitleFontSize(formattedTotal);
        panelData.options.series[0].data = props.chartData;
        panelData.options.legend.left = (props.chartData?.length ?? 0) > 7 ? "50%" : "65%";
        myCharts1?.setOption(panelData.options);
      },
    );

    onMounted(() => {
      if (props.chartData?.length) {
        state.objData = array2obj(props.chartData, "name");
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

    return () => <div class="line-chart" id={`line${state.id}`} />;
  },
});
