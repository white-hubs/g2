import type { FormFlowBusiness, ProcessTaskForm } from "@g2-client/stream-engine/client";
import { dayjs } from "@g2-platform/pc-ui";

import { readonlyConsumablesOutRows } from "./asset-model";
import type { FormPermEntry } from "./form-perms";
import { getFieldPermission } from "./form-perms";
import type { FormSchemaItem } from "./form-schema";
import { fieldKey } from "./form-schema";
import { matchesLegacyFormRelation } from "./form-validation";
import { formatProcessTime } from "./process-progress";

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function listOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordOf) : [];
}

const tableColumns: Record<string, Array<[string, string]>> = {
  ChooseAssetTable: [
    ["序号", "#"],
    ["资产编码", "serialNumber"],
    ["资产名称", "name"],
    ["资产类别", "typeName"],
    ["管理员", "adminName"],
    ["购入日期", "purchaseDate"],
    ["原值", "price"],
    ["规格型号", "norms"],
    ["计量单位", "unit"],
    ["数量", "number"],
  ],
  AddAssetTable: [
    ["序号", "#"],
    ["资产编码", "serialNumber"],
    ["财务编码", "financeNumber"],
    ["资产名称", "name"],
    ["资产类别", "type"],
    ["购入日期", "purchaseDate"],
    ["维保期限（月）", "maintenanceTime"],
    ["使用期限（月）", "usageTime"],
    ["规格型号", "norms"],
    ["计量单位", "unit"],
    ["数量", "number"],
    ["原值", "price"],
    ["管理员", "adminId"],
    ["区域", "areaIds"],
  ],
  ConsumablesEnter: [
    ["序号", "#"],
    ["耗材名称", "name"],
    ["耗材编码", "code"],
    ["规格型号", "model"],
    ["品牌", "brand"],
    ["耗材分类", "categoryName"],
    ["单位", "unit"],
    ["库存量", "stock"],
    ["数量", "num"],
    ["单价", "price"],
    ["金额", "storeAmount"],
  ],
  ConsumablesOut: [
    ["序号", "#"],
    ["耗材名称", "name"],
    ["耗材编码", "code"],
    ["规格型号", "model"],
    ["品牌", "brand"],
    ["耗材分类", "categoryName"],
    ["单位", "unit"],
    ["单价", "avgPrice"],
    ["库存量", "storeNum"],
    ["限领数量", "useLimit"],
    ["出库数量", "num"],
    ["金额", "storeAmount"],
  ],
};

const printableWithoutFlag = new Set(["Description", ...Object.keys(tableColumns)]);
const objectTypeNames: Record<string, string> = {
  DEVICE: "设备",
  STALL: "档位",
  PROPERTY: "资产",
  SITE_POINT: "现场点",
  SMALL_ENGINEERING: "小散工程",
};
const overtimeTypeNames: Record<string, string> = { WORK: "工作日", REST: "休息日", FESTIVAL: "节假日" };

export function formatPrintValue(item: FormSchemaItem, value: unknown): string {
  const name = String(item.name ?? "");
  if (name === "Description") return String(item.props?.placeholder ?? "");
  if (name === "AssetIsExpired") return value === true ? "是" : value === false ? "否" : "";
  if (value == null || value === "") return "";
  const object = recordOf(value);
  if (name === "WorkPermitTypeSelect") return String(object.typeName ?? object.name ?? "");
  if (name === "WorkPermitRiskCheckItems" || name === "WorkPermitAcceptanceItems")
    return listOf(value)
      .map((row) => {
        const result = row.confirmResult === "NORMAL" ? "正常" : row.confirmResult === "ABNORMAL" ? "异常" : "未确认";
        return `${String(row.itemName ?? "")}：${result}${row.description ? `（${String(row.description)}）` : ""}`;
      })
      .join("；");
  if (name === "DeviceStatus" || name === "DeviceChangeStatus")
    return listOf(value)
      .map(
        (row) =>
          `${String(row.name ?? "")}：${row.value == null || row.value === "" ? "--" : String(row.value)}${row.unitName ? String(row.unitName) : ""}`,
      )
      .join("；");
  if (name === "PersonnelCategory") return String(object.label ?? value);
  if (name === "ServicePeriod") return object.radioValue === "limited" ? `服务期限至${String(object.date ?? "")}` : "无期限";
  if (name === "AccessPermission")
    return object.accessControl
      ? `${listOf(object.accessControlRows)
          .map((row) => String(row.name ?? ""))
          .filter(Boolean)
          .join(",")}开启门禁权限`
      : "未开启门禁权限";
  if (name === "ParkingPermission")
    return object.parkingControl
      ? `${listOf(object.parkingControlRows)
          .map((row) => String(row.name ?? row.deviceName ?? ""))
          .filter(Boolean)
          .join(",")}开启停车权限`
      : "未开启停车权限";
  if (name === "SwitchSelect") return value ? "开启" : "关闭";
  if (name === "ObjectTypeSelect") return objectTypeNames[String(value)] ?? String(value);
  if (name === "OvertimeType") return overtimeTypeNames[String(value)] ?? String(value);
  if (name === "VacationBalance" && value === "NO_LIMITED") return "不限制";
  if ((name === "VacationLength" || name === "DepartureTimeLength") && value) return `${String(value)}小时`;
  if (name === "DateTimeRange" || name === "VacationDate") {
    const display = Array.isArray(value) ? value.join("~") : String(value);
    return display.replace(/AM/g, "上午").replace(/PM/g, "下午");
  }
  if (Array.isArray(value))
    return value
      .map((entry) => {
        const row = recordOf(entry);
        return String(row.name ?? row.label ?? entry ?? "");
      })
      .join(",");
  if (typeof value === "object") return String(object.name ?? object.label ?? "");
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

export type PrintField =
  | { kind: "text"; title: string; value: string }
  | { kind: "description"; value: string }
  | { kind: "table"; columns: string[]; rows: string[][] };

export interface PrintFieldsInput {
  schemaItems: FormSchemaItem[];
  formValues: Record<string, unknown>;
  formPerms: FormPermEntry[];
  processType: "add" | "detail";
  nodeId: string;
  taskDetail?: ProcessTaskForm;
}

export function buildPrintFields(input: PrintFieldsInput): PrintField[] {
  const fields: PrintField[] = [];
  const running = recordOf(input.taskDetail?.processInstanceRunningInfo);
  const append = (item: FormSchemaItem, value: unknown, rows: Record<string, unknown>[] = []): void => {
    if (item.name === "GroupList") {
      if (!Array.isArray(value)) return;
      const children = Array.isArray(item.props?.items) ? (item.props.items as FormSchemaItem[]) : [];
      value.forEach((entry, index) => {
        const row = recordOf(entry);
        children.forEach((child) => {
          const nestedKey = fieldKey(child);
          append(child, row[nestedKey] ?? input.formValues[`${fieldKey(item)}_${index}_${nestedKey}`], [...rows, row]);
        });
      });
      return;
    }
    const name = String(item.name ?? "");
    if (!printableWithoutFlag.has(name) && item.props?.showPrint !== true) return;
    if (name === "OutsiderConcat" && !running.outSider && input.processType === "detail") return;
    const permission = getFieldPermission(item, input.formPerms, input.processType, input.nodeId);
    if (!permission.show || item.show === false) return;
    // 旧打印页在只读字段无值时不输出该行。
    if (permission.readonly && (value == null || value === "")) return;
    if (input.processType === "detail" && !matchesLegacyFormRelation(item, input.schemaItems, input.formValues, rows)) return;
    if (name === "Description") {
      fields.push({ kind: "description", value: formatPrintValue(item, value) });
      return;
    }
    if (tableColumns[name]) {
      const columns = tableColumns[name];
      fields.push({
        kind: "table",
        columns: columns.map(([title]) => title),
        rows: (name === "ConsumablesOut" ? readonlyConsumablesOutRows(listOf(value)) : listOf(value)).map((row, index) =>
          columns.map(([, key]) => {
            if (key === "#") return String(index + 1);
            const raw = row[key];
            if (key === "purchaseDate" && raw) {
              const date = dayjs(raw as string | number | Date);
              return date.isValid() ? date.format("YYYY-MM-DD") : "--";
            }
            return formatPrintValue({ name: "TextInput" }, raw) || "--";
          }),
        ),
      });
      return;
    }
    fields.push({ kind: "text", title: String(item.title ?? ""), value: formatPrintValue(item, value) });
  };
  input.schemaItems.forEach((item) => append(item, input.formValues[fieldKey(item)]));
  return fields;
}

export interface PrintOperation {
  nodeName: string;
  operator: string;
  action: string;
  opinion?: string;
  signId?: string;
  time: string;
}

export function buildPrintOperations(nodes: unknown[], flowForm?: FormFlowBusiness): PrintOperation[] {
  return nodes.flatMap((node) => {
    const record = recordOf(node);
    const config = recordOf(record.approvalCommentConfig);
    return listOf(record.taskOperations).flatMap((entry) => {
      const operation = recordOf(entry.operation);
      if (!Object.keys(operation).length) return [];
      const opinion = recordOf(operation.approvalOpinion);
      const showApproval = opinion.approvalType === "ARTIFICIAL" || Boolean(flowForm?.autoApprovalPrinting);
      return [
        {
          nodeName: String(record.nodeName ?? ""),
          operator: showApproval ? String(recordOf(operation.operator).name ?? "") : "",
          action: showApproval ? String(operation.typeAlias ?? "同意") : "",
          opinion: showApproval && config.supportText ? `审批意见：${String(opinion.text || "已同意")}` : undefined,
          signId: showApproval && config.supportHandwrittenSignature && opinion.sign ? String(opinion.sign) : undefined,
          time: formatProcessTime(operation.createTime),
        },
      ];
    });
  });
}
