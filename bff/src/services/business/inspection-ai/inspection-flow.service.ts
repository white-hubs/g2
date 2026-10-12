import { Injectable } from "@dangao/bun-server";
import type { DataDictionary } from "@g2-contract/dictionary";
import type { AiInspectionAnalyzeResult, InspectionStandardVO } from "@g2-contract/inspection-ai";

import { InspectionAiError } from "./inspection-ai.error";
import { FlowProxyService } from "@/services/proxy/ai-application/flow-proxy.service";
import { DictionaryProxyService } from "@/services/proxy/dictionary/dictionary-proxy.service";
import { FileProxyService } from "@/services/proxy/file/file-proxy.service";
import type { FlowExecutionInputFileRef, FlowFileUploadResult, FlowRunPayload } from "@/types/flow.types";

const AI_FLOW_DICTIONARY_ITEM_CODE = "BUSINESS_AI_FLOW";
const AI_FLOW_DICTIONARY_CODE = "INSPECTION_AI_FLOW";
const INSPECT_EXECUTE_FLOW_KEY = "inspectExecute";
const INSPECT_STANDARD_FLOW_KEY = "inspectStandGenerate";
const DEFAULT_IMAGE_MIME = "image/jpeg";

export interface InspectionFlowRunParams {
  id: string;
  objId: string;
  targetName: string;
  images: string[];
  standardVOS: InspectionStandardVO[];
  safetyTips: string[];
}

export interface InspectionFlowAnalyzeInput {
  id: string;
  objId: string;
  imageFileId: string;
  targetName: string;
  standardVOS: InspectionStandardVO[];
  traceId: string;
}

export class InspectionFlowError extends InspectionAiError {}

@Injectable()
export class InspectionFlowService {
  constructor(
    private readonly dictionaryProxyService: DictionaryProxyService,
    private readonly fileProxyService: FileProxyService,
    private readonly flowProxyService: FlowProxyService,
  ) {}

  public async analyzeInspection(input: InspectionFlowAnalyzeInput): Promise<AiInspectionAnalyzeResult> {
    const flowId = await this.getInspectExecuteFlowId();
    const imageBytes = await this.fileProxyService.getFileByte(input.imageFileId);
    const imageFile = new File([new Uint8Array(imageBytes)], `${input.imageFileId}.jpg`, {
      type: DEFAULT_IMAGE_MIME,
    });
    const uploaded = await this.flowProxyService.uploadFlowFile(flowId, imageFile);
    const fileRef = normalizeFlowFileRef(uploaded);
    const payload = buildInspectionFlowRunPayload(
      {
        id: input.id,
        objId: input.objId,
        targetName: input.targetName,
        images: [input.imageFileId],
        standardVOS: input.standardVOS,
        safetyTips: mergeSafetyTips(input.standardVOS),
      },
      [fileRef],
    );
    const startedAt = Date.now();
    const result = await this.flowProxyService.runFlow(flowId, payload);
    console.log(`[inspection-ai] traceId=${input.traceId} flowId=${flowId} elapsed=${Date.now() - startedAt}ms`);
    return parseFlowAnalyzeResult(result);
  }

  public async generateInspectionStandards(input: { targetName: string; supplement?: string }): Promise<unknown> {
    const flowId = await this.getFlowId(INSPECT_STANDARD_FLOW_KEY, "未配置 AI 巡检标准生成流程");
    const supplement = input.supplement?.trim();
    return this.flowProxyService.runFlow(flowId, {
      input: supplement ? `${input.targetName}\n${supplement}` : input.targetName,
      inputType: "chat",
      outputType: "chat",
    });
  }

  private async getInspectExecuteFlowId(): Promise<string> {
    return this.getFlowId(INSPECT_EXECUTE_FLOW_KEY, "未配置巡检执行分析流程");
  }

  private async getFlowId(key: string, missingMessage: string): Promise<string> {
    const dictionaries = await this.dictionaryProxyService.getDataDictionaryByItem({
      itemCode: AI_FLOW_DICTIONARY_ITEM_CODE,
      code: AI_FLOW_DICTIONARY_CODE,
    });
    const variable = readDictionaryVariable(dictionaries);
    const flowId = readStringValueFromJsonText(variable, key);
    if (!flowId.trim()) {
      throw new InspectionFlowError("FLOW_CONFIG_MISSING", missingMessage);
    }
    return flowId.trim();
  }
}

export function buildInspectionFlowRunPayload(params: InspectionFlowRunParams, files: FlowExecutionInputFileRef[]): FlowRunPayload {
  return {
    input: {
      query: JSON.stringify(params),
      files,
    },
    inputType: "chat",
    outputType: "chat",
  };
}

export function normalizeFlowFileRef(uploaded: FlowFileUploadResult): FlowExecutionInputFileRef {
  const filePath = uploaded.file_path ?? uploaded.filePath ?? uploaded.path ?? uploaded.url ?? uploaded.id ?? null;
  if (!filePath) {
    throw new InspectionFlowError("FLOW_FILE_UPLOAD_INVALID", "Flow 文件上传结果缺少文件路径");
  }
  return {
    file_path: filePath,
    filePath,
    path: filePath,
    ...(uploaded.id ? { id: uploaded.id } : {}),
    ...(uploaded.name ? { name: uploaded.name } : {}),
    ...(uploaded.mime ? { mime: uploaded.mime } : { mime: DEFAULT_IMAGE_MIME }),
    ...(uploaded.url ? { url: uploaded.url } : {}),
    ...(uploaded.ext ? { ext: uploaded.ext } : {}),
  };
}

export function parseFlowAnalyzeResult(value: unknown): AiInspectionAnalyzeResult {
  const direct = normalizeAiResult(value);
  if (direct) {
    return direct;
  }

  const text = extractAiText(value);
  const parsed = parseJsonFromText(text);
  const fromText = normalizeAiResult(parsed);
  if (fromText) {
    return fromText;
  }

  throw new InspectionFlowError("FLOW_OUTPUT_INVALID", "Flow 返回结果为空或不是合法巡检分析 JSON");
}

function normalizeAiResult(value: unknown): AiInspectionAnalyzeResult | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = normalizeAiResult(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  const record = readRecord(value);
  if (!record) {
    return null;
  }
  if (Array.isArray(record.items)) {
    return {
      targetName: typeof record.targetName === "string" ? record.targetName : "",
      imageAnalysisSummary: typeof record.imageAnalysisSummary === "string" ? record.imageAnalysisSummary : "",
      items: record.items as AiInspectionAnalyzeResult["items"],
    };
  }

  for (const key of ["data", "result", "output", "outputText", "raw", "outputs"]) {
    const nested = normalizeAiResult(record[key]);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function mergeSafetyTips(standardVOS: InspectionStandardVO[]): string[] {
  const deduped = new Set<string>();
  for (const standard of standardVOS) {
    for (const tip of normalizeSafetyTips(standard.safetyTips)) {
      deduped.add(tip);
    }
  }
  return [...deduped];
}

function normalizeSafetyTips(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tip): tip is string => typeof tip === "string" && tip.trim().length > 0).map((tip) => tip.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function readDictionaryVariable(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(readDictionaryVariable).find(Boolean) ?? "";
  }
  const record = readRecord(value);
  if (!record) {
    return "";
  }
  if (typeof record.variable === "string") {
    return record.variable;
  }
  return readDictionaryVariable(record.data);
}

function readStringValueFromJsonText(jsonText: string, key: string): string {
  const parsed = parseJsonFromText(jsonText);
  const record = readRecord(parsed);
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const direct = safeJsonParse(trimmed);
  if (direct != null) {
    return direct;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const parsed = safeJsonParse(fenced.trim());
    if (parsed != null) {
      return parsed;
    }
  }
  const start = Math.min(...[trimmed.indexOf("{"), trimmed.indexOf("[")].filter((index) => index >= 0));
  if (Number.isFinite(start)) {
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (end > start) {
      return safeJsonParse(trimmed.slice(start, end + 1));
    }
  }
  return null;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractAiText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(extractAiText).find(Boolean) ?? "";
  }
  const record = readRecord(value);
  if (!record) {
    return "";
  }
  for (const key of ["text", "message", "content", "output", "outputText", "result", "response", "raw", "outputs"]) {
    const text = extractAiText(record[key]);
    if (text) {
      return text;
    }
  }
  return "";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as DataDictionary & Record<string, unknown>) : null;
}
