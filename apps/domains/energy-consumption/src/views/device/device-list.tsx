import { defineComponent, ref } from "vue";

import { DeviceListPanel } from "./components/device-list-panel";
import { TopologyDiagram } from "./components/topology-diagram";
import { GLayout } from "@/components/common/g-layout";
import { TabPane, Tabs } from "@/pc-ui-runtime";

import "./device-list.less";

export const DeviceListPage = defineComponent({
  name: "DeviceListPage",
  setup() {
    const activeKey = ref("0");

    return () => (
      <GLayout
        class="device-list-layout"
        title="设备列表"
        showFooter={false}
        v-slots={{
          "content-table": () => (
            <Tabs
              class="device-list-tabs"
              v-model:activeKey={activeKey.value}
              onChange={(value: string | number) => {
                activeKey.value = String(value);
              }}
            >
              <TabPane key="0" tab="列表">
                <div class="device-list-pane">
                  <DeviceListPanel />
                </div>
              </TabPane>
              <TabPane key="1" tab="拓扑图">
                <div class="topology-pane">{activeKey.value === "1" ? <TopologyDiagram /> : null}</div>
              </TabPane>
            </Tabs>
          ),
        }}
      />
    );
  },
});
