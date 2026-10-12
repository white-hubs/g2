import type { MapConfig } from "@g2-platform/pc-map";

import { getMapServiceConfig } from "./server";

interface DictionaryItem {
  code?: string;
  variable?: string;
}

function unwrapDictionaryItems(resp: unknown): DictionaryItem[] {
  if (Array.isArray(resp)) return resp as DictionaryItem[];
  if (resp && typeof resp === "object" && "data" in resp) {
    const data = (resp as { data?: unknown }).data;
    if (Array.isArray(data)) return data as DictionaryItem[];
  }
  return [];
}

function parseMapConfig(variable?: string): MapConfig | null {
  if (!variable?.trim()) return null;
  try {
    const parsed = JSON.parse(variable) as MapConfig;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 对齐旧仓 CubeMapCore：优先天地图 TD_MAP，否则高德 gdMap。
 * 均未配置时返回 Leaflet 高德瓦片兜底（无 JSAPI key）。
 */
export const resolveInteractiveMapConfig = async (): Promise<MapConfig> => {
  try {
    const tdItems = unwrapDictionaryItems(await getMapServiceConfig("TD_MAP"));
    const tdConfig = parseMapConfig(tdItems.find((item) => item.variable)?.variable);
    if (tdConfig?.webKey?.trim()) {
      return { ...tdConfig, mapType: "TD_MAP" };
    }
  } catch {
    // fall through
  }

  try {
    const gdItems = unwrapDictionaryItems(await getMapServiceConfig("gdMap"));
    const gdConfig = parseMapConfig(gdItems.find((item) => item.variable)?.variable);
    if (gdConfig?.webKey?.trim()) {
      return { ...gdConfig, mapType: "gdMap" };
    }
  } catch {
    // fall through
  }

  return { mapType: "gdMap" };
};
