import type { MapPickerResult } from "@g2-platform/pc-map";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";

type MapPickerModalComponent = (typeof import("@g2-platform/pc-map"))["MapPickerModal"];

export const MapPickerModal = defineAsyncRuntimeCommonComponent<MapPickerModalComponent>(
  loadRuntimeCommon,
  "pcMap",
  "index",
  "MapPickerModal",
);

export type { MapPickerResult };
