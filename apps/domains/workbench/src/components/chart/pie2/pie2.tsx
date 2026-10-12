import * as echarts from "echarts";
import { defineComponent, onBeforeUnmount, onMounted, reactive, nextTick, watch } from "vue";

import "./pie2.less";

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartProps {
  lineStyleColor?: string;
  areaStyleColor?: string;
  chartData?: ChartDataItem[];
  type?: string;
  yName?: string;
  unit?: string;
}

interface PieChartState {
  id: number;
  objData: Record<string, ChartDataItem>;
  total: number;
}

export default defineComponent({
  name: "PieChart",
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
    unit: {
      type: String,
      default: "",
    },
  },
  setup(props: PieChartProps) {
    let myCharts1: echarts.ECharts | null = null;
    let chartResizeObserver: ResizeObserver | undefined;
    const handleResize = (): void => myCharts1?.resize();
    const state = reactive<PieChartState>({
      id: Math.random() * 100,
      objData: {},
      total: 0,
    });

    const formatNumberWithUnit = (value: number, unit: string): string => {
      const abs = Math.abs(value);
      const formatter = new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

      if (abs >= 1e8) {
        return `${formatter.format(value / 1e8)}亿${unit}`;
      }
      if (abs >= 1e4) {
        return `${formatter.format(value / 1e4)}万${unit}`;
      }
      return `${formatter.format(value)}${unit}`;
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
        resObj[item[key].toString()] = item;
      });
      return resObj;
    };

    const panelData = reactive({
      options: {
        legend: {
          top: "65%",
          left: "center",
          icon: "circle",
          itemGap: 25,
          formatter: (name: string) => {
            if (!name || !state.objData[name]) return name;
            const value = state.objData[name].value;
            return `${name}  ${formatNumberWithUnit(value, props.unit ?? "")}`;
          },
        },
        title: {
          text: formatNumberWithUnit(state.total, props.unit ?? ""),
          subtext: "总数",
          left: "50%",
          top: "20%",
          textAlign: "center",
          textStyle: {
            color: "black",
            fontSize: getTitleFontSize(formatNumberWithUnit(state.total, props.unit ?? "")),
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
            center: ["50%", "30%"],
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
        state.total = 0;
        state.objData = array2obj(props.chartData || [], "name");
        const formattedTotal = formatNumberWithUnit(state.total, props.unit ?? "");
        panelData.options.title.text = formattedTotal;
        panelData.options.title.textStyle.fontSize = getTitleFontSize(formattedTotal);
        panelData.options.series[0].data = props.chartData;
        myCharts1?.setOption(panelData.options);
        myCharts1?.resize();
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
