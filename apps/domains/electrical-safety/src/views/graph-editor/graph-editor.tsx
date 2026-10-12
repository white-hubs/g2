import type { Graph } from "@antv/x6";
import {
  type ElectricalData,
  ElectricalEditor,
  type ElectricalElementLibItem,
  type ElectricalNode,
  provideGraphDeviceClient,
  replaceData,
} from "@g2-platform/pc-graph-editor";
import { Button, Modal, PageLayout, Space, message } from "@g2-platform/pc-ui";
import { defineComponent, nextTick, ref } from "vue";

import { getElectricalSafetyClient } from "@/domain-context";

import "../graph-editor/graph-editor.css";

const componentIcon = "/resource/v1/cube-graph-editor-basic/images/component.png";
const electricIcon = "/resource/v1/cube-graph-editor-basic/images/electric.png";

function buildIconLabelLibItem(id: string, name: string, iconUrl: string): ElectricalElementLibItem {
  return {
    id,
    name,
    icon: iconUrl,
    group: "main",
    definition: {
      id,
      name,
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
            "xlink:href": iconUrl,
            x: 16,
            y: 10,
            width: 20,
            height: 20,
          },
          label: {
            text: name,
            x: 110,
            y: 22,
            fill: "#333333",
            fontSize: 14,
          },
        },
      },
    },
  };
}

const graphEditorExtraElements: ElectricalElementLibItem[] = [
  buildIconLabelLibItem("component", "通用元件", componentIcon),
  buildIconLabelLibItem("electric", "电网", electricIcon),
];

type ElectricalEditorHandle = {
  importData(data: ElectricalData, options?: { zoomToFit?: boolean }): boolean;
  exportData(): ElectricalData | null;
  clear(): void;
};

export const GraphEditor = defineComponent({
  name: "GraphEditor",
  setup() {
    provideGraphDeviceClient({
      getDeviceArea: () => getElectricalSafetyClient().listAllArea(),
      getApplicationDevice: async (query) => {
        const res = await getElectricalSafetyClient().getSecurityDevices(query);
        return { ...res, records: res.records.map((r) => ({ ...r, deviceId: r.deviceId ?? r.id, deviceName: r.deviceName ?? r.name })) };
      },
    });

    const editorRef = ref<ElectricalEditorHandle | null>(null);
    const graphRef = ref<Graph | null>(null);
    const electricalNodes = ref<ElectricalNode[]>([]);
    const hasLoadedDefault = ref(false);

    const loadDefaultGraph = async (): Promise<void> => {
      try {
        const payload = await getElectricalSafetyClient().loadGraph();
        const { electricalData } = replaceData(payload);
        // ready 事件来自编辑器内部 Canvas；等待父组件 ref 完成本轮提交后再导入，
        // 避免首次进入时数据已返回但 ref 尚未可用，随后又被误标为“已加载”。
        await nextTick();
        const imported = editorRef.value?.importData(electricalData, { zoomToFit: true }) ?? false;
        if (imported) {
          hasLoadedDefault.value = true;
        }
      } catch {
        message.error("默认数据加载失败");
      }
    };

    const handleEditorReady = (graph: Graph): void => {
      graphRef.value = graph;
      if (!hasLoadedDefault.value) {
        loadDefaultGraph();
      }
    };

    const handleDataChange = (_data: ElectricalData): void => {};

    /**
     * 保存：将导出的 ElectricalData 拆分为节点列表和连线列表，
     * 再连同原始 ElectricalData 一起导出为一个 JSON 对象
     *
     * 节点列表字段：
     * - id
     * - name
     * - type
     * - deviceIds
     * - childrenIds
     * - location
     *
     * 连线列表字段：
     * - id
     * - lineName
     * - fromNodeId
     * - toNodeId
     */
    const handleSave = async (): Promise<void> => {
      if (!editorRef.value) {
        return;
      }

      const data = editorRef.value.exportData() as ElectricalData | null;
      if (!data) {
        message.warning("暂无数据可保存");
        return;
      }

      const graphNodes = (data.graph && Array.isArray(data.graph.nodes) ? data.graph.nodes : []) as unknown[];
      const graphEdges = (data.graph && Array.isArray(data.graph.edges) ? data.graph.edges : []) as unknown[];

      const nodeIdMap = new Map<string, string>();
      const edgeIdMap = new Map<string, string>();

      const isBusinessId = (id: string): boolean => /^\d+$/.test(id);

      const allNodeIds = graphNodes
        .map((n) => (n as { id?: string })?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const allEdgeIds = graphEdges
        .map((e) => (e as { id?: string })?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      // 已经是业务 ID（纯数字）的，直接映射为自身；只有临时 ID 才需要向后端申请新 ID
      allNodeIds.forEach((id) => {
        if (isBusinessId(id)) {
          nodeIdMap.set(id, id);
        }
      });
      allEdgeIds.forEach((id) => {
        if (isBusinessId(id)) {
          edgeIdMap.set(id, id);
        }
      });

      const tempNodeIds = allNodeIds.filter((id) => !isBusinessId(id));
      const tempEdgeIds = allEdgeIds.filter((id) => !isBusinessId(id));

      const total = tempNodeIds.length + tempEdgeIds.length;
      if (total > 0) {
        const ids = await getElectricalSafetyClient().getNewId(total);
        const nodeIds = ids.slice(0, tempNodeIds.length).map((v) => String(v));
        const edgeIds = ids.slice(tempNodeIds.length).map((v) => String(v));

        tempNodeIds.forEach((oldId, index) => {
          nodeIdMap.set(oldId, nodeIds[index] || oldId);
        });
        tempEdgeIds.forEach((oldId, index) => {
          edgeIdMap.set(oldId, edgeIds[index] || oldId);
        });
      }

      const replacePortId = (portId: unknown, oldNodeId: string, newNodeId: string): unknown => {
        if (typeof portId !== "string") {
          return portId;
        }
        const prefix = `${oldNodeId}-`;
        if (portId.startsWith(prefix)) {
          return `${newNodeId}-${portId.slice(prefix.length)}`;
        }
        return portId;
      };

      const replaceGraphNode = (raw: unknown): unknown => {
        const cloned = JSON.parse(JSON.stringify(raw)) as {
          id?: string;
          position?: { x?: number; y?: number };
          x?: number;
          y?: number;
          ports?: { items?: { id?: string; [key: string]: unknown }[] };
          data?: Record<string, unknown>;
          [key: string]: unknown;
        };
        if (!cloned || !cloned.id) {
          return cloned;
        }

        const oldId = cloned.id;
        const newId = nodeIdMap.get(oldId) || oldId;
        cloned.id = newId;

        if (cloned.ports && Array.isArray(cloned.ports.items)) {
          cloned.ports.items = cloned.ports.items.map((item) => {
            if (!item) {
              return item;
            }
            return {
              ...item,
              id: typeof item.id === "string" ? (replacePortId(item.id, oldId, newId) as string) : item.id,
            };
          });
        }
        return cloned;
      };

      const replaceGraphEdge = (raw: unknown): unknown => {
        const cloned = JSON.parse(JSON.stringify(raw)) as {
          id?: string;
          source?: string | { cell?: string; port?: unknown };
          target?: string | { cell?: string; port?: unknown };
          data?: { from?: string; to?: string; fromPort?: unknown; toPort?: unknown; [key: string]: unknown };
          [key: string]: unknown;
        };
        if (!cloned || !cloned.id) {
          return cloned;
        }

        const oldEdgeId = cloned.id;
        const newEdgeId = edgeIdMap.get(oldEdgeId) || oldEdgeId;
        cloned.id = newEdgeId;

        const getCellId = (t: unknown): string => {
          if (!t) {
            return "";
          }
          if (typeof t === "string") {
            return t;
          }
          const obj = t as { cell?: string };
          return typeof obj.cell === "string" ? obj.cell : "";
        };

        const nextSourceCell = (() => {
          const old = getCellId(cloned.source);
          return old ? nodeIdMap.get(old) || old : old;
        })();
        const nextTargetCell = (() => {
          const old = getCellId(cloned.target);
          return old ? nodeIdMap.get(old) || old : old;
        })();

        if (typeof cloned.source === "string") {
          cloned.source = nextSourceCell;
        } else if (cloned.source && typeof cloned.source === "object") {
          const src = cloned.source as { cell?: string; port?: unknown };
          const oldCell = src.cell || "";
          const newCell = oldCell ? nodeIdMap.get(oldCell) || oldCell : oldCell;
          cloned.source = {
            ...src,
            cell: newCell,
            port: oldCell ? replacePortId(src.port, oldCell, newCell) : src.port,
          };
        }

        if (typeof cloned.target === "string") {
          cloned.target = nextTargetCell;
        } else if (cloned.target && typeof cloned.target === "object") {
          const tgt = cloned.target as { cell?: string; port?: unknown };
          const oldCell = tgt.cell || "";
          const newCell = oldCell ? nodeIdMap.get(oldCell) || oldCell : oldCell;
          cloned.target = {
            ...tgt,
            cell: newCell,
            port: oldCell ? replacePortId(tgt.port, oldCell, newCell) : tgt.port,
          };
        }

        if (cloned.data) {
          const fromOld = cloned.data.from || "";
          const toOld = cloned.data.to || "";
          const fromNew = fromOld ? nodeIdMap.get(fromOld) || fromOld : fromOld;
          const toNew = toOld ? nodeIdMap.get(toOld) || toOld : toOld;
          cloned.data = {
            ...cloned.data,
            from: fromNew,
            to: toNew,
            fromPort: fromOld ? replacePortId(cloned.data.fromPort, fromOld, fromNew) : cloned.data.fromPort,
            toPort: toOld ? replacePortId(cloned.data.toPort, toOld, toNew) : cloned.data.toPort,
          };
        }

        return cloned;
      };

      const graphNodeMap = new Map<string, unknown>();
      graphNodes.forEach((gn) => {
        const n = gn as { id?: string };
        if (n && n.id) {
          graphNodeMap.set(n.id, gn);
        }
      });

      const graphEdgeMap = new Map<string, unknown>();
      graphEdges.forEach((ge) => {
        const e = ge as { id?: string };
        if (e && e.id) {
          graphEdgeMap.set(e.id, ge);
        }
      });

      const nodeList = (data.nodes || []).map((node: ElectricalNode) => {
        const foundGraphNode = graphNodes.find((gn) => {
          const g = gn as { id?: string };
          return g && g.id === node.id;
        }) as
          | {
              data?: { deviceBindings?: Record<string, unknown>; deviceId?: string; location?: string };
            }
          | undefined;

        const location: string | undefined =
          (foundGraphNode && foundGraphNode.data && (foundGraphNode.data.location as string)) || undefined;

        // 设备 ID 优先从节点自身的 deviceBindings（多选）中获取
        let deviceIdList: string[] = [];
        const nodeBindings =
          foundGraphNode && foundGraphNode.data && foundGraphNode.data.deviceBindings
            ? (foundGraphNode.data.deviceBindings as Record<string, unknown>)
            : undefined;
        if (nodeBindings && typeof nodeBindings === "object") {
          deviceIdList = Object.keys(nodeBindings);
        } else {
          // 兼容只绑定了单个设备且存到了 ElectricalData.deviceBindings 的老数据
          const { deviceId } = node as unknown as { deviceId?: string };
          if (deviceId && data.deviceBindings && data.deviceBindings[deviceId]) {
            deviceIdList = [deviceId];
          }
        }

        const graphId = node.id;
        const id = (graphId && nodeIdMap.get(graphId)) || graphId;
        const rawGraphNode = graphId ? graphNodeMap.get(graphId) : undefined;
        const webStyle = rawGraphNode ? JSON.stringify(replaceGraphNode(rawGraphNode)) : undefined;

        const deviceIds = deviceIdList.length > 0 ? deviceIdList.join(",") : undefined;
        const childrenIdList = (node.childrenIds || []).map((cid) => (cid && nodeIdMap.get(cid)) || cid);
        const childrenIds = childrenIdList.length > 0 ? childrenIdList.join(",") : undefined;

        return {
          id,
          name: node.name,
          type: node.type,
          deviceIds,
          childrenIds,
          location,
          webStyle,
        };
      });

      const nodeNameById = new Map<string, string>();
      nodeList.forEach((n) => {
        nodeNameById.set(n.id, n.name);
      });

      const edgeList = graphEdges
        .map((edgeValue) => {
          const edge = edgeValue as {
            id?: string;
            data?: { from?: string; to?: string; lineLoss?: number };
            source?: string | { cell?: string };
            target?: string | { cell?: string };
          };
          if (!edge) {
            return null;
          }

          const graphEdgeId = edge.id ?? "";
          const id = (graphEdgeId && edgeIdMap.get(graphEdgeId)) || graphEdgeId;

          const fromGraphId = edge.data?.from || (typeof edge.source === "string" ? edge.source : edge.source?.cell) || "";
          const toGraphId = edge.data?.to || (typeof edge.target === "string" ? edge.target : edge.target?.cell) || "";

          const fromNodeId = (fromGraphId && nodeIdMap.get(fromGraphId)) || fromGraphId;
          const toNodeId = (toGraphId && nodeIdMap.get(toGraphId)) || toGraphId;

          const fromName = (fromNodeId && nodeNameById.get(fromNodeId)) || fromNodeId;
          const toName = (toNodeId && nodeNameById.get(toNodeId)) || toNodeId;
          const startText = fromName || "开始节点";
          const endText = toName || "结束节点";
          const lineName = `【${startText}】-【${endText}】`;

          const rawGraphEdge = graphEdgeId ? graphEdgeMap.get(graphEdgeId) : undefined;
          const webStyle = rawGraphEdge ? JSON.stringify(replaceGraphEdge(rawGraphEdge)) : undefined;

          return {
            id,
            lineName,
            fromNodeId,
            toNodeId,
            webStyle,
          };
        })
        .filter((edge) => edge !== null);

      const payload = {
        nodeList,
        connectionList: edgeList,
      };

      try {
        await getElectricalSafetyClient().saveGraph(payload);
        message.success("数据已保存");
      } catch {
        message.error("数据保存失败");
      }
    };

    const handleClear = (): void => {
      Modal.confirm({
        okText: "确定",
        cancelText: "取消",
        title: "确认清空",
        content: "清空后画布上的所有节点和连线将被删除，是否继续？",
        // okType: "danger",
        onOk: () => {
          editorRef.value?.clear();
          message.info("画布已清空");
        },
      });
    };

    return () => (
      <PageLayout
        title="拓扑图配置"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <>
              <Space>
                {/* <Button onClick={handleUndo}>撤销</Button>
              <Button onClick={handleRedo}>重做</Button>
              <Button onClick={handleZoomToFit}>适应画布</Button> */}
                {/* <Button onClick={handleImport}>导入</Button> */}
                {/* <Button onClick={handleLoadSaved}>加载</Button> */}
                {/* <Button onClick={handleExport}>导出</Button> */}
                <Button onClick={handleSave} type="primary">
                  保存
                </Button>
                <Button onClick={handleClear} danger>
                  清空
                </Button>
              </Space>
            </>
          ),
          "layout-content": () => (
            <div class="electrical-graph">
              {" "}
              <main class="electrical-graph-main">
                <ElectricalEditor
                  ref={editorRef}
                  nodes={electricalNodes.value}
                  extraElements={graphEditorExtraElements}
                  options={{
                    grid: true,
                    panning: true,
                    mousewheel: {
                      enabled: true,
                      modifiers: ["ctrl", "meta"],
                    },
                    snapline: true,
                    selecting: true,
                    history: true,
                  }}
                  onReady={handleEditorReady}
                  onChange={handleDataChange}
                />
              </main>
            </div>
          ),
        }}
      />
    );
  },
});
