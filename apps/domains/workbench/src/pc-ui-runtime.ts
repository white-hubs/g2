import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName =
  | "Avatar"
  | "Button"
  | "Empty"
  | "Form"
  | "FormItem"
  | "Image"
  | "Input"
  | "Modal"
  | "Page"
  | "PopConfirm"
  | "PopOver"
  | "Select"
  | "Space"
  | "Spin"
  | "Textarea"
  | "Tooltip"
  | "ZhConfigProvider";

let pcUi: PcUiModule | undefined;

export async function installWorkbenchPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getWorkbenchPcUi(): PcUiModule {
  if (!pcUi) throw new Error("workbench pcUi Runtime Common is not installed");
  return pcUi;
}

export function defineAsyncWorkbenchPcUiComponent<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => (await getWorkbenchPcUi())[name] as Component) as unknown as PcUiModule[K];
}

export const Avatar: PcUiModule["Avatar"] = defineAsyncWorkbenchPcUiComponent("Avatar");
export const Button: PcUiModule["Button"] = defineAsyncWorkbenchPcUiComponent("Button");
export const Empty: PcUiModule["Empty"] = defineAsyncWorkbenchPcUiComponent("Empty");
export const Form: PcUiModule["Form"] = defineAsyncWorkbenchPcUiComponent("Form");
export const FormItem: PcUiModule["FormItem"] = defineAsyncWorkbenchPcUiComponent("FormItem");
export const Image: PcUiModule["Image"] = defineAsyncWorkbenchPcUiComponent("Image");
export const Input: PcUiModule["Input"] = defineAsyncWorkbenchPcUiComponent("Input");
export const Modal: PcUiModule["Modal"] = defineAsyncWorkbenchPcUiComponent("Modal");
export const Page: PcUiModule["Page"] = defineAsyncWorkbenchPcUiComponent("Page");
export const PopConfirm: PcUiModule["PopConfirm"] = defineAsyncWorkbenchPcUiComponent("PopConfirm");
export const PopOver: PcUiModule["PopOver"] = defineAsyncWorkbenchPcUiComponent("PopOver");
export const Select: PcUiModule["Select"] = defineAsyncWorkbenchPcUiComponent("Select");
export const Space: PcUiModule["Space"] = defineAsyncWorkbenchPcUiComponent("Space");
export const Spin: PcUiModule["Spin"] = defineAsyncWorkbenchPcUiComponent("Spin");
export const Textarea: PcUiModule["Textarea"] = defineAsyncWorkbenchPcUiComponent("Textarea");
export const Tooltip: PcUiModule["Tooltip"] = defineAsyncWorkbenchPcUiComponent("Tooltip");
export const ZhConfigProvider: PcUiModule["ZhConfigProvider"] = defineAsyncWorkbenchPcUiComponent("ZhConfigProvider");

function showMessage(level: "error" | "success" | "warning", text: string): void {
  void getWorkbenchPcUi().message[level](text);
}

export const message = {
  error: (text: string) => showMessage("error", text),
  success: (text: string) => showMessage("success", text),
  warning: (text: string) => showMessage("warning", text),
};

export function usePcTable(...args: Parameters<PcUiModule["usePcTable"]>): ReturnType<PcUiModule["usePcTable"]> {
  return getWorkbenchPcUi().usePcTable(...args);
}
