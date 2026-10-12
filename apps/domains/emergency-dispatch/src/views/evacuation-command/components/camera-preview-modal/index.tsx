// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { computed, defineComponent } from "vue";

import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";
import { getVideoAccessMode } from "../../utils/video-access-mode";
import { Modal } from "@/pc-ui-runtime";

import styles from "./index.module.less";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

export const CameraPreviewModal = defineComponent({
  name: "CameraPreviewModal",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    const videoType = computed(() => getVideoAccessMode());
    const device = computed(() => props.state.cameraPreviewDevice.value);
    const deviceId = computed(() => device.value?.id ?? "");

    return (): JSX.Element => (
      <Modal
        open={props.state.cameraPreviewOpen.value}
        title={device.value?.name ?? "实时监控"}
        footer={null}
        width={860}
        destroyOnClose
        onCancel={() => props.state.closeCameraPreview()}
      >
        <div class={styles.playerWrap}>
          {deviceId.value ? (
            <CubePlayer
              key={`modal-${deviceId.value}-${device.value?.name ?? ""}`}
              deviceId={deviceId.value}
              type={videoType.value}
              control={true}
              isShowDeviceDetails={false}
            />
          ) : null}
        </div>
      </Modal>
    );
  },
});
