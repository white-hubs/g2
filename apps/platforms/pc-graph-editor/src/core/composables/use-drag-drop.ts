import type { Graph } from "@antv/x6";
import { type Ref } from "vue";

import type { ElementDefinition } from "../types";

/**
 * 拖拽功能
 *
 * @param graph - Graph 实例的 ref
 * @returns 拖拽相关方法
 */
export function useDragDrop(graph: Ref<Graph | null>) {
  const syncNodeLabel = (node: any, text: string) => {
    if (!node) {
      return;
    }

    var attrs = node.getAttrs?.() || {};
    var label = (attrs as any).label || {};
    var hasLabelBox = !!(attrs as any).labelBox;
    var hasIcon = !!(attrs as any).icon;
    var nextLabel: any = {
      ...label,
      text,
      textWrap: {
        ...(label.textWrap || {}),
        text,
        width: -2,
        height: -2,
        ellipsis: false,
        breakWord: true,
      },
      textAnchor: "middle",
      textVerticalAnchor: "middle",
    };

    if (hasIcon) {
      delete nextLabel.textWrap;
      delete nextLabel.ref;
      nextLabel.refX = 0;
      nextLabel.refY = 0;
      nextLabel.x = 133;
      nextLabel.y = 20;
      nextLabel.style = {
        ...(nextLabel.style || {}),
        whiteSpace: "pre",
      };
    } else if (hasLabelBox) {
      nextLabel.ref = "labelBox";
      nextLabel.refX = "50%";
      nextLabel.refY = "50%";
    } else {
      nextLabel.ref = "body";
      nextLabel.refX = "50%";
      nextLabel.refY = "50%";
    }

    if (!hasIcon) {
      delete nextLabel.x;
      delete nextLabel.y;
    }

    node.setAttrs?.({
      ...attrs,
      label: nextLabel,
    });

    if (typeof node.attr === "function") {
      if (nextLabel.textWrap) {
        node.attr("label/textWrap", nextLabel.textWrap);
      }
      node.attr("label/text", text);
    }

    var size = node.getSize?.();
    if (size && typeof node.resize === "function") {
      node.resize(size.width, size.height);
    }
  };

  /**
   * 开始拖拽
   */
  const startDrag = (element: ElementDefinition, event: DragEvent) => {
    if (!event.dataTransfer) return;

    // 设置拖拽数据
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-graph-element", JSON.stringify(element));

    // 添加视觉反馈 - 创建拖拽图像
    const dragImage = document.createElement("div");
    dragImage.className = "graph-drag-image";
    dragImage.textContent = element.name;
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      padding: 8px 12px;
      background: #1890ff;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);

    // 延迟删除拖拽图像
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    // 从元件库拖出时，在 document 捕获阶段统一 cancel dragover，避免：
    // - 下方「空白」未命中 X6 子节点时，子层未持续 preventDefault 导致无法 drop
    // - flex 布局下画布未撑满时，指针落在容器外导致 drop 目标无效
    const onDocDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };
    document.addEventListener("dragover", onDocDragOver, true);

    const cleanupDocDragOver = () => {
      document.removeEventListener("dragover", onDocDragOver, true);
    };

    document.addEventListener("dragend", cleanupDocDragOver, { capture: true, once: true });
    document.addEventListener("drop", cleanupDocDragOver, { capture: true, once: true });
  };

  /**
   * 处理拖拽进入
   */
  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  /**
   * 处理拖拽悬停
   */
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  /**
   * 处理拖拽离开
   */
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
  };

  /**
   * 处理放置
   */
  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    if (!graph.value || !event.dataTransfer) return;

    try {
      // 获取拖拽的元素数据
      const elementData = event.dataTransfer.getData("application/x-graph-element");
      if (!elementData) return;

      const element: ElementDefinition = JSON.parse(elementData);

      // 转换为画布坐标（client 坐标 -> local 坐标）
      const localPoint = graph.value.clientToLocal({
        x: event.clientX,
        y: event.clientY,
      });

      // 根据元素类型创建节点或连线
      if (element.type === "node") {
        // 为了避免 shape 未注册导致样式丢失，这里统一用显式 markup 创建节点
        const defaultConfig: any = element.defaultConfig || {};
        const defaultAttrs: any = defaultConfig.attrs || {};
        const iconHref = defaultAttrs.icon && (defaultAttrs.icon["xlink:href"] || defaultAttrs.icon.href);

        let nodeConfig: any = null;

        // 文本标签：沿用默认 ports/边框，只改文字布局为 textWrap
        if (element.id === "text-label") {
          nodeConfig = {
            shape: element.shape || "rect",
            x: localPoint.x,
            y: localPoint.y,
            width: defaultConfig.width || 230,
            height: defaultConfig.height || 40,
            markup: [
              { tagName: "rect", selector: "body" },
              { tagName: "rect", selector: "labelBox" },
              { tagName: "text", selector: "label" },
            ],
            attrs: {
              // 文本标签：暂时隐藏边框和背景色，仅保留文字
              // body: { ...(defaultAttrs.body || {}) },
              body: {
                ...(defaultAttrs.body || {}),
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
                ...(defaultAttrs.label || {}),
                ref: "labelBox",
                refX: "50%",
                refY: "50%",
                fill: "#333333",
                fontSize: 14,
                lineHeight: 16,
                textAnchor: "middle",
                textVerticalAnchor: "middle",
                textWrap: {
                  text: element.name,
                  width: -16,
                  height: -8,
                  ellipsis: false,
                  breakWord: true,
                },
              },
            },
            ports: defaultConfig.ports,
            data: {
              elementId: element.id,
              nodeName: element.name,
              nodeType: element.name,
              ...(defaultConfig.data || {}),
            },
          };
        } else {
          // 图标节点：使用显式 markup 创建，边框/背景/图标/文字全部直接写出，
          // 避免 X6 3.x 下自定义 shape 的默认 attrs 合并不稳定。
          nodeConfig = {
            shape: "rect",
            x: localPoint.x,
            y: localPoint.y,
            width: defaultConfig.width || 230,
            height: defaultConfig.height || 40,
            markup: [
              { tagName: "rect", selector: "body" },
              { tagName: "image", selector: "icon" },
              { tagName: "text", selector: "label" },
            ],
            attrs: {
              body: {
                fill: "#ffffff",
                stroke: "#5F95FF",
                strokeWidth: 1,
                rx: 4,
                ry: 4,
                ...(defaultAttrs.body || {}),
              },
              icon: {
                ...(defaultAttrs.icon || {}),
                "xlink:href": iconHref || "",
                x: 16,
                y: 10,
                width: 20,
                height: 20,
                preserveAspectRatio: "xMidYMid meet",
              },
              label: {
                ...(defaultAttrs.label || {}),
                fill: "#333333",
                fontSize: 14,
                text: element.name,
                refX: 0,
                refY: 0,
                x: 133,
                y: 20,
                textAnchor: "middle",
                textVerticalAnchor: "middle",
              },
            },
            ports:
              defaultConfig.ports ||
              ({
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
                  { id: element.id + "-top", group: "top" },
                  { id: element.id + "-bottom", group: "bottom" },
                ],
              } as any),
            data: {
              elementId: element.id,
              nodeName: element.name,
              nodeType: element.name,
              ...(defaultConfig.data || {}),
            },
          };
        }

        const node = graph.value.addNode(nodeConfig);
        if (node && (node as any).setLabel) {
          (node as any).setLabel(element.name);
        }
        syncNodeLabel(node, element.name);

        // 选中新创建的节点
        graph.value.select(node);
      }
    } catch (error) {}
  };

  /**
   * 从节点创建可拖拽元素
   */
  const makeDraggable = (elementRef: Ref<HTMLElement | null>, element: ElementDefinition) => {
    if (!elementRef.value) return;

    elementRef.value.setAttribute("draggable", "true");

    elementRef.value.addEventListener("dragstart", (e) => {
      startDrag(element, e as DragEvent);
    });
  };

  return {
    startDrag,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    makeDraggable,
  };
}
