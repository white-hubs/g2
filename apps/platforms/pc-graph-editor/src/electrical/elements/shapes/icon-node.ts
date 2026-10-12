import { Node } from "@antv/x6";

/**
 * 通用图标节点
 * 使用图片作为节点内容，配合左侧图标库使用
 */
export const IconNode = Node.define({
  shape: "electrical-icon-node",
  width: 56,
  height: 56,
  markup: [
    {
      tagName: "rect",
      selector: "body",
    },
    {
      tagName: "image",
      selector: "icon",
    },
  ],
  attrs: {
    body: {
      fill: "#ffffff",
      stroke: "#d9d9d9",
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    },
    icon: {
      "xlink:href": "",
      x: 12,
      y: 12,
      width: 32,
      height: 32,
      preserveAspectRatio: "xMidYMid meet",
    },
  },
});
