import { getRiskGradedControlClient } from "../domain-context";

export interface RiskUnitVO {
  id?: string | number;
  unitId?: string | number;
  unitName?: string;
  name?: string;
  code?: string;
}

export interface RiskObjectVO {
  id?: string | number;
  objectId?: string | number;
  objectName?: string;
  name?: string;
  objectCode?: string;
  code?: string;
}

export interface RiskPage<T> {
  records: T[];
  total: number;
}

function normalizePage<T>(value: unknown): RiskPage<T> {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const records = body.records ?? body.list ?? body.rows;
  return { records: Array.isArray(records) ? (records as T[]) : [], total: Number(body.total ?? 0) };
}

export async function pageUnits(params: Record<string, unknown>): Promise<RiskPage<RiskUnitVO>> {
  return normalizePage<RiskUnitVO>(await (await getRiskGradedControlClient()).pageUnits(params));
}

export async function pageRiskObjects(params: Record<string, unknown>): Promise<RiskPage<RiskObjectVO>> {
  return normalizePage<RiskObjectVO>(await (await getRiskGradedControlClient()).pageRiskObjects(params));
}
