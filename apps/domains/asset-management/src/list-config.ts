import type { EditableResource, ExportResource, ListResource } from "@g2-contract/asset-management";
export interface Filter {
  field: string;
  label: string;
  kind: "text" | "date" | "day" | "select" | "category";
  options?: "business" | "asset" | "check" | "departments" | "assetType" | "assetSource" | "scrapReason" | "warehouses";
  placeholder?: string;
}
export interface ListConfig {
  title: string;
  resource: ListResource;
  tableCode: string;
  filters: Filter[];
  flow?: string;
  editable?: EditableResource;
  export?: ExportResource;
  selectedExport?: boolean;
  check?: "asset" | "consumable";
  template?: "asset" | "consumable" | "stock";
}
const select = (field: string, label: string, source: Filter["options"]): Filter => ({ field, label, kind: "select", options: source });
const date = (field: string, label: string): Filter => ({ field, label, kind: "date" });
const day = (field: string, label: string): Filter => ({ field, label, kind: "day" });
const keyword = (placeholder: string, field = "keyword"): Filter => ({ field, label: "", kind: "text", placeholder });
const status = select("status", "状态", "business");
const type = select("typeId", "资产类别", "assetType");
const assetStatus = select("status", "资产状态", "asset");
const warehouse = (label: string) => select("storeId", label, "warehouses");
export const LIST_CONFIG: Record<string, ListConfig> = {
  assetWarehousing: {
    title: "资产入库",
    resource: "warehousing",
    tableCode: "ASSET_WAREHOUSING",
    flow: "PROPERTY_DEPOSITORY",
    export: "warehousing",
    selectedExport: true,
    filters: [status, date("startTime", "入库日期"), type, keyword("入库单号、资产名称")],
  },
  assetInventory: {
    title: "资产清单",
    resource: "inventory",
    tableCode: "ASSET_INVENTORY",
    template: "asset",
    export: "inventory",
    filters: [
      select("receiveDepId", "使用部门", "departments"),
      assetStatus,
      day("purchaseDate", "购入日期"),
      day("startTime", "入库日期"),
      select("sourceId", "来源", "assetSource"),
      type,
      keyword("资产编码、资产名称"),
    ],
  },
  assetDistribution: {
    title: "资产派发",
    resource: "distribution",
    tableCode: "ASSET_DISTRIBUTION",
    flow: "PROPERTY_ALLOT_PERSONAL",
    export: "distribution",
    selectedExport: true,
    filters: [
      status,
      date("receiveTime", "派发日期"),
      select("receiveDepId", "使用部门", "departments"),
      type,
      keyword("派发单号、资产名称"),
    ],
  },
  assetAllocation: {
    title: "资产调拨",
    resource: "allocation",
    tableCode: "ASSET_ALLOCATION",
    flow: "PROPERTY_ALLOT_UNIT",
    export: "allocation",
    selectedExport: true,
    filters: [
      status,
      date("receiveTime", "移交日期"),
      select("overDepId", "移交部门", "departments"),
      select("receiveDepId", "接收部门", "departments"),
      type,
      keyword("调拨单号、资产名称"),
    ],
  },
  cleaning: {
    title: "清理报废",
    resource: "cleaning",
    tableCode: "ASSET_CLEANING",
    flow: "PROPERTY_WEED_OUT",
    filters: [status, date("manageTime", "清理日期"), type, select("causeId", "清理原因", "scrapReason"), keyword("资产名称、清理单号")],
  },
  "asset-check": {
    title: "资产盘点",
    resource: "assetCheck",
    tableCode: "ASSET_CHECK",
    check: "asset",
    export: "assetCheck",
    selectedExport: true,
    filters: [select("status", "状态", "check"), keyword("盘点任务名称", "taskName")],
  },
  justInTime: {
    title: "即时库存",
    resource: "stock",
    tableCode: "JUST_IN_TIME",
    template: "stock",
    filters: [warehouse("仓库"), { field: "categoryId", label: "耗材分类", kind: "category" }, keyword("耗材编码、耗材名称")],
  },
  entering: {
    title: "耗材入库",
    resource: "entering",
    tableCode: "ENTERING",
    flow: "CONSUMABLE_ADD",
    export: "entering",
    selectedExport: true,
    filters: [status, warehouse("入库仓库"), date("addDate", "入库日期"), keyword("入库单号、耗材名称")],
  },
  consuming: {
    title: "耗材领用",
    resource: "consuming",
    tableCode: "ASSET_CONSUMING",
    flow: "CONSUMABLE_REDUCE",
    export: "consuming",
    selectedExport: true,
    filters: [
      status,
      warehouse("出库仓库"),
      date("claimantDate", "出库日期"),
      select("deptId", "领用部门", "departments"),
      keyword("领用单号、耗材名称"),
    ],
  },
  "consumable-check": {
    title: "耗材盘点",
    resource: "consumableCheck",
    tableCode: "CONSUMABLE_CHECK",
    check: "consumable",
    export: "consumableCheck",
    selectedExport: true,
    filters: [select("status", "状态", "check"), keyword("盘点单名称", "name")],
  },
  assetHistory: {
    title: "资产履历表",
    resource: "history",
    tableCode: "ASSET_HISTORY",
    export: "history",
    filters: [
      date("handleTime", "处理日期"),
      select("departmentId", "处理人部门", "departments"),
      assetStatus,
      type,
      keyword("资产编码、资产名称", "keywords"),
    ],
  },
  maturityAssets: {
    title: "维保到期资产",
    resource: "maintenance",
    tableCode: "ASSET_MATURITY",
    export: "maintenance",
    filters: [date("maintenanceData", "维保到期时间"), assetStatus, type, keyword("资产编码、资产名称")],
  },
  overageAssetStatistics: {
    title: "逾龄资产统计",
    resource: "overage",
    tableCode: "OVERAGE_ASSET_STATISTICS",
    export: "overage",
    filters: [assetStatus, type, keyword("资产编码、资产名称")],
  },
  warehouseManage: {
    title: "仓库管理",
    resource: "warehouse",
    tableCode: "WAREHOUSE_MANAGE",
    editable: "warehouse",
    filters: [keyword("仓库名称")],
  },
  consumablesFile: {
    title: "耗材档案",
    resource: "consumable",
    tableCode: "CONSUMABLES_FILE",
    editable: "consumable",
    template: "consumable",
    filters: [keyword("耗材名称、编码")],
  },
  assetSource: {
    title: "资产来源",
    resource: "assetSource",
    tableCode: "ASSET_SOURCE",
    editable: "assetSource",
    filters: [keyword("资产来源名称", "name")],
  },
  scrapReason: {
    title: "报废原因",
    resource: "scrapReason",
    tableCode: "SCRAP_REASON",
    editable: "reasonForScrapping",
    filters: [keyword("报废原因名称", "name")],
  },
  abnormalType: {
    title: "异常类型",
    resource: "abnormalType",
    tableCode: "ABNORMAL_TYPE",
    editable: "abnormalType",
    filters: [keyword("类型名称", "name")],
  },
};
