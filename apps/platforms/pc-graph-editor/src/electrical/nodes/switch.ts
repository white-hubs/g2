import { Node } from "@antv/x6";

/**
 * 开关节点
 */
export const SwitchNode = Node.define({
  shape: "electrical-switch",
  width: 60,
  height: 80,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "circle",
      selector: "switch-top",
    },
    {
      tagName: "circle",
      selector: "switch-bottom",
    },
    {
      tagName: "line",
      selector: "switch-line",
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
      width: 60,
      height: 80,
    },
    "switch-top": {
      cx: 30,
      cy: 25,
      r: 4,
      fill: "#ffffff",
      stroke: "#333333",
      strokeWidth: 2,
    },
    "switch-bottom": {
      cx: 30,
      cy: 55,
      r: 4,
      fill: "#ffffff",
      stroke: "#333333",
      strokeWidth: 2,
    },
    "switch-line": {
      x1: 30,
      y1: 29,
      x2: 35,
      y2: 48,
      stroke: "#333333",
      strokeWidth: 2,
      strokeLinecap: "round",
    },
    label: {
      x: 30,
      y: 70,
      text: "开关",
      fill: "#333333",
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
    },
  },
  ports: {
    groups: {
      in: {
        position: { name: "absolute", args: { x: 30, y: 0 } },
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
        position: { name: "absolute", args: { x: 30, y: 80 } },
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
 * 注册开关节点
 */
export function registerSwitchNode() {
  return SwitchNode;
}
