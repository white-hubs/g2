import { Node } from "@antv/x6";

/**
 * 电气元件基础节点
 */
export const BaseElectricalNode = Node.define({
  shape: "electrical-base",
  width: 80,
  height: 60,
  attrs: {
    body: {
      fill: "#ffffff",
      stroke: "#333333",
      strokeWidth: 2,
      rx: 4,
      ry: 4,
    },
    label: {
      text: "元件",
      fill: "#333333",
      fontSize: 12,
      fontFamily: "Arial, sans-serif",
      textAnchor: "middle",
      textVerticalAnchor: "middle",
    },
  },
  ports: {
    groups: {
      in: {
        position: "top",
        attrs: {
          circle: {
            r: 6,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
      out: {
        position: "bottom",
        attrs: {
          circle: {
            r: 6,
            magnet: true,
            stroke: "#1890ff",
            strokeWidth: 2,
            fill: "#ffffff",
          },
        },
      },
    },
  },
});

/**
 * 注册基础节点到 X6
 */
export function registerBaseNode() {
  // 基础节点已经通过 define 注册
  return BaseElectricalNode;
}
