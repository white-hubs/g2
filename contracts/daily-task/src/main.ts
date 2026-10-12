export const DAILY_TASK_BFF_BASE_PATH = "/gw-bff/daily-task-api" as const;

export type DailyTaskBffBasePath = typeof DAILY_TASK_BFF_BASE_PATH;

/** 迁移期 BFF 边界：只允许转发 daily-task 明确使用的后端服务前缀。 */
export const DAILY_TASK_ALLOWED_UPSTREAM_PREFIXES = [
  "/daily-task/",
  "/mdata/",
  "/bracing/",
  "/message2/",
  "/loose-works/",
  "/device-center/",
  "/property/",
  "/dictionary/",
  "/maintain/",
  "/tag/",
  "/identity/",
] as const;

export interface DailyTaskProxyGateway {
  forwardGet(path: string, query?: Record<string, unknown>): Promise<unknown>;
  forwardPost(path: string, body?: unknown): Promise<unknown>;
  forwardPut(path: string, body?: unknown): Promise<unknown>;
  forwardDelete(path: string, query?: Record<string, unknown>): Promise<unknown>;
}
