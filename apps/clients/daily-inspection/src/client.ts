import type { PlatformContext } from "@g2-composition/contract";
import {
  DAILY_INSPECTION_API_BASE,
  type DailyInspectionClient,
  type DailyInspectionMethod,
  type InspectionConfigKind,
  type InspectionPage,
  type InspectionRecord,
} from "@g2-contract/daily-inspection";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

const API = DAILY_INSPECTION_API_BASE;
const AI_FLOW_ITEM_CODE = "BUSINESS_AI_FLOW";
const AI_FLOW_CODE = "INSPECTION_AI_FLOW";
const AI_FLOW_KEY = "inspectStandGenerate";

const resourcePath: Record<InspectionConfigKind, string> = {
  type: "inspect-type",
  cron: "inspect-cron",
  result: "inspect-result",
  item: "inspect-item-template",
  standard: "inspect-standard",
};

function query(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.append(key, String(value));
  });
  const suffix = search.toString();
  return `${path}${suffix ? `?${suffix}` : ""}`;
}

function unwrap(value: unknown): unknown {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (current && typeof current === "object" && !Array.isArray(current) && "data" in current) {
      current = (current as { data: unknown }).data;
    } else {
      break;
    }
  }
  return current;
}

function asRecord(value: unknown): InspectionRecord {
  const data = unwrap(value);
  return data && typeof data === "object" && !Array.isArray(data) ? (data as InspectionRecord) : {};
}

function asList(value: unknown): InspectionRecord[] {
  const data = unwrap(value);
  if (Array.isArray(data)) return data as InspectionRecord[];
  const root = asRecord(data);
  const records = root.records ?? root.list ?? root.content ?? [];
  return Array.isArray(records) ? (records as InspectionRecord[]) : [];
}

export function asInspectionPage(value: unknown): InspectionPage {
  const root = asRecord(value);
  const list = asList(root);
  return {
    records: list,
    total: Number(root.total ?? root.totalElements ?? list.length),
    pages: Number(root.pages ?? root.totalPages ?? 0),
  };
}

function readFlowId(dictionary: unknown): string {
  const row = asRecord(Array.isArray(unwrap(dictionary)) ? (unwrap(dictionary) as unknown[])[0] : dictionary);
  const variable = String(row.variable ?? row.value ?? "");
  if (!variable) return "";
  try {
    const parsed = JSON.parse(variable) as Record<string, unknown>;
    return String(parsed[AI_FLOW_KEY] ?? "").trim();
  } catch {
    const match = variable.match(new RegExp(`"${AI_FLOW_KEY}"\\s*:\\s*"([^"]+)"`));
    return match?.[1]?.trim() ?? "";
  }
}

export function createDailyInspectionClient(http: HttpClient): DailyInspectionClient {
  const request = async <T = unknown>(
    method: DailyInspectionMethod,
    path: string,
    payload?: Record<string, unknown> | unknown[],
  ): Promise<T> => {
    const url = path.startsWith("/api/") ? path : `${API}${path}`;
    const data =
      method === "GET"
        ? await http.get(query(url, (payload ?? {}) as Record<string, unknown>))
        : method === "POST"
          ? await http.post(url, payload)
          : method === "PUT"
            ? await http.put(url, payload)
            : await http.delete(query(url, (payload ?? {}) as Record<string, unknown>));
    return unwrap(data) as T;
  };

  return {
    request,
    listPlans: async (params = {}) => asInspectionPage(await request("GET", "/inspect-plan/pageV2", params)),
    getPlan: async (params) => asRecord(await request("GET", "/inspect-plan/detailV2", params)),
    createPlan: (data) => request("POST", "/inspect-record/addV2", data),
    updatePlan: (data) => request("POST", "/inspect-plan/edit", data),
    deletePlan: (id, businessType = "") => request("DELETE", `/inspect-plan/${encodeURIComponent(id)}`, { businessType }),
    setPlanEnabled: (id, enabled, businessType = "") =>
      request("PUT", `/inspect-plan/${encodeURIComponent(id)}/start/${String(enabled)}`, { id, startFlag: enabled, businessType }),
    checkPlanNameRepeat: async (params) => Boolean(await request("GET", "/inspect-plan/checkPlanNameIsRepeat", params)),
    listTasks: async (params = {}) => asInspectionPage(await request("GET", "/inspect-task/pageV2", params)),
    getTask: async (params) => asRecord(await request("GET", "/inspect-task/detailV2", params)),
    createTask: (data) => request("POST", "/inspect-task/save", data),
    stopTask: (id, businessType = "") => request("PUT", `/inspect-task/${encodeURIComponent(id)}/stop`, { id, businessType }),
    deleteTasks: (ids) => request("PUT", "/inspect-task/remove-batch", { idList: ids }),
    exportTasks: async (params = {}) => {
      const result = await http.post(`${API}/inspect-task/pageV2/export`, params);
      if (result instanceof Blob) return result;
      throw new Error("导出失败：响应不是文件流");
    },
    getTaskRate: async (params) => asInspectionPage(await request("GET", "/inspect-task/detail-rateV2", params)),
    getTaskProgress: async (params) => asRecord(await request("GET", "/inspect-task/detail-rateV2", params)),
    getTaskObjCount: async (params) => asRecord(await request("GET", "/inspect-task/objCount", params)),
    cancelRepairTasks: (ids) => request("PUT", "/inspect/repair/clean/task-ids", { idList: ids }),
    listRecords: async (params = {}) => asInspectionPage(await request("GET", "/inspect-record/pagination", params)),
    getRecord: async (id, businessType = "") =>
      asRecord(await request("GET", `/inspect-record/${encodeURIComponent(id)}`, { businessType })),
    listArchives: async (params = {}) => asInspectionPage(await request("GET", "/inspect-record/target-record-page", params)),
    getArchive: async (params) => asRecord(await request("GET", "/inspect-record/target-record-detail", params)),
    listArchiveRecords: async (params) => asInspectionPage(await request("GET", "/inspect-record/detail-recordPage", params)),
    listPlanStatistics: async (params = {}) => asInspectionPage(await request("GET", "/statistic-analysis/planStatistics", params)),
    listAbnormalRates: async (params = {}) =>
      asInspectionPage(await request("GET", "/statistic-analysis/taskStandardAbnormalRate", params)),
    listTypes: async (params = {}) => asList(await request("GET", "/inspect-type/list", params)),
    listPeriods: async (params = {}) => asList(await request("GET", "/inspect-cron/list", params)),
    listResultOptions: async (params = {}) => asList(await request("GET", "/inspect-result/list", params)),
    listConfig: async (kind, params = {}) => asInspectionPage(await request("GET", `/${resourcePath[kind]}/page`, params)),
    getConfig: async (kind, id, businessType) =>
      asRecord(await request("GET", `/${resourcePath[kind]}/${encodeURIComponent(id)}${kind === "item" ? "/detail" : ""}`, { businessType })),
    createConfig: (kind, data) => request("POST", `/${resourcePath[kind]}`, data),
    updateConfig: (kind, id, data) => {
      const suffix = kind === "item" ? `/standard/${encodeURIComponent(id)}` : `/${encodeURIComponent(id)}`;
      return request("PUT", `/${resourcePath[kind]}${suffix}`, data);
    },
    deleteConfig: (kind, id, businessType) => request("DELETE", `/${resourcePath[kind]}/${encodeURIComponent(id)}`, { businessType }),
    deleteCronBatch: (ids) => request("DELETE", "/inspect-cron/batch", { ids: ids.join(",") }),
    setDefaultStandard: (id, params = {}) =>
      request("POST", "/inspect-standard/defaultStandard", {
        standardId: id,
        ...params,
      }),
    relatedInspectStandard: (params) => request("POST", "/inspect-standard/type", params),
    listStandards: async (params = {}) => asList(await request("GET", "/inspect-standard/list", params)),
    getStandardsByTarget: async (targetCategory, targetType, businessType) =>
      asList(
        await request(
          "GET",
          `/inspect-standard/targetCategory/${encodeURIComponent(targetCategory)}/targetType/${encodeURIComponent(targetType)}`,
          { businessType },
        ),
      ),
    listStandardPage: async (params = {}) => asInspectionPage(await request("GET", "/inspect-standard/page", params)),
    listItemPage: async (params = {}) => asInspectionPage(await request("GET", "/inspect-item-template/page", params)),
    getIotProductCategoryTree: async () => asList(await request("GET", "/api/device-center/iot/product/category-tree")),
    stallTypeList: async (params = {}) => asList(await request("GET", "/api/mdata/stall-category/list", params)),
    getAssemblyClassifyPage: async (params = {}) =>
      asInspectionPage(await request("GET", "/api/property/classify/getAssemblyClassifyPage", params)),
    inspectPointTypeList: async () => asList(await request("GET", "/api/maintain/inspect/sceneTypeList")),
    getRiskSourceType: async (params = {}) => asList(await request("GET", "/api/dictionary/getCascadeDictionaryItem", params)),
    getProjectTypeList: async (params = {}) => asList(await request("GET", "/api/loose-works/project-type/list", params)),
    listObjectPage: async (kind, params = {}) => {
      // 对齐 cube ObjectSelectModal 各 Tab 真实数据源（非 business-tag）
      if (kind === "area") {
        const tree = asList(await request("GET", "/api/mdata/area/list", params));
        return { records: tree, total: tree.length, pages: 1 };
      }
      if (kind === "device") {
        return asInspectionPage(
          await request("POST", "/api/device-center/device/instance/page", {
            pageNumber: 1,
            pageSize: 10,
            ...params,
          }),
        );
      }
      if (kind === "property-detailed") {
        return asInspectionPage(
          await request("GET", "/api/property/property/detailed/getPropertyDetailedPage", {
            pageNumber: 1,
            pageSize: 10,
            ...params,
          }),
        );
      }
      if (kind === "stall") {
        return asInspectionPage(
          await request("GET", "/api/mdata/stall/page", {
            pageNumber: 1,
            pageSize: 10,
            enabled: true,
            ...params,
          }),
        );
      }
      if (kind === "scene-point") {
        return asInspectionPage(
          await request("GET", "/api/maintain/inspect/pointList", {
            pageNumber: 1,
            pageSize: 10,
            ...params,
          }),
        );
      }
      if (kind === "risk-source") {
        return asInspectionPage(
          await request("GET", "/api/property/risk/source/ledger/page", {
            pageNumber: 1,
            pageSize: 10,
            ...params,
          }),
        );
      }
      if (kind === "project-schedule") {
        return asInspectionPage(
          await request("GET", "/api/loose-works/project/schedule/list", {
            pageNumber: 1,
            pageSize: 10,
            ...params,
          }),
        );
      }
      // patrol-point fallback
      return asInspectionPage(await request("POST", `/api/tag/business-tag/ref/${kind}`, params));
    },
    listAreaTree: async (params = {}) => asList(await request("GET", "/api/mdata/area/list", params)),
    generateStandards: async (input) => {
      const dictionary = await http.get(
        query("/api/dictionary/getDataDictionaryByItemAndCode", {
          itemCode: AI_FLOW_ITEM_CODE,
          code: AI_FLOW_CODE,
        }),
      );
      const flowId = readFlowId(dictionary);
      if (!flowId) throw new Error("未配置 AI 巡检标准生成流程");
      const prompt = [input.targetName.trim(), input.supplement?.trim()].filter(Boolean).join("\n");
      return unwrap(
        await http.post(`/api/ai-center/flow/console/studio/${encodeURIComponent(flowId)}/run`, {
          input: prompt,
          inputType: "chat",
          outputType: "chat",
        }),
      );
    },
    batchCreateStandards: (standards) => request("POST", "/inspect-standard/batch", { standards }),
    listInspectionAnalysis: (name, params = {}) => request("GET", `/inspection-analysis/${encodeURIComponent(name)}`, params),
  };
}

export async function create(ctx: PlatformContext): Promise<DailyInspectionClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createDailyInspectionClient(module.createHttpClientForPlatform(ctx));
}

export type { DailyInspectionClient, InspectionPage, InspectionRecord } from "@g2-contract/daily-inspection";
