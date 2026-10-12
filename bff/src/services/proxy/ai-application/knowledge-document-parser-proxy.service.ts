import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";

import { ProxyClient } from "@/clients/proxy-client";

const DOCUMENT_PREVIEW_TIMEOUT_MS = 120_000;

@Injectable()
export class KnowledgeDocumentParserProxyService {
  private readonly baseUrl: string;

  public constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) configService: ConfigService,
  ) {
    this.baseUrl = (configService.get<string>("app.aiApplicationUrl") || "").replace(/\/$/, "");
  }

  public async preview(file: File): Promise<unknown> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.proxyClient.request<unknown>(`${this.baseUrl}/kb/console/documents/preview`, {
      method: "POST",
      body: formData,
      timeout: DOCUMENT_PREVIEW_TIMEOUT_MS,
    });
    return response.data;
  }
}
