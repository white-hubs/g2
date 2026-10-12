import { message } from "@g2-platform/pc-ui";

/** 错误展示属于领域，不依赖旧网关拦截器；保留 rejection 供页面清理 loading。 */
export async function reportRequest<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    message.error({ key: "electrical-safety-request-error", content: error instanceof Error ? error.message : "请求失败，请稍后重试" });
    throw error;
  }
}
