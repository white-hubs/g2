import { type PropType } from "vue";
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    /** 受控打开（install 宿主在收到 ai-assistant:open-requested 时置 true）。省略则组件内自持。 */
    open: {
        type: PropType<boolean | undefined>;
        default: undefined;
    };
}>, () => import("vue/jsx-runtime").JSX.Element, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "update:open"[], "update:open", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    /** 受控打开（install 宿主在收到 ai-assistant:open-requested 时置 true）。省略则组件内自持。 */
    open: {
        type: PropType<boolean | undefined>;
        default: undefined;
    };
}>> & Readonly<{
    "onUpdate:open"?: ((...args: any[]) => any) | undefined;
}>, {
    open: boolean | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=AiChatEntry.d.ts.map