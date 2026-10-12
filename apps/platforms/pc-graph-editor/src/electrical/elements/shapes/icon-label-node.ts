import { Node } from "@antv/x6";

/**
 * 图标 + 文本标签节点
 * 左侧元件库点击/拖拽时使用
 */
export const IconLabelNode = Node.define({
  shape: "electrical-icon-label-node",
  width: 230,
  height: 40,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "image",
      selector: "icon",
    },
    {
      tagName: "rect",
      selector: "labelBox",
    },
    {
      tagName: "text",
      selector: "label",
    },
  ],
  attrs: {
    body: {
      fill: "#ffffff",
      stroke: "#5F95FF",
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    },
    icon: {
      "xlink:href": "",
      x: 16,
      y: 10,
      width: 20,
      height: 20,
      preserveAspectRatio: "xMidYMid meet",
    },
    labelBox: {
      ref: "body",
      refX: 44,
      refY: 4,
      refWidth: -52,
      refHeight: -8,
      fill: "transparent",
      stroke: "transparent",
    },
    label: {
      ref: "labelBox",
      refX: "50%",
      refY: "50%",
      fill: "#333333",
      fontSize: 14,
      lineHeight: 16,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
      textVerticalAnchor: "middle",
      textWrap: {
        text: "",
        width: -2,
        height: -2,
        ellipsis: false,
        breakWord: true,
      },
    },
  },
  ports: {
    groups: {
      top: {
        position: "top",
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: "#C2C8D5",
            strokeWidth: 1,
            fill: "#fff",
          },
        },
      },
      bottom: {
        position: "bottom",
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: "#C2C8D5",
            strokeWidth: 1,
            fill: "#fff",
          },
        },
      },
    },
    items: [
      { id: "icon-label-top", group: "top" },
      { id: "icon-label-bottom", group: "bottom" },
    ],
  },
});
