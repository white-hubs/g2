import { onBeforeUnmount } from "vue";

import type { AuthState } from "@/api/auth-store";
import { authStore } from "@/api/auth-store";
import {
  type DeviceRealtimeTarget,
  type DeviceRealtimeUpdate,
  deviceRealtimeTargetKey,
  normalizeDeviceRealtimeTargets,
  parseDeviceRealtimeUpdates,
} from "@/utils/device-realtime-updates";

interface RealtimeSubscriber {
  targets: DeviceRealtimeTarget[];
  onUpdates: (updates: DeviceRealtimeUpdate[]) => void;
}

interface RealtimeSocketMessage {
  msgType?: string;
  content?: unknown;
}

const CLOSE_NORMAL = 1000;
const HEARTBEAT_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 5_000;
const SUBSCRIPTION_TTL_SECONDS = 500 * 60;
const SUBSCRIPTION_REFRESH_MS = 5 * 60 * 1000;

interface DeviceRealtimeHubOptions {
  createSocket?: (url: string) => WebSocket;
  getAuth?: () => AuthState;
  resolveSocketUrl?: (auth: AuthState) => string;
}

export class DeviceRealtimeHub {
  private readonly subscribers = new Map<symbol, RealtimeSubscriber>();
  private socket: WebSocket | undefined;
  private subscriptionId = "";
  private subscriptionPending = false;
  private welcomed = false;
  private lastSentTargetKey = "";
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private syncQueued = false;

  private readonly createSocket: (url: string) => WebSocket;
  private readonly getAuth: () => AuthState;
  private readonly resolveSocketUrl: (auth: AuthState) => string;

  public constructor(options: DeviceRealtimeHubOptions = {}) {
    this.createSocket = options.createSocket ?? ((url) => new WebSocket(url));
    this.getAuth = options.getAuth ?? (() => authStore);
    this.resolveSocketUrl =
      options.resolveSocketUrl ??
      ((auth) => {
        const protocol = location.protocol === "http:" ? "ws:" : "wss:";
        const url = new URL(`${protocol}//${location.host}/api/iot/websocket/subscribe`);
        url.searchParams.set("terminal", String(auth.terminal));
        url.searchParams.set("token", auth.token);
        url.searchParams.set("tenant", String(auth.tenant));
        return url.toString();
      });
  }

  public subscribe(onUpdates: RealtimeSubscriber["onUpdates"]): {
    setTargets: (targets: DeviceRealtimeTarget[]) => void;
    stop: () => void;
  } {
    const id = Symbol("device-realtime-subscriber");
    this.subscribers.set(id, { targets: [], onUpdates });
    return {
      setTargets: (targets) => {
        const subscriber = this.subscribers.get(id);
        if (!subscriber) {
          return;
        }
        const nextTargets = normalizeDeviceRealtimeTargets(targets);
        const currentKey = subscriber.targets.map(deviceRealtimeTargetKey).toSorted().join("|");
        const nextKey = nextTargets.map(deviceRealtimeTargetKey).toSorted().join("|");
        if (currentKey === nextKey) {
          return;
        }
        subscriber.targets = nextTargets;
        this.requestSync();
      },
      stop: () => {
        if (!this.subscribers.delete(id)) {
          return;
        }
        this.requestSync();
      },
    };
  }

  private get targets(): DeviceRealtimeTarget[] {
    return normalizeDeviceRealtimeTargets([...this.subscribers.values()].flatMap((subscriber) => subscriber.targets));
  }

  private requestSync(): void {
    if (this.syncQueued) {
      return;
    }
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      this.sync();
    });
  }

  private sync(): void {
    const targets = this.targets;
    if (targets.length === 0) {
      this.disposeSocket();
      return;
    }
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
      this.connect();
      return;
    }
    if (this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscription(targets);
    }
  }

  private connect(): void {
    const auth = this.getAuth();
    if (!auth.token || this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }
    this.clearReconnect();
    const socket = this.createSocket(this.resolveSocketUrl(auth));
    this.socket = socket;
    this.welcomed = false;
    socket.onopen = () => {
      this.startHeartbeat();
    };
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = undefined;
      }
      this.stopTimers();
      this.subscriptionId = "";
      this.subscriptionPending = false;
      this.welcomed = false;
      this.lastSentTargetKey = "";
      if (this.targets.length > 0) {
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(raw: unknown): void {
    let message: RealtimeSocketMessage;
    try {
      message = JSON.parse(String(raw)) as RealtimeSocketMessage;
    } catch {
      return;
    }
    if (message.msgType === "SUBSCRIBE" && message.content != null) {
      this.subscriptionId = String(message.content);
      this.subscriptionPending = false;
      return;
    }
    if (message.msgType === "WELCOME") {
      if (this.welcomed) {
        return;
      }
      this.welcomed = true;
      this.startSubscriptionRefresh();
      this.sendSubscription(this.targets);
      return;
    }
    const targets = this.targets;
    const updates = parseDeviceRealtimeUpdates(message, targets);
    if (updates.length === 0) {
      return;
    }
    for (const subscriber of this.subscribers.values()) {
      const keys = new Set(subscriber.targets.map(deviceRealtimeTargetKey));
      const matched = updates.filter((update) => keys.has(deviceRealtimeTargetKey(update)));
      if (matched.length > 0) {
        try {
          subscriber.onUpdates(matched);
        } catch {
          // 单个视图的数据合并异常不应中断其他订阅方接收实时数据。
        }
      }
    }
  }

  private sendSubscription(targets: DeviceRealtimeTarget[], force = false): void {
    if (!this.welcomed || this.socket?.readyState !== WebSocket.OPEN || targets.length === 0) {
      return;
    }
    const targetKey = targets.map(deviceRealtimeTargetKey).toSorted().join("|");
    if (!force && this.subscriptionPending && this.lastSentTargetKey === targetKey) {
      return;
    }
    if (this.subscriptionId) {
      this.socket.send(JSON.stringify({ msgType: "UNSUBSCRIBE", content: this.subscriptionId }));
      this.subscriptionId = "";
    }
    this.subscriptionPending = true;
    this.lastSentTargetKey = targetKey;
    this.socket.send(
      JSON.stringify({
        msgType: "SUBSCRIBE",
        content: {
          subscribeTTSWithSecond: SUBSCRIPTION_TTL_SECONDS,
          subscribeMsgTypes: [
            {
              key: "DEVICE_PROP",
              val: {
                changeNotify: false,
                deviceIdAndPropCode: targets.map(deviceRealtimeTargetKey),
              },
            },
          ],
        },
      }),
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ msgType: "HEART_BEAT", content: Date.now() }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startSubscriptionRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(() => this.sendSubscription(this.targets, true), SUBSCRIPTION_REFRESH_MS);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.targets.length > 0) {
        this.connect();
      }
    }, RECONNECT_DELAY_MS);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private stopTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private disposeSocket(): void {
    this.clearReconnect();
    this.stopTimers();
    this.subscriptionId = "";
    this.subscriptionPending = false;
    this.welcomed = false;
    this.lastSentTargetKey = "";
    const socket = this.socket;
    this.socket = undefined;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(CLOSE_NORMAL);
    }
  }
}

const deviceRealtimeHub = new DeviceRealtimeHub();

export const useDeviceRealtime = (
  onUpdates: (updates: DeviceRealtimeUpdate[]) => void,
): {
  setTargets: (targets: DeviceRealtimeTarget[]) => void;
} => {
  const subscription = deviceRealtimeHub.subscribe(onUpdates);
  onBeforeUnmount(subscription.stop);
  return { setTargets: subscription.setTargets };
};
