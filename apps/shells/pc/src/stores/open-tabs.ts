import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * 顶部多标签页的真实数据源（对齐旧仓 `NavTabs.vue` 里 `watch(route.path, ...)` 的核心语义）：
 * 每次路由变化，如果目标路径已经开着一个 tab 就直接激活它，否则在有对应菜单节点匹配时新开一个 tab。
 * `id` 直接用 `path` 本身（同一路径只会有一个 tab，天然去重，不需要额外生成唯一 id）。
 *
 * 与旧仓的一个已知差异：旧仓只有能在 `currentMenus`（当前应用菜单）里匹配到节点的路径才会开 tab，
 * 匹配不到时不开——这里同样只在 `ensureOpen` 的调用方（`App.ts`）确认有菜单节点匹配时才调用，
 * store 本身不做匹配判断（不依赖 `usePortalNavigationStore`，避免这层持久状态跨 store 耦合）。
 */
export interface OpenTab {
  id: string;
  label: string;
  path: string;
}

export const useOpenTabsStore = defineStore("openTabs", () => {
  const tabs = ref<OpenTab[]>([]);
  const activeId = ref("");

  /** 路径已开 tab 则只切换激活态；否则追加一个新 tab 并激活它。 */
  function ensureOpen(path: string, label: string): void {
    const existing = tabs.value.find((tab) => tab.path === path);
    if (existing) {
      activeId.value = existing.id;
      return;
    }
    const tab: OpenTab = { id: path, label, path };
    tabs.value = [...tabs.value, tab];
    activeId.value = tab.id;
  }

  /** 点击非激活 tab：切换激活态，返回对应 path 供调用方执行真正的路由跳转。 */
  function activate(id: string): string | undefined {
    const tab = tabs.value.find((item) => item.id === id);
    if (!tab) {
      return undefined;
    }
    activeId.value = tab.id;
    return tab.path;
  }

  /**
   * 关闭一个 tab。如果关的不是当前激活 tab，只做列表变更，不需要导航。
   * 如果关的正是当前激活 tab（对齐旧仓 `removeTab` 逻辑）：优先激活同一位置（原索引，若越界则取新列表最后一个）
   * 的相邻 tab 并返回它的 path 供调用方导航过去；如果关掉后列表空了，把 `activeId` 清空并返回 `"/"`
   * （回退到首页，因为已经没有任何标签页可以停留了）。
   */
  function close(id: string): string | undefined {
    const index = tabs.value.findIndex((item) => item.id === id);
    if (index === -1) {
      return undefined;
    }
    const wasActive = activeId.value === id;
    const next = tabs.value.slice();
    next.splice(index, 1);
    tabs.value = next;

    if (!wasActive) {
      return undefined;
    }
    if (next.length === 0) {
      activeId.value = "";
      return "/";
    }
    const fallbackIndex = index >= next.length ? next.length - 1 : index;
    const fallback = next[fallbackIndex] as OpenTab;
    activeId.value = fallback.id;
    return fallback.path;
  }

  /** 保留 `id` 对应的 tab，关闭其余全部（对齐旧仓"关闭其他"）。`id` 传入的应是当前 activeId，关闭后它仍是激活态。 */
  function closeOthers(id: string): void {
    const keep = tabs.value.find((item) => item.id === id);
    tabs.value = keep ? [keep] : [];
    activeId.value = keep ? keep.id : "";
  }

  /** 保留 `id` 及其左侧的 tab，关闭右侧全部（对齐旧仓"关闭到右侧"）。`id` 传入的应是当前 activeId。 */
  function closeToRight(id: string): void {
    const index = tabs.value.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    tabs.value = tabs.value.slice(0, index + 1);
  }

  return { tabs, activeId, ensureOpen, activate, close, closeOthers, closeToRight };
});
