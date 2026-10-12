import { CubeScada } from "@g2-platform/pc-scada";

import { SCADA_API_BASE, SCADA_STUDIO_ASSET_BASE } from "./scada-pages";

let instance: ReturnType<typeof CubeScada.create> | null = null;

export function getCubeScada(): ReturnType<typeof CubeScada.create> {
  instance ??= CubeScada.create({
    renderMode: "direct",
    apiBase: SCADA_API_BASE,
    elementAssetBase: SCADA_STUDIO_ASSET_BASE,
    viewerBase: SCADA_STUDIO_ASSET_BASE,
  });
  return instance;
}
