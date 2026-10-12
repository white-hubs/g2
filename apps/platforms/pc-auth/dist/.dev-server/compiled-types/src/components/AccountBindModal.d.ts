import type { PlatformContext } from "@g2-composition/contract";
import { type PropType } from "vue";
import "./AccountBindModal.css";
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
    open: {
        type: BooleanConstructor;
        required: true;
    };
    loginType: {
        type: PropType<"SMS" | "WECHAT">;
        required: true;
    };
    tokenId: {
        type: StringConstructor;
        required: true;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "update:open"[], "update:open", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
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
    open: {
        type: BooleanConstructor;
        required: true;
    };
    loginType: {
        type: PropType<"SMS" | "WECHAT">;
        required: true;
    };
    tokenId: {
        type: StringConstructor;
        required: true;
    };
}>> & Readonly<{
    "onUpdate:open"?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=AccountBindModal.d.ts.map