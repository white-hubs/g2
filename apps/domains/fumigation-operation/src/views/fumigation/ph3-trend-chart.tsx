import { computed, defineComponent, type PropType } from "vue";

import { EmptyBlock } from "./components";
import type { TrendPoint } from "./state";

export const Ph3TrendChart = defineComponent({
  name: "Ph3TrendChart",
  props: {
    points: {
      type: Array as PropType<TrendPoint[]>,
      default: () => [],
    },
  },
  setup: (props) => {
    const chartModel = computed(() => {
      const points = props.points.filter((item) => Number.isFinite(item.value));
      if (points.length === 0) {
        return null;
      }
      const width = 640;
      const height = 180;
      const padding = { top: 16, right: 16, bottom: 28, left: 40 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      const maxValue = Math.max(...points.map((item) => item.value), 0.1);
      const minValue = 0;
      const valueSpan = maxValue - minValue || 1;
      const coordinates = points.map((point, index) => {
        const x = padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
        const y = padding.top + plotHeight - ((point.value - minValue) / valueSpan) * plotHeight;
        return { x, y, point };
      });
      const polyline = coordinates.map((item) => `${item.x},${item.y}`).join(" ");
      const bars = coordinates.map((item) => ({
        x: item.x - Math.min(8, plotWidth / Math.max(points.length * 2, 1)),
        y: item.y,
        width: Math.min(16, plotWidth / Math.max(points.length, 1)),
        height: padding.top + plotHeight - item.y,
        label: item.point.time,
      }));
      return { width, height, padding, plotHeight, polyline, bars, maxValue };
    });

    return (): JSX.Element => {
      const model = chartModel.value;
      if (model == null) {
        return <EmptyBlock text="暂无趋势数据" />;
      }
      return (
        <div class="fumigation-ph3-chart">
          <svg viewBox={`0 0 ${model.width} ${model.height}`} preserveAspectRatio="none">
            <line
              x1={model.padding.left}
              y1={model.padding.top + model.plotHeight}
              x2={model.width - model.padding.right}
              y2={model.padding.top + model.plotHeight}
              stroke="#d7dde7"
            />
            {model.bars.map((bar) => (
              <g key={`${bar.label}-${bar.x}`}>
                <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill="rgba(65, 154, 120, 0.75)" rx="2" />
                <text x={bar.x + bar.width / 2} y={model.height - 8} text-anchor="middle" fill="#8c95a6" font-size="10">
                  {bar.label}
                </text>
              </g>
            ))}
            <polyline fill="none" stroke="#2563a8" stroke-width="2" points={model.polyline} />
          </svg>
        </div>
      );
    };
  },
});
