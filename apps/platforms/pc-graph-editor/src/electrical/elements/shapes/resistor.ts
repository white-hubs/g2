import { Node } from "@antv/x6";

/**
 * 电阻元件
 */
export const ResistorNode = Node.define({
  shape: "electrical-resistor",
  width: 80,
  height: 40,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "polyline",
      selector: "resistor-shape",
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
    "resistor-shape": {
      points: "10,20 20,10 30,30 40,10 50,30 60,10 70,20",
      fill: "none",
      stroke: "#333333",
      strokeWidth: 2,
      strokeLinejoin: "round",
    },
    label: {
      x: 40,
      y: 35,
      text: "R",
      fill: "#333333",
      fontSize: 11,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
    },
  },
  ports: {
    groups: {
      left: {
        position: { name: "absolute", args: { x: 0, y: 20 } },
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
        position: { name: "absolute", args: { x: 80, y: 20 } },
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
