import type { PlatformContext } from "@g2-composition/contract";
import type { RiskManagementClient } from "@g2-contract/risk-management";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

function query(url: string, params?: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {}))
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  return search.size ? `${url}?${search}` : url;
}
function unwrap<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) return (response as { data: T }).data;
  return response as T;
}

/** 接口逐条对齐旧仓 cube-risk-management-service：业务面保持 /api，不改写为 /gw-bff。 */
export function createRiskManagementClient(http: HttpClient): RiskManagementClient {
  return {
    pageRiskLedger: async (params) => unwrap(await http.get(query("/api/property/risk/source/ledger/page", params))),
    getRiskLedger: async (id) => unwrap(await http.get(`/api/property/risk/source/ledger/queryById/${encodeURIComponent(id)}`)),
    createRiskLedger: async (payload) => unwrap(await http.post("/api/property/risk/source/ledger/insert", payload)),
    updateRiskLedger: async (payload) => unwrap(await http.put("/api/property/risk/source/ledger/update", payload)),
    // 旧实现使用 gateway.update（PUT），请求体为 ID 数组。
    deleteRiskLedgers: async (ids) => unwrap(await http.put("/api/property/risk/source/ledger/delete", ids)),
    downloadRiskLedgerTemplate: async () => unwrap<Blob>(await http.get("/api/property/risk/source/ledger/getTemplateExcel")),
    importRiskLedgers: async (file) => unwrap(await http.post("/api/property/risk/source/ledger/import/template", file)),
    downloadRiskLedgerQrcodes: async (payload) => unwrap<Blob>(await http.post("/api/identity/qrcode/generate/batch/download", payload)),
    getRiskTypes: async (params = {}) => unwrap(await http.get(query("/api/dictionary/getCascadeDictionaryItem", params))),
    createRiskType: async (payload) => unwrap(await http.post("/api/dictionary/addCascadeDictionary", payload)),
    updateRiskType: async (payload) => unwrap(await http.put("/api/dictionary/updateCascadeDictionary", payload)),
    deleteRiskType: async (id) => unwrap(await http.delete(`/api/dictionary/deleteCascadeDictionary/${encodeURIComponent(id)}`)),
    getMessageConfigs: async (params) => unwrap(await http.get(query("/api/bracing/message/getConfigInfo", params))),
    saveMessageConfig: async (payload) => unwrap(await http.post("/api/bracing/message/addConfig", payload)),
  };
}
export async function create(ctx: PlatformContext): Promise<RiskManagementClient> {
  const http = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createRiskManagementClient(http.createHttpClientForPlatform(ctx));
}
export type { RiskManagementClient };
