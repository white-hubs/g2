import type { AuthHeaderProvider, EventBus } from "@g2-composition/contract";

const CLOSE_NORMAL = 1000;

export type MessageSocketHandle = {
  dispose: () => void;
};

function extractBearerToken(headers: Record<string, string>): string {
  const auth = headers.Authorization ?? headers.authorization ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

/**
 * 对齐旧仓 GHMessage：`/api/message2/websocket/msg`。
 * 入站帧经 bus `message-socket:payload` 交给 handlers 归一。
 */
export function startMessageSocket(options: {
  bus: EventBus;
  getAuthHeaders: AuthHeaderProvider;
  subscribeType?: string;
  createWebSocket?: (url: string) => WebSocket;
}): MessageSocketHandle | undefined {
  const headers = options.getAuthHeaders();
  const token = extractBearerToken(headers);
  const tenant = headers.tenant ?? "";
  const terminal = headers.terminal ?? "bimops-manage-web";
  if (!token) {
    return undefined;
  }

  let disposed = false;
  let ws: WebSocket | null = null;
  let healthTimer: ReturnType<typeof setInterval> | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let lockReconnect = false;
  const createWs = options.createWebSocket ?? ((url: string) => new WebSocket(url));

  const clearHealth = (): void => {
    if (healthTimer) {
      clearInterval(healthTimer);
      healthTimer = undefined;
    }
  };

  const connect = (): void => {
    if (disposed) {
      return;
    }
    const protocol = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
    const host = typeof location !== "undefined" ? location.host : "localhost";
    const subscribe = options.subscribeType ? `&subscribeType=${encodeURIComponent(options.subscribeType)}` : "";
    const url = `${protocol}://${host}/api/message2/websocket/msg?terminal=${encodeURIComponent(terminal)}&token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenant)}${subscribe}`;
    try {
      ws?.close(CLOSE_NORMAL);
    } catch {
      /* ignore */
    }
    ws = createWs(url);
    ws.onopen = () => {
      clearHealth();
      healthTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ msgType: "health", eventDataDTO: "ping" }));
        }
      }, 10_000);
    };
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as unknown;
        options.bus.publish("message-socket:payload", payload);
      } catch {
        /* ignore malformed */
      }
    };
    ws.onerror = () => {
      clearHealth();
    };
    ws.onclose = (event) => {
      clearHealth();
      if (disposed || event.code === CLOSE_NORMAL || lockReconnect) {
        return;
      }
      lockReconnect = true;
      reconnectTimer = setTimeout(() => {
        lockReconnect = false;
        connect();
      }, 5000);
    };
  };

  connect();

  return {
    dispose: () => {
      disposed = true;
      clearHealth();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      try {
        ws?.close(CLOSE_NORMAL);
      } catch {
        /* ignore */
      }
      ws = null;
    },
  };
}
