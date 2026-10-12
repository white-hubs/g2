import { beforeEach, describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";

import { useOpenTabsStore } from "./open-tabs";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("useOpenTabsStore", () => {
  test("ensureOpen 首次打开一个新路径会追加 tab 并激活它", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/workspace", "工作台");
    expect(store.tabs).toEqual([{ id: "/workspace", label: "工作台", path: "/workspace" }]);
    expect(store.activeId).toBe("/workspace");
  });

  test("ensureOpen 对已开过的路径只切换激活态，不重复追加", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/workspace", "工作台");
    store.ensureOpen("/tickets", "工单管理");
    store.ensureOpen("/workspace", "工作台");
    expect(store.tabs).toHaveLength(2);
    expect(store.activeId).toBe("/workspace");
  });

  test("activate 切换到已存在的 tab 并返回其 path；不存在的 id 返回 undefined", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/workspace", "工作台");
    store.ensureOpen("/tickets", "工单管理");

    expect(store.activate("/workspace")).toBe("/workspace");
    expect(store.activeId).toBe("/workspace");
    expect(store.activate("/not-exist")).toBeUndefined();
  });

  test("close 关闭非激活 tab：只改列表，不返回导航目标", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/workspace", "工作台");
    store.ensureOpen("/tickets", "工单管理");
    store.activate("/workspace");

    const result = store.close("/tickets");
    expect(result).toBeUndefined();
    expect(store.tabs.map((tab) => tab.id)).toEqual(["/workspace"]);
    expect(store.activeId).toBe("/workspace");
  });

  test("close 关闭当前激活 tab：激活相邻 tab（同索引位置）并返回其 path 供导航", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/a", "A");
    store.ensureOpen("/b", "B");
    store.ensureOpen("/c", "C");
    store.activate("/b");

    const result = store.close("/b");
    expect(result).toBe("/c");
    expect(store.activeId).toBe("/c");
    expect(store.tabs.map((tab) => tab.id)).toEqual(["/a", "/c"]);
  });

  test("close 关闭当前激活的最后一个 tab：越界时回退到新列表的最后一个", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/a", "A");
    store.ensureOpen("/b", "B");
    store.activate("/b");

    const result = store.close("/b");
    expect(result).toBe("/a");
    expect(store.activeId).toBe("/a");
  });

  test("close 关闭唯一剩下且激活的 tab：列表清空，回退到首页 /", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/only", "唯一页面");

    const result = store.close("/only");
    expect(result).toBe("/");
    expect(store.tabs).toEqual([]);
    expect(store.activeId).toBe("");
  });

  test("closeOthers 只保留传入 id 对应的 tab", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/a", "A");
    store.ensureOpen("/b", "B");
    store.ensureOpen("/c", "C");

    store.closeOthers("/b");
    expect(store.tabs.map((tab) => tab.id)).toEqual(["/b"]);
    expect(store.activeId).toBe("/b");
  });

  test("closeToRight 保留 id 及其左侧，关闭右侧全部", () => {
    const store = useOpenTabsStore();
    store.ensureOpen("/a", "A");
    store.ensureOpen("/b", "B");
    store.ensureOpen("/c", "C");
    store.ensureOpen("/d", "D");

    store.closeToRight("/b");
    expect(store.tabs.map((tab) => tab.id)).toEqual(["/a", "/b"]);
  });
});
