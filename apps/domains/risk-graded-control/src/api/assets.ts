import { getPropertyDetail, getPropertyDetailedPage } from "./server";

export interface PropertyAsset {
  id?: string | number;
  name?: string;
  typeName?: string;
  receiveDepName?: string;
  area?: Array<{ name?: string }>;
  areaName?: string;
}

export interface PropertyAssetPage {
  records: PropertyAsset[];
  total: number;
}

function unwrapPage(value: unknown): PropertyAssetPage {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  return { records: Array.isArray(body.records) ? (body.records as PropertyAsset[]) : [], total: Number(body.total ?? 0) };
}

export async function pagePropertyAssets(params: Record<string, unknown>): Promise<PropertyAssetPage> {
  return unwrapPage(await getPropertyDetailedPage(params));
}

export async function getPropertyAsset(id: string): Promise<PropertyAsset | undefined> {
  const value = await getPropertyDetail(id);
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? root.data : root;
  return body as PropertyAsset;
}
