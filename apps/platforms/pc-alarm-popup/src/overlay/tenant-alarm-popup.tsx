import dayjs from "dayjs";
import type { Component } from "vue";
import { computed, defineComponent, onBeforeUnmount, onMounted, type PropType, reactive, ref, watch } from "vue";

import { buildDetailNavigateIntent } from "../detail/navigate-intent";
import type { AlarmPopupController, DeviceCenterApi } from "../handlers";
import { shouldReplayAfterEnd } from "../model/alarm-audio";
import {
  buildAlarmDescription,
  getCurrentAlarm,
  isStorageArchiveAlarm,
  nextAlarmIndex,
  prevAlarmIndex,
  type AlarmQueueState,
  type AlarmModalItem,
} from "../model/alarm-queue";
import {
  buildAlarmSnapshotDetails,
  extractProductPropVoList,
  filterChartSnapshotDetails,
  parseMatchSnapshot,
  type AlarmSnapshotDetail,
} from "../model/alarm-snapshot";
import { getAlarmLevelClass, getAlarmLevelImage } from "../model/level-style";
import { buildStorageArchiveDescription, formatStorageValue, getOpText, parseStorageArchiveSnapshot } from "../model/storage-archive";
import { exitVideoFullscreen, requestVideoFullscreen } from "../model/video-fullscreen";
import { Button, message, Space, TabPane, Tabs, Tag } from "../pc-ui-runtime";

import styles from "./alarm-modal.module.css";

const EMPTY_IMG = "/resource/v1/alarm-center/empty.png";
const CHART_ALARM_TYPES = ["ELECTRICMANAGE", "FIRECONTROL", "ROTATINGMANAGE"] as const;
const FULLSCREEN_CONTAINER_CLASSES = [styles["alarm-video-container-box"], styles["grid-item"]];

const COMMAND_DISPATCH_PATH_PREFIXES = [
  "/command-dispatch-changsha",
  "/command-dispatch-huawei",
  "/command-dispatch-pt",
  "/command-dispatch-putian",
  "/command-dispatch",
] as const;

function FullscreenEnterIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M7 3H3v4h2V5h2V3zm10 0v2h2v2h2V3h-4zM5 17v-2H3v4h4v-2H5zm14 0h-2v2h2v2h2v-4h-2z" />
    </svg>
  );
}

function FullscreenExitIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M9 5H5v2h2v2h2V5zm10 0h-2v4h2v2h2V5h-2zM7 17H5v2h4v-2H7zm12 0h-2v2h2v2h2v-2h-2v-2z" />
    </svg>
  );
}

function shouldEnableDetailButtonByHost(): boolean {
  try {
    const { pathname, hostname } = window.location;
    const normalized = pathname.replace(/\/+$/, "") || "/";
    if (COMMAND_DISPATCH_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      return false;
    }
    if (hostname === "sn-hq.guhecloud.cn") {
      return false;
    }
  } catch {
    return true;
  }
  return true;
}

async function loadAlarmSnapshotDetail(
  alarm: AlarmModalItem | null,
  deviceCenter: DeviceCenterApi | undefined,
): Promise<AlarmSnapshotDetail[]> {
  if (!alarm?.alarmSnapshot || !deviceCenter) {
    return [];
  }
  const matchSnapshot = parseMatchSnapshot(alarm.alarmSnapshot);
  if (!matchSnapshot.length) {
    return [];
  }
  const deviceId = alarm.alarmTargetKey ?? "";
  if (!deviceId) {
    return [];
  }
  try {
    const result = await deviceCenter.getDeviceIotDetail(deviceId, { withSnapShot: true, withPropertySpec: true });
    return buildAlarmSnapshotDetails(matchSnapshot, extractProductPropVoList(result));
  } catch {
    return [];
  }
}

export const TenantAlarmPopup = defineComponent({
  props: {
    queue: { type: Object as PropType<AlarmQueueState>, required: true },
    controller: { type: Object as PropType<AlarmPopupController>, required: true },
    bus: { type: Object as PropType<import("@g2-composition/contract").EventBus>, required: true },
    intentCodes: { type: Array as PropType<string[]>, required: true },
    showLocateButton: { type: Boolean, default: false },
    CubePlayer: { type: Object as PropType<Component | undefined>, default: undefined },
    AlarmChartComponents: { type: Object as PropType<Record<string, Component> | undefined>, default: undefined },
    deviceCenter: { type: Object as PropType<DeviceCenterApi | undefined>, default: undefined },
  },
  setup(props) {
    const showDetailButton = ref(shouldEnableDetailButtonByHost());
    const videoErrorMap = reactive<Record<string, boolean>>({});
    const isFull = ref(false);
    const showGridVideo = ref(true);
    const snapshotState = reactive<{ alarmSnapshotDetail: AlarmSnapshotDetail[] }>({
      alarmSnapshotDetail: [],
    });
    const audioTick = ref(0);

    const currentAlarm = computed(() => getCurrentAlarm(props.queue));
    const alarmDesc = computed(() => buildAlarmDescription(currentAlarm.value));
    const isStorage = computed(() => isStorageArchiveAlarm(currentAlarm.value));
    const storageSnapshot = computed(() => parseStorageArchiveSnapshot(currentAlarm.value));
    const storageMessage = computed(() => buildStorageArchiveDescription(currentAlarm.value));
    const audioState = computed(() => {
      void audioTick.value;
      return props.controller.getAudioState();
    });

    const chartComponentKeys = computed(() => new Set(Object.keys(props.AlarmChartComponents ?? {})));
    const componentsChartDetail = computed(() => filterChartSnapshotDetails(snapshotState.alarmSnapshotDetail, chartComponentKeys.value));

    const handleAlarmSnapshot = async (): Promise<void> => {
      const details = await loadAlarmSnapshotDetail(currentAlarm.value, props.deviceCenter);
      snapshotState.alarmSnapshotDetail = details;
    };

    const playAlarmAudio = (): void => {
      const state = props.controller.getAudioState();
      if (!state.shouldPlay) {
        return;
      }
      const audioDom = document.getElementById("g2-alarm-audio") as HTMLAudioElement | null;
      if (!audioDom) {
        return;
      }
      audioDom.loop = state.looped;
      audioDom.currentTime = 0;
      props.controller.resetAudioPlayCount();
      void audioDom.play();
    };

    const handleAlarmAudioEnd = (): void => {
      const state = props.controller.getAudioState();
      props.controller.incrementAudioPlayCount();
      const nextCount = state.playCount + 1;
      const audioDom = document.getElementById("g2-alarm-audio") as HTMLAudioElement | null;
      if (!audioDom) {
        return;
      }
      if (state.looped) {
        audioDom.loop = true;
        return;
      }
      audioDom.loop = false;
      if (shouldReplayAfterEnd(state, nextCount)) {
        void audioDom.play();
      }
    };

    const warmUpAudio = (): void => {
      const audioDom = document.getElementById("g2-alarm-audio") as HTMLAudioElement | null;
      if (audioDom) {
        void audioDom
          .play()
          .then(() => audioDom.pause())
          .catch(() => undefined);
      }
    };

    const onFullscreenChange = (): void => {
      isFull.value = Boolean(document.fullscreenElement);
    };

    watch(
      () => currentAlarm.value?.businessKey,
      async () => {
        Object.keys(videoErrorMap).forEach((key) => delete videoErrorMap[key]);
        const alarm = currentAlarm.value;
        if (alarm) {
          await props.controller.refreshAudioForAlarm(alarm);
          audioTick.value += 1;
          playAlarmAudio();
        }
        void handleAlarmSnapshot();
      },
      { immediate: true },
    );

    watch(
      () => props.controller.getAudioState().audioUrl,
      () => {
        audioTick.value += 1;
      },
    );

    onMounted(() => {
      document.addEventListener("click", warmUpAudio);
      document.addEventListener("fullscreenchange", onFullscreenChange);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", warmUpAudio);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    });

    const close = (): void => {
      props.controller.closeTenant();
    };

    const handlePre = (): void => {
      props.controller.setQueue(prevAlarmIndex(props.queue));
    };

    const handleNext = (): void => {
      props.controller.setQueue(nextAlarmIndex(props.queue));
    };

    const handleDetail = (): void => {
      const alarm = currentAlarm.value;
      if (!alarm) {
        return;
      }
      const result = buildDetailNavigateIntent(alarm, props.intentCodes);
      if (!result.ok) {
        message.error("当前告警应用未配置详情跳转，请联系管理员");
        return;
      }
      props.bus.publish("navigate-intent", result.intent);
      if (props.queue.items.length < 2) {
        close();
      }
    };

    const locateToDevice = (): void => {
      const alarm = currentAlarm.value;
      if (!alarm) {
        return;
      }
      props.bus.publish("alarm-popup:locate-device", alarm);
      close();
    };

    const fullScreenVideo = (event: MouseEvent): void => {
      if (requestVideoFullscreen(event, FULLSCREEN_CONTAINER_CLASSES)) {
        isFull.value = true;
      }
    };

    const exitFullScreen = (): void => {
      exitVideoFullscreen();
      isFull.value = false;
    };

    const getVideoErrorKey = (alarm: AlarmModalItem, deviceId: string): string => `${alarm.businessKey}:${deviceId}`;

    const renderVideoPlayer = (alarm: AlarmModalItem, video: NonNullable<AlarmModalItem["videoList"]>[number]): JSX.Element | null => {
      if (!video.deviceId) {
        return null;
      }
      if (videoErrorMap[getVideoErrorKey(alarm, video.deviceId)]) {
        return (
          <div class={styles["video-fallback-empty"]}>
            <div>视频播放失败</div>
          </div>
        );
      }
      const Player = props.CubePlayer;
      if (!Player) {
        return (
          <div class={styles["video-fallback-empty"]}>
            <div>播放器未就绪</div>
          </div>
        );
      }
      return (
        <Player
          deviceId={video.deviceId}
          onError={() => {
            videoErrorMap[getVideoErrorKey(alarm, video.deviceId)] = true;
          }}
        />
      );
    };

    const renderChart = (chartItem: AlarmSnapshotDetail): JSX.Element | null => {
      const ChartComponent = props.AlarmChartComponents?.[chartItem.propCode];
      if (!ChartComponent) {
        return null;
      }
      return (
        <ChartComponent
          min={chartItem.minValue}
          max={chartItem.maxValue}
          label={chartItem.propName}
          isAlarmModal={true}
          value={`${chartItem.propValue}`}
          unit={chartItem.unit}
        />
      );
    };

    const componentsChart = (): JSX.Element | null => {
      if (!componentsChartDetail.value.length) {
        return null;
      }
      return (
        <>
          {componentsChartDetail.value.map((item) => (
            <TabPane tab={item.propName || item.propCode} key={item.propCode}>
              <div class={styles.content}>
                <div class={styles.item}>
                  <div class={styles.label}>报警值：</div>
                  <div class={styles.value}>{renderChart(item)}</div>
                </div>
              </div>
            </TabPane>
          ))}
        </>
      );
    };

    const StorageArchiveContent = (): JSX.Element | null => {
      const snapshot = storageSnapshot.value;
      const msg = storageMessage.value;
      if (!msg) {
        return null;
      }
      return (
        <div class={styles["storage-archive-card"]}>
          <div class={styles["storage-archive-card-header"]}>
            <div>
              <div class={styles["storage-archive-label"]}>告警仓库</div>
              <div class={styles["storage-archive-target"]}>{currentAlarm.value?.alarmTargetName ?? "--"}</div>
            </div>
            <div class={styles["storage-archive-header-extra"]}>
              <div class={styles["storage-archive-device"]}>{currentAlarm.value?.alarmTargetName ?? "--"}</div>
            </div>
          </div>
          <div class={styles["storage-archive-metrics"]}>
            <div class={[styles["storage-archive-metric"], snapshot?.volumeAlarm ? styles["is-alarm"] : ""]}>
              <div class={styles["storage-archive-metric-label"]}>容积</div>
              <div class={styles["storage-archive-metric-value"]}>{formatStorageValue(snapshot?.currentVolume)}</div>
              <div class={styles["storage-archive-metric-threshold"]}>
                阈值 {getOpText(snapshot?.volumeOp)} {formatStorageValue(snapshot?.volumeThreshold)}
              </div>
            </div>
            <div class={[styles["storage-archive-metric"], snapshot?.weightAlarm ? styles["is-alarm"] : ""]}>
              <div class={styles["storage-archive-metric-label"]}>重量</div>
              <div class={styles["storage-archive-metric-value"]}>{formatStorageValue(snapshot?.currentWeight)}</div>
              <div class={styles["storage-archive-metric-threshold"]}>
                阈值 {getOpText(snapshot?.weightOp)} {formatStorageValue(snapshot?.weightThreshold)}
              </div>
            </div>
          </div>
          <div class={styles["storage-archive-message"]}>{msg}</div>
        </div>
      );
    };

    const ModalContent = (): JSX.Element => {
      const storageContent = StorageArchiveContent();
      if (storageContent) {
        return storageContent;
      }
      const alarm = currentAlarm.value;
      const videos = alarm?.videoList ?? [];
      const hasCharts = alarm && CHART_ALARM_TYPES.includes(alarm.alarmTypeCode as (typeof CHART_ALARM_TYPES)[number]);
      if (videos.length || hasCharts) {
        return (
          <div>
            {componentsChartDetail.value.length || videos.length ? (
              <Tabs>
                {alarm && hasCharts && componentsChart()}
                {!showGridVideo.value
                  ? videos.map((v, i) => (
                      <TabPane key={v.deviceId + i} tab={v.deviceName}>
                        <div class={styles["alarm-video-container-box"]}>
                          <div class={styles["alarm-video-container-icon"]}>
                            {!isFull.value ? (
                              <span onClick={fullScreenVideo}>
                                <FullscreenEnterIcon />
                              </span>
                            ) : (
                              <span onClick={exitFullScreen}>
                                <FullscreenExitIcon />
                              </span>
                            )}
                          </div>
                          <div class={styles["alarm-video-container"]}>{alarm && renderVideoPlayer(alarm, v)}</div>
                        </div>
                      </TabPane>
                    ))
                  : videos.length > 0 && (
                      <TabPane key="video-grid" tab="监控视频">
                        <div class={`${styles.grid} ${styles[`grid-${Math.min(videos.length, 9)}`]}`}>
                          {videos.slice(0, 9).map((v, i) => (
                            <div key={v.deviceId + i} class={styles["grid-item"]}>
                              <div class={styles["video-title"]} title={v.deviceName}>
                                {v.deviceName}
                              </div>
                              <div class={styles["video-icon"]}>
                                {!isFull.value ? (
                                  <span onClick={fullScreenVideo}>
                                    <FullscreenEnterIcon />
                                  </span>
                                ) : (
                                  <span onClick={exitFullScreen}>
                                    <FullscreenExitIcon />
                                  </span>
                                )}
                              </div>
                              <div class={styles["video-container"]}>{alarm && renderVideoPlayer(alarm, v)}</div>
                            </div>
                          ))}
                        </div>
                      </TabPane>
                    )}
              </Tabs>
            ) : (
              <div class={styles["empty-data"]}>
                <img src={EMPTY_IMG} alt="" />
                <div>暂无数据快照</div>
              </div>
            )}
          </div>
        );
      }
      return (
        <div class={styles["empty-box"]}>
          <img src={EMPTY_IMG} alt="empty" />
        </div>
      );
    };

    return (): JSX.Element | null => {
      const alarm = currentAlarm.value;
      if (!alarm) {
        return null;
      }
      const levelClass = getAlarmLevelClass(alarm.alarmLevelName);
      return (
        <>
          <audio src={audioState.value.audioUrl} id="g2-alarm-audio" preload="auto" onEnded={handleAlarmAudioEnd} />
          <div class={styles.mask}>
            <div class={styles.modal}>
              <div class={styles[levelClass]} style="height:100%;box-sizing:border-box;padding:0 10px;position:relative;">
                <div class={styles["alarmDetail-modal-header"]}>
                  <div class={styles["header-title"]}>
                    <span>{alarm.applicationName}</span>
                    {alarm.marketName && <span>【{alarm.marketName}】</span>}
                    <Tag color={levelClass} style="margin-left:10px">
                      {alarm.alarmLevelName}
                    </Tag>
                  </div>
                  <div class={styles["header-close"]} onClick={close}>
                    ×
                  </div>
                </div>
                <div class={styles["alarm-name"]} style={{ backgroundImage: `url(${getAlarmLevelImage(alarm.alarmLevelName)})` }}>
                  <div style="font-size:18px">{alarm.alarmEventName}</div>
                  <div style="font-size:12px">{alarm.alarmTime ? dayjs(alarm.alarmTime).format("YYYY-MM-DD HH:mm:ss") : ""}</div>
                </div>
                {!isStorage.value && alarmDesc.value && (
                  <div class={styles["alarm-desc"]} title={alarmDesc.value}>
                    {alarmDesc.value}
                  </div>
                )}
                <ModalContent />
                <div class={styles["modal-footer"]}>
                  <span />
                  <div class={styles["modal-footer-right"]}>
                    <Space>
                      {props.queue.items.length > 1 && (
                        <>
                          <span class={styles["modal-num"]}>
                            {props.queue.currentIndex + 1}/{props.queue.items.length}
                          </span>
                          <Button class={styles["footer-button"]} disabled={props.queue.currentIndex === 0} onClick={handlePre}>
                            上一条
                          </Button>
                          <Button
                            class={styles["footer-button"]}
                            disabled={props.queue.currentIndex === props.queue.items.length - 1}
                            onClick={handleNext}
                          >
                            下一条
                          </Button>
                        </>
                      )}
                      {props.showLocateButton && (
                        <Button class={styles["footer-button"]} onClick={locateToDevice}>
                          定位
                        </Button>
                      )}
                      {showDetailButton.value && (
                        <Button class={styles["footer-detail-button"]} type="primary" onClick={handleDetail}>
                          详情
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    };
  },
});
