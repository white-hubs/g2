import { Body, Controller, HttpException, POST } from "@dangao/bun-server";
import type {
  EmergencyPlanAiGateway,
  EmergencyPlanTaskDecomposeRequest,
  EmergencyPlanTaskDecomposeResponse,
} from "@g2-contract/emergency-plan-ai";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { EmergencyPlanAiError } from "@/services/business/emergency-plan-ai/emergency-plan-ai.error";
import { EmergencyPlanAiService } from "@/services/business/emergency-plan-ai/emergency-plan-ai.service";

/** 旧门户兼容接口；路径与 ghcloud gateway 保持不变。 */
@Controller("/gw-bff/emergency/plan-ai")
export class EmergencyPlanAiController implements EmergencyPlanAiGateway {
  public constructor(private readonly emergencyPlanAiService: EmergencyPlanAiService) {}

  @POST("/tasks/decompose")
  @CubeAuthProxy()
  public async decomposeTasks(@Body() body: EmergencyPlanTaskDecomposeRequest): Promise<EmergencyPlanTaskDecomposeResponse> {
    const traceId = `trace_${Date.now()}_${crypto.randomUUID()}`;
    const validationMessage = validateRequest(body);
    if (validationMessage) throw createHttpError(400, "INVALID_PARAM", validationMessage, traceId);
    try {
      return await this.emergencyPlanAiService.decomposeTasks(body, traceId);
    } catch (error) {
      console.error(`[emergency-plan-ai] traceId=${traceId} decompose failed`, error);
      const aiError = error instanceof EmergencyPlanAiError ? error : null;
      const code = aiError?.code || "PLAN_AI_DECOMPOSE_FAILED";
      throw createHttpError(resolveHttpStatus(code), code, aiError?.message || "预案任务拆解失败，请重试", traceId);
    }
  }
}

function resolveHttpStatus(code: string): number {
  if (code === "PLAN_AI_TIMEOUT" || code === "DOCUMENT_PREVIEW_TIMEOUT") return 504;
  if (code === "FLOW_CONFIG_MISSING") return 503;
  if (code === "UNSUPPORTED_FILE_TYPE" || code === "DOCUMENT_EMPTY" || code === "DOCUMENT_TOO_LARGE") return 422;
  if (code === "DOCUMENT_PARSE_FAILED" || code === "DOCUMENT_PARSE_INCOMPLETE" || code.includes("OUTPUT_INVALID")) return 502;
  return 500;
}

function validateRequest(body: EmergencyPlanTaskDecomposeRequest): string {
  if (!body || typeof body !== "object") return "请求体不能为空";
  if (body.sourceType !== "RICH_TEXT" && body.sourceType !== "FILE") return "sourceType不合法";
  if (!body.planContext || typeof body.planContext.name !== "string" || !body.planContext.name.trim()) return "预案名称不能为空";
  if (body.sourceType === "RICH_TEXT" && !body.contentHtml?.trim()) return "预案正文不能为空";
  if (body.sourceType === "FILE" && !body.fileId?.trim()) return "预案文件ID不能为空";
  return "";
}

function createHttpError(status: number, code: string, message: string, traceId: string): HttpException {
  return new HttpException(status, JSON.stringify({ code, message, traceId }));
}
