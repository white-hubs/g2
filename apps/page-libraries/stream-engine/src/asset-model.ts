import { toRaw } from "vue";

export type AssetRow = Record<string, unknown>;

export type AssetPage = { records: AssetRow[]; total: number };

export type AssetCategory = { id: string; name: string; children?: AssetCategory[] };

export interface AssetControlClient {
  listAssetClassifications(type: "assetSource" | "assetType" | "reasonForScrapping"): Promise<AssetCategory[]>;
  listAssetClassificationTree(type: "assetType"): Promise<AssetCategory[]>;
  listAssetWarehouses(): Promise<AssetCategory[]>;
  pageAssets(params: Record<string, unknown>): Promise<AssetPage>;
  pageConsumables(params: Record<string, unknown>): Promise<AssetPage>;
  listConsumableCategories(): Promise<AssetCategory[]>;
  checkAssetCodes(payload: { checkSerialNumberList: Array<{ key?: string | null; value: string }> }): Promise<string[]>;
}

export const ASSET_CONTROLS = [
  { id: "AssetSource", title: "资产来源", name: "AssetSource", valueType: "String" },
  { id: "AssetTypeSelect", title: "资产类别", name: "AssetTypeSelect", valueType: "String" },
  { id: "AreaList", title: "区域选择", name: "AreaList", valueType: "String" },
  { id: "ScrappingReason", title: "报废原因", name: "ScrappingReason", valueType: "String" },
  { id: "AssetIsExpired", title: "是否逾龄(资产)", name: "AssetIsExpired", valueType: "String" },
  { id: "AddAssetTable", title: "添加资产", name: "AddAssetTable", valueType: "Array" },
  { id: "ChooseAssetTable", title: "选择资产", name: "ChooseAssetTable", valueType: "Array" },
  { id: "WareHouseSelect", title: "选择仓库", name: "WareHouseSelect", valueType: "String" },
  { id: "ConsumablesEnter", title: "耗材明细", name: "ConsumablesEnter", valueType: "Array" },
  { id: "ConsumablesOut", title: "耗材领用", name: "ConsumablesOut", valueType: "Array" },
] as const;

export function assetChoice(value: unknown): AssetCategory | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.id == null) return null;
  return { ...record, id: String(record.id), name: String(record.name ?? record.id) };
}

export function normalizeAssetCategories(rows: AssetCategory[]): AssetCategory[] {
  return rows.map((row) => ({
    ...row,
    id: String(row.id),
    name: String(row.name ?? row.id),
    ...(Array.isArray(row.children) ? { children: normalizeAssetCategories(row.children) } : {}),
  }));
}

export function assetName(value: unknown): string {
  const choice = assetChoice(value);
  return choice?.name ?? (value == null || value === "" ? "--" : String(value));
}

export function assetTableCell(value: unknown): string {
  if (value == null || value === "") return "--";
  if (Array.isArray(value)) return value.map(assetName).join("、") || "--";
  return assetName(value);
}

export function assetMoney(value: unknown): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export function assetEntryTotals(rows: AssetRow[]): { count: number; amount: string } {
  return {
    count: rows.reduce((sum, row) => sum + Number(row.num ?? 0), 0),
    amount: assetMoney(rows.reduce((sum, row) => sum + Number(row.storeAmount ?? 0), 0)),
  };
}

export function readonlyConsumablesOutRows(rows: AssetRow[]): AssetRow[] {
  return rows.map((row) => ({
    ...row,
    storeAmount: Number((Number(row.avgPrice ?? 0) * Number(row.num ?? 0)).toFixed(2)),
  }));
}

const pendingAssetRows = new WeakMap<AssetRow[], string[]>();

export function setPendingAssetRows(rows: AssetRow[], keys: string[]): void {
  pendingAssetRows.set(toRaw(rows), [...keys]);
}

export function pendingAssetRowIndex(rows: AssetRow[]): number {
  const keys = pendingAssetRows.get(toRaw(rows)) ?? [];
  return rows.findIndex((row, index) => keys.includes(String(row.key ?? row.id ?? index)));
}

export function consumablesOutRowIssue(rows: AssetRow[]): string | undefined {
  for (const [index, row] of rows.entries()) {
    const quantity = Number(row.num);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return `第${index + 1}行出库数量必须为大于0的整数`;
    if (row.storeNum != null && row.storeNum !== "" && quantity > Number(row.storeNum))
      return `第${index + 1}行出库数量不能大于库存数量（${row.storeNum}）`;
    if (Number(row.useLimit) > 0 && quantity > Number(row.useLimit)) return `第${index + 1}行出库数量不能大于限领数量（${row.useLimit}）`;
  }
  const pending = pendingAssetRowIndex(rows);
  return pending >= 0 ? `请先保存第${pending + 1}行耗材` : undefined;
}

export function assetRowIssue(
  kind: "AddAssetTable" | "ChooseAssetTable" | "ConsumablesEnter",
  rows: AssetRow[],
  required: boolean,
): string | undefined {
  if (!rows.length) return required ? "请至少添加一组数据" : undefined;
  if (kind === "ChooseAssetTable") return undefined;
  for (const [index, row] of rows.entries()) {
    const prefix = `第${index + 1}行数据`;
    if (kind === "AddAssetTable") {
      for (const [key, title] of [
        ["serialNumber", "资产编码"],
        ["financeNumber", "财务编码"],
        ["name", "资产名称"],
        ["type", "资产类别"],
        ["purchaseDate", "购入日期"],
        ["maintenanceTime", "维保期限（月）"],
        ["usageTime", "使用期限（月）"],
        ["number", "数量"],
      ]) {
        if (!row[key]) return `${prefix}，缺失${title}`;
      }
      if (rows.some((other, otherIndex) => otherIndex !== index && other.serialNumber === row.serialNumber))
        return `${prefix}，资产编码重复`;
    }
    if (kind === "ConsumablesEnter") {
      if (!Number.isSafeInteger(Number(row.num)) || Number(row.num) < 1) return `${prefix}，数量必须为大于0的整数`;
      if (!row.price || Number(row.price) < 0) return `${prefix}，请填写单价`;
    }
  }
  if (kind === "AddAssetTable") {
    const index = pendingAssetRowIndex(rows);
    if (index >= 0) return `请先保存第${index + 1}行数据`;
  }
  return undefined;
}
