import type { GrainVarietyOption, WarehouseOption } from "./state";
import { listFumigationGrainVarieties, listFumigationWarehouses } from "@/api/fumigation-client";

interface FumigationWarehousePayload {
  warehouseId?: string | number;
  warehouseName?: string;
  areaName?: string;
  grainType?: string;
  warehouseCode?: string;
  code?: string;
  capacityTon?: number;
}

export interface FumigationGrainVarietyPayload {
  grainVarietyName?: string;
  varietyName?: string;
  name?: string;
  warehouseId?: string | number;
}

const asString = (value: unknown): string => (value == null ? "" : String(value));

const resolveGrainVarietyName = (variety: FumigationGrainVarietyPayload, fallbackName: string): string => {
  const name = asString(variety.grainVarietyName ?? variety.varietyName ?? variety.name).trim();
  return name || fallbackName;
};

/** 接口只有 name、无 id 时，用品种名称作为选项值，并去重 */
export const mapGrainVarietiesFromPayload = (
  varieties: FumigationGrainVarietyPayload[],
  warehouseId: string,
  fallbackName: string,
): GrainVarietyOption[] => {
  const names = varieties.length === 0 ? [fallbackName] : varieties.map((variety) => resolveGrainVarietyName(variety, fallbackName));

  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).map((name) => ({
    name,
    warehouseId,
    source: "intelligent-grain-service",
  }));
};

const mapWarehouse = (item: FumigationWarehousePayload, varieties: FumigationGrainVarietyPayload[]): WarehouseOption => {
  const warehouseId = asString(item.warehouseId);
  const fallbackGrainName = item.grainType?.trim() || "未维护品种";

  return {
    id: warehouseId,
    code: item.warehouseCode ?? item.code ?? warehouseId,
    name: asString(item.warehouseName) || warehouseId,
    capacityTon: item.capacityTon ?? 0,
    source: "intelligent-grain-service",
    grainVarieties: mapGrainVarietiesFromPayload(varieties, warehouseId, fallbackGrainName),
  };
};

export const loadWarehousesFromIntelligentGrain = async (): Promise<WarehouseOption[]> => {
  const list = (await listFumigationWarehouses()) as FumigationWarehousePayload[];
  const varietiesList = await Promise.all(
    list.map(
      (item: FumigationWarehousePayload) =>
        listFumigationGrainVarieties(asString(item.warehouseId)) as Promise<FumigationGrainVarietyPayload[]>,
    ),
  );
  return list.map((item: FumigationWarehousePayload, index: number) => mapWarehouse(item, varietiesList[index] ?? []));
};

export const loadGrainVarietiesByWarehouse = async (warehouseId: string, fallbackName = "未维护品种"): Promise<GrainVarietyOption[]> => {
  const varieties = (await listFumigationGrainVarieties(warehouseId)) as FumigationGrainVarietyPayload[];
  return mapGrainVarietiesFromPayload(varieties, warehouseId, fallbackName);
};
