import { type PcUiModule, createPcUiRuntimeProxy } from "./pc-ui-proxy-helper";

const pcUi = createPcUiRuntimeProxy("consumption-management");
export const installConsumptionManagementPcUi = pcUi.install;
export const Button: PcUiModule["Button"] = pcUi.component("Button");
export const Page: PcUiModule["Page"] = pcUi.component("Page");
export const PageLayout: PcUiModule["PageLayout"] = pcUi.component("PageLayout");
export const Popover: PcUiModule["Popover"] = pcUi.component("Popover");
export const Spin: PcUiModule["Spin"] = pcUi.component("Spin");
export const message: PcUiModule["message"] = pcUi.object("message");
export const usePcForm: PcUiModule["usePcForm"] = pcUi.callable("usePcForm");
export const usePcTable: PcUiModule["usePcTable"] = pcUi.callable("usePcTable");
export type { PcFormSchemaProp, PcTableColumn } from "@g2-platform/pc-ui";
