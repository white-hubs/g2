import type * as CompositionContract from "@g2-composition/contract";
import type {
  KnowledgeDocumentBatchResult,
  KnowledgeDocumentClient,
  KnowledgeDocumentRow,
  KnowledgeDocumentStatistics,
  KnowledgeTypeNode,
  PageResult,
  ReferenceOption,
} from "@g2-contract/knowledge-document";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const MANAGEMENT = "/api/management";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object" || response instanceof Blob) {
    return response as T;
  }
  const envelope = response as Record<string, unknown>;
  if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
    throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "请求失败"));
  }
  const keys = Object.keys(envelope);
  const isEnvelope =
    "data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || "msg" in envelope || keys.length === 1);
  return (isEnvelope ? envelope.data : response) as T;
}

function list<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<Partial<PageResult<T>>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}

export function createKnowledgeDocumentClient(http: HttpClient): KnowledgeDocumentClient {
  return {
    getStatistics: async () => unwrap<KnowledgeDocumentStatistics>(await http.get(`${MANAGEMENT}/knowledge/stat/type`)),
    pageDocuments: async (query) => page<KnowledgeDocumentRow>(await http.get(withQuery(`${MANAGEMENT}/knowledge/page`, query))),
    getDocument: async (id) => unwrap<KnowledgeDocumentRow>(await http.get(withQuery(`${MANAGEMENT}/knowledge/detail`, { id }))),
    setDocumentStatus: async (id, status) => unwrap<boolean>(await http.put(`${MANAGEMENT}/knowledge/status`, { id, status })),
    createDocument: async (body) => unwrap(await http.post(`${MANAGEMENT}/knowledge/add`, body)),
    createDocuments: async (body) => unwrap<KnowledgeDocumentBatchResult>(await http.post(`${MANAGEMENT}/knowledge/add/batch`, body)),
    updateDocument: async (body) => unwrap(await http.put(`${MANAGEMENT}/knowledge/edit`, body)),
    deleteDocuments: async (ids) => unwrap(await http.post(`${MANAGEMENT}/knowledge/removes`, { idList: ids })),

    listTypeTree: async (query) => list<KnowledgeTypeNode>(await http.get(withQuery(`${MANAGEMENT}/knowledgeType/treeList`, query))),
    createType: async (body) => unwrap(await http.post(`${MANAGEMENT}/knowledgeType/add`, body)),
    updateType: async (body) => unwrap(await http.put(`${MANAGEMENT}/knowledgeType/edit`, body)),
    deleteType: async (id) => unwrap(await http.delete(withQuery(`${MANAGEMENT}/knowledgeType/remove`, { id }))),

    listProducts: async () => list<ReferenceOption>(await http.get("/api/device-center/things/product/list/all")),
    listDepartments: async (query) =>
      list<ReferenceOption>(await http.get(withQuery("/api/ouaa/authenticated/organizations", query ?? { enabled: true }))),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<KnowledgeDocumentClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createKnowledgeDocumentClient(module.createHttpClientForPlatform(ctx));
}

export type { KnowledgeDocumentClient };
