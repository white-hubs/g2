import { Controller, GET } from "@dangao/bun-server";

/**
 * 健康检查控制器
 */
@Controller("/health")
export class HealthController {
  @GET("/")
  public check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "@g2-server/bff",
    };
  }
}
