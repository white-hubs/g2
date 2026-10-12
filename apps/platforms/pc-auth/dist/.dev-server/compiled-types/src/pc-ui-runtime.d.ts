import type { PlatformContext } from "@g2-composition/contract";
type PcUiModule = typeof import("@g2-platform/pc-ui");
export declare function installPcAuthPcUi(ctx: PlatformContext): Promise<void>;
export declare function getPcAuthPcUi(): PcUiModule;
export declare const Button: PcUiModule["Button"];
export declare const Checkbox: PcUiModule["Checkbox"];
export declare const Form: PcUiModule["Form"];
export declare const FormItem: PcUiModule["FormItem"];
export declare const Input: PcUiModule["Input"];
export declare const InputPassword: PcUiModule["InputPassword"];
export declare const Modal: PcUiModule["Modal"];
export declare const Spin: PcUiModule["Spin"];
type PcUiMessage = PcUiModule["message"];
export declare const message: PcUiMessage;
export {};
//# sourceMappingURL=pc-ui-runtime.d.ts.map