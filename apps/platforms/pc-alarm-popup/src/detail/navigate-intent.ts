import type { AlarmModalItem } from "../model/alarm-queue";
import { getAlarmDetailId } from "../model/alarm-queue";

export type NavigateIntentPayload = {
  code: string;
  params: {
    entry: "alarmDetail";
    id: string;
    businessKey: string;
    deviceId?: string;
  };
};

export type DetailNavigateResult = { ok: true; intent: NavigateIntentPayload } | { ok: false; reason: "empty-code" | "not-allowed" };

export function isApplicationCodeNavigable(code: string | undefined, allowedCodes: readonly string[]): boolean {
  const normalized = String(code ?? "").trim();
  if (!normalized) {
    return false;
  }
  return allowedCodes.includes(normalized);
}

export function buildDetailNavigateIntent(alarm: AlarmModalItem, allowedCodes: readonly string[]): DetailNavigateResult {
  const code = String(alarm.applicationCode ?? "").trim();
  if (!code) {
    return { ok: false, reason: "empty-code" };
  }
  if (!isApplicationCodeNavigable(code, allowedCodes)) {
    return { ok: false, reason: "not-allowed" };
  }
  const id = getAlarmDetailId(alarm);
  return {
    ok: true,
    intent: {
      code,
      params: {
        entry: "alarmDetail",
        id,
        businessKey: alarm.businessKey,
        deviceId: alarm.alarmTargetKey,
      },
    },
  };
}
