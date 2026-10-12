/** 与旧站相同的 wangEditor 4 富文本输入，供迁域表单复用。 */
export declare const RichTextEditor: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    modelValue: {
        type: StringConstructor;
        default: string;
    };
    placeholder: {
        type: StringConstructor;
        default: string;
    };
    height: {
        type: NumberConstructor;
        default: number;
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "update:modelValue"[], "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: StringConstructor;
        default: string;
    };
    placeholder: {
        type: StringConstructor;
        default: string;
    };
    height: {
        type: NumberConstructor;
        default: number;
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
}>, {
    disabled: boolean;
    placeholder: string;
    height: number;
    modelValue: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=rich-text-editor.d.ts.map