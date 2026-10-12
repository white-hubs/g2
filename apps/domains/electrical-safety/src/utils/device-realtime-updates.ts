export interface DeviceRealtimeTarget {
  deviceId: string;
  propertyCode: string;
}

export interface DeviceRealtimeUpdate extends DeviceRealtimeTarget {
  value: unknown;
  status?: "NORMAL" | "WARNING" | "ALARM" | "UNKNOWN";
  collectTime?: string | null;
}

interface SocketMessage {
  msgType?: unknown;
  content?: unknown;
}

const REALTIME_STATUSES = new Set(["NORMAL", "WARNING", "ALARM", "UNKNOWN"]);

export const deviceRealtimeTargetKey = (target: DeviceRealtimeTarget): string => `${target.deviceId}.${target.propertyCode}`;

export const normalizeDeviceRealtimeTargets = (targets: DeviceRealtimeTarget[]): DeviceRealtimeTarget[] => [
  ...new Map(
    targets.flatMap((target) => {
      const deviceId = String(target.deviceId ?? "").trim();
      const propertyCode = String(target.propertyCode ?? "").trim();
      return deviceId && propertyCode ? [[`${deviceId}.${propertyCode}`, { deviceId, propertyCode }] as const] : [];
    }),
  ).values(),
];

const parseObject = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      return parseObject(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const resolveTarget = (rawKey: string, explicitDeviceId: string, targets: DeviceRealtimeTarget[]): DeviceRealtimeTarget | null => {
  if (explicitDeviceId) {
    const propertyCode = rawKey.startsWith(`${explicitDeviceId}.`) ? rawKey.slice(explicitDeviceId.length + 1) : rawKey;
    return targets.find((target) => target.deviceId === explicitDeviceId && target.propertyCode === propertyCode) ?? null;
  }

  const exact = targets.find((target) => deviceRealtimeTargetKey(target) === rawKey);
  if (exact) {
    return exact;
  }

  const candidates = targets.filter((target) => target.propertyCode === rawKey);
  return candidates.length === 1 ? candidates[0] : null;
};

/** 兼容物联推送中 `msg.deviceId + updates[].key` 和完整 `deviceId.propCode` 两种键格式。 */
export const parseDeviceRealtimeUpdates = (message: SocketMessage, subscribedTargets: DeviceRealtimeTarget[]): DeviceRealtimeUpdate[] => {
  if (message.msgType !== "SUBSCRIBE_PUSH") {
    return [];
  }
  const content = parseObject(message.content);
  const payload = parseObject(content?.msg);
  const updates = Array.isArray(payload?.updates) ? payload.updates : [];
  const messageDeviceId = payload?.deviceId == null ? "" : String(payload.deviceId).trim();
  const targets = normalizeDeviceRealtimeTargets(subscribedTargets);

  return updates.flatMap((rawUpdate) => {
    const update = parseObject(rawUpdate);
    if (!update || update.key == null) {
      return [];
    }
    const rawKey = String(update.key).trim();
    const updateDeviceId = update.deviceId == null ? messageDeviceId : String(update.deviceId).trim();
    const target = resolveTarget(rawKey, updateDeviceId, targets);
    if (!target) {
      return [];
    }
    const status = typeof update.status === "string" && REALTIME_STATUSES.has(update.status) ? update.status : undefined;
    const collectTimeValue = update.collectTime ?? update.timestamp;
    const parsed: DeviceRealtimeUpdate = {
      ...target,
      value: update.value,
    };
    if (status) {
      parsed.status = status as NonNullable<DeviceRealtimeUpdate["status"]>;
    }
    if (collectTimeValue != null) {
      parsed.collectTime = String(collectTimeValue);
    }
    return [parsed];
  });
};
