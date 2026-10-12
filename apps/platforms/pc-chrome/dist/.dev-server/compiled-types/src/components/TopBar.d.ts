import { type PropType } from "vue";
import type { ApplicationEntryGroup, NavigationMenuNode, OutsideTenantOption, TenantOption, TerminalEntry } from "./top-bar-types";
import "./TopBar.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    tenantName: {
        type: StringConstructor;
        required: true;
    };
    userName: {
        type: StringConstructor;
        required: true;
    };
    logoUrl: {
        type: StringConstructor;
        required: false;
    };
    displayGroups: {
        type: PropType<ApplicationEntryGroup[]>;
        default: () => never[];
    };
    activeGroupKey: {
        type: StringConstructor;
        default: string;
    };
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        default: () => never[];
    };
    terminalEntries: {
        type: PropType<TerminalEntry[]>;
        required: false;
    };
    tenants: {
        type: PropType<TenantOption[]>;
        default: () => never[];
    };
    outsideTenants: {
        type: PropType<OutsideTenantOption[]>;
        default: () => never[];
    };
    currentTenantCode: {
        type: StringConstructor;
        default: string;
    };
    showTenantSwitch: {
        type: BooleanConstructor;
        default: boolean;
    };
    onSelectTenant: {
        type: PropType<(tenant: TenantOption) => void | Promise<void>>;
        required: false;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("navigate" | "selectGroup" | "skinChange" | "selectTerminal" | "logout" | "navigatePersonManage")[], "navigate" | "selectGroup" | "skinChange" | "selectTerminal" | "logout" | "navigatePersonManage", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    tenantName: {
        type: StringConstructor;
        required: true;
    };
    userName: {
        type: StringConstructor;
        required: true;
    };
    logoUrl: {
        type: StringConstructor;
        required: false;
    };
    displayGroups: {
        type: PropType<ApplicationEntryGroup[]>;
        default: () => never[];
    };
    activeGroupKey: {
        type: StringConstructor;
        default: string;
    };
    menuTree: {
        type: PropType<NavigationMenuNode[]>;
        default: () => never[];
    };
    terminalEntries: {
        type: PropType<TerminalEntry[]>;
        required: false;
    };
    tenants: {
        type: PropType<TenantOption[]>;
        default: () => never[];
    };
    outsideTenants: {
        type: PropType<OutsideTenantOption[]>;
        default: () => never[];
    };
    currentTenantCode: {
        type: StringConstructor;
        default: string;
    };
    showTenantSwitch: {
        type: BooleanConstructor;
        default: boolean;
    };
    onSelectTenant: {
        type: PropType<(tenant: TenantOption) => void | Promise<void>>;
        required: false;
    };
}>> & Readonly<{
    onNavigate?: ((...args: any[]) => any) | undefined;
    onSelectGroup?: ((...args: any[]) => any) | undefined;
    onSkinChange?: ((...args: any[]) => any) | undefined;
    onSelectTerminal?: ((...args: any[]) => any) | undefined;
    onLogout?: ((...args: any[]) => any) | undefined;
    onNavigatePersonManage?: ((...args: any[]) => any) | undefined;
}>, {
    menuTree: NavigationMenuNode[];
    tenants: TenantOption[];
    outsideTenants: OutsideTenantOption[];
    currentTenantCode: string;
    showTenantSwitch: boolean;
    displayGroups: ApplicationEntryGroup[];
    activeGroupKey: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=TopBar.d.ts.map