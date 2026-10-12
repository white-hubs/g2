import { computed, defineComponent, ref, inject, type PropType } from "vue";

import { useDragDrop, type ElementDefinition } from "../../core";

import "./electrical-editor.css";

export interface ElectricalElementLibItem {
  id: string;
  name: string;
  icon: string;
  group: "main" | "other";
  definition: ElementDefinition;
}

const transformerIcon = "/resource/v1/cube-graph-editor-basic/images/transformerIcon.png";
const meterIcon = "/resource/v1/cube-graph-editor-basic/images/meterIcon.png";
const sensorIcon = "/resource/v1/cube-graph-editor-basic/images/sensorIcon.png";
const capacitorCompIcon = "/resource/v1/cube-graph-editor-basic/images/capacitorCompIcon.png";
const powerPointIcon = "/resource/v1/cube-graph-editor-basic/images/powerPointIcon.png";
const tJointIcon = "/resource/v1/cube-graph-editor-basic/images/tJointIcon.png";
const distributionCabinetIcon = "/resource/v1/cube-graph-editor-basic/images/distributionCabinetIcon.png";
const connectorIcon = "/resource/v1/cube-graph-editor-basic/images/connectorIcon.png";
const busBridgeIcon = "/resource/v1/cube-graph-editor-basic/images/busBridgeIcon.png";
const protectionIcon = "/resource/v1/cube-graph-editor-basic/images/protectionIcon.png";
const textLabelIcon = "/resource/v1/cube-graph-editor-basic/images/textLabelIcon.png";
const switchgearIcon = "/resource/v1/cube-graph-editor-basic/images/switchgearIcon.png";
const virtualMeterIcon = "/resource/v1/cube-graph-editor-basic/images/virtualMeterIcon.png";

/**
 * 电气元素库组件（定制左侧拓扑图配置栏）
 */
export const ElectricalElementLib = defineComponent({
  name: "ElectricalElementLib",
  props: {
    /**
     * 追加的元件（插入在「文本标签」之前，归入元件库 main 分组）
     */
    extraElements: {
      type: Array as PropType<ElectricalElementLibItem[]>,
      default: () => [],
    },
  },
  setup(props) {
    var keyword = ref("");

    var graph = inject("graph") as any;
    var { startDrag } = useDragDrop(graph as any);

    const baseElements: ElectricalElementLibItem[] = [
      {
        id: "transformer",
        name: "变压器",
        icon: transformerIcon,
        group: "main",
        definition: {
          id: "transformer",
          name: "变压器",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": transformerIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "变压器",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "switchgear",
        name: "开关柜",
        icon: switchgearIcon,
        group: "main",
        definition: {
          id: "switchgear",
          name: "开关柜",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": switchgearIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "开关柜",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "meter",
        name: "电表",
        icon: meterIcon,
        group: "main",
        definition: {
          id: "meter",
          name: "电表",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": meterIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "电表",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "sensor",
        name: "传感器",
        icon: sensorIcon,
        group: "main",
        definition: {
          id: "sensor",
          name: "传感器",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": sensorIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "传感器",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "distribution-cabinet",
        name: "配电柜",
        icon: distributionCabinetIcon,
        group: "main",
        definition: {
          id: "distribution-cabinet",
          name: "配电柜",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": distributionCabinetIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "配电柜",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "protection-device",
        name: "保护装置",
        icon: protectionIcon,
        group: "main",
        definition: {
          id: "protection-device",
          name: "保护装置",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": protectionIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "保护装置",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "power-point",
        name: "电源点",
        icon: powerPointIcon,
        group: "main",
        definition: {
          id: "power-point",
          name: "电源点",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": powerPointIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "电源点",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "capacitor-comp",
        name: "电容补偿",
        icon: capacitorCompIcon,
        group: "main",
        definition: {
          id: "capacitor-comp",
          name: "电容补偿",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": capacitorCompIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "电容补偿",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "t-joint",
        name: "T接点",
        icon: tJointIcon,
        group: "main",
        definition: {
          id: "t-joint",
          name: "T接点",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": tJointIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "T接点",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
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
                left: {
                  position: "left",
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
                right: {
                  position: "right",
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
                { id: "t-joint-top", group: "top" },
                { id: "t-joint-bottom", group: "bottom" },
                { id: "t-joint-left", group: "left" },
                { id: "t-joint-right", group: "right" },
              ],
            },
          },
        },
      },
      {
        id: "bus-bridge",
        name: "母线桥",
        icon: busBridgeIcon,
        group: "main",
        definition: {
          id: "bus-bridge",
          name: "母线桥",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": busBridgeIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "母线桥",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "virtual-meter",
        name: "虚拟计量",
        icon: virtualMeterIcon,
        group: "main",
        definition: {
          id: "virtual-meter",
          name: "虚拟计量",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": virtualMeterIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "虚拟计量",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "connector",
        name: "连接器",
        icon: connectorIcon,
        group: "main",
        definition: {
          id: "connector",
          name: "连接器",
          type: "node",
          shape: "electrical-icon-label-node",
          defaultConfig: {
            width: 230,
            height: 40,
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              icon: {
                "xlink:href": connectorIcon,
                x: 16,
                y: 10,
                width: 20,
                height: 20,
              },
              label: {
                text: "连接器",
                x: 110,
                y: 22,
                fill: "#333333",
                fontSize: 14,
              },
            },
          },
        },
      },
      {
        id: "text-label",
        name: "文本标签",
        icon: textLabelIcon,
        group: "other",
        definition: {
          id: "text-label",
          name: "文本标签",
          type: "node",
          shape: "rect",
          defaultConfig: {
            width: 230,
            height: 48,
            attrs: {
              // 文本标签：暂时隐藏边框和背景色
              // body: {
              //   fill: "#ffffff",
              //   stroke: "#5F95FF",
              //   strokeWidth: 1,
              //   rx: 4,
              //   ry: 4,
              // },
              body: {
                // 暂时隐藏文本标签背景与边框
                // fill: "#ffffff",
                // stroke: "#5F95FF",
                // strokeWidth: 1,
                fill: "transparent",
                stroke: "transparent",
                strokeWidth: 0,
                rx: 4,
                ry: 4,
              },
              label: {
                fill: "#333333",
                fontSize: 14,
                textAnchor: "middle",
                textVerticalAnchor: "middle",
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
                { id: "text-label-top", group: "top" },
                { id: "text-label-bottom", group: "bottom" },
              ],
            },
          },
        },
      },
    ];

    const elements = computed(() => {
      const extra = props.extraElements || [];
      if (extra.length === 0) {
        return baseElements;
      }
      const textIdx = baseElements.findIndex((x) => x.id === "text-label");
      if (textIdx === -1) {
        return [...baseElements, ...extra];
      }
      return [...baseElements.slice(0, textIdx), ...extra, ...baseElements.slice(textIdx)];
    });

    var handleDragStart = (element: ElementDefinition, event: DragEvent) => {
      startDrag(element, event);
    };

    // 点击生成节点：已注释，仅保留拖拽生成
    // var handleClickCreate = (item: { id: string; name: string; icon: string; group: "main" | "other"; definition: ElementDefinition }) => {
    //   if (!graph || !graph.value) {
    //     return;
    //   }
    //   var centerX = 200;
    //   var centerY = 120;
    //   // 文本标签：沿用默认配置（含端口），只改文字样式
    //   if (item.id === "text-label") {
    //     var baseConfig = (item.definition.defaultConfig || {}) as any;
    //     var baseAttrs = baseConfig.attrs || {};
    //     var textNode: any = {
    //       shape: item.definition.shape || "rect",
    //       x: centerX,
    //       y: centerY,
    //       width: baseConfig.width || 230,
    //       height: baseConfig.height || 40,
    //       markup: [
    //         { tagName: "rect", selector: "body" },
    //         { tagName: "rect", selector: "labelBox" },
    //         { tagName: "text", selector: "label" },
    //       ],
    //       attrs: {
    //         body: {
    //           ...baseAttrs.body,
    //         },
    //         labelBox: {
    //           ref: "body",
    //           refX: 8,
    //           refY: 4,
    //           refWidth: -16,
    //           refHeight: -8,
    //           fill: "transparent",
    //           stroke: "transparent",
    //         },
    //         label: {
    //           ref: "labelBox",
    //           refX: "50%",
    //           refY: "50%",
    //           fill: "#333333",
    //           fontSize: 14,
    //           lineHeight: 16,
    //           textAnchor: "middle",
    //           textVerticalAnchor: "middle",
    //           textWrap: {
    //             text: item.name,
    //             width: -16,
    //             height: -8,
    //             ellipsis: false,
    //             breakWord: true,
    //           },
    //         },
    //       },
    //       ports: baseConfig.ports,
    //       data: {
    //         elementId: item.id,
    //         nodeName: item.name,
    //         nodeType: item.name,
    //       },
    //     };
    //     var createdTextNode = graph.value.addNode(textNode);
    //     if (createdTextNode) {
    //       if ((createdTextNode as any).setLabel) {
    //         (createdTextNode as any).setLabel(item.name);
    //       }
    //       if (typeof (createdTextNode as any).attr === "function") {
    //         (createdTextNode as any).attr("label/textWrap", {
    //           text: item.name,
    //           width: -16,
    //           height: -8,
    //           ellipsis: false,
    //           breakWord: true,
    //         });
    //         (createdTextNode as any).attr("label/text", item.name);
    //       }
    //       fitNodeLabel(createdTextNode);
    //     }
    //     return;
    //   }
    //
    //   // 其他元件：使用显式 markup 创建，保证边框/背景/图标/文字都直接可见。
    //   var iconNode: any = {
    //     shape: "rect",
    //     x: centerX,
    //     y: centerY,
    //     width: 230,
    //     height: 40,
    //     markup: [
    //       { tagName: "rect", selector: "body" },
    //       { tagName: "image", selector: "icon" },
    //       { tagName: "text", selector: "label" },
    //     ],
    //     attrs: {
    //       body: {
    //         fill: "#ffffff",
    //         stroke: "#5F95FF",
    //         strokeWidth: 1,
    //         rx: 4,
    //         ry: 4,
    //       },
    //       icon: {
    //         "xlink:href": item.icon,
    //         x: 16,
    //         y: 10,
    //         width: 20,
    //         height: 20,
    //         preserveAspectRatio: "xMidYMid meet",
    //       },
    //       label: {
    //         fill: "#333333",
    //         fontSize: 14,
    //         text: item.name,
    //         refX: 0,
    //         refY: 0,
    //         x: 133,
    //         y: 20,
    //         textAnchor: "middle",
    //         textVerticalAnchor: "middle",
    //       },
    //     },
    //     ports: {
    //       groups: {
    //         top: {
    //           position: "top",
    //           attrs: {
    //             circle: {
    //               r: 4,
    //               magnet: true,
    //               stroke: "#C2C8D5",
    //               strokeWidth: 1,
    //               fill: "#fff",
    //             },
    //           },
    //         },
    //         bottom: {
    //           position: "bottom",
    //           attrs: {
    //             circle: {
    //               r: 4,
    //               magnet: true,
    //               stroke: "#C2C8D5",
    //               strokeWidth: 1,
    //               fill: "#fff",
    //             },
    //           },
    //         },
    //       },
    //       items: [
    //         { id: item.id + "-top", group: "top" },
    //         { id: item.id + "-bottom", group: "bottom" },
    //       ],
    //     },
    //     data: {
    //       elementId: item.id,
    //       nodeName: item.name,
    //       nodeType: item.name,
    //     },
    //   };
    //   var createdIconNode = graph.value.addNode(iconNode);
    //   if (createdIconNode && (createdIconNode as any).setLabel) {
    //     (createdIconNode as any).setLabel("");
    //   }
    //   if (createdIconNode) {
    //     fitNodeLabel(createdIconNode);
    //   }
    // };

    return () => {
      var value = keyword.value.trim();
      var lower = value.toLowerCase();
      var list = elements.value;
      var filtered = value ? list.filter((item) => item.name.toLowerCase().includes(lower)) : list;

      var mainItems = filtered.filter((item) => item.group === "main");
      var otherItems = filtered.filter((item) => item.group === "other");

      return (
        <div class="electrical-element-lib">
          <div class="electrical-element-lib__header">拓扑图配置</div>
          <div class="electrical-element-lib__search">
            <input type="text" v-model={keyword.value} placeholder="品类名称" class="electrical-element-lib__search-input" />
            <span class="electrical-element-lib__search-icon"></span>
          </div>

          <div class="electrical-element-lib__section">
            <div class="electrical-element-lib__section-title">元件库</div>
            <div class="electrical-element-lib__grid">
              {mainItems.map((item) => (
                <div
                  key={item.id}
                  class="electrical-element-lib__item"
                  draggable={true}
                  onDragstart={(e: DragEvent) => handleDragStart(item.definition, e)}
                >
                  <div
                    class={
                      item.id === "text-label"
                        ? "electrical-element-lib__item-icon electrical-element-lib__item-icon--text-label"
                        : "electrical-element-lib__item-icon"
                    }
                  >
                    <img src={item.icon} alt={item.name} />
                  </div>
                  <div class="electrical-element-lib__item-label">{item.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div class="electrical-element-lib__section">
            <div class="electrical-element-lib__section-title">其他</div>
            <div class="electrical-element-lib__grid electrical-element-lib__grid--other">
              {otherItems.map((item) => (
                <div
                  key={item.id}
                  class="electrical-element-lib__item"
                  draggable={true}
                  onDragstart={(e: DragEvent) => handleDragStart(item.definition, e)}
                >
                  <div
                    class={
                      item.id === "text-label"
                        ? "electrical-element-lib__item-icon electrical-element-lib__item-icon--text-label-text"
                        : "electrical-element-lib__item-icon"
                    }
                  >
                    <img class={"electrical-element-lib__item-icon-img"} src={item.icon} alt={item.name} />
                  </div>
                  <div class="electrical-element-lib__item-label">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };
  },
});

export default ElectricalElementLib;
