import type { PlatformContext } from "@g2-composition/contract";
import { type PropType } from "vue";
import "./SliderCaptcha.css";
interface DragPointerEvent {
    clientX: number;
    pointerId?: number;
    currentTarget?: EventTarget | null;
}
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    ctx: {
        type: PropType<PlatformContext>;
        required: true;
    };
    imgWidth: {
        type: NumberConstructor;
        default: number;
    };
    imgHeight: {
        type: NumberConstructor;
        default: number;
    };
    sliderSize: {
        type: NumberConstructor;
        default: number;
    };
}>, {
    show: () => Promise<void>;
    close: () => void;
    reset: () => void;
    refresh: (options?: {
        keepFailTip?: boolean;
    }) => Promise<void>;
    completeForTest: (captchaVerification?: string) => void;
    open: import("vue").Ref<boolean, boolean>;
    loading: import("vue").Ref<boolean, boolean>;
    backgroundSrc: import("vue").Ref<string, string>;
    puzzleSrc: import("vue").Ref<string, string>;
    trackStyle: import("vue").ComputedRef<{
        width: string;
        height: string;
    }>;
    puzzleStyle: import("vue").ComputedRef<{
        left: string;
        width: string;
        height: string;
    }>;
    sliderStyle: import("vue").ComputedRef<{
        transform: string;
        width: string;
    }>;
    tipClass: import("vue").ComputedRef<"pc-auth-slider-captcha__tip--ok" | "pc-auth-slider-captcha__tip--err">;
    tipWords: import("vue").Ref<string, string>;
    matched: import("vue").Ref<boolean, boolean>;
    failed: import("vue").Ref<boolean, boolean>;
    sliderX: import("vue").Ref<number, number>;
    handlePointerDown: (event: DragPointerEvent) => void;
    handlePointerMove: (event: DragPointerEvent) => void;
    handlePointerUp: () => Promise<void>;
    imgWidth: number;
    sliderSize: number;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("close" | "success" | "fail")[], "close" | "success" | "fail", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    ctx: {
        type: PropType<PlatformContext>;
        required: true;
    };
    imgWidth: {
        type: NumberConstructor;
        default: number;
    };
    imgHeight: {
        type: NumberConstructor;
        default: number;
    };
    sliderSize: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{
    onClose?: ((...args: any[]) => any) | undefined;
    onSuccess?: ((...args: any[]) => any) | undefined;
    onFail?: ((...args: any[]) => any) | undefined;
}>, {
    imgWidth: number;
    imgHeight: number;
    sliderSize: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
//# sourceMappingURL=SliderCaptcha.d.ts.map