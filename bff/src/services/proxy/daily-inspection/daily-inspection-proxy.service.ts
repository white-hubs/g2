import { Inject, CONFIG_SERVICE_TOKEN, ConfigService, Injectable } from "@dangao/bun-server";
import {
  DAILY_INSPECTION_ALLOWED_UPSTREAM_PREFIXES,
  type DailyInspectionProxyGateway,
  type InspectionRecord,
} from "@g2-contract/daily-inspection";
import type { InspectionStandardVO } from "@g2-contract/inspection-ai";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyServiceError<T> {
  data?: T;
  result?: T;
  code?: string;
  message?: string;
}

export interface InspectStandard {
  targetName?: string;
  standardVOS?: InspectionStandardVO[];
  [key: string]: unknown;
}

/**
 * 内部代理：仅供 inspection-ai 等 BFF 业务读取 maintain 巡检数据。
 * 日常巡检域前端已直连 /api/maintain，不再通过 HTTP BFF 转发。
 */
@Injectable()
export class DailyInspectionProxyService implements DailyInspectionProxyGateway {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.dailyInspectionUrl") || "";
  }

  public async performInspection(payload: { id: string; objId: string }): Promise<InspectionRecord> {
    this.assertAllowed(`/inspect-task/${payload.id}/performInspection`);
    const baseUrl = `${this.baseUrl.replace(/\/$/, "")}/inspect-task/${encodeURIComponent(payload.id)}/performInspection`;
    const url = buildUrl(baseUrl, {
      id: payload.id,
      objId: payload.objId,
    });
    const resp = await this.proxyClient.get<LegacyServiceError<InspectStandard> | InspectStandard>(url, {
      passthroughError: true,
    });
    return normalizePerformInspectionResponse(resp.data);
  }

  private assertAllowed(path: string): void {
    if (
      path.includes("..") ||
      path.includes("://") ||
      !DAILY_INSPECTION_ALLOWED_UPSTREAM_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      throw new Error(`daily-inspection upstream path is not allowed: ${path}`);
    }
  }
}

function normalizePerformInspectionResponse(response: LegacyServiceError<InspectStandard> | InspectStandard): InspectionRecord {
  if (response && typeof response === "object") {
    const legacy = response as LegacyServiceError<InspectStandard>;
    return (legacy.data || legacy.result || (response as InspectStandard)) as InspectionRecord;
  }
  return {};
}
