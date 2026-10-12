import { defineComponent, reactive, onMounted } from "vue";

import PanelCard from "../../card/card";
import Piechart from "../../chart/pie/pie";
import { cubeDeviceCenterService } from "@/api/server";

interface DeviceStatusCount {
  offlineNumber: number;
  normalNumber: number;
}

export default defineComponent({
  name: "DeviceOverview",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<{
      chartData: { name: string; value: number }[];
    }>({
      chartData: [],
    });

    const getData = async (): Promise<void> => {
      const response = (await cubeDeviceCenterService.getDeviceStatusCountByTagCode()) as DeviceStatusCount;
      state.chartData = [
        { name: "在线", value: response.normalNumber ?? 0 },
        { name: "离线", value: response.offlineNumber ?? 0 },
      ];
    };

    onMounted(() => {
      getData();
    });

    const handleClose = (): void => {
      emit("close");
    };

    return () => (
      <PanelCard title="设备总览" icon="icon-shebeigailan" onClose={handleClose}>
        <div class="deviceOverview-container">
          <Piechart chartData={state.chartData} color={["#00ba8b", "#ff4d4f"]} />
        </div>
      </PanelCard>
    );
  },
});
