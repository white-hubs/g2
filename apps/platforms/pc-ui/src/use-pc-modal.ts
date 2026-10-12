import Modal from "ant-design-vue/es/modal";
import { defineComponent, h, reactive, type DefineComponent } from "vue";

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
export function usePcModal(options: PcModalOptions = {}): [DefineComponent, PcModalApi] {
  const { onConfirm, onCancel, onClosed, onBeforeClose, ...initialState } = options;
  const state = reactive<PcModalState>({ open: false, confirmLoading: false, width: 640, ...initialState });
  let confirming = false;
  const api = {
    state,
    open: (): void => {
      state.open = true;
    },
    close: (): void => {
      if (onBeforeClose?.() === false) return;
      state.open = false;
    },
    confirm: async (): Promise<void> => {
      if (confirming || state.confirmLoading || state.confirmDisabled) return;
      confirming = true;
      try {
        const result = onConfirm?.();
        if (result instanceof Promise) {
          state.confirmLoading = true;
          await result;
        }
      } finally {
        confirming = false;
        state.confirmLoading = false;
      }
    },
    setState: (next: Partial<PcModalState>): void => {
      Object.assign(state, next);
    },
    setConfirmLoading: (value: boolean): void => {
      state.confirmLoading = value;
    },
  };
  const PcModal = defineComponent({
    name: "PcModal",
    setup(_, { slots }) {
      return () =>
        h(
          Modal,
          {
            open: state.open,
            title: state.title,
            width: state.width,
            confirmLoading: state.confirmLoading,
            okText: state.confirmText,
            cancelText: state.cancelText,
            centered: state.centered,
            destroyOnClose: state.destroyOnClose,
            maskClosable: state.closeOnClickModal !== false,
            keyboard: state.closeOnPressEscape !== false,
            closable: state.closable !== false,
            okButtonProps: { disabled: state.confirmDisabled },
            footer: state.footer === false ? null : undefined,
            wrapClassName: state.wrapperClass,
            onOk: api.confirm,
            onCancel: () => (onCancel ? onCancel() : api.close()),
            afterClose: onClosed,
          },
          slots,
        );
    },
  });
  return [PcModal as unknown as DefineComponent, api];
}
