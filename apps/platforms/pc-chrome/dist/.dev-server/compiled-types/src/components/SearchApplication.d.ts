import { type PropType } from "vue";
import type { NavigationMenuNode } from "./top-bar-types";
import "./SearchApplication.css";
/**
 * ⌘/Ctrl+F → 应用搜索；加 Shift 不拦截，留给浏览器页内查找。
 * 用 `code`（物理键）兼看 `key`，避免输入法下 key 不稳定。
 */
export declare function isAppSearchHotkey(event: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">): boolean;
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
export declare function flattenSearchEntries(nodes: NavigationMenuNode[], inheritedIcon?: string, groupLabel?: string): SearchEntry[];
/** 保持首次出现顺序，把扁平结果收成分段。 */
export declare function groupSearchEntries(entries: SearchEntry[]): SearchEntryGroup[];
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        default: () => never[];
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "navigate"[], "navigate", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        default: () => never[];
    };
}>> & Readonly<{
    onNavigate?: ((...args: any[]) => any) | undefined;
}>, {
    menuTree: NavigationMenuNode[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=SearchApplication.d.ts.map