import { defineComponent, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import { isMobile, usePlayer, type H5sParams, type VideoType } from "../hook/use-player";

import styles from "./player-core.module.less";
const failIcon = "/resource/v1/cube-player/icon/fail.svg";
import { DahuaPlayerStrategy, GhyPlayerStrategy, H5sPlayerStrategy, HikvisionPlayerStrategy, type PlayerStrategy } from "./player-strategy";

interface PlayerCoreProps {
  videoType: VideoType;
  videoUrl: string | undefined;
  h5sParams: H5sParams | undefined;
  isReconnect: boolean;
}
export enum ErrorType {
  PLAY_ERROR = "PLAY_ERROR",
  PARAMS_ERROR = "PARAMS_ERROR",
  SDK_ERROR = "SDK_ERROR",
}

export const PlayerCore = defineComponent({
  props: {
    videoType: {
      type: String as PropType<VideoType>,
      default: "",
    },
    videoUrl: {
      type: String as PropType<string | undefined>,
    },
    h5sParams: {
      type: Object as PropType<H5sParams | undefined>,
      default: () => undefined,
    },
    isReconnect: {
      type: Boolean,
      default: () => false,
    },
  },
  emits: ["error", "dblclick", "videoDomIdReady"],
  setup(props: PlayerCoreProps, { emit }) {
    const errorText = ref("");
    const loading = ref(false);
    const { guid } = usePlayer();
    const domId = guid();
    let strategy: PlayerStrategy | null = null;
    let initSerial = 0;
    let mounted = false;
    let disposed = false;
    onBeforeMount(() => {
      if (props.videoType === "unknown") {
        errorText.value = "未知的视频接入方式";
      }
    });

    onMounted(() => {
      mounted = true;
      disposed = false;
      emit("videoDomIdReady", domId);
    });

    onBeforeUnmount(() => {
      disposed = true;
      mounted = false;
      initSerial++;
      destroyStrategy();
    });

    watch(
      () => props.videoUrl,
      () => {
        if (props.videoUrl === "") {
          emitErrorMsg("播放地址获取失败", ErrorType.PARAMS_ERROR);
          errorText.value = "网络加载异常";
        } else if (props.videoUrl === undefined) {
          errorText.value = "播放地址获取中";
        } else {
          errorText.value = "";
        }
        props.videoUrl && void initPlayer();
      },
      { flush: "post" },
    );

    watch(
      () => props.h5sParams,
      () => {
        props.h5sParams?.token && void initPlayer();
      },
      { immediate: true, flush: "post" },
    );

    return (): JSX.Element => (
      <>
        {errorText.value && (
          <div class={styles["error-text"]}>
            <img src={failIcon} alt="error" />
            {errorText.value}
          </div>
        )}
        {props.videoType !== "h5s" && (
          <div id={domId} class={styles["ghy-player"]} v-show={!errorText.value} onDblclick={handleDblClick}>
            <span v-show={loading.value} class={styles["loading-text"]}>
              加载中
            </span>
          </div>
        )}
        {!errorText.value && props.videoType === "h5s" && (
          <video id={domId} style="width:100%;height:100%;background:#000;object-fit: fill;" muted />
        )}
      </>
    );

    function emitErrorMsg(msg: string, errorType: ErrorType = ErrorType.PARAMS_ERROR): void {
      if (disposed) {
        return;
      }
      errorText.value = msg;
      emit("error", msg, errorType);
    }
    async function initPlayer(): Promise<void> {
      const serial = ++initSerial;
      destroyStrategy();
      try {
        if (props.videoType === "h5s") {
          if (!props.h5sParams) {
            throw new Error("h5sParams 不能为空");
          }
          strategy = new H5sPlayerStrategy(
            {
              domId,
              h5sParams: props.h5sParams,
              isReconnect: props.isReconnect ?? true,
            },
            emitErrorMsg,
          );
        } else if (props.videoType === "hikvision-isc") {
          strategy = new HikvisionPlayerStrategy(
            {
              domId,
              videoUrl: props.videoUrl ?? "",
            },
            emitErrorMsg,
          );
        } else if (props.videoType === "ghy" || props.videoType === "unisinsight") {
          strategy = new GhyPlayerStrategy(
            {
              domId,
              videoUrl: props.videoUrl ?? "",
              useJessibuca: props.videoType === "unisinsight",
            },
            emitErrorMsg,
          );
        } else if (props.videoType === "dahua") {
          strategy = new DahuaPlayerStrategy(
            {
              domId,
              videoUrl: props.videoUrl ?? "",
            },
            emitErrorMsg,
          );
        } else {
          throw new Error("未知的视频接入方式");
        }

        const domReady = await waitForPlayerDom();
        if (disposed || serial !== initSerial) {
          strategy?.destroy();
          return;
        }
        if (!domReady) {
          emitErrorMsg("找不到播放器dom", ErrorType.PARAMS_ERROR);
          return;
        }
        await strategy?.initPlayer();
      } catch (error) {
        if (disposed || serial !== initSerial) {
          return;
        }
        emitErrorMsg("播放器初始化失败: " + (error as Error).message, ErrorType.SDK_ERROR);
      }
    }

    async function waitForPlayerDom(): Promise<boolean> {
      for (let index = 0; index < 5; index++) {
        await nextTick();
        if (disposed) {
          return false;
        }
        if (mounted && document.getElementById(domId)) {
          return true;
        }
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      for (let index = 0; index < 5; index++) {
        if (disposed) {
          return false;
        }
        if (document.getElementById(domId)) {
          return true;
        }
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      return false;
    }

    function destroyStrategy(): void {
      strategy?.destroy();
      strategy = null;
    }

    function handleDblClick(): void {
      if (isMobile()) {
        if (props.videoType === "hikvision-isc") {
          emit("dblclick");
        }
      }
    }
  },
});
