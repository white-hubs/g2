import type { EventBus } from "@g2-composition/contract";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** 对齐旧仓 message-socket：ALARM_NOTICE → 租户 / 总部分流。 */
export function routeMessageSocketPayload(bus: EventBus, raw: unknown): void {
  const message = asRecord(raw);
  if (!message) {
    return;
  }
  const msgType = typeof message.msgType === "string" ? message.msgType : "";
  if (msgType === "welcome" || msgType === "health") {
    return;
  }
  if (msgType === "COMMUNICATE_MESSAGE") {
    bus.publish("rtc-call-received", message.eventDataDTO);
    return;
  }
  if (msgType === "AUTHORITY_REFRESH_MESSAGE") {
    bus.publish("auth:authority-refresh", undefined);
    return;
  }
  if (msgType === "REMOTE_LOGIN_MESSAGE") {
    bus.publish("auth:remote-login", message.eventDataDTO);
    return;
  }

  const eventData = asRecord(message.eventDataDTO);
  const msgData = asRecord(eventData?.data) ?? asRecord(message.eventDataDTO);
  if (!msgData) {
    return;
  }

  const innerType = typeof msgData.msgType === "string" ? msgData.msgType : "";
  if (msgType === "NOTICE_MESSAGE" || innerType === "ALARM_NOTICE") {
    if (innerType === "ALARM_NOTICE" && typeof msgData.businessPrincipal === "string") {
      try {
        const alarmMessage = JSON.parse(msgData.businessPrincipal) as Record<string, unknown>;
        if (alarmMessage.marketTenant) {
          bus.publish("headquarters-alarm", msgData);
          return;
        }
        bus.publish("alarm-notice", alarmMessage);
        return;
      } catch {
        return;
      }
    }
    bus.publish("terminal-message", msgData);
  }
}

export function registerMessagingHandlers(bus: EventBus): void {
  bus.subscribe("terminal-message", (payload) => {
    const data = payload as { applicationName: string; msgContent: string; id?: string };
    bus.publish("notification:show", { title: data.applicationName, description: data.msgContent, sourceId: data.id });
  });

  bus.subscribe("message-socket:payload", (payload) => {
    routeMessageSocketPayload(bus, payload);
  });
}
