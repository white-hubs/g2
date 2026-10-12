import { Injectable } from "@dangao/bun-server";
import type { EmergencyPlanContext, EmergencyPlanMatchedTemplate, EmergencyPlanSemanticSignals } from "@g2-contract/emergency-plan-ai";

import { EmergencyPlanAiError } from "./emergency-plan-ai.error";
import type { ExtractedEmergencyPlanContent } from "./emergency-plan-content-extractor.service";
import { FlowProxyService } from "@/services/proxy/ai-application/flow-proxy.service";
import { DictionaryProxyService } from "@/services/proxy/dictionary/dictionary-proxy.service";
import type { FlowRunPayload } from "@/types/flow.types";

const FLOW_DICTIONARY_ITEM_CODE = "BUSINESS_AI_FLOW";
const FLOW_DICTIONARY_CODE = "PLAN_GEN_AI_FLOW";
export interface EmergencyPlanFlowConfig {
  identifyFlowId: string;
  decomposeFlowId: string;
}
export interface AiEmergencyPlanTask {
  name?: unknown;
  durationMinutes?: unknown;
  executionContents?: unknown;
  executionContent?: unknown;
  equipment?: unknown;
  locationDesc?: unknown;
  remark?: unknown;
  sourceTemplateId?: unknown;
  templateConfidence?: unknown;
  templateReason?: unknown;
}
export interface AiEmergencyPlanTaskResult {
  tasks: AiEmergencyPlanTask[];
  warnings: string[];
}

@Injectable()
export class EmergencyPlanFlowService {
  public constructor(
    private readonly dictionaryProxyService: DictionaryProxyService,
    private readonly flowProxyService: FlowProxyService,
  ) {}

  public async getFlowConfig(): Promise<EmergencyPlanFlowConfig> {
    const dictionary = await this.dictionaryProxyService.getDataDictionaryByItem({
      itemCode: FLOW_DICTIONARY_ITEM_CODE,
      code: FLOW_DICTIONARY_CODE,
    });
    const config = readRecord(parseFlowConfig(readDictionaryVariable(dictionary)));
    const decomposeFlowId = readFlowId(config?.decompose);
    const identifyFlowId = readFlowId(config?.decomposeIdentify) || decomposeFlowId;
    if (!decomposeFlowId) throw new EmergencyPlanAiError("FLOW_CONFIG_MISSING", "未配置预案任务拆解流程");
    return { identifyFlowId, decomposeFlowId };
  }

  public async identify(
    flowId: string,
    document: ExtractedEmergencyPlanContent,
    planContext: EmergencyPlanContext,
  ): Promise<EmergencyPlanSemanticSignals> {
    return parseSemanticSignals(await this.run(flowId, "IDENTIFY", { planContext, document }));
  }
  public async decompose(
    flowId: string,
    document: ExtractedEmergencyPlanContent,
    planContext: EmergencyPlanContext,
    signals: EmergencyPlanSemanticSignals,
    candidateTemplates: EmergencyPlanMatchedTemplate[],
  ): Promise<AiEmergencyPlanTaskResult> {
    return parseTaskResult(await this.run(flowId, "DECOMPOSE", { planContext, document, signals, candidateTemplates }));
  }
  private async run(flowId: string, mode: string, data: Record<string, unknown>): Promise<unknown> {
    const payload: FlowRunPayload = { input: { query: JSON.stringify({ mode, ...data }) }, inputType: "chat", outputType: "chat" };
    try {
      return await this.flowProxyService.runFlow(flowId, payload);
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || /timed?\s*out|timeout|超时/i.test(error.message)))
        throw new EmergencyPlanAiError("PLAN_AI_TIMEOUT", "预案任务拆解超时");
      throw error;
    }
  }
}

function parseSemanticSignals(value: unknown): EmergencyPlanSemanticSignals {
  const record = findResultRecord(value, (item) =>
    ["scenes", "keywords", "taskIntents", "eventTypeHints"].some((key) => Array.isArray(item[key])),
  );
  if (!record) throw new EmergencyPlanAiError("FLOW_IDENTIFY_OUTPUT_INVALID", "语义识别流程未返回合法JSON");
  return {
    summary: readString(record.summary),
    scenes: readStringArray(record.scenes, 20),
    keywords: readStringArray(record.keywords, 30),
    taskIntents: readStringArray(record.taskIntents, 30),
    eventTypeHints: readStringArray(record.eventTypeHints, 10),
  };
}
function parseTaskResult(value: unknown): AiEmergencyPlanTaskResult {
  const record = findResultRecord(value, (item) => Array.isArray(item.tasks));
  if (!record || !Array.isArray(record.tasks))
    throw new EmergencyPlanAiError("FLOW_DECOMPOSE_OUTPUT_INVALID", "任务拆解流程未返回合法JSON");
  return {
    tasks: record.tasks.filter((item): item is AiEmergencyPlanTask => Boolean(readRecord(item))).slice(0, 50),
    warnings: readStringArray(record.warnings, 30),
  };
}
function findResultRecord(value: unknown, predicate: (record: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  if (typeof value === "string") return findResultRecord(parseJsonText(value), predicate);
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findResultRecord(item, predicate);
      if (result) return result;
    }
    return null;
  }
  const record = readRecord(value);
  if (!record) return null;
  if (predicate(record)) return record;
  for (const key of ["data", "result", "output", "outputText", "text", "message", "content", "raw", "outputs", "response"]) {
    const result = findResultRecord(record[key], predicate);
    if (result) return result;
  }
  return null;
}
function parseJsonText(value: string): unknown {
  const text = value.trim();
  if (!text) return null;
  for (const candidate of [text, text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() || "", extractJsonRange(text)]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next */
    }
  }
  return null;
}
function parseFlowConfig(value: string): unknown {
  return parseJsonText(value.replace(/("(?:decompose|decomposeIdentify)"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"'));
}
function extractJsonRange(value: string): string {
  const starts = [value.indexOf("{"), value.indexOf("[")].filter((index) => index >= 0);
  if (!starts.length) return "";
  const start = Math.min(...starts);
  const end = Math.max(value.lastIndexOf("}"), value.lastIndexOf("]"));
  return end > start ? value.slice(start, end + 1) : "";
}
function readDictionaryVariable(value: unknown): string {
  if (Array.isArray(value)) return value.map(readDictionaryVariable).find(Boolean) || "";
  const record = readRecord(value);
  return !record ? "" : typeof record.variable === "string" ? record.variable : readDictionaryVariable(record.data);
}
function readFlowId(value: unknown): string {
  return typeof value === "string" && /^\d+$/.test(value.trim()) ? value.trim() : "";
}
function readStringArray(value: unknown, limit: number): string[] {
  return !Array.isArray(value)
    ? []
    : [
        ...new Set(
          value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ].slice(0, limit);
}
function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
