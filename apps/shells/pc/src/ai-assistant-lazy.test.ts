import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { AI_ASSISTANT_ACTION_ID, AI_ASSISTANT_OPEN_REQUESTED_EVENT, registerAiAssistantPlaceholder } from "./ai-assistant-lazy";

describe("registerAiAssistantPlaceholder", () => {
  test("经 chrome 总线注册 ai-assistant 占位 action", () => {
    const bus = createFakeBus();
    const published: unknown[] = [];
    bus.subscribe("chrome:register-top-bar-action", (payload) => published.push(payload));

    registerAiAssistantPlaceholder(bus, async () => {});

    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ id: AI_ASSISTANT_ACTION_ID });
  });

  test("导出的打开事件名供 pc-ai-assistant 订阅", () => {
    expect(AI_ASSISTANT_OPEN_REQUESTED_EVENT).toBe("ai-assistant:open-requested");
  });
});
