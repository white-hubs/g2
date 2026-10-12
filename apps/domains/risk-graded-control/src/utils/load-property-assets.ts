import { getPropertyAsset, type PropertyAsset } from "@/api/assets";
import type { RiskObjectVO } from "@/types/risk";

export interface PropertyAssetOption {
  id: string;
  name: string;
}

export function mapPropertyAsset(asset: PropertyAsset): PropertyAssetOption {
  return {
    id: String(asset.id ?? ""),
    name: asset.name ?? "",
  };
}

export async function resolvePropertyAssetNameMap(assetIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];
  const nameMap = new Map<string, string>();
  if (uniqueIds.length === 0) return nameMap;

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const detail = await getPropertyAsset(id);
        if (detail?.id && detail?.name) {
          nameMap.set(String(detail.id), detail.name);
        }
      } catch {
        // 资产可能已删除，保留 ID 回退
      }
    }),
  );

  return nameMap;
}

export async function enrichRiskObjectsWithAssetNames(objects: RiskObjectVO[]): Promise<void> {
  const assetIds = objects.map((o) => o.assetId).filter(Boolean) as string[];
  const nameMap = await resolvePropertyAssetNameMap(assetIds);
  for (const obj of objects) {
    if (obj.assetId) {
      obj.assetName = nameMap.get(obj.assetId) ?? obj.assetId;
    }
  }
}
