import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import { SECURE_EDU_ALLOWED_UPSTREAM_PREFIXES, type SecureEduUpstreamPath } from "@g2-contract/secure-edu";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";
import { requireUpstreamUrl, unwrapUpstreamResponse } from "@/services/upstream-response";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type DownloadMethod = Extract<Method, "GET" | "POST">;

/**
 * 安全教育历史服务的受限代理。旧前端使用了多个 SDK 与直接 `/api` 调用，
 * 这里将它们统一到 BFF，同时仅放行由原源码逐项确认的业务前缀。
 */
@Injectable()
export class SecureEduProxyService {
  public constructor(
    private readonly proxy: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  public async forward(method: Method, path: SecureEduUpstreamPath, query?: Record<string, unknown>, body?: unknown): Promise<unknown> {
    this.assertAllowed(path);
    const base = requireUpstreamUrl(this.config.get<string>("app.secureEduUrl"), "secureEduUrl");
    const response = await this.proxy.request(buildUrl(`${base}${path}`, query), {
      method,
      body,
      passthroughError: true,
    });
    return unwrapUpstreamResponse(response.data);
  }

  /**
   * 原样转发导出/模板下载的二进制 Response，保留 content-disposition 与文件类型。
   * BFF 前缀上的 `download=true` 只作路由标识，不会被传给历史服务。
   */
  public async forwardDownload(
    method: DownloadMethod,
    path: SecureEduUpstreamPath,
    query?: Record<string, unknown>,
    body?: unknown,
  ): Promise<Response> {
    this.assertAllowed(path);
    const base = requireUpstreamUrl(this.config.get<string>("app.secureEduUrl"), "secureEduUrl");
    return await this.proxy.fetchRaw(buildUrl(`${base}${path}`, query), {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
      passthroughError: true,
    });
  }

  private assertAllowed(path: string): void {
    if (path.includes("..") || path.includes("://") || !SECURE_EDU_ALLOWED_UPSTREAM_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      throw Response.json({ message: `不允许代理安全教育上游路径：${path}` }, { status: 400 });
    }
  }
}
