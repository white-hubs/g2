import type { PlatformContext } from "@g2-composition/contract";
import type {
  AssetClient,
  AssetQuery,
  AssetRow,
  ChartDatum,
  DepartmentSummary,
  DepartmentUse,
  EditableResource,
  ExportResource,
  FormFlow,
  Histogram,
  ListResource,
  OptionItem,
  PageResult,
  SceneConfig,
} from "@g2-contract/asset-management";
export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpModule {
  createHttpClientForPlatform(context: PlatformContext): HttpClient;
}
const pagePaths: Record<ListResource, string> = {
  warehousing: "/property/property/depository/getDepositoryDetailedPage",
  inventory: "/property/property/detailed/getPropertyDetailedPage-permission",
  distribution: "/property/property/allot/getAllotPage",
  allocation: "/property/property/allot/getAllotPage",
  cleaning: "/property/property/weedOut/getPropertyWeedOutPage",
  assetCheck: "/property/property/check/plan/getPropertyCheckPlanPage",
  stock: "/property/consumable-store-stock/page",
  entering: "/property/consumable-add-record/page",
  consuming: "/property/consumable-reduce-record/page",
  consumableCheck: "/property/consumable-check/page",
  history: "/property/property/history/getPropertyHistoryList",
  maintenance: "/property/property/detailed/getOveragePage",
  overage: "/property/property/detailed/getOveragePage",
  inout: "/property/consumable-stock-detail/record/page",
  departmentUse: "/property/consumable-reduce-record/detail",
  warehouse: "/property/storehouse/page",
  consumable: "/property/consumable/page-permission",
  assetSource: "/property/classify/getAssemblyClassifyPage",
  scrapReason: "/property/classify/getAssemblyClassifyPage",
  abnormalType: "/dictionary/getDataDictionaryByItemPage",
  assetCheckDetails: "/property/property/check/task/queryByPlanIdPage",
  consumableCheckDetails: "/property/consumable-check/detail/page",
};
const extraQuery: Partial<Record<ListResource | ExportResource, AssetQuery>> = {
  distribution: { type: "ALLOT_PERSONAL" },
  allocation: { type: "ALLOT_UNIT" },
  maintenance: { queryType: "maintenance" },
  overage: { queryType: "usage" },
  assetSource: { type: "assetSource" },
  scrapReason: { type: "reasonForScrapping" },
  abnormalType: { itemCode: "property-abnormal-type" },
};
const deletePaths: Partial<Record<ListResource | EditableResource, string>> = {
  warehousing: "/property/property/depository/deleteById",
  inventory: "/property/property/detailed",
  distribution: "/property/property/allot/deleteById",
  allocation: "/property/property/allot/deleteById",
  cleaning: "/property/property/weedOut/deleteById",
  assetCheck: "/property/property/check/plan",
  consumableCheck: "/property/consumable-check",
  entering: "/property/consumable-add-record",
  consuming: "/property/consumable-reduce-record",
  warehouse: "/property/storehouse",
  consumable: "/property/consumable",
  category: "/property/consumable-category",
  abnormalType: "/dictionary/deleteDataDictionary",
  assetType: "/property/classify/deleted",
  assetSource: "/property/classify/deleted",
  reasonForScrapping: "/property/classify/deleted",
  scrapReason: "/property/classify/deleted",
};
const exportPaths: Record<ExportResource, ["get" | "post", string]> = {
  inventory: ["get", "/property/property/detailed/getExcel"],
  warehousing: ["post", "/property/property/depository/getDepositoryDetailedExcel"],
  distribution: ["post", "/property/property/allot/getExcel"],
  allocation: ["post", "/property/property/allot/getExcel"],
  assetCheck: ["post", "/property/property/check/plan/getExcel"],
  consumableCheck: ["post", "/property/consumable-check-detail/getExcel"],
  entering: ["post", "/property/consumable-add-record/getExcel"],
  consuming: ["post", "/property/consumable-check-record/getExcel"],
  history: ["get", "/property/property/history/getExcel"],
  maintenance: ["get", "/property/property/detailed/getOverageExcel"],
  overage: ["get", "/property/property/detailed/getOverageExcel"],
  departments: ["get", "/property/property/detailed/getPropertyByDepAllExcel"],
  inout: ["get", "/property/export/consumable-stock-detail/record"],
};
export function assetUrl(path: string, query: AssetQuery = {}, requiredFields: readonly string[] = []): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && (value !== "" || requiredFields.includes(key))) {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return `/api${path}${search.size > 0 ? `?${search}` : ""}`;
}
export function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 4 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
    const record = value as Record<string, unknown>;
    if (!("data" in record && ("code" in record || "success" in record || "message" in record || Object.keys(record).length === 1))) {
      break;
    }
    if (record.success === false || (record.code !== undefined && !["0", "200"].includes(String(record.code)))) {
      throw new Error(String(record.message ?? record.msg ?? "资产管理请求失败"));
    }
    value = record.data;
  }
  return value as T;
}
export function assetPage(response: unknown): PageResult {
  const result = unwrap<{ records?: AssetRow[]; data?: { records?: AssetRow[] }; total?: number }>(response);
  const records = result?.records ?? result?.data?.records;
  if (!Array.isArray(records)) {
    throw new TypeError("资产管理分页返回格式错误");
  }
  return { records, total: Number(result.total ?? records.length) };
}
function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError("资产管理列表返回格式错误");
  }
  return value as T[];
}
function binary(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("下载接口未返回文件流");
  }
  return value;
}
const encoded = (id: string) => encodeURIComponent(id);
export function createAssetClient(http: HttpClient): AssetClient {
  const get = async <T>(path: string, query: AssetQuery = {}): Promise<T> => unwrap<T>(await http.get(assetUrl(path, query)));
  const getList = async <T>(path: string, query: AssetQuery = {}): Promise<T[]> => list<T>(await http.get(assetUrl(path, query)));
  return {
    page: async (resource, query) =>
      assetPage(
        await http.get(
          assetUrl(
            pagePaths[resource],
            { ...query, ...extraQuery[resource], ...(resource === "departmentUse" ? { deptId: query.deptId ?? "" } : {}) },
            resource === "departmentUse" ? ["deptId"] : [],
          ),
        ),
      ),
    classifications: async (type) =>
      assetPage(
        await http.get(assetUrl("/property/classify/getAssemblyClassifyPage", { pageNumber: 1, pageSize: 1000, type })),
      ).records.map((row) => ({ id: String(row.id), name: String(row.name ?? "") })),
    classificationTree: () => getList<AssetRow>("/property/classify/getAssemblyClassifyTree", { type: "assetType" }),
    categories: () => getList<OptionItem>("/property/consumable-category/tree"),
    organizations: () => getList<OptionItem>("/ouaa/authenticated/organizations/list", { enabled: true }),
    areas: () => getList<OptionItem>("/mdata/area/list"),
    users: async (query) => assetPage(await http.get(assetUrl("/ouaa/authenticated/user-under-tenant/page", { ...query, enabled: true }))),
    positions: () => getList<OptionItem>("/ouaa/authenticated/position/list"),
    roles: async () => assetPage(await http.get(assetUrl("/ouaa/authenticated/product/role/page", { pageNumber: 1, pageSize: 1000 }))),
    administrators: (query) => getList<AssetRow>("/property/property/check/task/admin/getPropertyCheckTaskAdminPage", query),
    bindAdministrators: async (orgId, userIds) => {
      unwrap(await http.post(assetUrl("/property/property/check/task/admin/insert"), { orgId, userIds }));
    },
    departmentSummary: (query) => get<DepartmentSummary>("/property/property/detailed/getPropertyByDepAllPage", query),
    overdueAmount: (query) => get("/property/property/detailed/getOverageAmount", query),
    overview: async (query) => {
      const [counts, status, category, departments, trend, consumableDepartments, areas] = await Promise.all([
        get<Record<string, number>>("/property/property/visualization/overdue", query),
        getList<ChartDatum>("/property/property/visualization/getPropertyByStatus", query),
        getList<ChartDatum>("/property/property/visualization/getPropertyByType", query),
        get<Histogram>("/property/property/visualization/getPropertyByDepHistogram", query),
        getList<ChartDatum>("/property/consumable/visualization/reduceRecord", query),
        getList<ChartDatum>("/property/consumable/visualization/consumableByDep", query),
        getList<ChartDatum>("/property/property/visualization/getPropertyBySourcePie", query),
      ]);
      return { counts, status, category, departments, trend, consumableDepartments, areas };
    },
    departmentUse: (query) => getList<DepartmentUse>("/property/consumable-reduce-record/stat", query),
    getAsset: (id) => get<AssetRow>(`/property/property/detailed/${encoded(id)}`),
    updateAsset: async (body) => {
      unwrap(await http.put(assetUrl("/property/property/detailed/update"), body));
    },
    updateAssetCode: async (body) => {
      unwrap(await http.put(assetUrl("/property/property/detailed/updateCode"), body));
    },
    checkAssetCodes: async (key, value) =>
      list<string>(await http.post(assetUrl("/property/property/detailed/checkCodeBath"), { checkSerialNumberList: [{ key, value }] })),
    save: async (resource, body, id) => {
      let path: string;
      let payload = body;
      if (resource === "assetType" || resource === "assetSource" || resource === "reasonForScrapping") {
        path = `/property/classify/${id ? "update" : "insert"}`;
        payload = { ...body, type: resource, ...(id ? { id } : {}) };
      } else if (resource === "abnormalType") {
        path = `/dictionary/${id ? "updateDataDictionary" : "addDataDictionary"}`;
        payload = { ...body, itemCode: "property-abnormal-type", ...(id ? { id } : {}) };
      } else {
        path =
          { warehouse: "/property/storehouse", consumable: "/property/consumable", category: "/property/consumable-category" }[resource] +
          (id ? `/${encoded(id)}` : "");
        payload = { ...body, ...(id ? { id } : {}) };
      }
      unwrap(await (id ? http.put(assetUrl(path), payload) : http.post(assetUrl(path), payload)));
    },
    remove: async (resource, id) => {
      const path = deletePaths[resource];
      if (!path) {
        throw new Error("该页面不支持删除");
      }
      unwrap(await http.delete(assetUrl(`${path}/${encoded(id)}`)));
    },
    createAssetCheck: async (body) => {
      unwrap(await http.post(assetUrl("/property/property/check/plan/insert"), body));
    },
    createConsumableCheck: async (body) => {
      unwrap(await http.post(assetUrl("/property/consumable-check"), body));
    },
    getAssetCheck: (id) => get<AssetRow>(`/property/property/check/plan/${encoded(id)}`),
    checkCounts: (kind, id) =>
      get<Record<string, number>>(
        kind === "asset" ? `/property/property/check/plan/queryByPalan/${encoded(id)}` : `/property/consumable-check/${encoded(id)}/stat`,
      ),
    checkTasks: (id) => getList<AssetRow>("/property/property/check/task/queryTaskByPlan", { planId: id }),
    submitAssetCheck: (id) => get<boolean>("/property/property/check/plan/submit", { planId: id }),
    syncAssetCheck: async (id) => {
      await get("/property/property/check/plan/submitWin", { planId: id });
    },
    hasConsumableCheckDifference: (id) => get<boolean>(`/property/consumable-check/submitWin/${encoded(id)}`, { planId: id }),
    submitConsumableCheck: async (id, sync) => {
      await get(`/property/consumable-check/${encoded(id)}/submit`);
      if (sync) {
        await get(`/property/consumable-check/addWin/${encoded(id)}`);
      }
    },
    export: async (resource, query) => {
      const [method, path] = exportPaths[resource];
      const params = { ...query, ...extraQuery[resource] };
      return binary(await (method === "get" ? http.get(assetUrl(path, params)) : http.post(assetUrl(path), params)));
    },
    template: async (kind) =>
      binary(
        await http.get(
          assetUrl(
            {
              asset: "/property/property/detailed/getTemplateExcel",
              consumable: "/property/consumable/downloadExcelTemplate",
              stock: "/property/consumable-store-stock/download-template",
            }[kind],
          ),
        ),
      ),
    import: async (kind, file) => {
      const body = new FormData();
      body.append("file", file);
      unwrap(
        await http.post(
          assetUrl(
            {
              asset: "/property/property/detailed/import/template",
              consumable: "/property/consumable/import",
              stock: "/property/consumable-store-stock/import",
            }[kind],
          ),
          body,
        ),
      );
    },
    qrcodes: async (entityInfo) =>
      binary(
        await http.post(assetUrl("/identity/qrcode/generate/batch/download"), {
          entityType: "PROPERTY",
          styleId: "1727209257265602562",
          entityInfo,
        }),
      ),
    approvalTypes: () => getList<OptionItem>("/property/consumable/approval/biz/type"),
    formFlows: () => getList<OptionItem>("/flow/form-flow/list", { enable: true, application: "PROPERTY_MANAGEMENT" }),
    businessFields: (type) => getList<OptionItem>("/property/property/approval/biz/form/field", { type }),
    businessFlow: (type) => get<string>(`/flow/form-flow-business/${encoded(type)}/flow`),
    getFormFlow: (id) => get<FormFlow>(`/flow/form-flow/${encoded(id)}`, { id }),
    saveFlow: async (body) => {
      unwrap(await http.post(assetUrl("/flow/form-flow-business"), body));
    },
    messageConfig: () => getList<SceneConfig>("/bracing/message/getConfigInfo", { businessType: "PROPERTY" }),
    messageMethods: async (scene) => {
      const [channels, selected] = await Promise.all([
        getList<{ channelCode: string; channelName: string }>("/message2/sat-msg-channels"),
        get<{ channelCodes: string[] } | null>(`/message2/sat-msg-scene-receive/code/${encoded(scene)}`),
      ]);
      return channels
        .filter((item) => selected?.channelCodes.includes(item.channelCode) ?? false)
        .map((item) => ({ label: item.channelName, value: item.channelCode }));
    },
    saveMessageConfig: async (sceneConfigDTOS) => {
      unwrap(await http.post(assetUrl("/bracing/message/addConfig"), { businessType: "PROPERTY", sceneConfigDTOS }));
    },
  };
}
export async function create(context: PlatformContext): Promise<AssetClient> {
  const module = (await context.loadPlatform("httpPlatform", "client")) as HttpModule;
  return createAssetClient(module.createHttpClientForPlatform(context));
}
