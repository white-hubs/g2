import { type PropType, computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { Input, Modal } from "../pc-ui-runtime";
import { BIMOPS_ICON_SEARCH, resolveStaticResourceUrl } from "../resource-api";
import type { NavigationMenuNode } from "./top-bar-types";

import "./SearchApplication.css";

/**
 * ⌘/Ctrl+F → 应用搜索；加 Shift 不拦截，留给浏览器页内查找。
 * 用 `code`（物理键）兼看 `key`，避免输入法下 key 不稳定。
 */
export function isAppSearchHotkey(event: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">): boolean {
  const isF = event.code === "KeyF" || event.key.toLowerCase() === "f";
  if (!isF) {
    return false;
  }
  if (event.shiftKey || event.altKey) {
    return false;
  }
  return event.metaKey || event.ctrlKey;
}

interface SearchEntry {
  label: string;
  path: string;
  /** 结果分段标题：根级有 path 的入口归「快捷」，其余归一级应用名。 */
  group: string;
  /** 自身 icon，或从一级应用继承（对齐旧仓「搜应用」带图）。 */
  icon?: string;
  pinyinFull?: string;
  pinyinInitial?: string;
}

export interface SearchEntryGroup {
  group: string;
  items: SearchEntry[];
}

/** 扁平化可跳转节点；子菜单继承最近祖先的应用 icon。不依赖 pinyin-pro（避免拖垮 TopBar MF 加载）。 */
export function flattenSearchEntries(nodes: NavigationMenuNode[], inheritedIcon?: string, groupLabel = "快捷"): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const node of nodes) {
    const icon = typeof node.icon === "string" && node.icon.trim() ? node.icon.trim() : inheritedIcon;
    if (node.path) {
      const entry: SearchEntry = { label: node.label, path: node.path, group: groupLabel };
      if (icon) {
        entry.icon = icon;
      }
      entries.push(entry);
    }
    if (node.children?.length) {
      // 进入一级应用子树时，用该应用名作为后续叶子的分组
      const childGroup = groupLabel === "快捷" ? node.label : groupLabel;
      entries.push(...flattenSearchEntries(node.children, icon, childGroup));
    }
  }
  return entries;
}

/** 保持首次出现顺序，把扁平结果收成分段。 */
export function groupSearchEntries(entries: SearchEntry[]): SearchEntryGroup[] {
  const groups: SearchEntryGroup[] = [];
  const indexByGroup = new Map<string, number>();
  for (const entry of entries) {
    const existing = indexByGroup.get(entry.group);
    if (existing === undefined) {
      indexByGroup.set(entry.group, groups.length);
      groups.push({ group: entry.group, items: [entry] });
    } else {
      groups[existing]!.items.push(entry);
    }
  }
  return groups;
}

export default defineComponent({
  name: "SearchApplication",
  props: {
    menuTree: { type: Array as PropType<NavigationMenuNode[]>, default: () => [] },
  },
  emits: ["navigate"],
  setup(props, { emit }) {
    const open = ref(false);
    const keyword = ref("");
    const iconSearch = resolveStaticResourceUrl(BIMOPS_ICON_SEARCH);
    /** 打开搜索后才挂拼音索引，避免 platform/TopBar 静态依赖 pinyin-pro 导致壳层白屏。 */
    const indexedEntries = ref<SearchEntry[]>([]);
    const indexReady = ref(false);

    const baseEntries = computed(() => flattenSearchEntries(props.menuTree));

    async function ensurePinyinIndex(): Promise<void> {
      try {
        const { buildSearchMatchable } = await import("./search-application-match");
        indexedEntries.value = baseEntries.value.map((entry) => {
          const matchable = buildSearchMatchable(entry.label);
          return {
            ...entry,
            pinyinFull: matchable.pinyinFull,
            pinyinInitial: matchable.pinyinInitial,
          };
        });
        indexReady.value = true;
      } catch {
        // 拼音包加载失败时仍可中文搜索，不阻断面板
        indexReady.value = false;
      }
    }

    const filtered = computed(() => {
      const raw = keyword.value;
      const source = indexReady.value ? indexedEntries.value : baseEntries.value;
      if (!raw.trim()) {
        return source;
      }
      if (!indexReady.value) {
        // 拼音模块尚未就绪时先走中文/大小写 includes，避免空窗
        const normalized = raw.trim().toLowerCase();
        return source.filter((entry) => entry.label.includes(raw.trim()) || entry.label.toLowerCase().includes(normalized));
      }
      // 同步路径：索引已带 pinyin 字段，内联匹配逻辑避免再 async
      const normalized = raw.trim().toLowerCase();
      return source.filter((entry) => {
        const nameHit = entry.label.includes(raw.trim()) || entry.label.toLowerCase().includes(normalized);
        const pinyinFull = entry.pinyinFull ?? "";
        const pinyinInitial = entry.pinyinInitial ?? "";
        const pinyinFullHit = pinyinFull.includes(normalized);
        const pinyinInitialHit = pinyinInitial.includes(normalized);
        const fuzzy = (target: string): boolean => {
          if (!normalized) {
            return true;
          }
          let i = 0;
          for (const char of normalized) {
            i = target.indexOf(char, i);
            if (i === -1) {
              return false;
            }
            i += 1;
          }
          return true;
        };
        return nameHit || pinyinFullHit || pinyinInitialHit || fuzzy(entry.label.toLowerCase()) || fuzzy(pinyinFull);
      });
    });

    const filteredGroups = computed(() => groupSearchEntries(filtered.value));

    function focusSearchInput(): void {
      void nextTick(() => {
        const input = document.querySelector<HTMLInputElement>(".pc-chrome-search-application-modal .ant-input");
        input?.focus();
      });
    }

    function openSearch(): void {
      keyword.value = "";
      // 立刻展开面板（不阻塞 TopBar/壳层）；拼音索引后台挂上
      open.value = true;
      void ensurePinyinIndex();
      focusSearchInput();
    }

    function close(): void {
      open.value = false;
    }

    function handleSelect(entry: SearchEntry): void {
      emit("navigate", entry.path);
      close();
    }

    function onDocumentKeydown(event: KeyboardEvent): void {
      // ESC：capture 显式关（焦点在 Input 时 antdv Modal keyboard 不可靠）
      if (open.value && (event.key === "Escape" || event.code === "Escape")) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (!isAppSearchHotkey(event)) {
        return;
      }
      // capture 阶段抢在浏览器默认「页内查找」之前；否则 ⌘/Ctrl+F 仍会弹出系统栏
      event.preventDefault();
      event.stopPropagation();
      if (open.value) {
        focusSearchInput();
        return;
      }
      openSearch();
    }

    onMounted(() => {
      document.addEventListener("keydown", onDocumentKeydown, true);
    });
    onBeforeUnmount(() => {
      document.removeEventListener("keydown", onDocumentKeydown, true);
    });

    watch(
      () => props.menuTree,
      () => {
        if (open.value) {
          indexReady.value = false;
          void ensurePinyinIndex();
        }
      },
    );

    return () => (
      <div class="pc-chrome-search-application">
        <button
          type="button"
          class="pc-chrome-search-application-trigger tw:g2-focus-ring tw:transition-opacity tw:duration-200 tw:hover:opacity-90"
          data-testid="search-application"
          aria-label="搜索"
          onClick={openSearch}
        >
          <img class="pc-chrome-search-application-trigger__icon" src={iconSearch} alt="" />
        </button>
        <Modal
          open={open.value}
          onUpdate:open={(value: boolean) => {
            open.value = value;
          }}
          footer={null}
          closable={false}
          keyboard
          maskClosable
          destroyOnClose
          width={560}
          centered={false}
          style={{ top: "80px" }}
          class="pc-chrome-search-application-modal"
          wrapClassName="pc-chrome-search-application-modal-wrap"
        >
          <div class="pc-chrome-search-application-panel pc-chrome-search-application-panel--legacy">
            <Input
              value={keyword.value}
              onUpdate:value={(value: string) => {
                keyword.value = value;
              }}
              size="large"
              placeholder="搜索"
            />
            {filteredGroups.value.length > 0 ? (
              <div class="pc-chrome-search-application-groups">
                {filteredGroups.value.map((section) => (
                  <section key={section.group} class="pc-chrome-search-application-group">
                    <h3 class="pc-chrome-search-application-group__heading" data-testid="search-group-heading">
                      {section.group}
                    </h3>
                    <ul class="pc-chrome-search-application-results">
                      {section.items.map((item) => (
                        <li key={`${item.path}:${item.label}`} onClick={() => handleSelect(item)}>
                          {item.icon ? (
                            <img class="pc-chrome-search-application-results__icon" src={resolveStaticResourceUrl(item.icon)} alt="" />
                          ) : (
                            <span
                              class="pc-chrome-search-application-results__icon pc-chrome-search-application-results__icon--empty"
                              aria-hidden="true"
                            />
                          )}
                          <span class="pc-chrome-search-application-results__label">{item.label}</span>
                          <span class="pc-chrome-search-application-results__arrow" aria-hidden="true">
                            →
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p class="pc-chrome-search-application-empty">暂无匹配结果</p>
            )}
          </div>
        </Modal>
      </div>
    );
  },
});
