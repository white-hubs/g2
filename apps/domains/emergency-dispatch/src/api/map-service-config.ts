import type { MapConfig } from "@g2-platform/pc-map";

import { unwrapList } from "./unwrap";
import { getDictionaryClient } from "@/domain-context";

interface DictionaryItem {
  code?: string;
  variable?: string;
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

async function loadDictionaryMapConfig(itemCode: string): Promise<MapConfig | null> {
  const client = await getDictionaryClient();
  const items = unwrapList<DictionaryItem>(await client.getDictionaryByItem({ itemCode }));
  return parseMapConfig(items.find((item) => item.variable)?.variable);
}

/**
 * 对齐 risk-graded-control：优先天地图 TD_MAP，否则高德 gdMap；均无配置时 Leaflet 高德瓦片兜底。
 */
export async function resolveInteractiveMapConfig(): Promise<MapConfig> {
  try {
    const tdConfig = await loadDictionaryMapConfig("TD_MAP");
    if (tdConfig?.webKey?.trim()) {
      return { ...tdConfig, mapType: "TD_MAP" };
    }
  } catch {
    // fall through
  }

  try {
    const gdConfig = await loadDictionaryMapConfig("gdMap");
    if (gdConfig?.webKey?.trim()) {
      return { ...gdConfig, mapType: "gdMap" };
    }
  } catch {
    // fall through
  }

  return { mapType: "gdMap" };
}
