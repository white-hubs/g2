import { Node } from "@antv/x6";

/**
 * 断路器节点
 */
export const BreakerNode = Node.define({
  shape: "electrical-breaker",
  width: 70,
  height: 90,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "rect",
      selector: "breaker-body",
    },
    {
      tagName: "line",
      selector: "breaker-line",
    },
    {
      tagName: "text",
      selector: "label",
    },
  ],
  attrs: {
    body: {
      fill: "transparent",
      stroke: "transparent",
      width: 70,
      height: 90,
    },
    "breaker-body": {
      x: 10,
      y: 20,
      width: 50,
      height: 30,
      fill: "#ffffff",
      stroke: "#333333",
      strokeWidth: 2,
      rx: 2,
    },
    "breaker-line": {
      x1: 35,
      y1: 50,
      x2: 35,
      y2: 70,
      stroke: "#333333",
      strokeWidth: 3,
    },
    label: {
      x: 35,
      y: 10,
      text: "断路器",
      fill: "#333333",
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
    },
  },
  ports: {
    groups: {
      in: {
        position: { name: "absolute", args: { x: 35, y: 0 } },
        attrs: {
          circle: {
            r: 5,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
      out: {
        position: { name: "absolute", args: { x: 35, y: 90 } },
        attrs: {
          circle: {
            r: 5,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
    },
    items: [
      { id: "in", group: "in" },
      { id: "out", group: "out" },
    ],
  },
});

/**
 * 注册断路器节点
 */
export function registerBreakerNode() {
  return BreakerNode;
}
