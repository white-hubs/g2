/** 表头、字段与原项目逐页对应；分组表头在统计页另外定义。 */
export interface ColumnDefinition {
  title: string;
  field: string;
  width: number;
}
export const COLUMN_DATA: Record<string, ColumnDefinition[]> = {
  assetWarehousing: [
    {
      title: "入库单号",
      field: "depositoryNumbers",
      width: 150,
    },
    {
      title: "入库日期",
      field: "startTime",
      width: 150,
    },
    {
      title: "处理人",
      field: "createByName",
      width: 150,
    },
    {
      title: "收货单号",
      field: "receiptNumbers",
      width: 150,
    },
    {
      title: "资产明细",
      field: "propertyDetailed",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "来源",
      field: "sourceName",
      width: 150,
    },
  ],
  assetInventory: [
    {
      title: "资产编码",
      field: "serialNumber",
      width: 120,
    },
    {
      title: "财务编码",
      field: "financeNumber",
      width: 250,
    },
    {
      title: "模型编码",
      field: "deviceNumber",
      width: 120,
    },
    {
      title: "资产名称",
      field: "name",
      width: 120,
    },
    {
      title: "资产类别",
      field: "typeName",
      width: 120,
    },
    {
      title: "规格型号",
      field: "norms",
      width: 120,
    },
    {
      title: "计量单位",
      field: "unit",
      width: 120,
    },
    {
      title: "原值",
      field: "price",
      width: 120,
    },
    {
      title: "来源",
      field: "sourceName",
      width: 120,
    },
    {
      title: "购入日期",
      field: "purchaseDate",
      width: 120,
    },
    {
      title: "入库日期",
      field: "startTime",
      width: 120,
    },
    {
      title: "维保到期时间",
      field: "maintenanceDate",
      width: 120,
    },
    {
      title: "剩余维保时间（月）",
      field: "maintenanceTime",
      width: 120,
    },
    {
      title: "资产逾龄时间",
      field: "usageDate",
      width: 120,
    },
    {
      title: "剩余使用期限",
      field: "usageTime",
      width: 120,
    },
    {
      title: "资产状态",
      field: "statusName",
      width: 120,
    },
    {
      title: "管理员",
      field: "adminName",
      width: 120,
    },
    {
      title: "区域",
      field: "area",
      width: 120,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 120,
    },
    {
      title: "维护部门",
      field: "maintenanceDepName",
      width: 120,
    },
    {
      title: "创建人",
      field: "createByName",
      width: 120,
    },
    {
      title: "创建时间",
      field: "createTime",
      width: 120,
    },
  ],
  assetDistribution: [
    {
      title: "派发单号",
      field: "allotNumbers",
      width: 150,
    },
    {
      title: "派发日期",
      field: "receiveTime",
      width: 150,
    },
    {
      title: "资产明细",
      field: "propertyDetailed",
      width: 150,
    },
    {
      title: "领用人",
      field: "receiveUserName",
      width: 150,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "处理人",
      field: "createByName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "说明",
      field: "remarks",
      width: 150,
    },
  ],
  assetAllocation: [
    {
      title: "调拨单号",
      field: "allotNumbers",
      width: 150,
    },
    {
      title: "资产明细",
      field: "propertyDetailed",
      width: 150,
    },
    {
      title: "移交部门",
      field: "overDepName",
      width: 150,
    },
    {
      title: "接收部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "处理人",
      field: "createByName",
      width: 150,
    },
    {
      title: "移交日期",
      field: "receiveTime",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "说明",
      field: "remarks",
      width: 150,
    },
  ],
  cleaning: [
    {
      title: "清理单号",
      field: "weedOutNumbers",
      width: 150,
    },
    {
      title: "清理日期",
      field: "manageTime",
      width: 150,
    },
    {
      title: "清理原因",
      field: "cause",
      width: 150,
    },
    {
      title: "资产明细",
      field: "propertyDetailed",
      width: 150,
    },
    {
      title: "处理人",
      field: "weedOutUserName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "说明",
      field: "remarks",
      width: 150,
    },
  ],
  "asset-check": [
    {
      title: "任务名称",
      field: "taskName",
      width: 150,
    },
    {
      title: "盘点资产数",
      field: "propertyNumber",
      width: 150,
    },
    {
      title: "预计完成时间",
      field: "estimateEndTime",
      width: 150,
    },
    {
      title: "实际完成时间",
      field: "realityEndTime",
      width: 150,
    },
    {
      title: "盘点负责人",
      field: "dutyUserName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
  ],
  justInTime: [
    {
      title: "图片",
      field: "files",
      width: 150,
    },
    {
      title: "所在仓库",
      field: "storeName",
      width: 150,
    },
    {
      title: "耗材名称",
      field: "name",
      width: 150,
    },
    {
      title: "耗材编码",
      field: "code",
      width: 150,
    },
    {
      title: "分类名称",
      field: "categoryName",
      width: 150,
    },
    {
      title: "规格型号",
      field: "model",
      width: 150,
    },
    {
      title: "品牌",
      field: "brand",
      width: 150,
    },
    {
      title: "商品条码",
      field: "goodsCode",
      width: 150,
    },
    {
      title: "单位",
      field: "unit",
      width: 150,
    },
    {
      title: "单价（加权平均）",
      field: "avgPrice",
      width: 140,
    },
    {
      title: "实际库存",
      field: "storeNum",
      width: 150,
    },
    {
      title: "库存金额",
      field: "storeAmount",
      width: 150,
    },
    {
      title: "库存上限",
      field: "stockMax",
      width: 150,
    },
    {
      title: "库存下限",
      field: "stockMin",
      width: 150,
    },
  ],
  entering: [
    {
      title: "入库单号",
      field: "depositoryNumbers",
      width: 150,
    },
    {
      title: "入库仓库",
      field: "storeName",
      width: 150,
    },
    {
      title: "入库日期",
      field: "addDate",
      width: 150,
    },
    {
      title: "处理人",
      field: "handlerName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "供应商",
      field: "supplier",
      width: 150,
    },
    {
      title: "合计金额",
      field: "amount",
      width: 150,
    },
    {
      title: "合计数量",
      field: "num",
      width: 150,
    },
  ],
  consuming: [
    {
      title: "领用单号",
      field: "depositoryNumbers",
      width: 150,
    },
    {
      title: "出库仓库",
      field: "storeName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "领用日期",
      field: "reduceDate",
      width: 150,
    },
    {
      title: "领用部门",
      field: "deptName",
      width: 150,
    },
    {
      title: "领用人",
      field: "claimantName",
      width: 150,
    },
    {
      title: "处理人",
      field: "handlerName",
      width: 150,
    },
    {
      title: "处理日期",
      field: "createTime",
      width: 150,
    },
  ],
  "consumable-check": [
    {
      title: "盘点单名称",
      field: "name",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "盘点仓库",
      field: "storeName",
      width: 150,
    },
    {
      title: "本次盘点时间",
      field: "startTime",
      width: 250,
    },
    {
      title: "盘点管理员",
      field: "checker",
      width: 150,
    },
    {
      title: "创建时间",
      field: "createTime",
      width: 150,
    },
    {
      title: "创建人",
      field: "createBy",
      width: 150,
    },
  ],
  assetHistory: [
    {
      title: "资产名称",
      field: "name",
      width: 150,
    },
    {
      title: "照片",
      field: "img",
      width: 150,
    },
    {
      title: "资产编码",
      field: "serialNumber",
      width: 150,
    },
    {
      title: "资产类型",
      field: "typeName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "金额",
      field: "price",
      width: 150,
    },
    {
      title: "使用人",
      field: "receiveUserName",
      width: 150,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "购入日期",
      field: "purchaseDate",
      width: 150,
    },
    {
      title: "操作类型",
      field: "handleTypeName",
      width: 150,
    },
    {
      title: "处理人",
      field: "createByName",
      width: 150,
    },
    {
      title: "处理时间",
      field: "handleTime",
      width: 150,
    },
    {
      title: "处理内容",
      field: "remarks",
      width: 200,
    },
  ],
  maturityAssets: [
    {
      title: "维保到期时间",
      field: "maintenanceDate",
      width: 140,
    },
    {
      title: "资产名称",
      field: "name",
      width: 150,
    },
    {
      title: "照片",
      field: "imgs",
      width: 150,
    },
    {
      title: "资产编码",
      field: "serialNumber",
      width: 150,
    },
    {
      title: "资产类型",
      field: "typeName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "规格型号",
      field: "norms",
      width: 150,
    },
    {
      title: "计量单位",
      field: "unit",
      width: 150,
    },
    {
      title: "金额",
      field: "price",
      width: 150,
    },
    {
      title: "使用人",
      field: "receiveUserName",
      width: 150,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "购入日期",
      field: "purchaseDate",
      width: 150,
    },
    {
      title: "区域",
      field: "area",
      width: 150,
    },
    {
      title: "存放地点",
      field: "storageLocation",
      width: 150,
    },
    {
      title: "管理员",
      field: "adminName",
      width: 150,
    },
    {
      title: "来源",
      field: "sourceName",
      width: 150,
    },
  ],
  overageAssetStatistics: [
    {
      title: "逾龄时间",
      field: "usageDate",
      width: 140,
    },
    {
      title: "资产名称",
      field: "name",
      width: 150,
    },
    {
      title: "照片",
      field: "file",
      width: 150,
    },
    {
      title: "资产编码",
      field: "serialNumber",
      width: 150,
    },
    {
      title: "资产类型",
      field: "typeName",
      width: 150,
    },
    {
      title: "状态",
      field: "status",
      width: 150,
    },
    {
      title: "规格型号",
      field: "norms",
      width: 150,
    },
    {
      title: "计量单位",
      field: "unit",
      width: 150,
    },
    {
      title: "金额",
      field: "price",
      width: 150,
    },
    {
      title: "使用人",
      field: "receiveUserName",
      width: 150,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "购入日期",
      field: "purchaseDate",
      width: 150,
    },
    {
      title: "区域",
      field: "area",
      width: 150,
    },
    {
      title: "存放地点",
      field: "storageLocation",
      width: 150,
    },
    {
      title: "管理员",
      field: "adminName",
      width: 150,
    },
    {
      title: "来源",
      field: "sourceName",
      width: 150,
    },
  ],
  deptAsset: [
    {
      title: "部门名称",
      field: "depName",
      width: 150,
    },
    {
      title: "资产数量",
      field: "totalNumber",
      width: 150,
    },
    {
      title: "金额",
      field: "totalPrice",
      width: 150,
    },
  ],
  warehouseManage: [
    {
      title: "仓库名称",
      field: "name",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remark",
      width: 150,
    },
  ],
  consumablesFile: [
    {
      title: "图片",
      field: "file",
      width: 150,
    },
    {
      title: "耗材名称",
      field: "name",
      width: 150,
    },
    {
      title: "耗材编码",
      field: "code",
      width: 150,
    },
    {
      title: "规格型号",
      field: "model",
      width: 150,
    },
    {
      title: "品牌",
      field: "brand",
      width: 150,
    },
    {
      title: "耗材分类",
      field: "categoryName",
      width: 150,
    },
    {
      title: "单位",
      field: "unit",
      width: 150,
    },
    {
      title: "质保期限",
      field: "qualityPeriod",
      width: 150,
    },
    {
      title: "安全上限",
      field: "stockMax",
      width: 150,
    },
    {
      title: "安全下限",
      field: "stockMin",
      width: 150,
    },
  ],
  assetSource: [
    {
      title: "资产来源名称",
      field: "name",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remarks",
      width: 150,
    },
  ],
  scrapReason: [
    {
      title: "报废原因名称",
      field: "name",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remarks",
      width: 150,
    },
  ],
  abnormalType: [
    {
      title: "类型名称",
      field: "name",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remarks",
      width: 150,
    },
  ],
  assetClass: [
    {
      title: "分类名称",
      field: "name",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remarks",
      width: 150,
    },
  ],
  assetAdministrators: [
    {
      title: "部门名称",
      field: "name",
      width: 150,
    },
    {
      title: "资产管理员",
      field: "adminName",
      width: 150,
    },
    {
      title: "备注说明",
      field: "remark",
      width: 150,
    },
  ],
  deptAssetList: [
    {
      title: "资产编号",
      field: "serialNumber",
      width: 120,
    },
    {
      title: "资产名称",
      field: "name",
      width: 120,
    },
    {
      title: "资产类别",
      field: "typeName",
      width: 120,
    },
    {
      title: "规格型号",
      field: "norms",
      width: 120,
    },
    {
      title: "计量单位",
      field: "unit",
      width: 120,
    },
    {
      title: "金额",
      field: "priceTotal",
      width: 120,
    },
    {
      title: "来源",
      field: "sourceName",
      width: 120,
    },
    {
      title: "购入日期",
      field: "purchaseDate",
      width: 120,
    },
    {
      title: "入库日期",
      field: "startTime",
      width: 120,
    },
    {
      title: "维保到期时间",
      field: "maintenanceDate",
      width: 120,
    },
    {
      title: "剩余维保时间(月)",
      field: "maintenanceTime",
      width: 120,
    },
    {
      title: "资产逾龄时间",
      field: "usageDate",
      width: 120,
    },
    {
      title: "剩余使用期限",
      field: "usageTime",
      width: 120,
    },
    {
      title: "资产状态",
      field: "status",
      width: 120,
    },
    {
      title: "管理员",
      field: "adminName",
      width: 120,
    },
    {
      title: "区域",
      field: "area",
      width: 120,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 120,
    },
    {
      title: "使用人",
      field: "receiveUserName",
      width: 120,
    },
    {
      title: "创建人",
      field: "createByName",
      width: 120,
    },
    {
      title: "创建时间",
      field: "createTime",
      width: 120,
    },
  ],
  assetCheckDetails: [
    {
      title: "资产编码",
      field: "serialNumber",
      width: 150,
    },
    {
      title: "资产名称",
      field: "name",
      width: 150,
    },
    {
      title: "资产类别",
      field: "typeName",
      width: 150,
    },
    {
      title: "规格型号",
      field: "norms",
      width: 150,
    },
    {
      title: "计量单位",
      field: "unit",
      width: 150,
    },
    {
      title: "原值",
      field: "price",
      width: 150,
    },
    {
      title: "使用部门",
      field: "receiveDepName",
      width: 150,
    },
    {
      title: "使用人",
      field: "receiveUserName",
      width: 150,
    },
    {
      title: "入库日期",
      field: "startTime",
      width: 150,
    },
    {
      title: "预计使用年限（月）",
      field: "usageTime",
      width: 150,
    },
    {
      title: "逾龄资产",
      field: "usage",
      width: 150,
    },
    {
      title: "盘点操作人",
      field: "checkUserName",
      width: 150,
    },
    {
      title: "盘点操作时间",
      field: "checkTime",
      width: 150,
    },
    {
      title: "盘点状态",
      field: "checkStatus",
      width: 150,
    },
    {
      title: "异常类型",
      field: "abnormalTypeName",
      width: 150,
    },
    {
      title: "说明",
      field: "abnormalRemarks",
      width: 150,
    },
  ],
  consumableCheckDetails: [
    {
      title: "耗材编码",
      field: "code",
      width: 150,
    },
    {
      title: "耗材名称",
      field: "name",
      width: 150,
    },
    {
      title: "单位",
      field: "unit",
      width: 150,
    },
    {
      title: "耗材分类",
      field: "categoryName",
      width: 150,
    },
    {
      title: "品牌",
      field: "brand",
      width: 150,
    },
    {
      title: "规格型号",
      field: "model",
      width: 150,
    },
    {
      title: "盘点操作时间",
      field: "checkTime",
      width: 150,
    },
    {
      title: "盘点人",
      field: "checkerName",
      width: 150,
    },
    {
      title: "盘点状态",
      field: "status",
      width: 150,
    },
    {
      title: "应盘数量",
      field: "num",
      width: 150,
    },
    {
      title: "实盘数量",
      field: "checkNum",
      width: 150,
    },
  ],
  checkTasks: [
    {
      title: "盘点任务名称",
      field: "taskName",
      width: 150,
    },
    {
      title: "盘点资产数量",
      field: "checkTotalNumber",
      width: 150,
    },
    {
      title: "盘点人员",
      field: "checkUserName",
      width: 150,
    },
    {
      title: "所在部门",
      field: "checkDepName",
      width: 150,
    },
    {
      title: "任务状态",
      field: "status",
      width: 150,
    },
    {
      title: "完成时间",
      field: "realityEndTime",
      width: 150,
    },
  ],
  departmentUse: [
    {
      title: "领用部门",
      field: "deptName",
      width: 140,
    },
    {
      title: "工单号",
      field: "depositoryNumbers",
      width: 180,
    },
    {
      title: "工单类型",
      field: "relatedOrderType",
      width: 110,
    },
    {
      title: "耗材名称",
      field: "name",
      width: 160,
    },
    {
      title: "耗材编码",
      field: "code",
      width: 145,
    },
    {
      title: "分类名称",
      field: "categoryName",
      width: 130,
    },
    {
      title: "仓库",
      field: "storeName",
      width: 130,
    },
    {
      title: "品牌",
      field: "brand",
      width: 115,
    },
    {
      title: "单位",
      field: "unit",
      width: 75,
    },
    {
      title: "处理时间",
      field: "reduceDate",
      width: 120,
    },
    {
      title: "领用数量",
      field: "num",
      width: 90,
    },
    {
      title: "金额",
      field: "amount",
      width: 105,
    },
    {
      title: "领用人",
      field: "claimantName",
      width: 125,
    },
  ],
};
