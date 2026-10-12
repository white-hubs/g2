import type { Cell, Graph } from "@antv/x6";
import {
  type ElectricalData,
  ElectricalEditor,
  type ElectricalNode,
  provideGraphDeviceClient,
  replaceData,
} from "@g2-platform/pc-graph-editor";
import { PageLayout } from "@g2-platform/pc-ui";

import { LineLossEdgePanel } from "./line-loss-edge-panel";
import { getElectricalSafetyClient } from "@/domain-context";
// import { replaceData } from "@/utils/page-name";
// import { replaceData } from "../../utils/utils";
import { Button, Space, message } from "@g2-platform/pc-ui";
import { defineComponent, nextTick, ref } from "vue";

import "../graph-editor/graph-editor.css";

type ElectricalEditorHandle = {
  importData(data: ElectricalData, options?: { zoomToFit?: boolean }): boolean;
};

export const LineEditor = defineComponent({
  name: "LineEditor",
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
    const updateLoading = ref(false);

    const getViewportState = (): { zoom: number; tx: number; ty: number } | null => {
      const graph = graphRef.value as unknown as {
        getZoom?: () => number;
        translate?: (...args: number[]) => unknown;
      } | null;
      if (!graph) {
        return null;
      }

      const zoom = typeof graph.getZoom === "function" ? graph.getZoom() : null;
      const translateResult =
        typeof graph.translate === "function" ? (graph.translate() as { tx?: number; ty?: number } | undefined) : undefined;
      if (typeof zoom !== "number" || !translateResult) {
        return null;
      }

      const tx = typeof translateResult.tx === "number" ? translateResult.tx : 0;
      const ty = typeof translateResult.ty === "number" ? translateResult.ty : 0;
      return { zoom, tx, ty };
    };

    const restoreViewportState = (state: { zoom: number; tx: number; ty: number } | null): void => {
      const graph = graphRef.value as unknown as {
        zoomTo?: (zoom: number) => void;
        translate?: (...args: number[]) => unknown;
      } | null;
      if (!graph || !state) {
        return;
      }

      if (typeof graph.zoomTo === "function") {
        graph.zoomTo(state.zoom);
      }
      if (typeof graph.translate === "function") {
        graph.translate(state.tx, state.ty);
      }
    };

    const loadDefaultGraph = async (options: { zoomToFit?: boolean } = {}): Promise<void> => {
      try {
        const payload = await getElectricalSafetyClient().loadLineGraph();
        const { electricalData } = replaceData(payload, true);
        await nextTick();
        const imported = editorRef.value?.importData(electricalData, { zoomToFit: options.zoomToFit !== false }) ?? false;
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

    const handleUpdate = async (): Promise<void> => {
      updateLoading.value = true;
      const viewportState = getViewportState();
      try {
        await getElectricalSafetyClient().updateLine();
        await loadDefaultGraph({ zoomToFit: false });
        restoreViewportState(viewportState);
        requestAnimationFrame(() => {
          restoreViewportState(viewportState);
        });
      } finally {
        updateLoading.value = false;
      }
    };

    return () => (
      <PageLayout
        title="线损管理"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <>
              <Space>
                {/* <Button onClick={handleUndo}>撤销</Button>
              <Button onClick={handleRedo}>重做</Button>
              <Button onClick={handleZoomToFit}>适应画布</Button>
              <Button onClick={handleImport}>导入</Button>
              <Button onClick={handleLoadSaved}>加载</Button>
              <Button onClick={handleExport}>导出</Button> */}
                <Button loading={updateLoading.value} onClick={handleUpdate} type="primary">
                  更新关系
                </Button>
                {/* <Button onClick={handleClear} danger>
                清空
              </Button> */}
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
                  readonly={true}
                  lineLossPanel={false}
                  rightPanelWidth={440}
                  showRightPanel={({ edges }: { edges: Cell[] }) => edges.length > 0}
                  customRightPanel={({ all, edges }: { all: Cell[]; edges: Cell[] }) => {
                    const hasEdge = edges && edges.length > 0;
                    if (!hasEdge) {
                      return null;
                    }
                    return <LineLossEdgePanel selectedCells={all} readonly={true} onSaved={() => loadDefaultGraph({ zoomToFit: false })} />;
                  }}
                  options={{
                    grid: true,
                    panning: true,
                    scroller: false,
                    mousewheel: {
                      enabled: true,
                      modifiers: ["ctrl", "meta"],
                    },
                    snapline: true,
                    // 线损管理：禁止拉线新增连线，但保留默认转角/router/connector
                    connecting: {
                      snap: true,
                      allowBlank: false,
                      allowLoop: false,
                      allowNode: true,
                      allowEdge: false,
                      allowPort: true,
                      highlight: true,
                      anchor: "center",
                      connectionPoint: "anchor",
                      router: {
                        name: "manhattan",
                      },
                      connector: {
                        name: "rounded",
                        args: {
                          radius: 8,
                        },
                      },
                      validateMagnet: () => false,
                      validateConnection: () => false,
                    },
                    // 线损管理：仅允许查看，禁止拖动/新增/删除节点和连线
                    selecting: {
                      enabled: true,
                      rubberband: false,
                      movable: false,
                      showNodeSelectionBox: true,
                    },

                    history: false,
                    clipboard: {
                      enabled: false,
                    },
                    keyboard: {
                      enabled: false,
                    },
                    interacting: {
                      nodeMovable: false,
                      edgeMovable: false,
                      vertexMovable: false,
                    },
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
