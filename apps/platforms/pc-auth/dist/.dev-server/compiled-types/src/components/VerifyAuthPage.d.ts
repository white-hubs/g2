import { type PropType } from "vue";
import "./VerifyAuthPage.css";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    onLoginSuccess: {
        type: PropType<(result: {
            token: string;
            tenant: string;
            refreshToken?: string;
        }) => void>;
        required: true;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "go-login"[], "go-login", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    onLoginSuccess: {
        type: PropType<(result: {
            token: string;
            tenant: string;
            refreshToken?: string;
        }) => void>;
        required: true;
    };
}>> & Readonly<{
    "onGo-login"?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=VerifyAuthPage.d.ts.map