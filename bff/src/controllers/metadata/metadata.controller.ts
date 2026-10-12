import { Controller, GET } from "@dangao/bun-server";
import type { Area, MetadataGateway } from "@g2-contract/metadata";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { MetadataProxyService } from "@/services/proxy/metadata/metadata-proxy.service";

/**
 * 元数据控制器
 * 实现 MetadataGateway 接口
 */
@Controller("/gw-bff/metadata")
export class MetadataController implements MetadataGateway {
  constructor(private readonly metadataProxyService: MetadataProxyService) {}

  @GET("/areas/list-all")
  @CubeAuthProxy()
  public async listAllArea(): Promise<Area[]> {
    return await this.metadataProxyService.listAllArea();
  }
}
