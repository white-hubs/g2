/** Preserve legacy business failures even when the transport status is 200. */
export function unwrapUpstreamResponse<T>(payload: unknown): T {
  if (payload !== null && typeof payload === "object") {
    const value = payload as Record<string, unknown>;
    if (
      value.success === false ||
      (typeof value.code === "number" && value.code >= 400) ||
      (typeof value.code === "string" && /^\d+$/.test(value.code) && Number(value.code) >= 400)
    ) {
      throw Response.json(payload, { status: 502 });
    }
    if ("data" in value) return value.data as T;
  }
  return payload as T;
}

export function requireUpstreamUrl(value: string | undefined, configName: string): string {
  if (!value?.trim()) throw Response.json({ message: `未配置上游服务 ${configName}` }, { status: 503 });
  return value.replace(/\/$/, "");
}
