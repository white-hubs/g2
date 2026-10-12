import type { PlatformContext } from "@g2-composition/contract";
import { type PropType } from "vue";
import "./WechatLogin.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    ctx: {
        type: PropType<PlatformContext>;
        required: true;
    };
    onLoginSuccess: {
        type: PropType<(result: {
            token: string;
            tenant: string;
            refreshToken?: string;
        }) => void>;
        required: true;
    };
    bind: {
        type: BooleanConstructor;
        default: boolean;
    };
    tokenId: {
        type: StringConstructor;
        default: string;
    };
    bindType: {
        type: PropType<"SMS" | "WECHAT">;
        default: string;
    };
    appid: {
        type: StringConstructor;
        default: string;
    };
    redirectUri: {
        type: StringConstructor;
        default: string;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("bind" | "back")[], "bind" | "back", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    ctx: {
        type: PropType<PlatformContext>;
        required: true;
    };
    onLoginSuccess: {
        type: PropType<(result: {
            token: string;
            tenant: string;
            refreshToken?: string;
        }) => void>;
        required: true;
    };
    bind: {
        type: BooleanConstructor;
        default: boolean;
    };
    tokenId: {
        type: StringConstructor;
        default: string;
    };
    bindType: {
        type: PropType<"SMS" | "WECHAT">;
        default: string;
    };
    appid: {
        type: StringConstructor;
        default: string;
    };
    redirectUri: {
        type: StringConstructor;
        default: string;
    };
}>> & Readonly<{
    onBind?: ((...args: any[]) => any) | undefined;
    onBack?: ((...args: any[]) => any) | undefined;
}>, {
    bind: boolean;
    tokenId: string;
    bindType: "SMS" | "WECHAT";
    appid: string;
    redirectUri: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=WechatLogin.d.ts.map