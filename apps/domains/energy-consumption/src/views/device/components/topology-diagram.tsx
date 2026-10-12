import { defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { EnergyCollectConfigList, getTopologyDiagram } from "@/api";
import { ETree } from "@/components/echart/e-tree";
import { Button, Form, FormItem, Select } from "@/pc-ui-runtime";

import "./topology-diagram.less";

const BASE = "/d/energy-consumption";

export const TopologyDiagram = defineComponent({
  name: "TopologyDiagram",
  setup() {
    const router = useRouter();
    const topology = ref<unknown[]>([]);
    const instrumentType = ref("electricity_meter");
    const classifyList = ref<unknown[]>([]);

    const topologyDiagramData = async () => {
      const { data } = (await getTopologyDiagram({ instrumentType: instrumentType.value })) as { data: unknown[] };
      topology.value = [
        {
          label: { formatter: "设备拓扑" },
          children: data,
        },
      ];
    };

    const getStructureTableList = async () => {
      const { data } = (await EnergyCollectConfigList()) as { data: unknown[] };
      classifyList.value = data;
    };

    const clickSeries = (data: { id?: string; deviceId?: string; instrumentType?: string }) => {
      if (data.id) {
        void router.push({
          path: `${BASE}/device/detail`,
          query: {
            id: data.id,
            deviceId: data.deviceId,
            instrumentType: data.instrumentType,
          },
        });
      }
    };

    onMounted(() => {
      void getStructureTableList();
      void topologyDiagramData();
    });

    return () => (
      <div class="topology-diagram">
        <Form class="topology-filter" layout="inline" style="margin-top: 10px">
          <FormItem label="能耗分类">
            <Select
              placeholder="请选择"
              v-model:value={instrumentType.value}
              style="width: 180px"
              options={classifyList.value as never}
              fieldNames={{ label: "categoryName", value: "categoryCode" }}
            />
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              onClick={() => {
                topology.value = [];
                void topologyDiagramData();
              }}
            >
              查询
            </Button>
            <Button
              style="margin-left: 10px"
              onClick={() => {
                instrumentType.value = "electricity_meter";
                void topologyDiagramData();
              }}
            >
              重置
            </Button>
          </FormItem>
        </Form>
        <div class="topology-scroll">
          {topology.value?.[0] &&
          Array.isArray((topology.value[0] as { children?: unknown[] }).children) &&
          (topology.value[0] as { children: unknown[] }).children.length === 0 ? (
            <div class="noData">暂无数据！</div>
          ) : (
            <ETree class="contractTable" treeData={topology.value} onClickSeries={clickSeries} />
          )}
        </div>
      </div>
    );
  },
});
