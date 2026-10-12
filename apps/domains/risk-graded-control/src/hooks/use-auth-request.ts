/**
 * G2 http platform 已统一注入登录态与错误响应；旧页面保留该函数签名，避免请求链路再持有全局鉴权单例。
 */
export async function useAuthRequest<T>(request: () => Promise<T>): Promise<T> {
  return request();
}
