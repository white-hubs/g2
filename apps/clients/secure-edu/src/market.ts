import type { EduResource, PageResult, SecureEduMarketClient, SecureEduRecord, SecureEduUpstreamPath } from "@g2-contract/secure-edu";

interface Gateway {
  get<T>(path: SecureEduUpstreamPath, query?: Record<string, unknown>): Promise<T>;
  post<T>(path: SecureEduUpstreamPath, body?: unknown): Promise<T>;
  put<T>(path: SecureEduUpstreamPath, body?: unknown): Promise<T>;
  delete<T>(path: SecureEduUpstreamPath): Promise<T>;
  download(path: SecureEduUpstreamPath, body?: unknown, method?: "GET" | "POST"): Promise<Blob>;
}
interface Http {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
}
const ROOT = "/api/safety-education";
export const MARKET_RESOURCES: Record<EduResource, string> = {
  "training-task": "cultivate-task",
  "exam-task": "exam-task",
  "test-paper-manage": "exam-paper",
  courseware: "courseware-library",
  question: "exam-question-bank",
  theme: "theme",
  "paper-question-rule": "exam-question-rule",
  "training-count": "cultivate-task/page/extendStat",
  "exam-count": "exam-task-statistics/page",
  "training-details": "cultivate-task-user/page",
  "exam-details": "exam-task-statistics/user-page",
};
const path = (suffix: string): SecureEduUpstreamPath => `${ROOT}/${suffix}`;
const encoded = (id: string) => encodeURIComponent(id);
const unwrap = <T>(value: unknown): T => (value && typeof value === "object" && "data" in value ? value.data : value) as T;
function page(value: unknown): PageResult<SecureEduRecord> {
  const result = unwrap<unknown>(value);
  if (Array.isArray(result)) {
    return { records: result as SecureEduRecord[], total: result.length };
  }
  if (result && typeof result === "object" && "records" in result && Array.isArray(result.records)) {
    return { records: result.records as SecureEduRecord[], total: Number("total" in result ? result.total : result.records.length) };
  }
  throw new Error("安全教育列表响应格式错误");
}
export function createMarketClient(gateway: Gateway, http: Http): SecureEduMarketClient {
  return {
    page: async (resource, query) =>
      page(
        await gateway.get(
          path(
            `${MARKET_RESOURCES[resource]}${resource === "paper-question-rule" ? "/list" : ["training-count", "exam-count", "training-details", "exam-details"].includes(resource) ? "" : "/page"}`,
          ),
          query,
        ),
      ),
    detail: (resource, id) =>
      gateway.get(path(`${MARKET_RESOURCES[resource]}/${resource === "paper-question-rule" ? "detail/" : ""}${encoded(id)}`)),
    taskPaper: (taskId, paperId, headquarters = false) =>
      gateway.get(path(`${headquarters ? "headquarters/" : ""}exam-task/${encoded(taskId)}/paper/${encoded(paperId)}`)),
    save: (resource, body, id) => {
      const suffix =
        resource === "paper-question-rule"
          ? `exam-question-rule/${id ? "change" : "create"}`
          : `${MARKET_RESOURCES[resource]}${id ? `/${encoded(id)}` : ""}`;
      return id ? gateway.put(path(suffix), { ...body, id }) : gateway.post(path(suffix), body);
    },
    remove: (resource, id) =>
      gateway.delete(path(`${MARKET_RESOURCES[resource]}/${resource === "paper-question-rule" ? "remove/" : ""}${encoded(id)}`)),
    setPublished: (resource, id, published) =>
      gateway.put(
        path(
          resource === "training-task"
            ? `cultivate-task/${encoded(id)}/update/${published ? "PUBLISHED" : "REVOKED"}`
            : `exam-task/${published ? "published" : "withdraw"}/${encoded(id)}`,
        ),
      ),
    themes: async () => unwrap<SecureEduRecord[]>(await gateway.get(path("themes"))),
    rules: async () => unwrap<SecureEduRecord[]>(await gateway.get(path("exam-question-rule/option-list"))),
    overview: async (period, yearPeriod) => {
      const endpoints = {
        training: "cultivate-task/stat",
        trainingUsers: "cultivate-task/trainUser/stat",
        exam: "exam-task-statistics",
        examTypes: "exam-task-statistics/type-ratio",
        trainingTypes: "cultivate-task/target/stat",
        trainingThemes: "cultivate-task/theme/stat",
        examThemes: "exam-task-statistics/theme-ratio",
        examAttendance: "exam-task-statistics/attendance",
        trainingAttendance: "cultivate-task/userSign/stat",
        trainingTrend: "cultivate-task/trend/stat",
        examTrend: "exam-task-statistics/trend",
      };
      const results = await Promise.allSettled(
        Object.entries(endpoints).map(
          async ([key, suffix]) => [key, await gateway.get(path(suffix), { period: key.endsWith("Trend") ? yearPeriod : period })] as const,
        ),
      );
      const errors = results.filter((result) => result.status === "rejected");
      if (errors.length === results.length) {
        throw new Error("统计接口读取失败");
      }
      return {
        ...Object.fromEntries(results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))),
        errors: errors.length,
      };
    },
    export: (resource, query) =>
      gateway.download(
        path(
          resource === "training-count"
            ? "cultivate-task/extendStat/export"
            : `${MARKET_RESOURCES[resource]}/export`.replace("cultivate-task-user/page/", "cultivate-task-user/"),
        ),
        query,
      ),
    questionTemplate: () => gateway.download(path("exam-question-bank/template"), undefined, "GET"),
    importQuestions: async (file) => {
      const form = new FormData();
      form.append("file", file);
      // FormData 必须直达正式 Client 的 HTTP 网关，JSON BFF 控制器不能转发 multipart。
      return unwrap<Record<string, unknown>>(await http.post(`${ROOT}/exam-question-bank/import`, form));
    },
    exportImportErrors: (rows) => gateway.download(path("exam-question-bank/error/export"), rows),
    messages: async () =>
      unwrap<SecureEduRecord[]>(
        await http.get("/api/message/sat-msg-configs?satMsgDefineCodes=EXAM_TASK_PUBLISHED%2CCULTIVATE_TASK_PUBLISHED"),
      ),
    saveMessages: (params, create) =>
      create ? http.post("/api/message/sat-msg-config", { params }) : http.put("/api/message/sat-msg-config", { params }),
  };
}
