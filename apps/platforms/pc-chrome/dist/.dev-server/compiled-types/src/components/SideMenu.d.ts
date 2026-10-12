import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation";
import { type PropType } from "vue";
import "./SideMenu.css";
/**
 * 纯函数：判断 node 自身或其任意子孙节点的 path 是否等于 activePath。
 */
export declare function isAncestorActive(node: NavigationMenuNode, activePath: string): boolean;
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        required: true;
    };
    activePath: {
        type: StringConstructor;
        required: true;
    };
    /** 当前真实路由；隐藏详情页的 activePath 可能与列表页相同，仍需据此重新同步展开链。 */
    currentPath: {
        type: StringConstructor;
        default: string;
    };
    depth: {
        type: NumberConstructor;
        default: number;
    };
    keyPrefix: {
        type: StringConstructor;
        default: string;
    };
    collapsed: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("navigate" | "collapsedChange")[], "navigate" | "collapsedChange", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        required: true;
    };
    activePath: {
        type: StringConstructor;
        required: true;
    };
    /** 当前真实路由；隐藏详情页的 activePath 可能与列表页相同，仍需据此重新同步展开链。 */
    currentPath: {
        type: StringConstructor;
        default: string;
    };
    depth: {
        type: NumberConstructor;
        default: number;
    };
    keyPrefix: {
        type: StringConstructor;
        default: string;
    };
    collapsed: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    onNavigate?: ((...args: any[]) => any) | undefined;
    onCollapsedChange?: ((...args: any[]) => any) | undefined;
}>, {
    currentPath: string;
    depth: number;
    keyPrefix: string;
    collapsed: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=SideMenu.d.ts.map