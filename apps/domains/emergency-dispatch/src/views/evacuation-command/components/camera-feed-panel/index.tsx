// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { computed, defineComponent } from "vue";

import type { EvacuationCommandState } from "../../composables/use-evacuation-command-state";
import { getVideoAccessMode } from "../../utils/video-access-mode";
import { Input } from "@/pc-ui-runtime";

import styles from "./index.module.less";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

const SEARCH_MAX_LENGTH = 9999;

export const CameraFeedPanel = defineComponent({
  name: "CameraFeedPanel",
  props: {
    state: { type: Object as () => EvacuationCommandState, required: true },
  },
  setup(props) {
    const videoType = computed(() => getVideoAccessMode());

    return (): JSX.Element => (
      <div class={styles.panel}>
        <div class={styles.header}>
          <span class={styles.title}>实时画面</span>
          <span class={styles.subtitle}>{props.state.selectedRoute.value ? props.state.selectedRoute.value.name : "全部路线"}</span>
        </div>
        <div class={styles.search}>
          <Input
            size="small"
            placeholder="搜索摄像头..."
            value={props.state.feedCamSearch.value}
            maxlength={SEARCH_MAX_LENGTH}
            showCount={false}
            onUpdate:value={(v: string) => {
              props.state.feedCamSearch.value = v ?? "";
            }}
            allowClear
          />
        </div>
        <div class={styles.list}>
          {props.state.feedFilteredCameras.value.length === 0 ? (
            <div class={styles.empty}>{props.state.selectedRoute.value ? "该路线未绑定监控设备" : "当前区域路线未绑定监控设备"}</div>
          ) : (
            props.state.feedFilteredCameras.value.map((cam) => {
              const selected = cam.id === props.state.selectedCameraId.value;
              return (
                <div
                  key={cam.id}
                  class={[styles.feed, selected ? styles.feedSelected : ""].filter(Boolean).join(" ")}
                  onClick={() => props.state.openCameraPreview(cam)}
                >
                  <div class={styles.playerBox}>
                    <CubePlayer
                      key={`feed-${cam.id}`}
                      deviceId={cam.id}
                      type={videoType.value}
                      control={false}
                      isShowDeviceDetails={false}
                    />
                    <span class={styles.nameOverlay} title={cam.name}>
                      {cam.name}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  },
});
