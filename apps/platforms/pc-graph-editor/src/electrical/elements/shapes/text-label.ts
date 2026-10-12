import { Node } from "@antv/x6";

/**
 * 文本标签元件
 */
export const TextLabelNode = Node.define({
  shape: "electrical-text-label",
  width: 230,
  height: 48,
  markup: [
    {
      tagName: "rect",
      selector: "body",
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
    // 文本标签：暂时隐藏边框和背景，仅保留文字
    // body: {
    //   fill: "#ffffff",
    //   stroke: "#5F95FF",
    //   strokeWidth: 1,
    //   rx: 4,
    //   ry: 4,
    // },
    body: {
      // 暂时隐藏背景与边框（恢复：取消下面注释，并删除 transparent / strokeWidth: 0）
      // fill: "#ffffff",
      // stroke: "#5F95FF",
      // strokeWidth: 1,
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
      rx: 4,
      ry: 4,
    },
    labelBox: {
      ref: "body",
      refX: 8,
      refY: 4,
      refWidth: -16,
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
        text: "文本标签",
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
            fill: "#ffffff",
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
            fill: "#ffffff",
          },
        },
      },
    },
    items: [
      { id: "top", group: "top" },
      { id: "bottom", group: "bottom" },
    ],
  },
});
