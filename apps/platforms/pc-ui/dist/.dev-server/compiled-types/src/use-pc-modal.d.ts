import { type DefineComponent } from "vue";
export interface PcModalOptions {
    title?: string;
    width?: string | number;
    confirmText?: string;
    wrapperClass?: string;
    cancelText?: string;
    centered?: boolean;
    destroyOnClose?: boolean;
    closeOnClickModal?: boolean;
    closeOnPressEscape?: boolean;
    closable?: boolean;
    footer?: boolean;
    confirmDisabled?: boolean;
    onBeforeClose?: () => boolean | void;
    onConfirm?: () => void | Promise<unknown>;
    onCancel?: () => void;
    onClosed?: () => void;
}
export interface PcModalState extends Omit<PcModalOptions, "onConfirm" | "onCancel" | "onClosed"> {
    open: boolean;
    confirmLoading: boolean;
}
export interface PcModalApi {
    state: PcModalState;
    open: () => void;
    close: () => void;
    confirm: () => Promise<void>;
    setState: (next: Partial<PcModalState>) => void;
    setConfirmLoading: (value: boolean) => void;
}
/** 立即展示弹窗；状态、底部插槽和提交保护由同一个实例管理。 */
export declare function usePcModal(options?: PcModalOptions): [DefineComponent, PcModalApi];
//# sourceMappingURL=use-pc-modal.d.ts.map