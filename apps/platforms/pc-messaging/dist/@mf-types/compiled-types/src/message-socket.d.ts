import type { AuthHeaderProvider, EventBus } from "@g2-composition/contract";
export type MessageSocketHandle = {
    dispose: () => void;
};
/**
 * 对齐旧仓 GHMessage：`/api/message2/websocket/msg`。
 * 入站帧经 bus `message-socket:payload` 交给 handlers 归一。
 */
export declare function startMessageSocket(options: {
    bus: EventBus;
    getAuthHeaders: AuthHeaderProvider;
    subscribeType?: string;
    createWebSocket?: (url: string) => WebSocket;
}): MessageSocketHandle | undefined;
//# sourceMappingURL=message-socket.d.ts.map