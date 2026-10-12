import { afterEach, describe, expect, it } from "bun:test";

const DEV_MOCK_AUTH = { tenant: 1, terminal: "test-terminal", token: "test-token" };

import { DeviceRealtimeHub } from "./use-device-realtime";
import type { DeviceRealtimeUpdate } from "@/utils/device-realtime-updates";

class FakeWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public readonly sent: string[] = [];
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  public open(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  public message(message: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(message) }));
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(code?: number): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close", { code }));
  }
}

const subscriptions: ReturnType<DeviceRealtimeHub["subscribe"]>[] = [];

afterEach(() => {
  subscriptions.splice(0).forEach((subscription) => subscription.stop());
});

describe("device realtime websocket handshake", () => {
  it("subscribes to configured overview properties only after WELCOME", async () => {
    let socket: FakeWebSocket | undefined;
    const receivedUpdates: DeviceRealtimeUpdate[][] = [];
    const hub = new DeviceRealtimeHub({
      createSocket: () => {
        socket = new FakeWebSocket();
        return socket as unknown as WebSocket;
      },
      getAuth: () => ({ ...DEV_MOCK_AUTH, tenant: 1, token: "token" }),
      resolveSocketUrl: () => "ws://example.test/api/iot/websocket/subscribe",
    });
    const subscription = hub.subscribe((updates) => receivedUpdates.push(updates));
    subscriptions.push(subscription);
    subscription.setTargets([{ deviceId: "device-1", propertyCode: "temperature" }]);
    await Promise.resolve();

    socket?.open();
    expect(socket?.sent).toEqual([]);

    socket?.message({ msgType: "WELCOME", content: "welcome" });
    expect(socket?.sent.map((item) => JSON.parse(item))).toEqual([
      {
        msgType: "SUBSCRIBE",
        content: {
          subscribeTTSWithSecond: 30_000,
          subscribeMsgTypes: [
            {
              key: "DEVICE_PROP",
              val: { changeNotify: false, deviceIdAndPropCode: ["device-1.temperature"] },
            },
          ],
        },
      },
    ]);

    socket?.message({
      msgType: "SUBSCRIBE_PUSH",
      content: JSON.stringify({
        msg: {
          deviceId: "device-1",
          updates: [{ key: "temperature", value: 26.5, collectTime: "2026-08-27 12:00:00" }],
        },
      }),
    });
    expect(receivedUpdates).toEqual([
      [
        {
          deviceId: "device-1",
          propertyCode: "temperature",
          value: 26.5,
          collectTime: "2026-08-27 12:00:00",
        },
      ],
    ]);
  });
});
