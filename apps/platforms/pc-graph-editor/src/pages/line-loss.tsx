import { Button, Empty, Form, FormItem, Modal, PageLayout, RadioGroup, Select, Space, Spin, Table, message } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import type { PropType } from "vue";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import { ElectricalEditor } from "../index";

import "./line-loss-page.css";

export interface LineLossPageEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  fromDeviceId?: string;
  toDeviceId?: string;
  lineLossRate?: number;
}

export interface LineLossPageNode {
  id: string;
  name: string;
  type?: string;
  location?: string;
}

export interface LineLossPageDeviceOption {
  id: string;
  name: string;
  code: string;
}

export interface LineLossPageTrendPoint {
  lineId?: number | string;
  lineName?: string;
  lossRate: number;
  inputEnergy?: number;
  outputEnergy?: number;
  collectTime: string;
}

/** 线损共享页所需 Client 能力，由 Domain 注入，避免 Platform 静态依赖领域 Client。 */
export interface LineLossPageClient {
  getSupplyGraph: () => Promise<{ nodeList: LineLossPageNode[]; connectionList: LineLossPageEdge[] }>;
  syncSupplyGraph: () => Promise<boolean>;
  getLineLossTrend: (params: { lineId: string; timeRange: string }) => Promise<LineLossPageTrendPoint[]>;
  getLineLossDevices: (params: {
    lineId: string;
  }) => Promise<{ fromDeviceList: LineLossPageDeviceOption[]; toDeviceList: LineLossPageDeviceOption[] }>;
  updateLineLossDevices: (params: { id: string; fromDeviceId?: string; toDeviceId?: string }) => Promise<boolean>;
}

type TrendPeriod = "WEEK" | "MONTH" | "YEAR";

/**
 * 线上菜单 path=/portal/graphEditor/lineLoss 对应的共享页。
 * ElectricalEditor 在 @antv/x6 进仓前为 stub，先用线路列表承接选中态，右侧面板仍走真实线损接口。
 */
export const LineLossPage = defineComponent({
  name: "PcGraphEditorLineLossPage",
  props: {
    getClient: {
      type: Function as PropType<() => Promise<LineLossPageClient>>,
      required: true,
    },
  },
  setup(props) {
    const graphLoading = ref(false);
    const detailLoading = ref(false);
    const syncing = ref(false);
    const saving = ref(false);
    const nodes = ref<LineLossPageNode[]>([]);
    const edges = ref<LineLossPageEdge[]>([]);
    const selectedEdgeId = ref("");
    const trendPeriod = ref<TrendPeriod>("MONTH");
    const trend = ref<LineLossPageTrendPoint[]>([]);
    const devices = ref<{ fromDeviceList: LineLossPageDeviceOption[]; toDeviceList: LineLossPageDeviceOption[] }>({
      fromDeviceList: [],
      toDeviceList: [],
    });
    const editorVisible = ref(false);
    const form = reactive({ fromDeviceId: undefined as string | undefined, toDeviceId: undefined as string | undefined });
    let graphVersion = 0;
    let detailVersion = 0;

    const selectedEdge = computed(() => edges.value.find((item) => item.id === selectedEdgeId.value));
    const nodeNames = computed(() => new Map(nodes.value.map((node) => [node.id, node.name])));
    const lineName = (edge?: LineLossPageEdge): string => {
      if (!edge) {
        return "--";
      }
      if (edge.lineName) {
        return edge.lineName;
      }
      const from = nodeNames.value.get(edge.fromNodeId ?? "") ?? edge.fromNodeId ?? "开始节点";
      const to = nodeNames.value.get(edge.toNodeId ?? "") ?? edge.toNodeId ?? "结束节点";
      return `【${from}】-【${to}】`;
    };

    const loadGraph = async (): Promise<void> => {
      const version = ++graphVersion;
      graphLoading.value = true;
      try {
        const client = await props.getClient();
        const result = await client.getSupplyGraph();
        if (version !== graphVersion) {
          return;
        }
        nodes.value = result?.nodeList ?? [];
        edges.value = result?.connectionList ?? [];
        if (!selectedEdgeId.value && edges.value[0]) {
          await selectEdge(edges.value[0]);
        } else if (selectedEdge.value) {
          await loadDetail(selectedEdge.value);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "线损拓扑加载失败");
      } finally {
        if (version === graphVersion) {
          graphLoading.value = false;
        }
      }
    };

    const loadDetail = async (edge: LineLossPageEdge): Promise<void> => {
      const version = ++detailVersion;
      detailLoading.value = true;
      try {
        const client = await props.getClient();
        const [deviceResult, trendResult] = await Promise.all([
          client.getLineLossDevices({ lineId: edge.id }),
          client.getLineLossTrend({ lineId: edge.id, timeRange: trendPeriod.value }),
        ]);
        if (version !== detailVersion || selectedEdgeId.value !== edge.id) {
          return;
        }
        devices.value = {
          fromDeviceList: deviceResult?.fromDeviceList ?? [],
          toDeviceList: deviceResult?.toDeviceList ?? [],
        };
        trend.value = trendResult ?? [];
        form.fromDeviceId = edge.fromDeviceId;
        form.toDeviceId = edge.toDeviceId;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "线路详情加载失败");
      } finally {
        if (version === detailVersion) {
          detailLoading.value = false;
        }
      }
    };

    const selectEdge = async (edge: LineLossPageEdge): Promise<void> => {
      selectedEdgeId.value = edge.id;
      trend.value = [];
      devices.value = { fromDeviceList: [], toDeviceList: [] };
      await loadDetail(edge);
    };

    const changePeriod = (event: { target: { value?: unknown } }): void => {
      const value = event.target.value;
      if (value !== "WEEK" && value !== "MONTH" && value !== "YEAR") {
        return;
      }
      trendPeriod.value = value;
      if (selectedEdge.value) {
        void loadDetail(selectedEdge.value);
      }
    };

    const sync = async (): Promise<void> => {
      if (syncing.value) {
        return;
      }
      syncing.value = true;
      try {
        const client = await props.getClient();
        await client.syncSupplyGraph();
        message.success("供电关系同步成功");
        await loadGraph();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "供电关系同步失败");
      } finally {
        syncing.value = false;
      }
    };

    const saveDevices = async (): Promise<void> => {
      if (saving.value || !selectedEdge.value) {
        return;
      }
      saving.value = true;
      try {
        const client = await props.getClient();
        await client.updateLineLossDevices({
          id: selectedEdge.value.id,
          fromDeviceId: form.fromDeviceId,
          toDeviceId: form.toDeviceId,
        });
        selectedEdge.value.fromDeviceId = form.fromDeviceId;
        selectedEdge.value.toDeviceId = form.toDeviceId;
        editorVisible.value = false;
        message.success("保存成功");
        await loadDetail(selectedEdge.value);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => void loadGraph());

    const trendColumns = [
      {
        title: "采集时间",
        dataIndex: "collectTime",
        width: 180,
        customRender: ({ text }: { text: string }) => (text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--"),
      },
      { title: "输入电量(kWh)", dataIndex: "inputEnergy" },
      { title: "输出电量(kWh)", dataIndex: "outputEnergy" },
      {
        title: "线损率(%)",
        dataIndex: "lossRate",
        customRender: ({ text }: { text: number }) => (text === undefined || text === null ? "--" : `${(Number(text) * 100).toFixed(2)}%`),
      },
    ];

    return () => (
      <PageLayout
        title="线损管理"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button type="primary" loading={syncing.value} onClick={() => void sync()}>
                更新关系
              </Button>
              {selectedEdge.value ? (
                <Button
                  onClick={() => {
                    editorVisible.value = true;
                  }}
                >
                  编辑线路设备
                </Button>
              ) : null}
            </Space>
          ),
          "layout-content": () => (
            <div class="pc-graph-line-loss">
              <Spin spinning={graphLoading.value}>
                <div class="pc-graph-line-loss__canvas">
                  <ElectricalEditor />
                  <div class="pc-graph-line-loss__edges">
                    {edges.value.length > 0 ? (
                      edges.value.map((edge) => (
                        <button
                          type="button"
                          key={edge.id}
                          class={["pc-graph-line-loss__edge", selectedEdgeId.value === edge.id ? "is-active" : ""]}
                          onClick={() => void selectEdge(edge)}
                        >
                          {lineName(edge)}
                        </button>
                      ))
                    ) : (
                      <Empty description="暂无供电拓扑线路" />
                    )}
                  </div>
                </div>
              </Spin>
              <aside class="pc-graph-line-loss__panel">
                <Spin spinning={detailLoading.value}>
                  {selectedEdge.value ? (
                    <>
                      <section class="pc-graph-line-loss__section">
                        <div class="pc-graph-line-loss__title">基本信息</div>
                        <div class="pc-graph-line-loss__field">
                          <span>线路名称</span>
                          <strong>{lineName(selectedEdge.value)}</strong>
                        </div>
                        <div class="pc-graph-line-loss__field">
                          <span>输入设备</span>
                          <strong>{devices.value.fromDeviceList.find((item) => item.id === form.fromDeviceId)?.name ?? "--"}</strong>
                        </div>
                        <div class="pc-graph-line-loss__field">
                          <span>输出设备</span>
                          <strong>{devices.value.toDeviceList.find((item) => item.id === form.toDeviceId)?.name ?? "--"}</strong>
                        </div>
                      </section>
                      <section class="pc-graph-line-loss__section">
                        <div class="pc-graph-line-loss__title-row">
                          <div class="pc-graph-line-loss__title">线损趋势</div>
                          <RadioGroup
                            value={trendPeriod.value}
                            onChange={changePeriod}
                            optionType="button"
                            buttonStyle="solid"
                            size="small"
                            options={[
                              { label: "本周", value: "WEEK" },
                              { label: "本月", value: "MONTH" },
                              { label: "今年", value: "YEAR" },
                            ]}
                          />
                        </div>
                        <Table rowKey="collectTime" size="small" pagination={false} columns={trendColumns} dataSource={trend.value} />
                      </section>
                      <section class="pc-graph-line-loss__section">
                        <div class="pc-graph-line-loss__title">预警信息</div>
                        <Empty description="请到「预警列表」查看完整预警" />
                      </section>
                    </>
                  ) : (
                    <Empty description="请选择左侧图中的线路查看详情" />
                  )}
                </Spin>
              </aside>
              <Modal
                open={editorVisible.value}
                title="编辑线路设备"
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void saveDevices()}
                onCancel={() => {
                  editorVisible.value = false;
                }}
              >
                <Form model={form} labelCol={{ style: { width: "100px" } }}>
                  <FormItem label="线路">{lineName(selectedEdge.value)}</FormItem>
                  <FormItem label="输入设备">
                    <Select
                      v-model:value={form.fromDeviceId}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择输入设备"
                      options={devices.value.fromDeviceList.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id }))}
                    />
                  </FormItem>
                  <FormItem label="输出设备">
                    <Select
                      v-model:value={form.toDeviceId}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择输出设备"
                      options={devices.value.toDeviceList.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id }))}
                    />
                  </FormItem>
                </Form>
              </Modal>
            </div>
          ),
        }}
      />
    );
  },
});

export default LineLossPage;
