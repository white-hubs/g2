import { Body, Controller, HttpException, POST } from "@dangao/bun-server";
import type {
  InspectionAiGateway,
  InspectionAnalyzeRequest,
  InspectionAnalyzeResponseData,
  InspectionApiError,
} from "@g2-contract/inspection-ai";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { InspectionAiError } from "@/services/business/inspection-ai/inspection-ai.error";
import { InspectionAiService } from "@/services/business/inspection-ai/inspection-ai.service";

@Controller("/gw-bff/inspection/image")
export class InspectionAiController implements InspectionAiGateway {
  constructor(private readonly inspectionAiService: InspectionAiService) {}

  @POST("/analyze")
  @CubeAuthProxy()
  public async analyzeInspectionImage(@Body() body: InspectionAnalyzeRequest): Promise<InspectionAnalyzeResponseData> {
    const traceId = createTraceId();
    const errors = validateAnalyzeRequest(body);
    if (errors.length > 0) {
      throw createInspectionHttpError(400, "INVALID_PARAM", "请求参数不合法", traceId, errors);
    }

    try {
      return await this.inspectionAiService.analyzeInspectionImage(body, traceId);
    } catch (error) {
      const aiError = error instanceof InspectionAiError ? error : null;
      console.error(`[inspection-ai] traceId=${traceId} analyze failed`, error);
      throw createInspectionHttpError(500, "AI_ANALYZE_FAILED", "图片分析失败，请人工确认", traceId, [
        {
          code: aiError?.code ?? "AI_ANALYZE_FAILED",
          message: aiError?.message ?? "图片分析失败，请人工确认",
        },
      ]);
    }
  }
}

function validateAnalyzeRequest(body: InspectionAnalyzeRequest): InspectionApiError[] {
  const errors: InspectionApiError[] = [];

  if (!body || typeof body !== "object") {
    return [{ code: "INVALID_PARAM", message: "请求体不能为空" }];
  }
  if (!isNonEmptyString(body.id)) {
    errors.push({ code: "INVALID_PARAM", message: "id 不能为空" });
  }
  if (!isNonEmptyString(body.objId)) {
    errors.push({ code: "INVALID_PARAM", message: "objId 不能为空" });
  }
  if (!isNonEmptyString(body.images)) {
    errors.push({ code: "INVALID_PARAM", message: "images 必须为非空文件 ID 字符串" });
  }

  return errors;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createTraceId(): string {
  return `trace_${Date.now()}_${crypto.randomUUID()}`;
}

function createInspectionHttpError(
  statusCode: number,
  code: string,
  message: string,
  traceId: string,
  errors: InspectionApiError[],
): HttpException {
  return new HttpException(
    statusCode,
    JSON.stringify({
      code,
      message,
      traceId,
      errors,
    }),
  );
}
