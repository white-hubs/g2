import { defineAsyncComponent, type Component } from "vue";

import { getElectricalSafetyContext } from "./domain-context";

type PcPlayerModule = typeof import("@g2-platform/pc-player");
type CubePlayerComponent = PcPlayerModule["CubePlayer"];

export const CubePlayer: CubePlayerComponent = defineAsyncComponent(async () => {
  const module = await getElectricalSafetyContext().loadRuntimeCommon<PcPlayerModule>("pcPlayer", "index");
  return module.CubePlayer as Component;
}) as unknown as CubePlayerComponent;
