import type { EventBus } from "@g2-composition/contract";

import { buildHeadquartersIframeUrl, parseHeadquartersAlarmPayload } from "./headquarters/iframe-url";
import { DEFAULT_ALARM_AUDIO, resolveAudioFromConfig, shouldPlayAlarmAudio, type AlarmLevelPlayConfig } from "./model/alarm-audio";
import type { AlarmModalItem, AlarmQueueState } from "./model/alarm-queue";
import { addAlarmToQueue, clearQueue, createEmptyQueue, shouldRefreshAlarmDetail } from "./model/alarm-queue";

export type AlarmCenterApi = {
  getAlarmDetails: (businessKey: string) => Promise<Record<string, unknown>>;
  getVideoListByEventId: (businessKey: string) => Promise<unknown>;
  getAlarmLevelPlayConfig: (query: { alarmLevelCode: string }) => Promise<AlarmLevelPlayConfig>;
  getAlarmRecordDetail: (businessKey: string) => Promise<{ alarmStatus?: string }>;
};

export type DeviceCenterApi = {
  getDeviceIotDetail: (deviceId: string, query?: { withSnapShot?: boolean; withPropertySpec?: boolean }) => Promise<unknown>;
};

export type AlarmAudioState = {
  audioUrl: string;
  looped: boolean;
  playNum: number;
  shouldPlay: boolean;
  playCount: number;
};

export type HeadquartersMarketApi = {
  getMarketConfig: (id: string) => Promise<{ marketName?: string; url?: string; account?: string; password?: string }>;
};

export type AlarmPopupConfig = {
  intentCodes: string[];
  showLocateButton: boolean;
};

export type OverlayView =
  | { mode: "idle" }
  | { mode: "tenant"; queue: AlarmQueueState }
  | { mode: "headquarters"; iframeUrl: string; alarmDetails: Record<string, unknown>; visible: boolean };

export type AlarmPopupController = {
  getView: () => OverlayView;
  getAudioState: () => AlarmAudioState;
  subscribe: (listener: () => void) => () => void;
  closeTenant: () => void;
  closeHeadquarters: () => void;
  handleTenantAlarm: (raw: unknown) => Promise<void>;
  handleHeadquartersAlarm: (msgData: unknown) => Promise<void>;
  refreshAudioForAlarm: (alarm: AlarmModalItem) => Promise<void>;
  resetAudioPlayCount: () => void;
  incrementAudioPlayCount: () => void;
  updateQueueItem: (index: number, patch: Partial<AlarmModalItem>) => void;
  setQueue: (queue: AlarmQueueState) => void;
  setHeadquartersVisible: (visible: boolean) => void;
};

type Listener = () => void;

function createDefaultAudioState(): AlarmAudioState {
  return {
    audioUrl: DEFAULT_ALARM_AUDIO,
    looped: false,
    playNum: 1,
    shouldPlay: false,
    playCount: 0,
  };
}

function asAlarmItem(raw: unknown): AlarmModalItem | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const businessKey = String(record.businessKey ?? record.id ?? "").trim();
  if (!businessKey) {
    return null;
  }
  return {
    ...(record as AlarmModalItem),
    businessKey,
    videoList: Array.isArray(record.videoList) ? (record.videoList as AlarmModalItem["videoList"]) : [],
  };
}

export function createAlarmPopupController(deps: {
  bus: EventBus;
  alarmCenter: AlarmCenterApi;
  headquartersMarket: HeadquartersMarketApi;
  config: AlarmPopupConfig;
}): AlarmPopupController {
  let view: OverlayView = { mode: "idle" };
  let audioState = createDefaultAudioState();
  const listeners = new Set<Listener>();
  const statusTimers = new Map<string, ReturnType<typeof setInterval>>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const clearStatusTimer = (businessKey: string): void => {
    const timer = statusTimers.get(businessKey);
    if (timer) {
      clearInterval(timer);
      statusTimers.delete(businessKey);
    }
  };

  const clearAllStatusTimers = (): void => {
    for (const key of statusTimers.keys()) {
      clearStatusTimer(key);
    }
  };

  const startStatusPoll = (alarm: AlarmModalItem): void => {
    clearStatusTimer(alarm.businessKey);
    const timer = setInterval(async () => {
      try {
        const res = await deps.alarmCenter.getAlarmRecordDetail(alarm.businessKey);
        if (res.alarmStatus === "ALARM_HANDLER") {
          controller.closeTenant();
        }
      } catch {
        // ignore poll errors
      }
    }, 60_000);
    statusTimers.set(alarm.businessKey, timer);
  };

  const enrichAlarm = async (data: AlarmModalItem, index: number): Promise<void> => {
    if (shouldRefreshAlarmDetail(data)) {
      try {
        const detail = await deps.alarmCenter.getAlarmDetails(data.businessKey);
        // 对齐旧仓：详情合并时保留已有 videoList，避免被详情空字段盖掉。
        const existingVideoList = view.mode === "tenant" ? (view.queue.items[index]?.videoList ?? data.videoList) : data.videoList;
        controller.updateQueueItem(index, { ...data, ...detail, videoList: existingVideoList });
      } catch {
        // detail fetch must not block popup
      }
    }
    if (data.applicationCode !== "RESERVE_MONITORING" && data.alarmTypeCode !== "RESERVE_MONITORING") {
      try {
        const raw = await deps.alarmCenter.getVideoListByEventId(data.businessKey);
        const videos = (
          Array.isArray(raw)
            ? raw
            : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
              ? (raw as { data: AlarmModalItem["videoList"] }).data
              : []
        ) as AlarmModalItem["videoList"];
        // 仅在接口有数据时覆盖；失败/空列表保留推送载荷里的 videoList（对齐旧仓可本地入队）。
        if (Array.isArray(videos) && videos.length > 0) {
          controller.updateQueueItem(index, { videoList: videos });
        }
      } catch {
        // keep existing videoList
      }
    }
  };

  const refreshAudioForAlarm = async (alarm: AlarmModalItem): Promise<void> => {
    const shouldPlay = shouldPlayAlarmAudio(alarm.turnWarningSound, alarm.alarmLevelCode);
    let next = { ...createDefaultAudioState(), shouldPlay };
    if (alarm.turnWarningSound) {
      try {
        const config = await deps.alarmCenter.getAlarmLevelPlayConfig({
          alarmLevelCode: alarm.alarmLevelCode ?? "",
        });
        const resolved = resolveAudioFromConfig(config);
        next = { ...next, ...resolved };
      } catch {
        // keep default audio url
      }
    }
    audioState = { ...next, playCount: 0 };
    notify();
  };

  const controller: AlarmPopupController = {
    getView: () => view,
    getAudioState: () => audioState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    closeTenant() {
      clearAllStatusTimers();
      audioState = createDefaultAudioState();
      view = { mode: "idle" };
      notify();
    },
    closeHeadquarters() {
      view = { mode: "idle" };
      notify();
    },
    updateQueueItem(index, patch) {
      if (view.mode !== "tenant") {
        return;
      }
      const items = [...view.queue.items];
      const existing = items[index];
      if (!existing) {
        return;
      }
      items[index] = { ...existing, ...patch };
      view = { mode: "tenant", queue: { ...view.queue, items } };
      notify();
    },
    setQueue(queue) {
      view = { mode: "tenant", queue };
      notify();
    },
    setHeadquartersVisible(visible) {
      if (view.mode === "headquarters") {
        view = { ...view, visible };
        notify();
      }
    },
    async refreshAudioForAlarm(alarm) {
      await refreshAudioForAlarm(alarm);
    },
    resetAudioPlayCount() {
      audioState = { ...audioState, playCount: 0 };
      notify();
    },
    incrementAudioPlayCount() {
      audioState = { ...audioState, playCount: audioState.playCount + 1 };
    },
    async handleTenantAlarm(raw) {
      const data = asAlarmItem(raw);
      if (!data) {
        return;
      }
      const prev = view.mode === "tenant" ? view.queue : createEmptyQueue();
      const { state, index } = addAlarmToQueue(prev, data);
      view = { mode: "tenant", queue: state };
      notify();
      startStatusPoll(data);
      void enrichAlarm(data, index);
      await refreshAudioForAlarm(data);
    },
    async handleHeadquartersAlarm(msgData) {
      const envelope = msgData as Record<string, unknown>;
      const alarmMessage = parseHeadquartersAlarmPayload(envelope);
      if (!alarmMessage) {
        return;
      }
      const marketTenant = String(alarmMessage.marketTenant ?? "").trim();
      if (!marketTenant) {
        return;
      }
      const config = await deps.headquartersMarket.getMarketConfig(marketTenant);
      alarmMessage.applicationName = config.marketName ?? alarmMessage.applicationName;
      const iframeUrl = buildHeadquartersIframeUrl(config, String(alarmMessage.businessKey ?? ""));
      view = { mode: "headquarters", iframeUrl, alarmDetails: alarmMessage, visible: false };
      notify();
    },
  };

  return controller;
}

export function registerAlarmPopupHandlers(
  bus: EventBus,
  controller: Pick<AlarmPopupController, "handleTenantAlarm" | "handleHeadquartersAlarm">,
): () => void {
  const unsubAlarm = bus.subscribe("alarm-notice", (payload) => {
    void controller.handleTenantAlarm(payload);
  });
  const unsubHq = bus.subscribe("headquarters-alarm", (payload) => {
    void controller.handleHeadquartersAlarm(payload);
  });
  return () => {
    unsubAlarm();
    unsubHq();
  };
}

export { clearQueue };
