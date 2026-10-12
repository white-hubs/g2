import { PlusOutlined, RobotOutlined } from "@ant-design/icons-vue";
import type { InspectionConfigKind, InspectionPage, InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, onMounted, reactive, ref, type Component } from "vue";
import { useRouter } from "vue-router";

import { AreaCascaderSelect } from "@/compat/app-design";
import {
  OBJECT_STATUS_MAP,
  RESULT_OPTIONS,
  recordTypeOptions,
  resultSourceOptions,
  smartTargetCategoryOptions,
  targetCategoryOptions,
  taskTimeoutOptions,
} from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopOver,
  PopConfirm,
  Switch,
  Textarea,
  message,
  usePcForm,
  usePcTable,
  type PcTableColumn,
} from "@/pc-ui-runtime";
import { ArchiveInfo } from "@/views/inspect-archive/archive-info/archive-info";
import { InspectItemsForm } from "@/views/inspect-config/inspect-items-form/inspect-items-form";
import { InspectResultModal } from "@/views/inspect-config/inspect-result/inspect-result-modal";
import { InspectStandardAi } from "@/views/inspect-config/inspect-standard-ai/inspect-standard-ai";
import { InspectStandardForm } from "@/views/inspect-config/inspect-standard-form/inspect-standard-form";
import { InspectPlanEdit } from "@/views/inspect-plan/inspect-plan-edit/inspect-plan-edit";
import { RecordInfo } from "@/views/inspect-records/record-info/record-info";
import { InspectTaskEdit } from "@/views/inspect-task/inspect-task-edit/inspect-task-edit";
import { InspectTaskInfo } from "@/views/inspect-task/inspect-task-edit/inspect-task-info";
import { SmartInspectPlanEdit, SmartInspectPlanInfo } from "@/views/smart-inspect-plan/smart-inspect-plan-edit/smart-inspect-plan-edit";
import { SmartInspectTaskEdit, SmartInspectTaskInfo } from "@/views/smart-inspect-task/smart-inspect-task-edit/smart-inspect-task-edit";

const BASE = "/d/daily-inspection";

type PageKind = "plan" | "smart-plan" | "task" | "smart-task" | "records" | "archive" | "plan-statistics" | "abnormal-rate";

interface ListSpec {
  title: string;
  tableCode: string;
  nameField: string;
  nameLabel: string;
  statusField?: string;
  columns: Array<{
    title: string;
    fields: string[];
    width?: number;
    render?:
      | "time"
      | "plan-status"
      | "task-status"
      | "result"
      | "result-source"
      | "rate"
      | "progress"
      | "target-category"
      | "executor"
      | "receive"
      | "task-type";
  }>;
  canCreate?: boolean;
  smart?: boolean;
}

const listSpecs: Record<PageKind, ListSpec> = {
  plan: {
    title: "巡检计划",
    tableCode: "DAILY_INSPECTION_PLAN",
    nameField: "keywords",
    nameLabel: "计划名称",
    statusField: "status",
    canCreate: true,
    columns: [
      { title: "计划名称", fields: ["name", "planName"], width: 210 },
      { title: "巡检类型", fields: ["typeName", "inspectTypeName"], width: 140 },
      { title: "执行部门/人", fields: ["receiveType"], width: 180, render: "receive" },
      { title: "巡检对象数", fields: ["targetNum", "objectCount"], width: 120 },
      { title: "失效时间", fields: ["validEndTime"], width: 170, render: "time" },
      { title: "状态", fields: ["status"], width: 100, render: "plan-status" },
      { title: "创建人", fields: ["createByName"], width: 120 },
      { title: "创建时间", fields: ["createTime"], width: 170, render: "time" },
    ],
  },
  "smart-plan": {
    title: "智能巡检计划",
    tableCode: "SMART_INSPECT_PLAN_TABLE_CODE",
    nameField: "keywords",
    nameLabel: "计划名称",
    statusField: "status",
    canCreate: true,
    smart: true,
    columns: [
      { title: "计划名称", fields: ["name", "planName"], width: 200 },
      { title: "巡检类型", fields: ["typeName"], width: 140 },
      { title: "巡检对象类型", fields: ["targetCategory", "targetCategories"], width: 150, render: "target-category" },
      { title: "执行人或设备", fields: ["executor"], width: 170, render: "executor" },
      { title: "周期", fields: ["cycleText", "cycle"], width: 130 },
      { title: "巡检对象数", fields: ["targetNum"], width: 120 },
      { title: "失效时间", fields: ["validEndTime"], width: 170, render: "time" },
      { title: "状态", fields: ["status"], width: 100, render: "plan-status" },
      { title: "创建人", fields: ["createByName"], width: 120 },
      { title: "创建时间", fields: ["createTime"], width: 170, render: "time" },
    ],
  },
  task: {
    title: "巡检任务",
    tableCode: "DAILY_INSPECTION_TASK",
    nameField: "keyword",
    nameLabel: "任务名称",
    statusField: "status",
    canCreate: true,
    columns: [
      { title: "任务名称", fields: ["name", "taskName"], width: 200 },
      { title: "巡检类型", fields: ["typeName"], width: 130 },
      { title: "任务类型", fields: ["isCheck"], width: 100, render: "task-type" },
      { title: "执行人", fields: ["receiveNames"], width: 150 },
      { title: "发布人", fields: ["publisherName"], width: 120 },
      { title: "发布时间", fields: ["createTime"], width: 170, render: "time" },
      { title: "截止时间", fields: ["validEndTime"], width: 170, render: "time" },
      { title: "异常巡检项数", fields: ["abnormalItemCount"], width: 130 },
      { title: "巡检对象数", fields: ["targetNum"], width: 120 },
      { title: "巡检进度", fields: ["recordCompletionRate"], width: 130, render: "progress" },
      { title: "状态", fields: ["status"], width: 100, render: "task-status" },
      { title: "异常对象数", fields: ["errCount"], width: 120 },
      { title: "已修复对象数", fields: ["repairNum", "repairCount"], width: 130 },
    ],
  },
  "smart-task": {
    title: "智能巡检任务",
    tableCode: "SMART_INSPECT_TASK_TABLE_CODE",
    nameField: "keyword",
    nameLabel: "任务名称",
    statusField: "status",
    canCreate: true,
    smart: true,
    columns: [
      { title: "任务名称", fields: ["name", "taskName"], width: 200 },
      { title: "巡检类型", fields: ["typeName"], width: 130 },
      { title: "巡检对象类型", fields: ["targetCategory", "targetCategories"], width: 150, render: "target-category" },
      { title: "执行人或设备", fields: ["executeDevice", "executor"], width: 170, render: "executor" },
      { title: "发布人", fields: ["publisherName"], width: 120 },
      { title: "发布时间", fields: ["createTime"], width: 170, render: "time" },
      { title: "截止时间", fields: ["validEndTime"], width: 170, render: "time" },
      { title: "巡检对象数", fields: ["targetNum"], width: 120 },
      { title: "巡检进度", fields: ["recordCompletionRate"], width: 150, render: "progress" },
      { title: "状态", fields: ["status"], width: 100, render: "task-status" },
      { title: "异常巡检项数", fields: ["abnormalItemCount"], width: 130 },
      { title: "已修复对象数", fields: ["repairNum", "repairCount"], width: 130 },
    ],
  },
  records: {
    title: "巡检记录",
    tableCode: "DAILY_INSPECTION_RECORDS",
    nameField: "keyword",
    nameLabel: "任务名称",
    statusField: "result",
    columns: [
      { title: "序号", fields: ["__index"], width: 70 },
      { title: "任务名称", fields: ["taskName", "inspectTaskName"], width: 190 },
      { title: "巡检对象", fields: ["targetName", "objectName", "inspectObjName"], width: 190 },
      { title: "巡检项", fields: ["itemName", "inspectItemName", "standardName"], width: 190 },
      { title: "巡检结果", fields: ["result", "resultName", "inspectResult"], width: 110, render: "result" },
      { title: "结果来源", fields: ["resultSource"], width: 110, render: "result-source" },
      { title: "执行人", fields: ["nickname", "username", "executorName"], width: 120 },
      { title: "巡检时间", fields: ["time", "inspectTime", "executeTime", "createTime"], width: 170, render: "time" },
    ],
  },
  archive: {
    title: "巡检档案",
    tableCode: "DAILY_INSPECTION_ARCHIVE",
    nameField: "keyword",
    nameLabel: "巡检对象",
    columns: [
      { title: "对象名称", fields: ["targetName", "objectName", "name"], width: 200 },
      { title: "对象类型", fields: ["targetCategory"], width: 130, render: "target-category" },
      { title: "所在区域", fields: ["areaName"], width: 160 },
      { title: "部门", fields: ["organizationName"], width: 150 },
      { title: "巡检人员", fields: ["nickname"], width: 120 },
      { title: "最近一次巡检时间", fields: ["time"], width: 180, render: "time" },
      { title: "最近一次巡检结果", fields: ["result"], width: 150, render: "result" },
      { title: "最近一次结果来源", fields: ["resultSource"], width: 150, render: "result-source" },
    ],
  },
  "plan-statistics": {
    title: "计划统计",
    tableCode: "DAILY_INSPECTION_PLAN_STATISTICS",
    nameField: "name",
    nameLabel: "计划名称",
    columns: [
      { title: "序号", fields: ["__index"], width: 70 },
      { title: "任务名称", fields: ["name"], width: 190 },
      { title: "巡检类型", fields: ["typeName"], width: 130 },
      { title: "任务数", fields: ["taskTotal"], width: 100 },
      { title: "已完成任务数", fields: ["completedTaskTotal"], width: 130 },
      { title: "待完成任务数", fields: ["pendingTaskTotal"], width: 130 },
      { title: "对象总数", fields: ["objectTotal"], width: 110 },
      { title: "已巡检对象数", fields: ["inspectedObjectTotal"], width: 130 },
      { title: "待巡检对象数", fields: ["pendingObjectTotal"], width: 130 },
      { title: "异常巡检项数", fields: ["abnormalItemTotal"], width: 130 },
      { title: "未处理异常项数", fields: ["unhandledAbnormalItemTotal"], width: 140 },
      { title: "已处理异常项数", fields: ["handledAbnormalItemTotal"], width: 140 },
    ],
  },
  "abnormal-rate": {
    title: "任务标准项异常率统计",
    tableCode: "DAILY_INSPECTION_ABNORMAL_RATE",
    nameField: "standardName",
    nameLabel: "任务标准名称",
    columns: [
      { title: "序号", fields: ["__index"], width: 70 },
      { title: "对象名称", fields: ["targetName"], width: 180 },
      { title: "执行人", fields: ["nickname"], width: 120 },
      { title: "执行时间", fields: ["updateTime"], width: 170, render: "time" },
      { title: "任务标准名称", fields: ["standardName"], width: 180 },
      { title: "任务名称", fields: ["taskName"], width: 180 },
      { title: "标准项个数", fields: ["totalItemCount"], width: 120 },
      { title: "异常数", fields: ["abnormalItemCount"], width: 100 },
      { title: "异常率", fields: ["abnormalRate"], width: 110, render: "rate" },
    ],
  },
};

const configSpecs: Record<InspectionConfigKind, { title: string; tableCode: string; nameFields: string[]; codeFields: string[] }> = {
  type: { title: "巡检类型", tableCode: "DAILY_INSPECTION_TYPE", nameFields: ["name", "typeName"], codeFields: ["code", "typeCode"] },
  cron: {
    title: "巡检周期",
    tableCode: "DAILY_INSPECTION_CRON",
    nameFields: ["name", "cronName"],
    codeFields: ["cron", "cronExpression", "code"],
  },
  result: {
    title: "巡检结果",
    tableCode: "DAILY_INSPECTION_RESULT",
    nameFields: ["name", "resultName"],
    codeFields: ["code"],
  },
  item: {
    title: "巡检项",
    tableCode: "DAILY_INSPECTION_ITEM",
    nameFields: ["alias", "itemName", "name"],
    codeFields: ["name", "itemCode", "code"],
  },
  standard: {
    title: "巡检标准",
    tableCode: "DAILY_INSPECTION_STANDARD",
    nameFields: ["name", "standardName"],
    codeFields: ["code", "standardCode"],
  },
};

function read(record: InspectionRecord, fields: string[], fallback = "--"): string {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "boolean") return value ? "启用" : "停用";
      if (Array.isArray(value)) return value.map(String).join("、") || fallback;
      return String(value);
    }
  }
  return fallback;
}

function readValue(record: InspectionRecord, fields: string[]): unknown {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function formatTime(value: unknown): string {
  if (value === undefined || value === null || value === "") return "--";
  const normalized = typeof value === "string" && /^\d{13}$/.test(value) ? Number(value) : value;
  const date = new Date(normalized as string | number | Date);
  if (Number.isNaN(date.getTime())) return "--";
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const planStatusMap: Record<string, string> = { EXECUTING: "执行中", OVER: "已结束", STOP: "已停用" };
const taskStatusMap: Record<string, string> = {
  ACCEPT: "待接收",
  EXECUTING: "待巡检",
  STOP: "已终止",
  OVER: "已巡检",
  WAIT_REPAIR: "待修复",
  REPAIRED: "已修复",
};
const targetCategoryMap: Record<string, string> = {
  AREA: "区域",
  DEVICE: "设备",
  PROPERTY: "资产",
  STALL: "档位",
  SITE_POINT: "现场点",
  RISK_SOURCE: "风险源",
  SMALL_ENGINEERING: "小散工程",
  DRONE: "无人机",
  ROBOT_DOG: "机器狗",
};

function displayStatus(value: unknown, map: Record<string, string>): { label: string; color: string } {
  const key = String(value ?? "");
  const label = (map[key] ?? key) || "--";
  const color = key === "STOP" ? "#969799" : /OVER|REPAIRED/.test(key) ? "#6ab539" : key === "WAIT_REPAIR" ? "#ffaa26" : "#1d66ff";
  return { label, color };
}

function targetCategoryText(record: InspectionRecord, fields: string[]): string {
  const raw = readValue(record, fields);
  const values = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  const labels = values.map((value) => targetCategoryMap[String(value).trim()] ?? String(value).trim()).filter(Boolean);
  if (labels.length) return [...new Set(labels)].join("、");
  return read(record, ["targetCategoryNames", "targetCategoryName", "objectTypeName"]);
}

function executorText(record: InspectionRecord): string {
  const manual = read(record, ["receiveNames", "receiveDeptNames", "receivePostNames", "receiveRoleNames"], "");
  const device = read(record, ["executionDeviceName", "deviceName", "executorName"], "");
  const drone = record.droneInspection as InspectionRecord | undefined;
  const droneConfig = record.droneConfig as InspectionRecord | undefined;
  const robot = record.robotDogInspection as InspectionRecord | undefined;
  const robotConfig = record.robotDogConfig as InspectionRecord | undefined;
  return (
    [manual, device, drone?.deviceName, droneConfig?.deviceName, robot?.deviceName, robotConfig?.deviceName]
      .filter(Boolean)
      .map(String)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" / ") || "--"
  );
}

function receiveText(record: InspectionRecord): string {
  if (String(record.receiveType ?? "") === "1") return read(record, ["receiveNames"]);
  const department = read(record, ["receiveDeptNames"], "");
  const post = read(record, ["receivePostNames"], "");
  if (department && post) return `${department}/${post}`;
  return department || post || read(record, ["receiveRoleNames"]);
}

function inspectItemText(record: InspectionRecord): string {
  const direct = read(record, ["itemName", "standardItemName", "inspectItemName"], "");
  if (direct) return direct;
  const names: string[] = [];
  const recordItems = record.recordItemVOS;
  if (Array.isArray(recordItems)) {
    recordItems.forEach((item) => {
      if (item && typeof item === "object" && "itemName" in item) names.push(String((item as InspectionRecord).itemName ?? ""));
    });
  }
  const standards = record.standardVOS;
  if (Array.isArray(standards)) {
    standards.forEach((standard) => {
      if (!standard || typeof standard !== "object") return;
      const items = (standard as InspectionRecord).standardItems;
      if (Array.isArray(items)) items.forEach((item) => names.push(read(item as InspectionRecord, ["itemName", "name"], "")));
    });
  }
  return [...new Set(names.filter(Boolean))].join("、") || "--";
}

function recordId(record: InspectionRecord): string {
  return String(record.id ?? record.recordId ?? record.taskId ?? record.planId ?? "");
}

function normalizeRate(value: string): string {
  if (value === "--" || value.endsWith("%")) return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${number <= 1 ? Math.round(number * 100) : number}%`;
}

async function loadList(kind: PageKind, params: Record<string, unknown>): Promise<InspectionPage> {
  const client = getDailyInspectionClient();
  if (kind === "plan" || kind === "smart-plan") return client.listPlans(params);
  if (kind === "task" || kind === "smart-task") return client.listTasks(params);
  if (kind === "records") return client.listRecords(params);
  if (kind === "archive") return client.listArchives(params);
  if (kind === "plan-statistics") return client.listPlanStatistics(params);
  return client.listAbnormalRates(params);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function normalizePeriod(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(",");
  return value ? String(value) : "";
}

function normalizeAreaId(value: unknown): string {
  if (Array.isArray(value)) {
    const leaf = value.filter(Boolean).at(-1);
    return leaf == null ? "" : String(leaf);
  }
  return value ? String(value) : "";
}

function defaultMonthPeriod(): [string, string] {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const begin = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return [begin, end];
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value).replaceAll('"', '""');
  return `"${text}"`;
}

async function exportListAsCsv(options: {
  fileName: string;
  total: number;
  columns: Array<{ title: string; dataIndex: string }>;
  fetchPage: (pageNumber: number, pageSize: number) => Promise<InspectionPage>;
}): Promise<void> {
  if (options.total <= 0) {
    message.warning("暂无数据");
    return;
  }
  const pageSize = 999;
  const pageCount = Math.max(1, Math.ceil(options.total / pageSize));
  const records: InspectionRecord[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await options.fetchPage(pageNumber, pageSize);
    records.push(...(page.records ?? []));
  }
  if (records.length === 0) {
    message.warning("暂无数据");
    return;
  }
  const lines = [
    options.columns.map((column) => escapeCsvCell(column.title)).join(","),
    ...records.map((record) => options.columns.map((column) => escapeCsvCell(record[column.dataIndex])).join(",")),
  ];
  downloadBlob(new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${options.fileName}.csv`);
}

function createListPage(kind: PageKind): Component {
  const spec = listSpecs[kind];
  return defineComponent({
    name: `DailyInspection${kind}`,
    setup() {
      const router = useRouter();
      const [defaultBegin, defaultEnd] = defaultMonthPeriod();
      const query = reactive({
        keyword: "",
        status: "",
        typeId: "",
        targetCategory: "",
        areaId: "" as string,
        period: kind === "plan-statistics" ? `${defaultBegin},${defaultEnd}` : "",
        resultSource: "",
        taskTimeout: "",
        temporary: "",
        result: "",
        pageNumber: 1,
        pageSize: 10,
        total: 0,
      });
      const typeOptions = reactive<Array<{ label: string; value: string }>>([]);
      const isTaskList = kind === "task" || kind === "smart-task";
      const canLoopExport = kind === "archive" || kind === "records" || kind === "plan-statistics" || kind === "abnormal-rate";
      const selectedRowKeys = ref<string[]>([]);
      const exportLoading = ref(false);
      const batchDeleteLoading = ref(false);

      const navigate = (path: string, row?: InspectionRecord, extra: Record<string, string> = {}): void => {
        void router.push({ path: `${BASE}/${path}`, query: { ...extra, ...(row ? { id: recordId(row) } : {}) } });
      };

      const remove = async (row: InspectionRecord): Promise<void> => {
        const id = recordId(row);
        if (!id) return;
        try {
          const client = getDailyInspectionClient();
          if (kind === "plan" || kind === "smart-plan") await client.deletePlan(id);
          else if (isTaskList) await client.deleteTasks([id]);
          message.success("删除成功");
          tableApi.query();
        } catch {
          message.error("删除失败，请稍后重试");
        }
      };

      const togglePlan = async (row: InspectionRecord, checked: boolean): Promise<void> => {
        try {
          await getDailyInspectionClient().setPlanEnabled(recordId(row), checked);
          row.enable = checked;
          row.startFlag = checked;
          message.success(checked ? "已启用" : "已停用");
        } catch {
          message.error("状态更新失败");
        }
      };

      const columns: PcTableColumn[] = spec.columns.map((column) => ({
        title: column.title,
        dataIndex: column.fields[0],
        key: column.fields[0],
        align: "center",
        width: column.width,
        ellipsis: true,
        customRender: ({ record, index }: { record: InspectionRecord; index?: number }) => {
          const raw = readValue(record, column.fields);
          let value = read(record, column.fields);
          if (column.fields[0] === "__index") value = String((query.pageNumber - 1) * query.pageSize + (index ?? 0) + 1);
          if (column.render === "time") value = formatTime(raw);
          if (column.render === "rate") value = normalizeRate(value);
          if (column.render === "progress") {
            const percent = normalizeRate(value === "--" ? "0" : value);
            return (
              <div class="daily-inspection-progress">
                <span style={{ width: percent }} />
                <em>{percent}</em>
              </div>
            );
          }
          if (column.render === "plan-status" || column.render === "task-status") {
            const status = displayStatus(raw, column.render === "plan-status" ? planStatusMap : taskStatusMap);
            return (
              <PopOver content={status.label}>
                <span class="daily-inspection-status-text" style={{ color: status.color }}>
                  {status.label}
                </span>
              </PopOver>
            );
          }
          if (column.render === "result") {
            const key = String(raw ?? "");
            value = key === "NORMAL" ? "正常" : key === "ABNORMAL" ? "异常" : value;
            return (
              <PopOver content={value}>
                <span style={{ color: key === "ABNORMAL" ? "#ff4158" : key === "NORMAL" ? "#6ab539" : undefined }}>{value}</span>
              </PopOver>
            );
          }
          if (column.render === "result-source") value = String(raw ?? "MANUAL") === "AI" ? "AI识别" : "人工确认";
          if (column.render === "target-category") value = targetCategoryText(record, column.fields);
          if (column.render === "executor") value = executorText(record);
          if (column.render === "receive") value = receiveText(record);
          if (column.render === "task-type") value = raw ? "稽查" : "普通";
          if (column.fields[0] === "itemName") value = inspectItemText(record);
          return (
            <PopOver content={value}>
              <span class="daily-inspection-cell-text">{value}</span>
            </PopOver>
          );
        },
      }));

      if (kind === "plan" || kind === "smart-plan") {
        columns.push({
          title: "停用/启用",
          dataIndex: "enable",
          key: "enable",
          align: "center",
          width: 120,
          fixed: "right",
          customRender: ({ record }: { record: InspectionRecord }) => (
            <Switch
              checked={Boolean(record.enable ?? record.startFlag)}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) => void togglePlan(record, Boolean(checked))}
            />
          ),
        });
      }

      if (kind === "plan" || kind === "smart-plan" || isTaskList || kind === "records" || kind === "archive") {
        columns.push({
          title: "操作",
          dataIndex: "operation",
          key: "operation",
          align: "center",
          width: kind === "plan" || kind === "smart-plan" ? 220 : 150,
          fixed: "right",
          customRender: ({ record }: { record: InspectionRecord }) => {
            const isPlan = kind === "plan" || kind === "smart-plan";
            const prefix = kind.startsWith("smart-") ? "smart-" : "";
            return (
              <div class="daily-inspection-actions">
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    navigate(
                      isTaskList
                        ? `${prefix}inspect-task-info`
                        : isPlan
                          ? kind === "smart-plan"
                            ? "smart-inspect-plan-info"
                            : "inspect-plan-edit"
                          : kind === "archive"
                            ? "inspect-archive-info"
                            : "inspect-record-info",
                      record,
                      isPlan && kind !== "smart-plan" ? { type: "info" } : {},
                    )
                  }
                >
                  详情
                </Button>
                {isPlan ? (
                  <Button type="link" size="small" onClick={() => navigate(`${prefix}inspect-plan-edit`, record, { type: "edit" })}>
                    编辑
                  </Button>
                ) : null}
                {isPlan ? (
                  <Button type="link" size="small" onClick={() => navigate(`${prefix}inspect-plan-edit`, record, { type: "copy" })}>
                    复制
                  </Button>
                ) : null}
                {isPlan ? (
                  <PopConfirm title="确认删除该数据吗？" onConfirm={() => void remove(record)}>
                    <Button type="link" danger size="small">
                      删除
                    </Button>
                  </PopConfirm>
                ) : null}
                {isTaskList && String(record.status ?? "") === "EXECUTING" ? (
                  <PopConfirm
                    title="确认终止巡检任务？"
                    onConfirm={() =>
                      void getDailyInspectionClient()
                        .stopTask(recordId(record))
                        .then(() => tableApi.query())
                    }
                  >
                    <Button type="link" size="small">
                      终止巡检
                    </Button>
                  </PopConfirm>
                ) : null}
              </div>
            );
          },
        });
      }

      const listQueryParams = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
        const base: Record<string, unknown> = {
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
          [spec.nameField]: query.keyword || undefined,
          ...overrides,
        };
        if (kind === "archive") {
          return {
            ...base,
            keyword: query.keyword || undefined,
            areaId: query.areaId || undefined,
            targetCategory: query.targetCategory || undefined,
            resultSource: query.resultSource || undefined,
            period: query.period || undefined,
          };
        }
        if (kind === "records") {
          return {
            ...base,
            keyword: query.keyword || undefined,
            status: query.status || undefined,
            temporary: query.temporary || undefined,
            result: query.result || undefined,
            resultSource: query.resultSource || undefined,
            period: query.period || undefined,
          };
        }
        if (isTaskList) {
          return {
            ...base,
            keyword: query.keyword || undefined,
            status: query.status || undefined,
            typeId: query.typeId || undefined,
            taskTimeout: query.taskTimeout || undefined,
            period: query.period || undefined,
            ...(kind === "smart-task"
              ? {
                  ...(query.targetCategory === "DRONE" ? { droneInspection: true } : {}),
                  ...(query.targetCategory === "ROBOT_DOG" ? { robotDogInspection: true } : {}),
                  ...(query.targetCategory && query.targetCategory !== "DRONE" && query.targetCategory !== "ROBOT_DOG"
                    ? { targetCategory: query.targetCategory }
                    : {}),
                }
              : {}),
          };
        }
        if (kind === "smart-plan") {
          return {
            ...base,
            status: query.status || undefined,
            typeId: query.typeId || undefined,
            targetCategory: query.targetCategory || undefined,
          };
        }
        if (kind === "plan") {
          return {
            ...base,
            status: query.status || undefined,
            typeId: query.typeId || undefined,
          };
        }
        if (kind === "plan-statistics") {
          return {
            ...base,
            name: query.keyword || undefined,
            typeId: query.typeId || undefined,
            period: query.period || undefined,
          };
        }
        if (kind === "abnormal-rate") {
          return {
            ...base,
            standardName: query.keyword || undefined,
            period: query.period || undefined,
          };
        }
        return {
          ...base,
          [spec.statusField ?? "status"]: query.status || undefined,
          ...(["plan", "smart-plan", "task", "smart-task"].includes(kind) ? { typeId: query.typeId || undefined } : {}),
        };
      };

      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: spec.tableCode,
        rowKey: "id",
        autoFetch: false,
        ...(isTaskList
          ? {
              rowSelection: "checkbox" as const,
              rowSelectionChange: (keys: (string | number)[]) => {
                selectedRowKeys.value = keys.map(String);
              },
            }
          : {}),
        fetchApi: async () => {
          try {
            const page = await loadList(kind, listQueryParams());
            query.total = page.total;
            return page;
          } catch {
            message.error(`${spec.title}加载失败，请稍后重试`);
            return { records: [], total: 0, pages: 0 };
          }
        },
      });

      const handleExport = async (): Promise<void> => {
        try {
          exportLoading.value = true;
          if (isTaskList) {
            const blob = await getDailyInspectionClient().exportTasks(listQueryParams());
            downloadBlob(blob, `${spec.title}列表.xlsx`);
            return;
          }
          if (!canLoopExport) return;
          const exportColumns = columns
            .filter((column) => column.dataIndex && column.dataIndex !== "operation" && column.dataIndex !== "enable")
            .map((column) => ({ title: String(column.title ?? column.dataIndex), dataIndex: String(column.dataIndex) }));
          await exportListAsCsv({
            fileName: spec.title,
            total: query.total,
            columns: exportColumns,
            fetchPage: (pageNumber, pageSize) => loadList(kind, listQueryParams({ pageNumber, pageSize })),
          });
        } catch {
          message.error("导出失败，请稍后重试");
        } finally {
          exportLoading.value = false;
        }
      };

      const handleBatchDelete = async (): Promise<void> => {
        if (!isTaskList || selectedRowKeys.value.length === 0) return;
        try {
          batchDeleteLoading.value = true;
          await getDailyInspectionClient().deleteTasks(selectedRowKeys.value);
          message.success("删除成功");
          selectedRowKeys.value = [];
          tableApi.setSelectedRowKeys([]);
          query.pageNumber = 1;
          tableApi.query();
        } catch {
          message.error("删除失败，请稍后重试");
        } finally {
          batchDeleteLoading.value = false;
        }
      };

      // Select 未选值必须是 undefined/null，禁止用 ""（会吞掉 placeholder）；「全部」靠 allowClear + placeholder
      const planStatusOptions = [
        { label: "执行中", value: "EXECUTING" },
        { label: "已结束", value: "OVER" },
        { label: "已停用", value: "STOP" },
      ];
      const taskStatusOptions = Object.entries(taskStatusMap).map(([value, label]) => ({ label, value }));
      const objectStatusOptions = Object.entries(OBJECT_STATUS_MAP).map(([value, label]) => ({ label, value }));

      const buildFormSchema = (): Array<{
        component: string | Component;
        fieldName: string;
        label: string;
        defaultValue?: unknown;
        componentProps?: Record<string, unknown>;
      }> => {
        if (kind === "archive") {
          return [
            {
              component: "Select",
              fieldName: "targetCategory",
              label: "对象类型",
              componentProps: { allowClear: true, placeholder: "对象类型", options: targetCategoryOptions },
            },
            { component: AreaCascaderSelect, fieldName: "areaId", label: "区域", componentProps: { placeholder: "区域" } },
            {
              component: "RangePicker",
              fieldName: "period",
              label: "巡检时间",
              componentProps: { valueFormat: "YYYY-MM-DD HH:mm:ss", allowClear: true },
            },
            {
              component: "Select",
              fieldName: "resultSource",
              label: "结果来源",
              componentProps: { allowClear: true, placeholder: "结果来源", options: resultSourceOptions },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "巡检对象名称" } },
          ];
        }
        if (kind === "records") {
          return [
            {
              component: "Select",
              fieldName: "temporary",
              label: "记录类型",
              componentProps: { allowClear: true, placeholder: "记录类型", options: recordTypeOptions },
            },
            {
              component: "Select",
              fieldName: "status",
              label: "对象状态",
              componentProps: { allowClear: true, placeholder: "对象状态", options: objectStatusOptions },
            },
            {
              component: "Select",
              fieldName: "result",
              label: "巡查结果",
              componentProps: { allowClear: true, placeholder: "巡查结果", options: RESULT_OPTIONS },
            },
            {
              component: "Select",
              fieldName: "resultSource",
              label: "结果来源",
              componentProps: { allowClear: true, placeholder: "结果来源", options: resultSourceOptions },
            },
            {
              component: "RangePicker",
              fieldName: "period",
              label: "巡检时间",
              componentProps: { valueFormat: "YYYY-MM-DD HH:mm:ss", allowClear: true },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "对象名称" } },
          ];
        }
        if (kind === "task") {
          return [
            {
              component: "Select",
              fieldName: "status",
              label: "状态",
              componentProps: { allowClear: true, placeholder: "状态", options: taskStatusOptions },
            },
            {
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: { allowClear: true, placeholder: "请选择", options: typeOptions },
            },
            {
              component: "Select",
              fieldName: "taskTimeout",
              label: "任务时限",
              componentProps: { allowClear: true, placeholder: "任务时限", options: taskTimeoutOptions },
            },
            {
              component: "RangePicker",
              fieldName: "period",
              label: "发布时间",
              componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "任务名称" } },
          ];
        }
        if (kind === "smart-task") {
          return [
            {
              component: "Select",
              fieldName: "status",
              label: "状态",
              componentProps: { allowClear: true, placeholder: "状态", options: taskStatusOptions },
            },
            {
              component: "Select",
              fieldName: "targetCategory",
              label: "对象类型",
              componentProps: { allowClear: true, placeholder: "对象类型", options: smartTargetCategoryOptions },
            },
            {
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: { allowClear: true, placeholder: "请选择", options: typeOptions },
            },
            {
              component: "Select",
              fieldName: "taskTimeout",
              label: "任务时限",
              componentProps: { allowClear: true, placeholder: "任务时限", options: taskTimeoutOptions },
            },
            {
              component: "RangePicker",
              fieldName: "period",
              label: "发布时间",
              componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "任务名称" } },
          ];
        }
        if (kind === "smart-plan") {
          return [
            {
              component: "Select",
              fieldName: "status",
              label: "状态",
              componentProps: { allowClear: true, placeholder: "状态", options: planStatusOptions },
            },
            {
              component: "Select",
              fieldName: "targetCategory",
              label: "对象类型",
              componentProps: { allowClear: true, placeholder: "对象类型", options: smartTargetCategoryOptions },
            },
            {
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: { allowClear: true, placeholder: "请选择", options: typeOptions },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "计划名称" } },
          ];
        }
        if (kind === "plan") {
          return [
            {
              component: "Select",
              fieldName: "status",
              label: "状态",
              componentProps: { allowClear: true, placeholder: "状态", options: planStatusOptions },
            },
            {
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: { allowClear: true, placeholder: "请选择", options: typeOptions },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "计划名称" } },
          ];
        }
        if (kind === "plan-statistics") {
          return [
            {
              component: "RangePicker",
              fieldName: "period",
              label: "查询时间",
              defaultValue: [defaultBegin, defaultEnd],
              componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
            },
            {
              component: "Select",
              fieldName: "typeId",
              label: "巡检类型",
              componentProps: { allowClear: true, placeholder: "巡检类型", options: typeOptions },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "任务名称" } },
          ];
        }
        if (kind === "abnormal-rate") {
          return [
            {
              component: "RangePicker",
              fieldName: "period",
              label: "执行时间",
              componentProps: { valueFormat: "YYYY-MM-DD HH:mm:ss", allowClear: true },
            },
            { component: "Input", fieldName: "keyword", label: "", componentProps: { allowClear: true, placeholder: "标准名称" } },
          ];
        }
        return [
          {
            component: "Input",
            fieldName: "keyword",
            label: spec.nameLabel,
            componentProps: { allowClear: true, placeholder: spec.nameLabel },
          },
        ];
      };

      const applyFilterValues = (values: Record<string, unknown>): void => {
        query.keyword = String(values.keyword ?? values.name ?? values.standardName ?? "").trim();
        query.status = String(values.status ?? "");
        query.typeId = String(values.typeId ?? "");
        query.targetCategory = String(values.targetCategory ?? "");
        query.areaId = normalizeAreaId(values.areaId);
        query.period = normalizePeriod(values.period);
        query.resultSource = String(values.resultSource ?? "");
        query.taskTimeout = String(values.taskTimeout ?? "");
        query.temporary = values.temporary == null || values.temporary === "" ? "" : String(values.temporary);
        query.result = String(values.result ?? "");
        query.pageNumber = 1;
      };

      const resetFilterValues = (): void => {
        Object.assign(query, {
          keyword: "",
          status: "",
          typeId: "",
          targetCategory: "",
          areaId: "",
          period: kind === "plan-statistics" ? `${defaultBegin},${defaultEnd}` : "",
          resultSource: "",
          taskTimeout: "",
          temporary: "",
          result: "",
          pageNumber: 1,
        });
      };

      const [PcForm] = usePcForm({
        layout: "horizontal",
        showCollapseButton: true,
        cache: kind === "abnormal-rate" || kind === "plan-statistics" ? false : true,
        schema: buildFormSchema(),
        handleSubmit(values) {
          applyFilterValues(values);
          tableApi.query();
        },
        handleReset() {
          resetFilterValues();
          tableApi.query();
        },
      });

      onMounted(async () => {
        if (["plan", "smart-plan", "task", "smart-task", "plan-statistics"].includes(kind)) {
          try {
            const types = await getDailyInspectionClient().listTypes();
            typeOptions.splice(
              0,
              typeOptions.length,
              ...types.map((item) => ({ label: read(item, ["name", "typeName"]), value: recordId(item) })),
            );
          } catch {
            /* 类型选项失败不阻塞主列表 */
          }
        }
        tableApi.query();
      });

      const createPath =
        kind === "smart-plan"
          ? "smart-inspect-plan-edit"
          : kind === "smart-task"
            ? "smart-inspect-task-edit"
            : kind === "plan"
              ? "inspect-plan-edit"
              : "inspect-task-edit";
      const showExport = isTaskList || canLoopExport;
      const slots = {
        "layout-header": () => (
          <div class="daily-inspection-toolbar">
            {showExport ? (
              <Button type="primary" loading={exportLoading.value} onClick={() => void handleExport()}>
                导出
              </Button>
            ) : null}
            {spec.canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(createPath, undefined, { type: "create" })}>
                新增
              </Button>
            ) : null}
            {isTaskList ? (
              <PopConfirm title="确定删除当前数据？" onConfirm={() => void handleBatchDelete()}>
                <Button disabled={selectedRowKeys.value.length === 0} type="primary" danger loading={batchDeleteLoading.value}>
                  批量删除
                </Button>
              </PopConfirm>
            ) : null}
          </div>
        ),
        "layout-content": () => (
          <div class="daily-inspection-page">
            <PcForm />
            <PcTable />
          </div>
        ),
        "footer-page": () => (
          <div class="daily-inspection-footer">
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              onPageChange={(page: number, size: number) => {
                query.pageNumber = page;
                query.pageSize = size;
                tableApi.query();
              }}
            />
          </div>
        ),
      };
      return () => <PageLayout title={spec.title} v-slots={slots} />;
    },
  });
}

function createConfigPage(kind: InspectionConfigKind): Component {
  const spec = configSpecs[kind];
  return defineComponent({
    name: `DailyInspectionConfig${kind}`,
    setup() {
      const router = useRouter();
      const query = reactive({ keyword: "", referType: "", pageNumber: 1, pageSize: 10, total: 0 });
      const modalOpen = ref(false);
      const saving = ref(false);
      const batchDeleteLoading = ref(false);
      const selectedRowKeys = ref<string[]>([]);
      const editingId = ref("");
      const form = reactive({ name: "", code: "", remark: "" });

      const navigateConfig = (row: InspectionRecord, type: "edit" | "detail"): void => {
        void router.push({
          path: `${BASE}/${kind === "item" ? "inspect-items-form" : "inspect-standard-form"}`,
          query: { type, id: recordId(row) },
        });
      };

      const openEditor = (row?: InspectionRecord): void => {
        editingId.value = row ? recordId(row) : "";
        if (kind === "result") {
          modalOpen.value = true;
          return;
        }
        Object.assign(form, {
          name: row ? read(row, spec.nameFields, "") : "",
          code: row ? read(row, spec.codeFields, "") : "",
          remark: row ? read(row, kind === "cron" ? ["description"] : ["remark", "description"], "") : "",
        });
        if (kind === "item" || kind === "standard") {
          if (row) navigateConfig(row, "edit");
          else
            void router.push({
              path: `${BASE}/${kind === "item" ? "inspect-items-form" : "inspect-standard-form"}`,
              query: { type: "add" },
            });
          return;
        }
        modalOpen.value = true;
      };

      const save = async (): Promise<void> => {
        if (saving.value) return;
        if (!form.name.trim()) {
          message.warning(kind === "cron" ? "请输入周期名称" : "请输入类型名称");
          return;
        }
        if (kind === "cron" && !form.code.trim()) {
          message.warning("请输入表达式");
          return;
        }
        saving.value = true;
        try {
          const payload: InspectionRecord =
            kind === "cron"
              ? { name: form.name.trim(), cron: form.code.trim(), description: form.remark.trim() }
              : { name: form.name.trim() };
          if (editingId.value) await getDailyInspectionClient().updateConfig(kind, editingId.value, payload);
          else await getDailyInspectionClient().createConfig(kind, payload);
          message.success("保存成功");
          modalOpen.value = false;
          tableApi.query();
        } catch {
          message.error("保存失败，请稍后重试");
        } finally {
          saving.value = false;
        }
      };

      const remove = async (row: InspectionRecord): Promise<void> => {
        try {
          await getDailyInspectionClient().deleteConfig(kind, recordId(row));
          message.success("删除成功");
          tableApi.query();
        } catch {
          message.error("删除失败，请稍后重试");
        }
      };

      const removeSelectedCycles = async (): Promise<void> => {
        if (kind !== "cron" || batchDeleteLoading.value || selectedRowKeys.value.length === 0) return;
        batchDeleteLoading.value = true;
        try {
          await getDailyInspectionClient().deleteCronBatch(selectedRowKeys.value);
          selectedRowKeys.value = [];
          tableApi.setSelectedRowKeys([]);
          message.success("删除成功");
          tableApi.query();
        } catch {
          message.error("批量删除失败，请稍后重试");
        } finally {
          batchDeleteLoading.value = false;
        }
      };

      const textColumn = (title: string, field: string, fields: string[], width?: number): PcTableColumn => ({
        title,
        dataIndex: field,
        key: field,
        width,
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: InspectionRecord }) => {
          const value = read(record, fields);
          return (
            <PopOver content={value}>
              <span class="daily-inspection-cell-text">{value}</span>
            </PopOver>
          );
        },
      });
      const columns: PcTableColumn[] =
        kind === "type"
          ? [textColumn("类型名称", "name", ["name", "typeName"], 260)]
          : kind === "cron"
            ? [
                textColumn("周期名称", "name", ["name", "cronName"], 220),
                textColumn("表达式", "cron", ["cron", "cronExpression"], 220),
                textColumn("描述", "description", ["description", "remark"]),
              ]
            : kind === "result"
              ? [
                  textColumn("结果名称", "name", ["name", "resultName"], 240),
                  textColumn("结果项", "itemNames", ["itemNames", "items"], 300),
                ]
              : kind === "item"
                ? [
                    textColumn("巡检项名称", "alias", ["alias", "itemName"], 200),
                    textColumn("巡检项内容", "name", ["name", "content"], 260),
                    textColumn("巡检结果项", "resultNames", ["resultNames"], 220),
                    textColumn("适用对象", "referTypeNames", ["referTypeNames", "targetTypeNames"], 180),
                  ]
                : [
                    textColumn("巡检标准", "name", ["name", "standardName"], 300),
                    {
                      title: "设为默认巡检标准",
                      dataIndex: "defaultStandard",
                      key: "defaultStandard",
                      width: 180,
                      align: "center",
                      customRender: ({ record }: { record: InspectionRecord }) => (
                        <Switch
                          checked={Boolean(record.defaultStandard)}
                          checkedChildren="启用"
                          unCheckedChildren="停用"
                          onChange={(checked) =>
                            void getDailyInspectionClient()
                              .setDefaultStandard(recordId(record), { defaultStandard: Boolean(checked) })
                              .then(() => {
                                record.defaultStandard = Boolean(checked);
                                message.success("设置成功");
                              })
                              .catch(() => message.error("设置失败"))
                          }
                        />
                      ),
                    },
                  ];
      columns.push({
        title: "操作",
        dataIndex: "operation",
        key: "operation",
        width: 180,
        fixed: "right",
        align: "center",
        customRender: ({ record }: { record: InspectionRecord }) => (
          <div class="daily-inspection-actions">
            {kind === "item" || kind === "standard" ? (
              <Button type="link" size="small" onClick={() => navigateConfig(record, "detail")}>
                详情
              </Button>
            ) : null}
            <Button type="link" size="small" onClick={() => openEditor(record)}>
              编辑
            </Button>
            <PopConfirm title="确认删除该项？" onConfirm={() => void remove(record)}>
              <Button type="link" danger size="small">
                删除
              </Button>
            </PopConfirm>
          </div>
        ),
      });

      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: spec.tableCode,
        rowKey: "id",
        ...(kind === "cron"
          ? {
              rowSelection: "checkbox" as const,
              rowSelectionChange: (keys: (string | number)[]) => {
                selectedRowKeys.value = keys.map(String);
              },
            }
          : {}),
        autoFetch: false,
        fetchApi: async () => {
          try {
            const page = await getDailyInspectionClient().listConfig(kind, {
              pageNumber: query.pageNumber,
              pageSize: query.pageSize,
              keyword: query.keyword || undefined,
              ...(kind === "item" ? { referType: query.referType || undefined } : {}),
            });
            query.total = page.total;
            return page;
          } catch {
            message.error(`${spec.title}加载失败`);
            return { records: [], total: 0, pages: 0 };
          }
        },
      });
      const configFormSchema =
        kind === "item"
          ? [
              {
                component: "Select",
                fieldName: "referType",
                label: "适用对象",
                defaultValue: null,
                componentProps: { allowClear: true, placeholder: "适用对象", options: targetCategoryOptions },
              },
              {
                component: "Input",
                fieldName: "keyword",
                label: "",
                componentProps: { allowClear: true, placeholder: "巡检项名称" },
              },
            ]
          : [
              {
                component: "Input",
                fieldName: "keyword",
                label: "",
                componentProps: {
                  allowClear: true,
                  placeholder: kind === "cron" ? "周期名称" : kind === "result" ? "结果名称" : "类型名称",
                },
              },
            ];
      const [PcForm] = usePcForm({
        layout: "horizontal",
        showCollapseButton: true,
        schema: configFormSchema,
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          query.referType = kind === "item" ? String(values.referType ?? "") : "";
          query.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          query.keyword = "";
          query.referType = "";
          query.pageNumber = 1;
          tableApi.query();
        },
      });
      onMounted(() => tableApi.query());

      const slots = {
        "layout-header": () => (
          <div class="daily-inspection-toolbar">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
              新增
            </Button>
            {kind === "standard" ? (
              <Button icon={<RobotOutlined />} onClick={() => void router.push(`${BASE}/inspect-standard-ai`)}>
                AI生成
              </Button>
            ) : null}
          </div>
        ),
        "layout-content": () => (
          <div class="daily-inspection-page">
            <PcForm />
            <PcTable />
            {kind === "result" ? (
              <InspectResultModal
                open={modalOpen.value}
                id={editingId.value}
                onClose={() => (modalOpen.value = false)}
                onSaved={() => tableApi.query()}
              />
            ) : (
              <Modal
                open={modalOpen.value}
                title={`${editingId.value ? "编辑" : "新增"}${spec.title}`}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => {
                  modalOpen.value = false;
                }}
              >
                <Form labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
                  <FormItem label={kind === "cron" ? "周期名称" : "类型名称"} required>
                    <Input v-model:value={form.name} placeholder={kind === "cron" ? "请输入周期名称" : "请输入类型名称"} />
                  </FormItem>
                  {kind === "cron" ? (
                    <>
                      <FormItem label="表达式" required>
                        <Textarea v-model:value={form.code} placeholder="请输入表达式" maxlength={200} rows={3} />
                      </FormItem>
                      <FormItem label="描述">
                        <Textarea v-model:value={form.remark} placeholder="请输入描述" maxlength={200} rows={3} />
                      </FormItem>
                    </>
                  ) : null}
                </Form>
              </Modal>
            )}
          </div>
        ),
        "footer-btn": () =>
          kind === "cron" ? (
            <div class="daily-inspection-toolbar">
              <span>已选 {selectedRowKeys.value.length} 项</span>
              <PopConfirm title="确定要删除当前选中项？" okText="确定" cancelText="取消" onConfirm={() => void removeSelectedCycles()}>
                <Button disabled={selectedRowKeys.value.length === 0} type="primary" danger loading={batchDeleteLoading.value}>
                  批量删除
                </Button>
              </PopConfirm>
            </div>
          ) : null,
        "footer-page": () => (
          <div class="daily-inspection-footer">
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              onPageChange={(page: number, size: number) => {
                query.pageNumber = page;
                query.pageSize = size;
                tableApi.query();
              }}
            />
          </div>
        ),
      };
      return () => <PageLayout title={spec.title} v-slots={slots} />;
    },
  });
}

export function createInspectionPage(name: string): Component {
  if (name in listSpecs) return createListPage(name as PageKind);
  if (name.startsWith("config-") && !name.endsWith("-edit")) return createConfigPage(name.slice(7) as InspectionConfigKind);
  if (name === "plan-edit") return InspectPlanEdit;
  if (name === "task-edit") return InspectTaskEdit;
  if (name === "task-info") return InspectTaskInfo;
  if (name === "record-info") return RecordInfo;
  if (name === "archive-info") return ArchiveInfo;
  if (name === "config-item-edit") return InspectItemsForm;
  if (name === "config-standard-edit") return InspectStandardForm;
  if (name === "smart-plan-edit") return SmartInspectPlanEdit;
  if (name === "smart-plan-info") return SmartInspectPlanInfo;
  if (name === "smart-task-edit") return SmartInspectTaskEdit;
  if (name === "smart-task-info") return SmartInspectTaskInfo;
  if (name === "standard-ai") return InspectStandardAi;
  return defineComponent({ name: "DailyInspectionNotFound", setup: () => () => <Empty description="页面暂不可用" /> });
}
