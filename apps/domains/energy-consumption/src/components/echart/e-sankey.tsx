import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref } from "vue";

export const ESankey = defineComponent({
  name: "ESankey",
  props: {
    nodes: { type: Array as PropType<unknown[]>, default: () => [] },
    // 用 unknown[] 避免导出组件时暴露 echarts 内部 SankeyEdgeItemOption 命名类型
    links: { type: Array as PropType<unknown[]>, default: () => [] },
  },
  setup(props, { expose }) {
    const sankey = ref<HTMLDivElement>();
    let myChart: echarts.ECharts | null = null;

    const clear = () => {
      if (myChart) {
        echarts.dispose(myChart);
        myChart = null;
      }
    };

    const render = () => {
      if (!sankey.value) return;
      clear();
      const option: EChartsOption = {
        title: {},
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
        },
        series: [
          {
            type: "sankey",
            data: props.nodes as never,
            nodeGap: 20,
            links: props.links as never,
            emphasis: {
              focus: "adjacency",
            },
            levels: [
              {
                depth: 0,
                itemStyle: { color: "#fbb4ae" },
                lineStyle: { color: "source", opacity: 0.6 },
              },
              {
                depth: 1,
                itemStyle: { color: "#b3cde3" },
                lineStyle: { color: "source", opacity: 0.6 },
              },
              {
                depth: 2,
                itemStyle: { color: "#ccebc5" },
                lineStyle: { color: "source", opacity: 0.6 },
              },
              {
                depth: 3,
                itemStyle: { color: "#decbe4" },
                lineStyle: { color: "source", opacity: 0.6 },
              },
            ],
            lineStyle: {
              curveness: 0.5,
            },
          },
        ],
      };
      myChart = echarts.init(sankey.value);
      myChart.setOption(option);

      // 按节点数量撑高容器，避免桑基图节点重叠
      const chartViews = (myChart as unknown as { _chartsViews?: Array<{ _data?: { _graphicEls?: unknown[] } }> })._chartsViews;
      const nodes = chartViews?.[0]?._data?._graphicEls ?? [];
      let allNode = 0;
      for (let i = 0, count = nodes.length; i < count; i++) {
        if (nodes[i] === undefined) continue;
        allNode++;
      }
      const height = window.innerHeight;
      const currentHeight = 35 * allNode;
      const newHeight = Math.max(currentHeight, height);
      sankey.value.style.height = `${newHeight}px`;
      myChart.resize();
    };

    onMounted(() => {
      render();
    });

    onBeforeUnmount(() => {
      clear();
    });

    expose({ render });

    return () => <div ref={sankey} style={{ width: "100%", height: "100%" }} />;
  },
});
