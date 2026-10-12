import * as echarts from "echarts";
import { defineComponent, onBeforeUnmount, onMounted, reactive, nextTick, watch } from "vue";

import "./pie.less";

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieProps {
  lineStyleColor?: string;
  areaStyleColor?: string;
  chartData?: ChartDataItem[];
  type?: string;
  yName?: string;
  color?: string[];
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
    color: {
      type: Array<string>,
      default: () => [],
    },
  },
  setup(props: PieProps) {
    let myCharts1: echarts.ECharts | null = null;
    let chartResizeObserver: ResizeObserver | undefined;
    const handleResize = (): void => myCharts1?.resize();
    const state = reactive<{ id: number; total: number; objData: Record<string, ChartDataItem> }>({
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

    const array2obj = (array: ChartDataItem[], key: keyof ChartDataItem): Record<string, ChartDataItem> => {
      const resObj: Record<string, ChartDataItem> = {};
      array.forEach((item) => {
        state.total += item.value;
        resObj[item[key].toString()] = item;
      });
      return resObj;
    };

    const panelData = reactive({
      options: {
        legend: {
          top: "center",
          left: "70%",
          icon: "circle",
          orient: "vertical",
          itemGap: 25,
          textStyle: {
            color: "black",
            fontSize: 14,
            fontWeight: "normal",
          },
          selectedMode: false,
          formatter: function (name: string) {
            if (!name || !state.objData[name]) return name;
            const value = state.objData[name].value;
            return `${name}  ${formatNumber(value)}`;
          },
        },
        title: {
          text: "0",
          subtext: "总数",
          left: "24.5%",
          top: "40%",
          textAlign: "center",
          textStyle: {
            color: "black",
            fontSize: 28,
            fontWeight: "normal",
          },
          subtextStyle: {
            color: "black",
            fontSize: 12,
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
            // 添加以下配置确保单数据点显示
          },
        ],
      },
    });

    watch(
      () => props.chartData,
      () => {
        state.total = 0;
        state.objData = array2obj(props.chartData ?? [], "name");
        const formattedTotal = formatNumber(state.total);
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
        const el = document.getElementById("line" + state.id);
        if (el) {
          myCharts1 = echarts.init(el);
          myCharts1.setOption(panelData.options);
          chartResizeObserver = new ResizeObserver(handleResize);
          chartResizeObserver.observe(el);
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
