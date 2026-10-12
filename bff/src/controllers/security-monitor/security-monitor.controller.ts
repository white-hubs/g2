import { Body, type Context, ContextParam, Controller, DELETE, GET, POST, PUT } from "@dangao/bun-server";
import { SECURITY_MONITOR_BFF_BASE_PATH } from "@g2-contract/security-monitor";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { SecurityMonitorProxyService } from "@/services/proxy/security-monitor/security-monitor-proxy.service";

@Controller(SECURITY_MONITOR_BFF_BASE_PATH)
export class SecurityMonitorController {
  public constructor(private readonly proxy: SecurityMonitorProxyService) {}

  @GET("/*")
  @CubeAuthProxy()
  public async get(@ContextParam() context: Context): Promise<unknown> {
    return await this.proxy.forwardGet(this.upstreamPath(context), Object.fromEntries(context.query.entries()));
  }

  @POST("/*")
  @CubeAuthProxy()
  public async post(@ContextParam() context: Context, @Body() body?: unknown): Promise<unknown> {
    return await this.proxy.forwardPost(this.upstreamPath(context), body);
  }

  @PUT("/*")
  @CubeAuthProxy()
  public async put(@ContextParam() context: Context, @Body() body?: unknown): Promise<unknown> {
    return await this.proxy.forwardPut(this.upstreamPath(context), body);
  }

  @DELETE("/*")
  @CubeAuthProxy()
  public async delete(@ContextParam() context: Context): Promise<unknown> {
    return await this.proxy.forwardDelete(this.upstreamPath(context), Object.fromEntries(context.query.entries()));
  }

  private upstreamPath(context: Context): string {
    return context.path.slice(SECURITY_MONITOR_BFF_BASE_PATH.length) || "/";
  }
}
