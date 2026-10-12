import { Body, type Context, ContextParam, Controller, DELETE, GET, POST, PUT } from "@dangao/bun-server";
import { DAILY_TASK_BFF_BASE_PATH } from "@g2-contract/daily-task";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { DailyTaskProxyService } from "@/services/proxy/daily-task/daily-task-proxy.service";

@Controller(DAILY_TASK_BFF_BASE_PATH)
export class DailyTaskController {
  public constructor(private readonly proxy: DailyTaskProxyService) {}

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
    return context.path.slice(DAILY_TASK_BFF_BASE_PATH.length) || "/";
  }
}
