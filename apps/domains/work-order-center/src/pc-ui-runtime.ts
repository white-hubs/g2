import { loadRuntimeCommon } from "@g2-runtime/common-loader";

type PcUiModule = typeof import("@g2-platform/pc-ui");
const pcUi = await loadRuntimeCommon<PcUiModule>("pcUi", "index");

export const Button: PcUiModule["Button"] = pcUi.Button;
export const Modal: PcUiModule["Modal"] = pcUi.Modal;
export const Page: PcUiModule["Page"] = pcUi.Page;
export const PageLayout: PcUiModule["PageLayout"] = pcUi.PageLayout;
export const Tag: PcUiModule["Tag"] = pcUi.Tag;
export const message: PcUiModule["message"] = pcUi.message;
export const usePcForm: PcUiModule["usePcForm"] = pcUi.usePcForm;
export const usePcTable: PcUiModule["usePcTable"] = pcUi.usePcTable;
