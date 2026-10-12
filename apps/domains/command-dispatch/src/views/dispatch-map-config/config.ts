import type { DataDictionary, DictionaryClient } from "@g2-contract/dictionary";
import type { MapConfig as ProviderConfig } from "@g2-platform/pc-map";

export const MAP_CONFIG_CODE = "COMMAND_DISPATCH_MAP_CONFIG";
export interface MapValues {
  center: { lng: number; lat: number };
  radius: number;
  rotation: number;
  zoom: number;
}

export function configurationRecord(
  records: DataDictionary[],
  itemCode: string,
  code: string,
  name: string,
  variable: string,
): DataDictionary {
  const existing = records.find((record) => record.code === code);
  return { id: "", name, code, remarks: "", version: "0", flag: false, itemCode, ...existing, variable };
}

function finiteNumber(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function readMapValues(records: DataDictionary[]): MapValues {
  const value = (code: string): string | undefined => records.find((record) => record.code === code)?.variable;
  const coordinates = value("lnglat")?.split(",");
  const lng = finiteNumber(coordinates?.[0], NaN);
  const lat = finiteNumber(coordinates?.[1], NaN);
  const validCenter =
    coordinates?.length === 2 && Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
  return {
    center: validCenter ? { lng, lat } : { lng: 116.397428, lat: 39.90923 },
    radius: Math.max(0, finiteNumber(value("radius"), 0)),
    rotation: Math.min(360, Math.max(0, finiteNumber(value("rotation"), 0))),
    zoom: Math.min(18, Math.max(3, finiteNumber(value("zoom"), 14))),
  };
}

export function mapRecords(records: DataDictionary[], values: MapValues): DataDictionary[] {
  return [
    configurationRecord(records, MAP_CONFIG_CODE, "lnglat", "中心坐标", `${values.center.lng},${values.center.lat}`),
    configurationRecord(records, MAP_CONFIG_CODE, "rotation", "旋转角度", String(values.rotation)),
    configurationRecord(records, MAP_CONFIG_CODE, "zoom", "放大层级", String(values.zoom)),
    configurationRecord(records, MAP_CONFIG_CODE, "radius", "有效范围", String(values.radius)),
  ];
}

export function readProviderConfig(records: DataDictionary[]): ProviderConfig {
  const record = ["TD_MAP", "t-map", "gdMap"]
    .map((code) => records.find((item) => item.code === code && item.variable?.trim()))
    .find(Boolean);
  if (!record?.variable) return {};
  const value: unknown = JSON.parse(record.variable);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("地图服务配置格式错误");
  const fields = value as Record<string, unknown>;
  const config: ProviderConfig = { mapType: record.code === "TD_MAP" ? "TD_MAP" : record.code === "t-map" ? "t-map" : "gdMap" };
  for (const key of ["webKey", "securityJsCode", "andriodKey", "iosKey"] as const) {
    if (typeof fields[key] === "string") config[key] = fields[key];
  }
  return config;
}

export async function loadConfiguration(
  client: Pick<DictionaryClient, "getDictionaryItemByCode" | "getDataDictionaryByItem">,
  itemCode: string,
): Promise<DataDictionary[]> {
  const item = await client.getDictionaryItemByCode(itemCode);
  return item ? client.getDataDictionaryByItem({ itemCode }) : [];
}

type SaveClient = Pick<
  DictionaryClient,
  "getDictionaryItemByCode" | "createDictionaryItem" | "createDataDictionary" | "updateDataDictionary"
>;

export async function saveConfiguration(client: SaveClient, records: DataDictionary[], remarks: string): Promise<void> {
  const itemCode = records[0]?.itemCode;
  if (!itemCode) return;
  const item = await client.getDictionaryItemByCode(itemCode);
  if (!item) await client.createDictionaryItem({ code: itemCode, remarks });
  for (const record of records) {
    const saved = record.id ? await client.updateDataDictionary(record) : await client.createDataDictionary(record);
    // Preserve successful IDs/version even if a later write fails, making retries safe.
    Object.assign(record, saved);
  }
}

export function configurationError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? `${fallback}：${error.message}` : fallback;
}
