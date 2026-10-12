import { Node } from "@antv/x6";

/**
 * 电容元件
 */
export const CapacitorNode = Node.define({
  shape: "electrical-capacitor",
  width: 80,
  height: 40,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "line",
      selector: "cap-left",
    },
    {
      tagName: "line",
      selector: "cap-right",
    },
    {
      tagName: "line",
      selector: "wire-left",
    },
    {
      tagName: "line",
      selector: "wire-right",
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
      width: 80,
      height: 40,
    },
    "cap-left": {
      x1: 35,
      y1: 8,
      x2: 35,
      y2: 28,
      stroke: "#333333",
      strokeWidth: 2,
    },
    "cap-right": {
      x1: 45,
      y1: 8,
      x2: 45,
      y2: 28,
      stroke: "#333333",
      strokeWidth: 2,
    },
    "wire-left": {
      x1: 10,
      y1: 18,
      x2: 35,
      y2: 18,
      stroke: "#333333",
      strokeWidth: 2,
    },
    "wire-right": {
      x1: 45,
      y1: 18,
      x2: 70,
      y2: 18,
      stroke: "#333333",
      strokeWidth: 2,
    },
    label: {
      x: 40,
      y: 35,
      text: "C",
      fill: "#333333",
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
    },
  },
  ports: {
    groups: {
      left: {
        position: { name: "absolute", args: { x: 0, y: 18 } },
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
      right: {
        position: { name: "absolute", args: { x: 80, y: 18 } },
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
    },
    items: [
      { id: "left", group: "left" },
      { id: "right", group: "right" },
    ],
  },
});
