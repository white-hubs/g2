import { expect, test } from "bun:test";

import { HIDDEN_DANGER_CONTROLS } from "./components/control-catalog";
import { STREAM_ENGINE_PAGE_KEYS } from "./contract";
import { contractInfo } from "./contract-info";

test("stream-engine page library contract major is 1", () => {
  expect(contractInfo.name).toBe("stream-engine");
  expect(contractInfo.major).toBe(1);
  expect(STREAM_ENGINE_PAGE_KEYS.StreamEngineRender).toBe("StreamEngineRender");
  expect(HIDDEN_DANGER_CONTROLS.some((item) => item.id === "TargetObjectSelect")).toBe(true);
});
