import { Inject, CONFIG_SERVICE_TOKEN, ConfigService, Injectable } from "@dangao/bun-server";

import { FlowClient } from "@cube-ai/flow-sdk-client";

import { ProxyClient } from "@/clients/proxy-client";
import type { FlowFileUploadResult, FlowRunPayload, FlowRunResult } from "@/types/flow.types";

@Injectable()
export class FlowProxyService {
  private readonly baseUrl: string;
  private readonly flowClient: FlowClient;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.aiApplicationUrl") || "").replace(/\/$/, "");
    this.flowClient = new FlowClient({
      baseUrl: this.baseUrl,
      fetchImpl: this.createFlowFetch(),
    });
  }

  public async uploadFlowFile(flowId: string, file: File): Promise<FlowFileUploadResult> {
    return (await this.flowClient.uploadFlowFile(flowId, file)) as FlowFileUploadResult;
  }

  public async runFlow(flowId: string, payload: FlowRunPayload): Promise<FlowRunResult> {
    return (await this.flowClient.runFlow(flowId, payload as never)) as FlowRunResult;
  }

  private createFlowFetch(): typeof fetch {
    return (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
      const response = await this.proxyClient.request<unknown>(String(input), {
        method: init?.method ?? "GET",
        headers: init?.headers as Headers | Record<string, string> | undefined,
        body: init?.body,
        passthroughError: true,
      });
      return new Response(JSON.stringify(response.data ?? null), {
        status: response.status,
        statusText: response.statusText,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
  }
}
