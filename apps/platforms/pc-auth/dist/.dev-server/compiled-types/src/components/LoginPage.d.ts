import type { PlatformContext } from "@g2-composition/contract";
import { type PropType } from "vue";
import "./LoginPage.css";
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
        }) => void | Promise<void>>;
        required: true;
    };
    systemTitle: {
        type: StringConstructor;
        default: string;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    ctx: {
        type: PropType<PlatformContext>;
        required: true;
    };
    onLoginSuccess: {
        type: PropType<(result: {
            token: string;
            tenant: string;
            refreshToken?: string;
        }) => void | Promise<void>>;
        required: true;
    };
    systemTitle: {
        type: StringConstructor;
        default: string;
    };
}>> & Readonly<{}>, {
    systemTitle: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=LoginPage.d.ts.map