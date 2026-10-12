import { Injectable } from "@dangao/bun-server";
import type { InspectionAnalyzeRequest, InspectionAnalyzeResponseData } from "@g2-contract/inspection-ai";

import { InspectionFlowService } from "./inspection-flow.service";
import { DailyInspectionProxyService } from "@/services/proxy/daily-inspection/daily-inspection-proxy.service";
import { buildInspectionAnalyzeData } from "@/utils/inspection-result-normalizer";

@Injectable()
export class InspectionAiService {
  constructor(
    private readonly dailyInspectionProxyService: DailyInspectionProxyService,
    private readonly inspectionFlowService: InspectionFlowService,
  ) {}

  public async analyzeInspectionImage(request: InspectionAnalyzeRequest, traceId: string): Promise<InspectionAnalyzeResponseData> {
    const inspectionDetail = await this.dailyInspectionProxyService.performInspection({
      id: request.id.trim(),
      objId: request.objId.trim(),
    });
    const targetName = typeof inspectionDetail.targetName === "string" ? inspectionDetail.targetName : "";
    const standardVOS = Array.isArray(inspectionDetail.standardVOS) ? inspectionDetail.standardVOS : [];
    const imageFileId = request.images.trim();

    const aiResult = await this.inspectionFlowService.analyzeInspection({
      id: request.id.trim(),
      objId: request.objId.trim(),
      imageFileId,
      targetName,
      standardVOS,
      traceId,
    });

    return buildInspectionAnalyzeData(
      {
        targetName,
        images: [imageFileId],
        standardVOS,
      },
      aiResult,
    );
  }
}
