import type * as CompositionContract from "@g2-composition/contract";
import type { TodoCenterClient, TodoTaskPage, TodoTaskQuery, TodoTaskTag, TodoTaskTrend, TodoTaskType } from "@g2-contract/todo-center";
interface HttpClient {
  get(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}
function unwrap<T>(value: unknown): T {
  if (!value || typeof value !== "object" || value instanceof Blob) {
    return value as T;
  }
  const o = value as Record<string, unknown>;
  if (o.success === false || (o.code !== undefined && !["0", "200"].includes(String(o.code)))) {
    throw new Error(String(o.message ?? o.msg ?? "请求失败"));
  }
  return ("data" in o && ("code" in o || "success" in o || "message" in o || Object.keys(o).length === 1) ? o.data : value) as T;
}
function query(path: string, params?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.size > 0 ? `${path}?${search}` : path;
}
function page(value: unknown): TodoTaskPage {
  const result = unwrap<Partial<TodoTaskPage>>(value);
  if (!Array.isArray(result?.records)) {
    throw new TypeError("待办列表响应格式错误");
  }
  return { records: result.records, total: Number(result.total ?? 0), pages: Number(result.pages ?? 0) };
}
export function createTodoCenterClient(http: HttpClient): TodoCenterClient {
  return {
    getTodoTaskCount: async () => Number(unwrap(await http.get("/api/todo/todo-task-statistics")) ?? 0),
    getTodoTaskTags: async () => {
      const rows = unwrap<TodoTaskTag[]>(await http.get("/api/todo/todo-task-tag-statistics"));
      if (!Array.isArray(rows)) {
        throw new TypeError("待办统计响应格式错误");
      }
      return rows;
    },
    getTodoTaskTagsTrend: async () => {
      const rows = unwrap<TodoTaskTrend[]>(await http.get("/api/todo/todo-task-statistics/last-thirty-days-trend"));
      if (!Array.isArray(rows)) {
        throw new TypeError("待办趋势响应格式错误");
      }
      return rows;
    },
    getTodoTaskTypes: async (done = false) => {
      const rows = unwrap<TodoTaskType[]>(await http.get(`/api/todo/${done ? "todo-done-task-tags" : "todo-task-tags"}`));
      if (!Array.isArray(rows)) {
        throw new TypeError("任务类型响应格式错误");
      }
      return rows;
    },
    pageTodoTasks: async (params: TodoTaskQuery) => page(await http.get(query("/api/todo/todo-tasks", params))),
    pageDoneTasks: async (params: TodoTaskQuery) => page(await http.get(query("/api/todo/todo-tasks-done", params))),
  };
}
export async function create(ctx: CompositionContract.PlatformContext): Promise<TodoCenterClient> {
  const platform = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createTodoCenterClient(platform.createHttpClientForPlatform(ctx));
}
export type { TodoCenterClient };
