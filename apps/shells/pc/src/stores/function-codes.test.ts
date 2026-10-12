import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";

import { useFunctionCodesStore } from "./function-codes";

describe("useFunctionCodesStore", () => {
  test("has() 在 codes 未加载时返回 false（保守：宁可多隐藏，不误放行）", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    expect(store.has("demo:view")).toBe(false);
  });

  test("setCodes 后 has() 能正确判断", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    store.setCodes(["demo:view", "demo:edit"]);
    expect(store.has("demo:view")).toBe(true);
    expect(store.has("demo:delete")).toBe(false);
    const snapshot = store.snapshot();
    expect([...snapshot]).toEqual(["demo:view", "demo:edit"]);
    store.setCodes(["next:view"]);
    expect([...snapshot]).toEqual(["demo:view", "demo:edit"]);
  });

  test("isDomainVisible 复用同一套 code 集合，判断 domain:{name}:visible 约定", () => {
    setActivePinia(createPinia());
    const store = useFunctionCodesStore();
    store.setCodes(["domain:fire-management:visible"]);
    expect(store.isDomainVisible("fire-management")).toBe(true);
    expect(store.isDomainVisible("other-domain")).toBe(false);
  });
});
