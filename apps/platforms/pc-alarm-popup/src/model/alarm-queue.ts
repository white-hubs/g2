export type AlarmVideo = {
  deviceId: string;
  deviceName: string;
  token?: string;
};

export type AlarmModalItem = {
  id?: string | number;
  alarmRecordId?: string | number;
  alarmTargetKey?: string;
  alarmSnapshot?: string | Record<string, unknown>;
  businessKey: string;
  alarmTypeName?: string;
  alarmLevelName?: string;
  alarmLevelCode?: string;
  applicationName?: string;
  alarmTypeCode?: string;
  applicationCode?: string;
  alarmEventTypeName?: string;
  alarmEventName?: string;
  alarmTime?: string;
  alarmTargetName?: string;
  areaName?: string;
  marketTenant?: string;
  marketName?: string;
  alarmStatus?: string;
  businessStatus?: string;
  videoList?: AlarmVideo[];
  msgContent?: string;
  turnWarningSound?: boolean | null;
};

export type AlarmQueueState = {
  items: AlarmModalItem[];
  currentIndex: number;
};

export function createEmptyQueue(): AlarmQueueState {
  return { items: [], currentIndex: 0 };
}

export function getAlarmDetailId(alarm: Partial<AlarmModalItem> | null | undefined): string {
  for (const value of [alarm?.id, alarm?.alarmRecordId, alarm?.businessKey]) {
    const text = String(value ?? "").trim();
    if (text && text !== "undefined" && text !== "null") {
      return text;
    }
  }
  return "";
}

export function normalizeAlarmForDetail(alarm: AlarmModalItem): AlarmModalItem {
  const detailId = getAlarmDetailId(alarm);
  return {
    ...alarm,
    ...(detailId ? { id: alarm.id ?? detailId } : {}),
    alarmStatus: alarm.alarmStatus ?? alarm.businessStatus ?? "",
    videoList: alarm.videoList ?? [],
  };
}

export function addAlarmToQueue(state: AlarmQueueState, data: AlarmModalItem): { state: AlarmQueueState; index: number } {
  const nextItems = [...state.items];
  if (!nextItems.length) {
    nextItems.push(normalizeAlarmForDetail({ ...data, videoList: data.videoList ?? [] }));
    return { state: { items: nextItems, currentIndex: 0 }, index: 0 };
  }
  nextItems.push(normalizeAlarmForDetail({ ...data, videoList: data.videoList ?? [] }));
  return { state: { items: nextItems, currentIndex: state.currentIndex }, index: nextItems.length - 1 };
}

export function prevAlarmIndex(state: AlarmQueueState): AlarmQueueState {
  if (state.currentIndex <= 0) {
    return state;
  }
  return { ...state, currentIndex: state.currentIndex - 1 };
}

export function nextAlarmIndex(state: AlarmQueueState): AlarmQueueState {
  if (state.currentIndex >= state.items.length - 1) {
    return state;
  }
  return { ...state, currentIndex: state.currentIndex + 1 };
}

export function getCurrentAlarm(state: AlarmQueueState): AlarmModalItem | null {
  if (!state.items.length) {
    return null;
  }
  const index = state.currentIndex >= state.items.length ? 0 : state.currentIndex;
  return state.items[index] ?? null;
}

export function clearQueue(): AlarmQueueState {
  return createEmptyQueue();
}

export function isStorageArchiveAlarm(alarm: Partial<AlarmModalItem> | null | undefined): boolean {
  return alarm?.applicationCode === "RESERVE_MONITORING" || alarm?.alarmTypeCode === "RESERVE_MONITORING";
}

export function shouldRefreshAlarmDetail(data: Partial<AlarmModalItem>): boolean {
  if (isStorageArchiveAlarm(data)) {
    return !data.alarmSnapshot;
  }
  return !data.alarmSnapshot || !data.applicationCode;
}

export function buildAlarmDescription(alarm: AlarmModalItem | null): string {
  if (!alarm) {
    return "";
  }
  if (isStorageArchiveAlarm(alarm) && alarm.msgContent) {
    return alarm.msgContent;
  }
  return `【${alarm.alarmTargetName ?? ""}】 在 【${alarm.areaName || alarm.marketName || ""}】发生 【${alarm.alarmEventName ?? ""}】报警事件`;
}
