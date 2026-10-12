import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { PropType } from "vue";
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import "./e-tree.less";

export const ETree = defineComponent({
  name: "ETree",
  props: {
    treeData: { type: Array as PropType<unknown[]>, default: () => [] },
  },
  emits: ["clickSeries"],
  setup(props, { emit, expose }) {
    const tree = ref<HTMLDivElement>();
    let myChart: echarts.ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const series = ref<unknown[]>([]);

    const truncateDeviceName = (value?: string) => {
      if (!value) return "";
      const characters = Array.from(value);
      return characters.length > 10 ? `${characters.slice(0, 10).join("")}...` : value;
    };

    const formatNodeLabel = (data: { deviceName?: string; code?: string; label?: { formatter?: string } }) => {
      const deviceName = truncateDeviceName(data.deviceName);
      const code = data.code ? String(data.code) : "";
      const fallback = typeof data.label?.formatter === "string" ? data.label.formatter : "";
      return [deviceName || fallback, code].filter(Boolean).join("\n");
    };

    const clear = () => {
      if (myChart) {
        myChart.clear();
        echarts.dispose(myChart);
        myChart = null;
      }
    };

    const render = () => {
      if (!tree.value) return;
      clear();
      const option: EChartsOption = {
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
        },
        series: series.value as EChartsOption["series"],
      };
      myChart = echarts.init(tree.value);
      myChart.setOption(option, true);
      myChart.on("click", (params: { componentType: string; data: unknown }) => {
        if (params.componentType === "series") {
          emit("clickSeries", params.data);
        }
      });
    };

    onMounted(() => {
      render();
      const container = tree.value?.parentElement;
      if (container) {
        resizeObserver = new ResizeObserver(() => myChart?.resize());
        resizeObserver.observe(container);
      }
    });

    watch(
      () => props.treeData,
      () => {
        series.value = [];
        (props.treeData as Array<Record<string, unknown>>).forEach((item, index) => {
          series.value.push({
            type: "tree",
            data: [item],
            symbolSize: 9,
            height: `${100 / props.treeData.length}%`,
            top: `${(100 / props.treeData.length) * index}%`,
            bottom: "1%",
            left: "1%",
            right: "10%",
            label: {
              position: "right",
              verticalAlign: "middle",
              align: "left",
              fontSize: 12,
              formatter: (params: { data: { deviceName?: string; code?: string; label?: { formatter?: string } } }) =>
                formatNodeLabel(params.data),
            },
            tooltip: {
              formatter: (params: { data?: { deviceName?: string; code?: string }; name?: string }) => {
                const { deviceName, code } = params.data ?? {};
                return deviceName ? [deviceName, code].filter(Boolean).join("<br />") : params.name;
              },
            },
            edgeShape: "polyline",
            edgeForkPosition: "10%",
            expandAndCollapse: false,
            animationDuration: 550,
            animationDurationUpdate: 750,
          });
        });
        render();
        if (!tree.value || !myChart) return;
        const chartViews = Reflect.get(myChart as object, "_chartsViews") as object[] | undefined;
        const chartData = chartViews?.[0] ? (Reflect.get(chartViews[0], "_data") as object | undefined) : undefined;
        const nodes = chartData ? ((Reflect.get(chartData, "_graphicEls") as unknown[] | undefined) ?? []) : [];
        let allNode = 0;
        for (let i = 0, count = nodes.length; i < count; i++) {
          if (nodes[i] === undefined) continue;
          allNode++;
        }
        const minimumTreeHeight = 240;
        const currentHeight = 35 * allNode;
        const newHeight = Math.max(currentHeight, minimumTreeHeight);
        tree.value.style.height = `${newHeight}px`;
        myChart.resize();
      },
      { deep: true },
    );

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      clear();
    });

    expose({
      clear,
      render,
    });

    return () => <div ref={tree} class="e-tree-chart" />;
  },
});
