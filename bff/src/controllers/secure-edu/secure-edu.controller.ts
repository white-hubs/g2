import { Body, type Context, ContextParam, Controller, DELETE, GET, POST, PUT } from "@dangao/bun-server";
import { SECURE_EDU_BFF_BASE_PATH, type SecureEduUpstreamPath } from "@g2-contract/secure-edu";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { SecureEduProxyService } from "@/services/proxy/secure-edu/secure-edu-proxy.service";

@Controller(SECURE_EDU_BFF_BASE_PATH)
export class SecureEduController {
  public constructor(private readonly proxy: SecureEduProxyService) {}

  @GET("/*")
  @CubeAuthProxy()
  public async get(@ContextParam() context: Context): Promise<unknown> {
    const query = this.query(context);
    return context.query.get("download") === "true"
      ? await this.proxy.forwardDownload("GET", this.upstreamPath(context), query)
      : await this.proxy.forward("GET", this.upstreamPath(context), query);
  }

  @POST("/*")
  @CubeAuthProxy()
  public async post(@ContextParam() context: Context, @Body() body?: unknown): Promise<unknown> {
    return context.query.get("download") === "true"
      ? await this.proxy.forwardDownload("POST", this.upstreamPath(context), this.query(context), body)
      : await this.proxy.forward("POST", this.upstreamPath(context), this.query(context), body);
  }

  @PUT("/*")
  @CubeAuthProxy()
  public async put(@ContextParam() context: Context, @Body() body?: unknown): Promise<unknown> {
    return await this.proxy.forward("PUT", this.upstreamPath(context), this.query(context), body);
  }

  @DELETE("/*")
  @CubeAuthProxy()
  public async delete(@ContextParam() context: Context): Promise<unknown> {
    return await this.proxy.forward("DELETE", this.upstreamPath(context), this.query(context));
  }

  private upstreamPath(context: Context): SecureEduUpstreamPath {
    return (context.path.slice(SECURE_EDU_BFF_BASE_PATH.length) || "/") as SecureEduUpstreamPath;
  }

  private query(context: Context): Record<string, string> {
    return Object.fromEntries([...context.query.entries()].filter(([key]) => key !== "download"));
  }
}
