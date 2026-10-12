import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";

import { useQiankunMountStatusStore } from "./qiankun-mount-status";

describe("useQiankunMountStatusStore", () => {
  test("初始态是 idle", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    expect(store.status).toBe("idle");
  });

  test("idle → loading → mounted：beforeLoad 触发 toLoading，afterMount 触发 toMounted", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    store.toLoading();
    expect(store.status).toBe("loading");
    store.toMounted();
    expect(store.status).toBe("mounted");
  });

  test("idle → loading → error：加载中遇到全局未捕获错误触发 toError", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    store.toLoading();
    store.toError();
    expect(store.status).toBe("error");
  });

  test("mounted 之后再触发 toError 不应该把已挂载成功的状态打回 error（与加载过程无关的运行时错误不应该污染状态）", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    store.toLoading();
    store.toMounted();
    store.toError();
    expect(store.status).toBe("mounted");
  });

  test("idle 态下直接触发 toError 是 no-op（没有正在加载的东西，不应该出现 error 态）", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    store.toError();
    expect(store.status).toBe("idle");
  });

  test("reset 把状态打回 idle，供重新加载场景复用", () => {
    setActivePinia(createPinia());
    const store = useQiankunMountStatusStore();
    store.toLoading();
    store.toError();
    store.reset();
    expect(store.status).toBe("idle");
  });
});
