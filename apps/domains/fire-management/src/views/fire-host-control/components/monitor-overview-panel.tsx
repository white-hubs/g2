import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { computed, defineComponent, type PropType } from "vue";

import type { MonitorFeed } from "../models";
import { Button, FullscreenExitOutlined, FullscreenOutlined } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

type CubePlayerComponent = (typeof import("@g2-platform/pc-player"))["CubePlayer"];
const CubePlayer = defineAsyncRuntimeCommonComponent<CubePlayerComponent>(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");

export const MonitorOverviewPanel = defineComponent({
  name: "MonitorOverviewPanel",
  props: {
    feeds: { type: Array as PropType<MonitorFeed[]>, required: true },
    activeIndex: { type: Number, required: true },
    fullscreen: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
  },
  emits: { previous: () => true, next: () => true, select: (_index: number) => true, toggleFullscreen: () => true },
  setup(props, { emit }) {
    const currentFeed = computed(() => props.feeds[props.activeIndex]);
    return () => (
      <div class={[styles.videoPanel, props.fullscreen && styles.videoFullscreen]}>
        {currentFeed.value ? (
          <div class={styles.videoContent}>
            <div class={styles.videoPlayer}>
              <CubePlayer
                key={currentFeed.value.id}
                deviceId={currentFeed.value.id}
                h5sControl={false}
                isShowDeviceDetails={false}
                enableAutoRecovery
              />
            </div>
            <div class={styles.videoMeta}>
              <strong>{currentFeed.value.name}</strong>
              <span>{currentFeed.value.description}</span>
            </div>
            <div class={styles.liveTag}>
              <span />
              LIVE
            </div>
            {props.feeds.length > 1 ? (
              <>
                <button
                  class={[styles.videoSwitch, styles.videoPrevious]}
                  type="button"
                  aria-label="上一个视频"
                  onClick={() => emit("previous")}
                >
                  ‹
                </button>
                <button class={[styles.videoSwitch, styles.videoNext]} type="button" aria-label="下一个视频" onClick={() => emit("next")}>
                  ›
                </button>
                <div class={styles.videoDots}>
                  {props.feeds.map((feed, index) => (
                    <button
                      key={feed.id}
                      type="button"
                      aria-label={`切换至${feed.name}`}
                      class={index === props.activeIndex && styles.videoDotActive}
                      onClick={() => emit("select", index)}
                    />
                  ))}
                </div>
              </>
            ) : undefined}
            <div class={styles.videoCount}>
              {props.activeIndex + 1} / {props.feeds.length}
            </div>
          </div>
        ) : (
          <div class={styles.videoEmpty}>{props.loading ? "正在加载关联视频设备..." : "当前主机未关联视频设备"}</div>
        )}
        {currentFeed.value ? (
          <Button
            class={styles.fullscreenButton}
            size="small"
            icon={props.fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => emit("toggleFullscreen")}
          />
        ) : undefined}
      </div>
    );
  },
});
