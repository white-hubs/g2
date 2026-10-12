import { type PropType } from "vue";
import type { OutsideTenantOption, TenantOption } from "./top-bar-types";
import "./UserDropdown.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    userName: {
        type: StringConstructor;
        required: true;
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
    /** 多于 1 个企业时显示「组织切换」（对齐旧仓；列表由 Shell 进主应用时预拉）。 */
    showTenantSwitch: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** Shell 切换租户（refresh_token）；失败时 throw，由本组件 message.error。 */
    onSelectTenant: {
        type: PropType<(tenant: TenantOption) => void | Promise<void>>;
        required: false;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("logout" | "navigatePersonManage")[], "logout" | "navigatePersonManage", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    userName: {
        type: StringConstructor;
        required: true;
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
    /** 多于 1 个企业时显示「组织切换」（对齐旧仓；列表由 Shell 进主应用时预拉）。 */
    showTenantSwitch: {
        type: BooleanConstructor;
        default: boolean;
    };
    /** Shell 切换租户（refresh_token）；失败时 throw，由本组件 message.error。 */
    onSelectTenant: {
        type: PropType<(tenant: TenantOption) => void | Promise<void>>;
        required: false;
    };
}>> & Readonly<{
    onLogout?: ((...args: any[]) => any) | undefined;
    onNavigatePersonManage?: ((...args: any[]) => any) | undefined;
}>, {
    tenants: TenantOption[];
    outsideTenants: OutsideTenantOption[];
    currentTenantCode: string;
    showTenantSwitch: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=UserDropdown.d.ts.map