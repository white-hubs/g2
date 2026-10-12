import { Injectable } from "@dangao/bun-server";
import type {
  EmergencyPlanMatchedTemplate,
  EmergencyPlanTaskDecomposeRequest,
  EmergencyPlanTaskDecomposeResponse,
  EmergencyPlanTaskDraft,
  EmergencyPlanTaskSourceType,
} from "@g2-contract/emergency-plan-ai";

import { EmergencyPlanContentExtractorService } from "./emergency-plan-content-extractor.service";
import { EmergencyPlanFlowService, type AiEmergencyPlanTask } from "./emergency-plan-flow.service";
import { EmergencyPlanProxyService } from "@/services/proxy/emergency-plan/emergency-plan-proxy.service";

@Injectable()
export class EmergencyPlanAiService {
  public constructor(
    private readonly contentExtractorService: EmergencyPlanContentExtractorService,
    private readonly flowService: EmergencyPlanFlowService,
    private readonly emergencyPlanProxyService: EmergencyPlanProxyService,
  ) {}

  public async decomposeTasks(request: EmergencyPlanTaskDecomposeRequest, traceId: string): Promise<EmergencyPlanTaskDecomposeResponse> {
    const source = await this.contentExtractorService.extract(request);
    const config = await this.flowService.getFlowConfig();
    const signals = await this.flowService.identify(config.identifyFlowId, source, request.planContext);
    const matchedTemplates = await this.emergencyPlanProxyService.matchTaskTemplates({
      planName: request.planContext.name,
      eventTypeCode: request.planContext.emergencyEventTypeCode,
      eventTypeName: request.planContext.emergencyEventTypeName,
      signals,
    });
    const aiResult = await this.flowService.decompose(config.decomposeFlowId, source, request.planContext, signals, matchedTemplates);
    const normalized = normalizeTasks(aiResult.tasks, matchedTemplates);
    console.log(`[emergency-plan-ai] traceId=${traceId} candidates=${matchedTemplates.length} tasks=${normalized.tasks.length}`);
    return {
      traceId,
      sourceDigest: source.digest,
      signals,
      matchedTemplates,
      tasks: normalized.tasks,
      warnings: [...aiResult.warnings, ...normalized.warnings],
    };
  }
}

function normalizeTasks(
  values: AiEmergencyPlanTask[],
  templates: EmergencyPlanMatchedTemplate[],
): { tasks: EmergencyPlanTaskDraft[]; warnings: string[] } {
  const templateMap = new Map(templates.map((template) => [template.templateId, template]));
  const warnings: string[] = [];
  const tasks: EmergencyPlanTaskDraft[] = [];
  for (const value of values) {
    const name = readText(value.name, 100);
    if (!name) {
      warnings.push("已忽略一个缺少任务名称的AI结果");
      continue;
    }
    const requestedTemplateId = readNullableId(value.sourceTemplateId);
    const template = requestedTemplateId ? templateMap.get(requestedTemplateId) : undefined;
    if (requestedTemplateId && !template) warnings.push(`任务“${name}”返回了非候选模板ID，已按AI任务处理`);
    const sourceType: EmergencyPlanTaskSourceType = template ? "TEMPLATE" : "AI";
    tasks.push({
      clientKey: crypto.randomUUID(),
      name,
      sortNo: tasks.length + 1,
      durationMinutes: readNonNegativeInteger(value.durationMinutes),
      executionContents: readTextArray(value.executionContents ?? value.executionContent, 50, 500),
      equipment: readTextArray(value.equipment, 50, 100),
      locationDesc: readText(value.locationDesc, 200),
      remark: readText(value.remark, 500),
      sourceType,
      sourceTemplateId: template?.templateId || null,
      templateName: template?.templateName || null,
      templateConfidence: template ? readConfidence(value.templateConfidence) : null,
      templateReason: template ? readText(value.templateReason, 500) || template.matchedReasons.join("；") : null,
      executors: [],
    });
  }
  return { tasks, warnings };
}

function readText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function readTextArray(value: unknown, maxItems: number, maxLength: number): string[] {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,，;；]+/) : [];
  return [
    ...new Set(
      source
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}
function readNullableId(value: unknown): string | null {
  return typeof value === "string" && /^\d+$/.test(value.trim()) ? value.trim() : null;
}
function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}
function readConfidence(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
}
