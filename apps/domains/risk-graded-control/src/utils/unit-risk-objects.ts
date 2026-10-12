import { getUnit, pageRiskObjects } from "@/api/server";
import type { RiskObjectVO } from "@/types/risk";
import { mapRiskObjectFromApi } from "@/utils/risk-control-mapper";

/** 按单元 ID 加载风险对象（优先 getUnit.objects，否则 pageRiskObjects） */
export async function loadUnitRiskObjects(unitId: string, request: <T>(fn: () => Promise<T>) => Promise<T>): Promise<RiskObjectVO[]> {
  const unitVo = await request(() => getUnit(unitId));
  const fromUnit = (unitVo.objects ?? []).map(mapRiskObjectFromApi);
  if (fromUnit.length > 0) return fromUnit;

  const page = await request(() =>
    pageRiskObjects({
      unitId,
      pageNumber: 1,
      pageSize: 500,
    }),
  );
  return page.records.map(mapRiskObjectFromApi);
}
