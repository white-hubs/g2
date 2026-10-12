import type { DomainContext } from "@g2-composition/contract";

export const authStore: { tenant: string; terminal: string; token: string } = {
  tenant: "",
  terminal: "bimops-manage-web",
  token: "",
};

export function initAuthStore(context: DomainContext): void {
  const headers = context.getAuthHeaders();
  const authorization = headers.Authorization ?? headers.authorization ?? "";
  authStore.token = authorization.replace(/^Bearer\s+/iu, "");
  authStore.tenant = headers.tenant ?? headers.Tenant ?? headers["x-tenant"] ?? "";
  try {
    if (!authStore.tenant) {
      authStore.tenant = String(JSON.parse(sessionStorage.getItem("GH-NowEnterprise") ?? "{}").code ?? "");
    }
    if (!authStore.token) {
      authStore.token = String(JSON.parse(sessionStorage.getItem("GH-Token") ?? "{}").access_token ?? "");
    }
  } catch {
    // 会话存储异常时仍保留宿主头中的鉴权信息。
  }
}
