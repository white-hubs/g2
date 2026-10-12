import type { AssetRow } from "@g2-contract/asset-management";
import type { PcTableColumn } from "@g2-platform/pc-ui";

import { COLUMN_DATA } from "./columns-data";
/** @jsxImportSource vue */
import { ASSET_STATUS, BUSINESS_STATUS, CHECK_STATUS, cellText, money, text } from "./model";
import { loadPcUi } from "./runtime-modules";
const { Image, Tooltip, dayjs } = await loadPcUi();
export function displayDate(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const date = dayjs(value as string | number);
  return date.isValid() ? date.format("YYYY-MM-DD") : cellText(value);
}
export function renderCell(slug: string, field: string, value: unknown, row: AssetRow) {
  if (["files", "file", "imgs", "img"].includes(field)) {
    const files = Array.isArray(value) ? value : [];
    const image = files.find(
      (item) => item && typeof item === "object" && /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/iu.test(String((item as { path?: string }).path)),
    );
    return image ? (
      <Image src={String((image as { path?: string }).path ?? "")} width={44} height={44} style={{ objectFit: "contain" }} />
    ) : (
      "暂无图片"
    );
  }
  let label: string;
  if (field === "status") {
    if (slug === "asset-check" || slug === "checkTasks") {
      label = value === "FINISH" ? "已完成" : "未完成";
    } else if (slug === "consumable-check") {
      label = value === "WEB_FINISH" ? "已完成" : "未完成";
    } else {
      label = [...ASSET_STATUS, ...BUSINESS_STATUS, ...CHECK_STATUS].find((item) => item.value === value)?.label ?? cellText(value);
    }
  } else if (field === "checkStatus") {
    label = CHECK_STATUS.find((item) => item.value === value)?.label ?? cellText(value);
  } else if (field === "startTime" && slug === "consumable-check") {
    label = row.startTime && row.endTime ? `${displayDate(row.startTime)} 至 ${displayDate(row.endTime)}` : "--";
  } else if (/Date$|Time$/u.test(field) && !["usageTime", "maintenanceTime"].includes(field)) {
    label = displayDate(value);
  } else if (["price", "amount", "storeAmount", "avgPrice", "totalPrice", "priceTotal"].includes(field)) {
    label = money(value);
  } else if (field === "propertyDetailed" && Array.isArray(value)) {
    label =
      value
        .map((item) => {
          const asset = item as AssetRow;
          return `${cellText(asset.name)}(${cellText(asset.serialNumber)})`;
        })
        .join("、") || "--";
  } else if (field === "adminName" && !value && Array.isArray(row.adminId)) {
    label = cellText(row.adminId);
  } else if (field === "usage") {
    label = value ? "是" : "否";
  } else if (field === "relatedOrderType") {
    label = value === "FAULT" ? "故障报修" : value === "CONSUMABLE_REDUCE" ? "耗材领用" : cellText(value);
  } else {
    label = cellText(value);
  }
  return (
    <Tooltip title={label}>
      <span>{label}</span>
    </Tooltip>
  );
}
export function columnsFor(slug: string, start = () => 0): PcTableColumn[] {
  return [
    ...(slug === "assetClass"
      ? []
      : [
          {
            title: "序号",
            dataIndex: "_index",
            width: 70,
            align: "center" as const,
            customRender: ({ index }: { index: number }) => start() + index + 1,
          },
        ]),
    ...(COLUMN_DATA[slug] ?? []).map(
      (item): PcTableColumn => ({
        title: item.title,
        dataIndex: item.field,
        width: item.width,
        ellipsis: true,
        customRender: ({ record }) => renderCell(slug, item.field, (record as AssetRow)[item.field], record as AssetRow),
      }),
    ),
  ];
}
export function inoutColumns(): PcTableColumn[] {
  const base = [
    "照片:files",
    "耗材名称:name",
    "耗材编码:code",
    "分类名称:categoryName",
    "仓库:storeName",
    "品牌:brand",
    "单位:unit",
    "处理时间:handleDate",
    "处理人:createBy",
  ].map((item): PcTableColumn => {
    const [title, field] = item.split(":");
    return {
      title,
      dataIndex: field,
      width: 130,
      ellipsis: true,
      customRender: ({ record }) => renderCell("inout", field, (record as AssetRow)[field], record as AssetRow),
    };
  });
  const group = (title: string, prefix: string, flag?: string): PcTableColumn => ({
    title,
    key: prefix,
    children: ["数量:Num", "单价:Price", "金额:Amount"].map((entry): PcTableColumn => {
      const [label, suffix] = entry.split(":");
      const field = flag ? (suffix === "Amount" ? "storeAmount" : suffix.toLowerCase()) : `${prefix}${suffix}`;
      return {
        title: label,
        key: `${prefix}_${field}`,
        dataIndex: field,
        width: 100,
        align: "right",
        customRender: ({ record }) => {
          const row = record as AssetRow;
          const matches = !flag || [flag, flag === "入库" ? "ADD" : "REDUCE"].includes(text(row, "stockFlag"));
          return matches ? (suffix === "Num" ? cellText(row[field]) : money(row[field])) : "--";
        },
      };
    }),
  });
  return [
    { title: "序号", dataIndex: "_index", width: 70, customRender: ({ index }) => index + 1 },
    ...base,
    group("初始", "init"),
    group("入库", "in", "入库"),
    group("出库", "out", "出库"),
    group("结存", "end"),
  ];
}
