import { SwapOutlined } from "@ant-design/icons-vue";
import { cubeAppService } from "@ghcloud/cube-app-js-sdk";
import { CubeAppPageOrientationEnum } from "@ghcloud/cube-app-js-sdk/src/js/cube-app.service";
import type { DeviceInstanceDetail } from "@ghcloud/cube-iot-center-service";
import { defineComponent, ref, watch, onMounted, onBeforeUnmount, type PropType } from "vue";

import { normalizeVideoType, usePlayer, type H5sParams } from "../hook/use-player";
import { resetPlayerSDK } from "./player-assets-load";
import { PlayerControl } from "./player-control";
import { ErrorType, PlayerCore } from "./player-core";

import styles from "./player.module.less";

export const CubePlayer = defineComponent({
  props: {
    deviceId: {
      type: String,
      default: "",
    },
    control: {
      type: Boolean,
      default: false,
    },
    isReconnect: {
      type: Boolean,
      default: true,
    },
    h5sControl: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: "",
    },
    isShowDeviceDetails: {
      type: Boolean,
      default: true,
    },
    enableAutoRecovery: {
      type: Boolean,
      default: true,
    },
    maxRecoveryCount: {
      type: Number,
      default: 3,
    },
    recoveryDelays: {
      type: Array as PropType<number[]>,
      default: () => [1000, 3000, 8000],
    },
  },
  emits: ["error", "dblclick", "deviceChange", "h5sSessionChange", "deviceDetailChange"],
  setup(props, { emit }) {
    const {
      videoType,
      videoUrl,
      relatedDevices,
      deviceDetail,
      getVideoFormatUrl,
      getVideoUrl,
      bootstrap,
      getH5sParams,
      getDeviceInstanceDetail,
    } = usePlayer();
    const h5sParams = ref<H5sParams | undefined>();
    const playerExtraParams = ref<Record<string, unknown>>({});
    const cubePlayerRef = ref();
    const playerError = ref(false);
    const isShowDeviceDetails = ref(props.isShowDeviceDetails);
    const showDeviceList = ref(false);
    const currentDeviceIndex = ref(0);
    const currentDevice = ref<{ id: string; name: string }>({
      id: props.deviceId,
      name: "主设备",
    });
    const nativePlayableUrl = ref<string | null>(null);
    const videoDomIdRef = ref<string | null>(null);
    const retryCount = ref(0);
    const retrying = ref(false);
    const playerKey = ref(0);
    const lastError = ref<{ msg: string; errorType: ErrorType } | null>(null);
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let playSerial = 0;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const isWebSocketUrl = (url: string): boolean => {
      const value = url.trim().toLowerCase();
      return value.startsWith("ws://") || value.startsWith("wss://");
    };

    watch(
      [() => props.deviceId, () => props.type],
      async () => {
        const serial = ++playSerial;
        resetRecoveryState();
        currentDevice.value = {
          id: props.deviceId,
          name: "主设备",
        };
        currentDeviceIndex.value = 0;
        h5sParams.value = undefined;
        videoUrl.value = undefined;
        nativePlayableUrl.value = null;
        playerKey.value++;
        await bootstrap();
        if (serial !== playSerial) {
          return;
        }
        const propVideoType = normalizeVideoType(props.type);
        if ((!videoType.value || videoType.value === "unknown") && propVideoType) {
          videoType.value = propVideoType;
        }
        await playDevice(props.deviceId, serial);
      },
      { immediate: true },
    );

    const playDevice = async (deviceId: string, serial = ++playSerial): Promise<void> => {
      if (!deviceId) {
        return;
      }
      playerError.value = false;
      h5sParams.value = undefined;
      videoUrl.value = undefined;
      try {
        if (isMobile) {
          const protocol = window.location.protocol === "http:" ? "HLS" : "HLS_S";
          const hlsUrl = await getVideoFormatUrl(deviceId, protocol);
          if (serial !== playSerial) {
            return;
          }
          if (hlsUrl && !isWebSocketUrl(hlsUrl)) {
            nativePlayableUrl.value = hlsUrl;
          } else {
            nativePlayableUrl.value = null;
          }
        } else {
          nativePlayableUrl.value = null;
        }
      } catch (error) {
        if (serial !== playSerial) {
          return;
        }
        nativePlayableUrl.value = null;
      }
      if (videoType.value === "h5s") {
        try {
          const params = await getH5sParams(deviceId);
          if (serial !== playSerial) {
            return;
          }
          h5sParams.value = params;
          if (deviceDetail.value) {
            emit("deviceDetailChange", deviceDetail.value as DeviceInstanceDetail);
          }
          emit("h5sSessionChange", h5sParams.value.session);
          playerExtraParams.value = JSON.parse(JSON.stringify(h5sParams.value));
        } catch (error) {
          if (serial !== playSerial) {
            return;
          }
          const errorMessage = getErrorMessage(error);
          emitErrorMsg(errorMessage, ErrorType.PARAMS_ERROR);
        }
      } else {
        const detail = await getDeviceInstanceDetail(deviceId);
        if (serial !== playSerial) {
          return;
        }
        emit("deviceDetailChange", detail as DeviceInstanceDetail);
        setTimeout(() => {
          if (serial === playSerial) {
            void getVideoUrl(deviceId);
          }
        }, 0);
      }
    };

    const switchDevice = (index: number): void => {
      const serial = ++playSerial;
      resetRecoveryState();
      currentDevice.value = relatedDevices.value[index];
      currentDeviceIndex.value = index;
      h5sParams.value = undefined;
      videoUrl.value = undefined;
      nativePlayableUrl.value = null;
      playerKey.value++;
      playDevice(currentDevice.value.id, serial);
      emit("deviceChange", currentDevice.value.id, currentDevice.value.name);
      showDeviceList.value = false;
    };

    const toggleDeviceList = (): void => {
      // showDeviceList.value = !showDeviceList.value
      // //
      // // relatedDevices
      if (currentDeviceIndex.value + 1 === relatedDevices.value.length) {
        currentDeviceIndex.value = 0;
      } else {
        currentDeviceIndex.value = currentDeviceIndex.value + 1;
      }
      switchDevice(currentDeviceIndex.value);
    };

    // 添加点击外部关闭设备列表的处理
    const handleClickOutside = (event: MouseEvent): void => {
      const deviceSwitcher = event.currentTarget as HTMLElement;
      if (showDeviceList.value && deviceSwitcher && !deviceSwitcher.contains(event.target as Node)) {
        showDeviceList.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
    });

    onBeforeUnmount(() => {
      clearRecoveryTimer();
      document.removeEventListener("click", handleClickOutside);

      window.removeEventListener("popstate", handleBackButton);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    });

    return (): JSX.Element => (
      <div class="h5s_container cube-player" style="position: relative;width: 100%; height: 100%;" ref={cubePlayerRef}>
        {videoType.value && (
          <PlayerCore
            key={playerKey.value}
            videoType={videoType.value}
            videoUrl={videoUrl.value}
            h5sParams={h5sParams.value}
            isReconnect={props.isReconnect}
            onError={emitErrorMsg}
            onDblclick={() => {
              emit("dblclick");
            }}
            onVideoDomIdReady={(id: string) => {
              videoDomIdRef.value = id;
            }}
          />
        )}
        {(props.control || props.h5sControl) && videoType.value && !playerError.value && (
          <PlayerControl
            videoType={videoType.value}
            onFullscreen={handleFullscreen}
            extraParams={playerExtraParams.value}
            deviceId={props.deviceId}
          />
        )}
        {isShowDeviceDetails.value && relatedDevices.value.length > 1 && (
          <div class={styles["device-switcher"]}>
            <div
              class={styles["device-switcher-btn"]}
              onClick={(e) => {
                e.stopPropagation();
                toggleDeviceList();
              }}
            >
              <SwapOutlined class={styles["swap-icon"]} />
              <span class="device-count">
                切换设备 ({currentDeviceIndex.value + 1}/{relatedDevices.value.length})
              </span>
            </div>
            {showDeviceList.value && (
              <div class={styles["device-list"]} onClick={(e) => e.stopPropagation()}>
                {relatedDevices.value.map((device, index) => (
                  <div
                    key={device.id}
                    class={`${styles["device-item"]} ${currentDeviceIndex.value === index ? styles["active"] : ""}`}
                    onClick={() => switchDevice(index)}
                  >
                    {device.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {nativePlayableUrl.value && (
          <div class={styles["native-play"]}>
            <div
              class={styles["device-switcher-btn"]}
              onClick={(e) => {
                e.stopPropagation();
                void cubeAppService.playVideo({ videoUrl: nativePlayableUrl.value as string, videoName: "" });
              }}
            >
              <span class="device-count">原生播放</span>
            </div>
          </div>
        )}
      </div>
    );

    function emitErrorMsg(msg: string, errorType: ErrorType = ErrorType.PARAMS_ERROR): void {
      playerError.value = true;
      lastError.value = { msg, errorType };
      emit("error", msg, errorType);
      scheduleRecovery(errorType);
    }

    function scheduleRecovery(errorType: ErrorType): void {
      if (!props.enableAutoRecovery || errorType === ErrorType.PARAMS_ERROR) {
        return;
      }
      if (retrying.value || retryTimer || retryCount.value >= props.maxRecoveryCount) {
        return;
      }
      if (errorType === ErrorType.SDK_ERROR && videoType.value) {
        resetPlayerSDK(videoType.value);
      }
      const delay = props.recoveryDelays[retryCount.value] ?? props.recoveryDelays[props.recoveryDelays.length - 1] ?? 8000;
      retryCount.value++;
      clearRecoveryTimer();
      retryTimer = setTimeout(() => {
        void recoverPlayer();
      }, delay);
    }

    async function recoverPlayer(): Promise<void> {
      const deviceId = currentDevice.value.id || props.deviceId;
      if (!deviceId) {
        return;
      }
      retrying.value = true;
      try {
        const serial = ++playSerial;
        playerKey.value++;
        await playDevice(deviceId, serial);
      } finally {
        retrying.value = false;
      }
    }

    function resetRecoveryState(): void {
      clearRecoveryTimer();
      retryCount.value = 0;
      retrying.value = false;
      lastError.value = null;
      playerError.value = false;
    }

    function clearRecoveryTimer(): void {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    }

    function getErrorMessage(error: unknown): string {
      if (error && typeof error === "object" && "toJSON" in error && typeof (error as { toJSON: unknown }).toJSON === "function") {
        const result = (error as { toJSON: () => { errorMessage?: string; message?: string } }).toJSON();
        return result.errorMessage || result.message || "播放器参数获取失败";
      }
      if (error instanceof Error) {
        return error.message;
      }
      return "播放器参数获取失败";
    }

    function enterFullscreen(element: HTMLElement | HTMLVideoElement): boolean {
      const anyEl = element as any;
      if (anyEl.requestFullscreen) {
        anyEl.requestFullscreen();
        return true;
      }
      if (anyEl.webkitRequestFullscreen) {
        anyEl.webkitRequestFullscreen();
        return true;
      }
      if (anyEl.mozRequestFullScreen) {
        anyEl.mozRequestFullScreen();
        return true;
      }
      if (anyEl.msRequestFullscreen) {
        anyEl.msRequestFullscreen();
        return true;
      }
      return false;
    }

    function handleFullscreen(full: boolean): void {
      const element = cubePlayerRef.value as HTMLElement;
      if (full && element) {
        const success = enterFullscreen(element);
        if (isMobile) {
          if (success) {
            cubeAppService.setPageOrientation(CubeAppPageOrientationEnum.LANDSCAPE);
            // 监听返回按钮事件
            window.addEventListener("popstate", handleBackButton);
            // 监听全屏变化事件
            document.addEventListener("fullscreenchange", handleFullscreenChange);
            document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.addEventListener("mozfullscreenchange", handleFullscreenChange);
            document.addEventListener("MSFullscreenChange", handleFullscreenChange);
          } else {
            //IOS系统并不支持原生 Fullscreen API。IOS只能对video元素全屏，其他HTML元素都不能全屏
            //VideoElement.webkitEnterFullscreen：打开video全屏
            //VideoElement.webkitDisplayingFullscreen：判断是否video的全屏模式
            if (isIOS && videoDomIdRef.value) {
              try {
                const videoElement = document.getElementById(videoDomIdRef.value) as HTMLVideoElement | null;
                if (videoElement?.tagName === "VIDEO") {
                  videoElement?.webkitEnterFullscreen();
                }
              } catch (e) {}
            }
          }
        }
      } else {
        exitFullscreenAndResetOrientation();
      }
    }

    function handleBackButton(): void {
      // 当用户点击返回按钮时，退出全屏并恢复竖屏
      exitFullscreenAndResetOrientation();
    }

    function handleFullscreenChange(): void {
      // 检查是否已经退出全屏
      if (
        !document.fullscreenElement &&
        !(document as any).webkitFullscreenElement &&
        !(document as any).mozFullScreenElement &&
        !(document as any).msFullscreenElement
      ) {
        // 已经退出全屏，恢复竖屏
        if (isMobile) {
          cubeAppService.setPageOrientation(CubeAppPageOrientationEnum.PORTRAIT);

          // 移除事件监听器
          window.removeEventListener("popstate", handleBackButton);
          document.removeEventListener("fullscreenchange", handleFullscreenChange);
          document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
          document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
          document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        }
      }
    }

    function exitFullscreenAndResetOrientation(): void {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }

      // 恢复竖屏
      if (isMobile) {
        cubeAppService.setPageOrientation(CubeAppPageOrientationEnum.PORTRAIT);

        // 移除事件监听器
        window.removeEventListener("popstate", handleBackButton);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      }
    }
  },
});
