import { Body, Controller, POST } from "@dangao/bun-server";
import type { BusinessFile } from "@g2-contract/file";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { FileProxyService } from "@/services/proxy/file/file-proxy.service";

@Controller("/gw-bff/file")
export class FileController {
  public constructor(private readonly proxy: FileProxyService) {}

  @POST("/upload")
  @CubeAuthProxy()
  upload(@Body() body: unknown): Promise<BusinessFile> {
    if (!(body instanceof FormData)) throw Response.json({ message: "文件上传需要 multipart/form-data" }, { status: 400 });
    return this.proxy.uploadBusinessFile(body);
  }
}
