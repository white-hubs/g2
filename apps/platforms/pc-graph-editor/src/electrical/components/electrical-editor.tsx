import type { Graph } from "@antv/x6";
import { defineComponent, shallowRef, ref, type PropType } from "vue";

import { Editor, type EditorOptions } from "../../core";
import { transformToGraph, transformFromGraph, generateGraphFromNodeTree } from "../transforms";
import type { ElectricalNode, ElectricalData, DeviceBinding } from "../types";
import { fitNodeLabel } from "../utils/fit-node-label";
import { ElectricalEdgePanel } from "./electrical-edge-panel";
import { ElectricalElementLib, type ElectricalElementLibItem } from "./electrical-element-lib";
import { ElectricalPropertyPanel } from "./electrical-property-panel";
// 导入节点定义和元素，这会自动注册它们到 X6
import "../nodes";
import "../elements"; // 这会注册 electrical-connector 和边
import "./electrical-editor.css";

/**
 * 电气编辑器主组件
 *
 * 基于核心编辑器扩展的业务编辑器
 */
export const ElectricalEditor = defineComponent({
  name: "ElectricalEditor",
  props: {
    /**
     * 编辑器配置
     */
    options: {
      type: Object as PropType<EditorOptions>,
      default: () => ({}),
    },
    /**
     * 电气节点数据（支持多根）
     */
    nodes: {
      type: Array as PropType<ElectricalNode[]>,
      default: () => [],
    },
    /**
     * 初始电气数据
     */
    initialData: {
      type: Object as PropType<ElectricalData>,
      default: null,
    },
    /**
     * 是否只读（禁用节点/连线编辑，仅查看）
     */
    readonly: {
      type: Boolean,
      default: false,
    },
    /**
     * 是否启用线损右侧面板（线损管理专用）
     */
    lineLossPanel: {
      type: Boolean,
      default: false,
    },
    /**
     * 自定义右侧面板渲染函数（优先级最高）
     * 由外部应用根据当前选中状态自行渲染右侧内容
     */
    customRightPanel: {
      type: Function as PropType<(selection: { all: any[]; edges: any[]; nodes: any[] }) => any>,
      default: undefined,
    },
    /**
     * 右侧面板宽度（px）
     */
    rightPanelWidth: {
      type: Number,
      default: undefined,
    },
    /**
     * 控制右侧面板是否展示（返回 true 展示，false 隐藏）
     */
    showRightPanel: {
      type: Function as PropType<(selection: { all: any[]; edges: any[]; nodes: any[] }) => boolean>,
      default: undefined,
    },
    /**
     * 左侧元件库追加项（如图编辑器应用专用元件）
     */
    extraElements: {
      type: Array as PropType<ElectricalElementLibItem[]>,
      default: () => [],
    },
  },
  emits: {
    /**
     * 编辑器就绪
     */
    ready: (graph: Graph) => true,
    /**
     * 数据变化
     */
    change: (data: ElectricalData) => true,
    /**
     * 节点选择
     */
    "node-select": (node: ElectricalNode) => true,
    /**
     * 设备绑定
     */
    "device-bind": (cellId: string, deviceBinding: DeviceBinding) => true,
    /**
     * 边选择（用于线损管理等场景）
     */
    "edge-select": (edge: any | null) => true,
  },
  setup(props, { emit, expose }) {
    const editorRef = ref<InstanceType<typeof Editor> | null>(null);
    const graph = shallowRef<Graph | null>(null);
    const selectedCells = ref<any[]>([]);
    const isImporting = ref(false);

    const restoreImportedNodeLabels = (g: Graph, nodes: any[]): void => {
      nodes.forEach((node: any) => {
        if (!node || !node.isNode || !node.isNode()) {
          return;
        }
        let data = node.getData?.() || {};
        let isTextLabel = data.elementId === "text-label" || data.nodeType === "text-label" || data.nodeType === "文本标签";

        if (isTextLabel) {
          let attrs = { ...(node.getAttrs?.() || {}) } as Record<string, unknown>;
          const textBlock = attrs.text && typeof attrs.text === "object" ? (attrs.text as Record<string, unknown>) : null;
          const inheritFont =
            textBlock && typeof textBlock.fontFamily === "string" && textBlock.fontFamily.length > 0 ? textBlock.fontFamily : undefined;
          // 后端 webStyle 常带 attrs.text，但文本标签真实文案在 label；去掉以免与 X6 默认 text 桩混淆
          delete attrs.text;
          let label = (attrs as any).label || {};
          let text = data.nodeName || label.textWrap?.text || label.text || "文本标签";
          node.setData?.(
            {
              ...data,
              elementId: "text-label",
              nodeType: data.nodeType || "文本标签",
              nodeName: text,
            },
            { overwrite: true },
          );
          const nextTextWrap = {
            ...(label.textWrap || {}),
            text,
            width: -2,
            height: -2,
            ellipsis: false,
            breakWord: true,
          };
          node.setAttrs?.({
            ...attrs,
            body: {
              ...((attrs as any).body || {}),
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
              ...((attrs as any).labelBox || {}),
            },
            label: {
              ...label,
              ref: "labelBox",
              refX: "50%",
              refY: "50%",
              text,
              fontFamily:
                (typeof label.fontFamily === "string" && label.fontFamily.length > 0 ? label.fontFamily : undefined) ||
                inheritFont ||
                "Arial, helvetica, sans-serif",
              textWrap: nextTextWrap,
              textAnchor: "middle",
              textVerticalAnchor: "middle",
            },
          });
          if (typeof node.attr === "function") {
            node.attr("label/textWrap", nextTextWrap);
            node.attr("label/text", text);
          }
        }

        fitNodeLabel(node);

        if (isTextLabel) {
          const view = (g as any).findViewByCell?.(node);
          if (view && typeof view.update === "function") {
            view.update();
          }
        }
      });
    };

    /**
     * 导入/初始加载后：多帧重跑标签与 fit，字体就绪后再缩放；并轻推边端点以触发连线在节点尺寸稳定后重算（文本标签 resize 后尤需）
     */
    const nudgeEdgeTerminals = (g: Graph): void => {
      const edges = g.getEdges?.() || [];
      edges.forEach((edge: any) => {
        try {
          const s = edge.getSource?.();
          const t = edge.getTarget?.();
          if (s) {
            edge.setSource(s);
          }
          if (t) {
            edge.setTarget(t);
          }
        } catch (_ignore) {
          // ignore
        }
      });
    };

    const schedulePostImportLayout = (g: Graph, opts: { zoomToFit: boolean; onDone?: () => void }): void => {
      const zoomOpts = { padding: 50, maxScale: 1 as const };
      const run = (): void => {
        const list = g.getNodes?.() || [];
        restoreImportedNodeLabels(g, list);
        nudgeEdgeTerminals(g);
      };
      run();
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(() => {
          run();
          const finish = (): void => {
            run();
            // 导入/zoom 前同步容器尺寸，避免 clientToLocal 与可视区域不一致（嵌套布局、异步字体后尤需）
            const el = g.container as HTMLElement | undefined;
            const viewport = (el?.closest(".x6-graph-scroller") as HTMLElement | null) ?? el?.parentElement ?? el;
            if (viewport && viewport.clientWidth > 0 && viewport.clientHeight > 0 && typeof g.resize === "function") {
              g.resize(viewport.clientWidth, viewport.clientHeight);
            }
            if (opts.zoomToFit) {
              g.zoomToFit(zoomOpts);
            }
            opts.onDone?.();
          };
          if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
              requestAnimationFrame(finish);
            });
          } else {
            setTimeout(finish, 0);
          }
        });
      });
    };

    // 处理 Graph 就绪
    const handleGraphReady = (graphInstance: Graph) => {
      graph.value = graphInstance;

      const getNodeName = (node: any) => {
        if (!node) return "";
        let data = node.getData?.() || {};
        if (typeof data.nodeName === "string" && data.nodeName) {
          return data.nodeName;
        }
        let attrs = node.getAttrs?.() || {};
        let label = (attrs as any).label || {};
        if (label.textWrap && typeof label.textWrap.text === "string") {
          return label.textWrap.text;
        }
        if (typeof label.text === "string") {
          return label.text;
        }
        return "";
      };

      const syncParentNodes = (nodeId: string) => {
        if (!nodeId) return;
        let node = graphInstance.getCellById(nodeId);
        if (!node || !node.isNode || !node.isNode()) {
          return;
        }
        let incomingEdges = graphInstance.getIncomingEdges(node as any) || [];
        let parentNames: string[] = [];
        let parentIds: string[] = [];
        incomingEdges.forEach((edge: any) => {
          let fromId = edge.getSourceCellId?.() || edge.getSource?.()?.cell || edge.getData?.()?.from;
          if (!fromId) return;
          parentIds.push(fromId);
          let parentNode = graphInstance.getCellById(fromId);
          parentNames.push(getNodeName(parentNode) || fromId);
        });
        let nextParent = parentNames.join("、");
        let existing = node.getData?.() || {};
        node.setData?.({
          ...existing,
          parentNode: nextParent,
          parentNodeIds: parentIds,
        });
      };

      const applyEdgeStyleAndData = (edge: any) => {
        if (!edge || !edge.isEdge || !edge.isEdge()) {
          return;
        }
        let sourceCellId = (edge.getSourceCellId && edge.getSourceCellId()) || edge.getSource?.()?.cell;
        let targetCellId = (edge.getTargetCellId && edge.getTargetCellId()) || edge.getTarget?.()?.cell;
        let sourcePort = edge.getSource?.()?.port;
        let targetPort = edge.getTarget?.()?.port;

        let existingData = edge.getData?.() || {};
        edge.setData?.({
          ...existingData,
          from: sourceCellId,
          to: targetCellId,
          fromPort: sourcePort,
          toPort: targetPort,
        });

        let attrs = edge.getAttrs?.() || {};
        let line = (attrs as any).line || {};
        let stroke = line.stroke || "#5F95FF";
        let strokeWidth = line.strokeWidth || 3;
        edge.setAttrs?.({
          ...attrs,
          line: {
            ...line,
            stroke,
            strokeWidth,
            strokeLinejoin: "round",
            targetMarker: {
              name: "block",
              width: 12,
              height: 8,
            },
          },
        });

        if (targetCellId) {
          syncParentNodes(targetCellId);
        }
      };

      // 如果有初始数据，加载到画布
      if (props.initialData) {
        const { nodes, edges } = transformToGraph(props.initialData);
        graphInstance.fromJSON({ cells: [...nodes, ...edges] });
        requestAnimationFrame(() => {
          schedulePostImportLayout(graphInstance, { zoomToFit: true });
        });
      } else if (props.nodes && props.nodes.length > 0) {
        // 从节点树生成画布图形
        const { nodes, edges } = generateGraphFromNodeTree(props.nodes);
        graphInstance.fromJSON({ cells: [...nodes, ...edges] });
        requestAnimationFrame(() => {
          schedulePostImportLayout(graphInstance, { zoomToFit: true });
        });
      }

      // 监听选择变化
      graphInstance.on("selection:changed", () => {
        selectedCells.value = (graphInstance as any).getSelectedCells?.() || [];
        // const cells = (graphInstance as any).getSelectedCells?.() || [];
        // selectedCells.value = cells;
        // 线损管理：当选中边时，向外抛出第一个边
        emit("edge-select", selectedCells.value);
      });

      // 监听图变化
      graphInstance.on("node:added", ({ node }: any) => {
        if (isImporting.value) {
          return;
        }
        // 清理外部 label，只保留节点内部文本
        let data = node?.getData?.() || {};
        let isTextLabelNode = data.elementId === "text-label" || data.nodeType === "text-label" || data.nodeType === "文本标签";
        if (node && node.setLabel && !isTextLabelNode) {
          node.setLabel("");
        }
        // 文字超长时：自动增高节点显示多行（不省略）
        if (node) {
          fitNodeLabel(node);
        }
        emitChange();
      });
      graphInstance.on("edge:added", ({ edge }: any) => {
        if (isImporting.value) {
          return;
        }
        applyEdgeStyleAndData(edge);
        emitChange();
      });
      graphInstance.on("edge:connected", ({ edge }: any) => {
        applyEdgeStyleAndData(edge);
        emitChange();
      });
      graphInstance.on("edge:removed", ({ edge }: any) => {
        // 边删除后，重新同步其目标节点的上一级节点
        let toId = edge?.getTargetCellId?.() || edge?.getTarget?.()?.cell || edge?.getData?.()?.to;
        if (toId) {
          syncParentNodes(toId);
        }
        emitChange();
      });
      graphInstance.on("node:removed", () => {
        if (isImporting.value) {
          return;
        }
        emitChange();
      });
      graphInstance.on("node:changed", () => {
        if (isImporting.value) {
          return;
        }
        emitChange();
      });
      graphInstance.on("edge:changed", () => {
        if (isImporting.value) {
          return;
        }
        emitChange();
      });

      emit("ready", graphInstance);
    };

    // 触发数据变化事件
    const emitChange = () => {
      if (graph.value) {
        const data = transformFromGraph(graph.value);
        emit("change", data);
      }
    };

    // 处理节点选择
    const handleNodeSelect = (node: ElectricalNode) => {
      emit("node-select", node);
    };

    // 处理属性更新
    const handlePropertyUpdate = (cellId: string, property: string, value: any) => {
      // 属性已经在 PropertyPanel 组件中直接更新了
      emitChange();
    };

    // 处理设备绑定
    const handleDeviceBind = (cellId: string, deviceBinding: DeviceBinding) => {
      emit("device-bind", cellId, deviceBinding);
      emitChange();
    };

    // 导出数据
    const exportData = (): ElectricalData | null => {
      if (!graph.value) return null;
      return transformFromGraph(graph.value);
    };

    // 导入数据：按导出的图数据原样恢复，避免 addNode/addEdge 二次创建导致走线和文本布局发生偏移
    const importData = (data: ElectricalData, options: { zoomToFit?: boolean } = {}): boolean => {
      if (!graph.value) return false;

      const { nodes, edges } = transformToGraph(data);
      isImporting.value = true;
      graph.value.clearCells();
      graph.value.fromJSON({ cells: [...nodes, ...edges] });
      requestAnimationFrame(() => {
        schedulePostImportLayout(graph.value!, {
          zoomToFit: options.zoomToFit !== false,
          onDone: () => {
            isImporting.value = false;
            emitChange();
          },
        });
      });
      return true;
    };

    // 清空画布
    const clear = () => {
      if (graph.value) {
        graph.value.clearCells();
      }
    };

    // 暴露方法
    expose({
      graph,
      exportData,
      importData,
      clear,
    });

    return () => (
      <div class="electrical-editor">
        <Editor
          ref={editorRef}
          options={props.options}
          showLeftPanel={!props.readonly}
          showRightPanel={
            props.showRightPanel
              ? props.showRightPanel({
                  all: selectedCells.value,
                  edges: selectedCells.value.filter((c: any) => c?.isEdge?.()),
                  nodes: selectedCells.value.filter((c: any) => c?.isNode?.()),
                })
              : true
          }
          rightPanelWidth={typeof props.rightPanelWidth === "number" ? props.rightPanelWidth : undefined}
          onReady={handleGraphReady}
        >
          {/* 左侧面板 */}
          {{
            "left-panel": () => (
              <div class="electrical-editor__left-panel">
                <ElectricalElementLib extraElements={props.extraElements} />
              </div>
            ),

            /* 右侧面板 */
            "right-panel": (selection: any) => {
              const payload = {
                all: selection?.all || selectedCells.value,
                edges: selection?.edges || selectedCells.value.filter((c: any) => c?.isEdge?.()),
                nodes: selection?.nodes || selectedCells.value.filter((c: any) => c?.isNode?.()),
              };

              // 1. 外部自定义优先
              if (props.customRightPanel) {
                return props.customRightPanel(payload);
              }

              // 2. 选中连线时显示连线面板
              if (payload.edges.length > 0) {
                return <ElectricalEdgePanel selectedCells={payload.all} readonly={props.readonly} />;
              }

              // 3. 默认节点属性面板
              return (
                <ElectricalPropertyPanel
                  selectedCells={payload.all}
                  readonly={props.readonly}
                  onUpdate:property={handlePropertyUpdate}
                  onBind:device={handleDeviceBind}
                />
              );
            },
          }}
        </Editor>
      </div>
    );
  },
});

export default ElectricalEditor;
