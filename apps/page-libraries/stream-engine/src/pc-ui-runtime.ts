import { loadRuntimeCommon } from "@g2-runtime/common-loader";

type PcUiModule = typeof import("@g2-platform/pc-ui");
await loadRuntimeCommon<PcUiModule>("pcUi", "index");

export * from "../../../../packages/runtime-common-loader/src/pc-ui-proxy";
