import type { EventBus } from "@g2-composition/contract";
/** 对齐旧仓 message-socket：ALARM_NOTICE → 租户 / 总部分流。 */
export declare function routeMessageSocketPayload(bus: EventBus, raw: unknown): void;
export declare function registerMessagingHandlers(bus: EventBus): void;
//# sourceMappingURL=handlers.d.ts.map