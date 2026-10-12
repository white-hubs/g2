import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import { getCubePlayerAuthHeaders } from "./player-api";

import styles from "./cube-player.module.css";

type VideoUrlResponse = {
  data?: { url?: string } | string;
  url?: string;
};

function extractVideoUrl(body: VideoUrlResponse | string): string {
  if (typeof body === "string") return body;
  return typeof body.data === "string" ? body.data : String(body.data?.url || body.url || "");
}

async function requestVideoUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    credentials: "include",
    headers: getCubePlayerAuthHeaders(),
  });
  if (!response.ok) throw new Error(`video url ${response.status}`);
  return extractVideoUrl((await response.json()) as VideoUrlResponse);
}

/**
 * g2 pc-player：对齐旧仓 CubePlayer 主 props，经同源 API 取流并播放。
 * 完整旧仓 wasm SDK 资产保留在同包 src/lib（供后续加深）；本组件为可运行主入口。
 */
export const CubePlayer = defineComponent({
  name: "CubePlayer",
  props: {
    deviceId: { type: String, default: "" },
    control: { type: Boolean, default: false },
    isReconnect: { type: Boolean, default: true },
    type: { type: String, default: "" },
    isShowDeviceDetails: { type: Boolean, default: true },
  },
  emits: ["error", "dblclick", "deviceChange", "deviceDetailChange"],
  setup(props, { emit }) {
    const videoUrl = ref("");
    const error = ref("");
    const loading = ref(false);

    async function loadStream(deviceId: string): Promise<void> {
      if (!deviceId) {
        videoUrl.value = "";
        return;
      }
      loading.value = true;
      error.value = "";
      try {
        const encodedId = encodeURIComponent(deviceId);
        const protocol = window.location.protocol === "https:" ? "HLS_S" : "HLS";
        const candidates = [
          `/api/iot/north/device/video-url?deviceId=${encodedId}`,
          `/api/securitymanagement/videogw/video/${encodedId}/preview-url?protocol=${protocol}`,
          `/api/securitymanagement/video/stream/${encodedId}`,
        ];
        let lastError: unknown;
        for (const candidate of candidates) {
          try {
            videoUrl.value = await requestVideoUrl(candidate);
            if (videoUrl.value) break;
          } catch (requestError) {
            lastError = requestError;
          }
        }
        if (!videoUrl.value) {
          throw lastError ?? new Error("empty video url");
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
        emit("error", error.value);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      void loadStream(props.deviceId);
    });
    watch(
      () => props.deviceId,
      (id) => {
        void loadStream(id);
      },
    );

    return () => (
      <div data-platform="pc-player" class={styles.player} onDblclick={() => emit("dblclick")}>
        {loading.value ? (
          <div class={styles.playerStatus}>
            <span class={styles.loadingIndicator} />
            <span>加载中</span>
          </div>
        ) : null}
        {error.value ? (
          <div class={styles.playerStatus} title={error.value}>
            <span>加载失败</span>
            <button type="button" class={styles.refreshButton} disabled={loading.value} onClick={() => void loadStream(props.deviceId)}>
              {loading.value ? "刷新中" : "刷新"}
            </button>
          </div>
        ) : null}
        {videoUrl.value ? (
          <video class={styles.video} src={videoUrl.value} controls={props.control} autoplay muted />
        ) : !loading.value && !error.value ? (
          <div class={styles.playerStatus}>请选择设备</div>
        ) : null}
      </div>
    );
  },
});
