import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { EmergencyPlanMatchedTemplate, EmergencyPlanSemanticSignals } from "@g2-contract/emergency-plan-ai";

import { ProxyClient } from "@/clients/proxy-client";

export interface EmergencyPlanTemplateMatchInput {
  planName: string;
  eventTypeCode?: string | null;
  eventTypeName?: string | null;
  signals: EmergencyPlanSemanticSignals;
}

@Injectable()
export class EmergencyPlanProxyService {
  private readonly baseUrl: string;

  public constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) configService: ConfigService,
  ) {
    this.baseUrl = (configService.get<string>("app.emergencyUrl") || "").replace(/\/$/, "");
  }

  public async matchTaskTemplates(input: EmergencyPlanTemplateMatchInput): Promise<EmergencyPlanMatchedTemplate[]> {
    const response = await this.proxyClient.post<EmergencyPlanMatchedTemplate[]>(
      `${this.baseUrl}/emergency-task-templates/match`,
      {
        planName: input.planName,
        eventTypeCode: input.eventTypeCode,
        eventTypeName: input.eventTypeName,
        scenes: input.signals.scenes,
        keywords: input.signals.keywords,
        taskIntents: input.signals.taskIntents,
      },
      { passthroughError: true },
    );
    const body = unwrapResponse(response.data);
    return Array.isArray(body) ? body : [];
  }
}

function unwrapResponse(value: unknown): unknown {
  return value && typeof value === "object" && "data" in value ? (value as { data: unknown }).data : value;
}
