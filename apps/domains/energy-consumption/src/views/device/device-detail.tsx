import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AssociatedMonitoring, HistoryRecord, OperateNote, ReadingRecord } from "./components/detail-tabs";
import { DeviceInfoPanel } from "./components/device-info-panel";
import { deviceDetail } from "@/api";
import { Button, TabPane, Tabs } from "@/pc-ui-runtime";

import "./device-detail.less";

const BASE = "/d/energy-consumption";

export const DeviceDetail = defineComponent({
  name: "DeviceDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const activeKey = ref("1");
    const device = reactive<{
      deviceArea: string;
      deviceName: string;
      fileVOS: Array<{ path: string }>;
      readeValue: string;
      nowReadeValue: string;
      lastReadeValue: string;
    }>({
      deviceArea: "",
      deviceName: "",
      fileVOS: [],
      readeValue: "",
      nowReadeValue: "",
      lastReadeValue: "",
    });
    const deviceData = ref<Record<string, unknown>>();

    const getData = async () => {
      const id = route.query.id as string;
      const { data } = (await deviceDetail(id ?? "")) as { data: Record<string, unknown> };
      deviceData.value = data;
      Object.assign(device, {
        deviceArea: data.deviceArea || "",
        deviceName: data.deviceName || "",
        fileVOS: data.fileVOS || [],
        readeValue: data.readeValue || "",
        nowReadeValue: data.nowReadeValue || "",
        lastReadeValue: data.lastReadeValue || "",
      });
    };

    onMounted(() => {
      void getData();
    });

    return () => (
      <div class="device-detail">
        <p class="title">
          {device.deviceArea}
          {device.deviceArea ? "-" : ""}
          {device.deviceName}
        </p>
        <Tabs id="tabs" v-model:activeKey={activeKey.value} style="height: calc(100% - 230px);">
          <TabPane key="1" tab="设备信息">
            {deviceData.value ? <DeviceInfoPanel deviceData={deviceData.value} model={device} /> : null}
          </TabPane>
          <TabPane key="2" tab="仪表读数记录" forceRender>
            <ReadingRecord />
          </TabPane>
          <TabPane key="3" tab="历史仪表" forceRender>
            <HistoryRecord />
          </TabPane>
          <TabPane key="4" tab="关联监控">
            <AssociatedMonitoring />
          </TabPane>
          <TabPane key="5" tab="操作日志">
            <OperateNote />
          </TabPane>
        </Tabs>
        <div class="button">
          <Button onClick={() => void router.push(`${BASE}/device/list`)}>返回</Button>
        </div>
      </div>
    );
  },
});
