import { Injectable } from "@dangao/bun-server";
import type { WorkPermitAssociatedItemAiRecognitionRequest, WorkPermitAssociatedItemAiRecognitionResponse } from "@g2-contract/work-permit";

import { normalizeFlowFileRef } from "@/services/business/inspection-ai/inspection-flow.service";
import { FlowProxyService } from "@/services/proxy/ai-application/flow-proxy.service";
import { DictionaryProxyService } from "@/services/proxy/dictionary/dictionary-proxy.service";
import { FileProxyService } from "@/services/proxy/file/file-proxy.service";
import type { FlowExecutionInputFileRef, FlowRunPayload } from "@/types/flow.types";

const AI_FLOW_DICTIONARY_ITEM_CODE = "BUSINESS_AI_FLOW";
const AI_FLOW_DICTIONARY_CODE = "WORK_PERMIT_AI_FLOW";
const WORK_PERMIT_ITEM_RECOGNITION_FLOW_KEY = "workPermitItemRecognition";
const DEFAULT_IMAGE_MIME = "image/jpeg";

@Injectable()
export class WorkPermitAiFlowService {
  constructor(
    private readonly dictionaryProxyService: DictionaryProxyService,
    private readonly fileProxyService: FileProxyService,
    private readonly flowProxyService: FlowProxyService,
  ) {}

  public async recognizeAssociatedItem(
    payload: WorkPermitAssociatedItemAiRecognitionRequest,
    traceId: string,
  ): Promise<WorkPermitAssociatedItemAiRecognitionResponse> {
    const flowId = await this.getWorkPermitItemRecognitionFlowId();
    const files = await this.uploadFiles(flowId, payload.fileIds);
    const runPayload = buildWorkPermitRecognitionFlowRunPayload(payload, files);
    const startedAt = Date.now();
    const result = await this.flowProxyService.runFlow(flowId, runPayload);
    console.log(`[work-permit-ai] traceId=${traceId} flowId=${flowId} elapsed=${Date.now() - startedAt}ms`);
    return parseWorkPermitRecognitionResult(result);
  }

  private async uploadFiles(flowId: string, fileIds: string[]): Promise<FlowExecutionInputFileRef[]> {
    const uploaded: FlowExecutionInputFileRef[] = [];
    for (const fileId of fileIds) {
      const imageBytes = await this.fileProxyService.getFileByte(fileId);
      const imageFile = new File([new Uint8Array(imageBytes)], `${fileId}.jpg`, {
        type: DEFAULT_IMAGE_MIME,
      });
      uploaded.push(normalizeFlowFileRef(await this.flowProxyService.uploadFlowFile(flowId, imageFile)));
    }
    return uploaded;
  }

  private async getWorkPermitItemRecognitionFlowId(): Promise<string> {
    const dictionaries = await this.dictionaryProxyService.getDataDictionaryByItem({
      itemCode: AI_FLOW_DICTIONARY_ITEM_CODE,
      code: AI_FLOW_DICTIONARY_CODE,
    });
    const variable = readDictionaryVariable(dictionaries);
    const flowId = readStringValueFromJsonText(variable, WORK_PERMIT_ITEM_RECOGNITION_FLOW_KEY);
    if (!flowId.trim()) {
      throw new Error("未配置作业许可检查/验收项 AI 识别流程");
    }
    return flowId.trim();
  }
}

export function buildWorkPermitRecognitionFlowRunPayload(
  payload: WorkPermitAssociatedItemAiRecognitionRequest,
  files: FlowExecutionInputFileRef[],
): FlowRunPayload {
  return {
    input: {
      query: JSON.stringify({
        itemContent: payload.itemContent,
        fileIds: payload.fileIds,
      }),
      files,
    },
    inputType: "chat",
    outputType: "chat",
  };
}

export function parseWorkPermitRecognitionResult(value: unknown): WorkPermitAssociatedItemAiRecognitionResponse {
  const parsed = normalizeRecognitionResult(value) ?? normalizeRecognitionResult(parseJsonFromText(extractAiText(value)));
  if (!parsed) {
    return {
      recognitionStatus: "unrecognized",
      needManualReview: true,
      description: "AI未识别到明确结果，请手动确认",
      raw: value,
    };
  }
  return parsed;
}

function normalizeRecognitionResult(value: unknown): WorkPermitAssociatedItemAiRecognitionResponse | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = normalizeRecognitionResult(item);
      if (nested) return nested;
    }
    return null;
  }
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const nested = normalizeNestedRecognitionResult(record);
  if (nested) {
    return nested;
  }

  const recognitionStatus = readRecognitionStatus(record);
  const confirmResult = readConfirmResult(record);
  if (!recognitionStatus && !confirmResult) {
    return null;
  }
  const resolvedStatus = recognitionStatus ?? (confirmResult ? "recognized" : "unrecognized");
  return {
    confirmResult,
    description: readString(record.description) || readString(record.problemDescription) || readString(record.evidence),
    recognitionStatus: resolvedStatus,
    confidence: readNumber(record.confidence),
    needManualReview: resolvedStatus === "unrecognized" || record.needManualReview === true,
    raw: value,
  };
}

function normalizeNestedRecognitionResult(record: Record<string, unknown>): WorkPermitAssociatedItemAiRecognitionResponse | null {
  for (const key of ["data", "result", "output", "outputText", "raw", "outputs"]) {
    const nested = normalizeRecognitionResult(record[key]);
    if (nested) return nested;
  }
  return null;
}

function readRecognitionStatus(record: Record<string, unknown>): "recognized" | "unrecognized" | undefined {
  const value = readString(record.recognitionStatus) || readString(record.status);
  if (["unrecognized", "UNRECOGNIZED", "未识别"].includes(value)) return "unrecognized";
  if (["recognized", "RECOGNIZED", "normal", "abnormal", "NORMAL", "ABNORMAL", "正常", "异常"].includes(value)) return "recognized";
  return undefined;
}

function readConfirmResult(record: Record<string, unknown>): "NORMAL" | "ABNORMAL" | undefined {
  const value = readString(record.confirmResult) || readString(record.result) || readString(record.status);
  if (["NORMAL", "normal", "正常"].includes(value)) return "NORMAL";
  if (["ABNORMAL", "abnormal", "异常"].includes(value)) return "ABNORMAL";
  return undefined;
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

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
