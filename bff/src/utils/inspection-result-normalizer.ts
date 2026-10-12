import type {
  AiInspectionAnalyzeResult,
  AiInspectionItemResult,
  InspectionAnalyzeResponseData,
  InspectionItemResult,
  InspectionMatchedResult,
  InspectionOverallResult,
  InspectionResultOptionVO,
  InspectionResultVO,
  InspectionStandardStatusResult,
  InspectionStandardVO,
  InspectionSummary,
} from "@g2-contract/inspection-ai";

import type { InternalInspectionStandardItem } from "@/types/inspection-ai.types";

export interface InspectionAnalyzeBuildInput {
  targetName: string;
  images: string[];
  standardVOS: InspectionStandardVO[];
}

export function normalizeImages(images: string | string[]): string[] {
  if (Array.isArray(images)) {
    return images.filter((image) => typeof image === "string" && image.trim()).map((image) => image.trim());
  }
  return typeof images === "string" && images.trim() ? [images.trim()] : [];
}

export function flattenStandardItems(standardVOS: InspectionStandardVO[]): InternalInspectionStandardItem[] {
  const list: InternalInspectionStandardItem[] = [];

  for (const standard of standardVOS) {
    const standardId = toNonEmptyString(standard.standardId ?? standard.id);
    if (!standardId) {
      continue;
    }
    const standardName = toNonEmptyString(standard.standardName ?? standard.name) || standardId;
    const standardItems = Array.isArray(standard.standardItems) ? standard.standardItems : [];

    for (const item of standardItems) {
      const itemId = toNonEmptyString(item.itemId ?? item.id);
      if (!itemId) {
        continue;
      }
      const itemName = toNonEmptyString(item.itemName ?? item.name ?? item.content) || itemId;
      const resultVO = item.resultVO && typeof item.resultVO === "object" ? item.resultVO : {};
      const options = Array.isArray(resultVO.options) ? resultVO.options : [];
      list.push({
        standardId,
        standardName,
        standard,
        itemId,
        itemName,
        item,
        resultId: toNonEmptyString(resultVO.id) || "",
        resultName: toNonEmptyString(resultVO.name) || "",
        options,
      });
    }
  }

  return list;
}

export function findMatchedOption(
  options: InspectionResultOptionVO[],
  matchedResult: AiInspectionItemResult["matchedResult"],
): InspectionResultOptionVO | null {
  if (!matchedResult) {
    return null;
  }

  return (
    options.find((option) => option.itemValue === matchedResult.itemValue) ||
    options.find((option) => option.itemName === matchedResult.itemName) ||
    null
  );
}

export function resolveOverallResult(summary: {
  normalCount: number;
  abnormalCount: number;
  unrecognizedCount: number;
}): InspectionOverallResult {
  if (summary.abnormalCount > 0) {
    return "abnormal";
  }

  if (summary.unrecognizedCount > 0 && summary.normalCount === 0) {
    return "unrecognized";
  }

  if (summary.unrecognizedCount > 0) {
    return "partial";
  }

  return "normal";
}

export function summarize(items: InspectionItemResult[]): InspectionSummary {
  const summary = {
    totalCount: items.length,
    normalCount: items.filter((item) => item.status === "normal").length,
    abnormalCount: items.filter((item) => item.status === "abnormal").length,
    unrecognizedCount: items.filter((item) => item.status === "unrecognized").length,
    overallResult: "normal" as InspectionOverallResult,
  };
  summary.overallResult = resolveOverallResult(summary);
  return summary;
}

export function buildInspectionAnalyzeData(
  input: InspectionAnalyzeBuildInput,
  aiResult: AiInspectionAnalyzeResult,
): InspectionAnalyzeResponseData {
  const indexedItems = flattenStandardItems(input.standardVOS);
  const aiItemMap = new Map<string, AiInspectionItemResult>();
  const knownItemKeys = new Set(indexedItems.map((item) => getItemKey(item.standardId, item.itemId)));

  for (const item of Array.isArray(aiResult.items) ? aiResult.items : []) {
    const key = getItemKey(item.standardId, item.itemId);
    if (knownItemKeys.has(key)) {
      aiItemMap.set(key, item);
    }
  }

  const normalItems: InspectionStandardStatusResult[] = [];
  const abnormalItems: InspectionStandardStatusResult[] = [];
  const unrecognizedItems: InspectionStandardStatusResult[] = [];
  const flatResults: InspectionItemResult[] = [];

  const itemsByStandard = groupItemsByStandard(indexedItems);
  for (const [standardId, standardItems] of itemsByStandard.entries()) {
    const standardResults = standardItems.map((item) => buildFinalItem(item, aiItemMap.get(getItemKey(item.standardId, item.itemId))));
    flatResults.push(...standardResults);

    pushStatusGroup(normalItems, standardId, standardItems, standardResults, "normal");
    pushStatusGroup(abnormalItems, standardId, standardItems, standardResults, "abnormal");
    pushStatusGroup(unrecognizedItems, standardId, standardItems, standardResults, "unrecognized");
  }

  const summary = summarize(flatResults);

  return {
    targetName: input.targetName,
    images: input.images,
    safetyTips: mergeSafetyTips(input.standardVOS),
    totalCount: summary.totalCount,
    normalCount: summary.normalCount,
    abnormalCount: summary.abnormalCount,
    unrecognizedCount: summary.unrecognizedCount,
    normalItems,
    abnormalItems,
    unrecognizedItems,
  };
}

function pushStatusGroup(
  target: InspectionStandardStatusResult[],
  standardId: string,
  standardItems: InternalInspectionStandardItem[],
  standardResults: InspectionItemResult[],
  status: InspectionItemResult["status"],
): void {
  const matchedItems = standardResults.filter((item) => item.status === status);
  if (matchedItems.length === 0) {
    return;
  }

  const firstItem = standardItems[0];
  const standardName = firstItem?.standardName ?? standardId;
  const itemById = new Map(standardItems.map((item) => [item.itemId, item]));

  target.push({
    standardId,
    standardName,
    standardItems: matchedItems.map((result) => {
      const sourceItem = itemById.get(result.itemId);
      return mapAnalyzedStandardItem(sourceItem, result);
    }),
    problemDescription: mergeText(matchedItems.map((item) => item.problemDescription)),
    evidence: mergeText(matchedItems.map((item) => item.evidence)),
    confidence: resolveGroupConfidence(matchedItems),
    needManualReview: matchedItems.some((item) => item.needManualReview),
  });
}

function buildFinalItem(item: InternalInspectionStandardItem, aiItem?: AiInspectionItemResult): InspectionItemResult {
  const confidence = normalizeConfidence(aiItem?.confidence);
  const matchedOption = findMatchedOption(item.options, aiItem?.matchedResult ?? null);
  const isRecognized = aiItem?.recognitionStatus === "recognized" && confidence >= 0.5 && Boolean(matchedOption);

  if (!isRecognized || !matchedOption) {
    return {
      standardId: item.standardId,
      standardName: item.standardName,
      itemId: item.itemId,
      itemName: item.itemName,
      status: "unrecognized",
      statusName: "未识别",
      result: null,
      problemDescription: aiItem?.problemDescription || "模型未能可靠识别该巡检项，需人工确认。",
      evidence: aiItem?.evidence || "",
      confidence,
      needManualReview: true,
    };
  }

  const result: InspectionMatchedResult = {
    id: item.resultId,
    name: item.resultName,
    itemName: matchedOption.itemName,
    itemValue: matchedOption.itemValue,
    errorFlag: matchedOption.errorFlag,
  };
  const status = matchedOption.errorFlag ? "abnormal" : "normal";

  return {
    standardId: item.standardId,
    standardName: item.standardName,
    itemId: item.itemId,
    itemName: item.itemName,
    status,
    statusName: status === "abnormal" ? "异常" : "正常",
    result,
    problemDescription: status === "abnormal" ? aiItem?.problemDescription || "识别到异常，需人工确认。" : "",
    evidence: aiItem?.evidence || "",
    confidence,
    needManualReview: status === "abnormal" || confidence < 0.8,
  };
}

function normalizeConfidence(confidence: unknown): number {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return 0;
  }
  return Math.min(1, Math.max(0, confidence));
}

function resolveGroupConfidence(items: InspectionItemResult[]): number {
  if (items.length === 0) {
    return 0;
  }
  const total = items.reduce((sum, item) => sum + item.confidence, 0);
  return Number((total / items.length).toFixed(2));
}

function mergeText(values: string[]): string {
  return values.filter((value) => value.trim()).join("\n");
}

function getItemKey(standardId: string, itemId: string): string {
  return `${standardId}::${itemId}`;
}

function groupItemsByStandard(items: InternalInspectionStandardItem[]): Map<string, InternalInspectionStandardItem[]> {
  const grouped = new Map<string, InternalInspectionStandardItem[]>();
  for (const item of items) {
    const current = grouped.get(item.standardId) ?? [];
    current.push(item);
    grouped.set(item.standardId, current);
  }
  return grouped;
}

function toNonEmptyString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
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

function mapAnalyzedStandardItem(
  sourceItem: InternalInspectionStandardItem | undefined,
  result: InspectionItemResult,
): InspectionStandardStatusResult["standardItems"][number] {
  const recognitionStatus: "recognized" | "unrecognized" = result.status === "unrecognized" ? "unrecognized" : "recognized";

  return {
    ...sourceItem?.item,
    itemId: result.itemId,
    itemName: result.itemName,
    resultVO: normalizeResultVO(sourceItem?.item.resultVO, result.result),
    result: result.result,
    recognitionStatus,
    status: result.status,
    statusName: result.statusName,
    problemDescription: result.problemDescription,
    problemDesc: result.problemDescription,
    evidence: result.evidence,
    suggestion: result.evidence,
    confidence: result.confidence,
    needManualReview: result.needManualReview,
  };
}

function normalizeResultVO(value: unknown, result: InspectionMatchedResult | null): InspectionResultVO {
  if (value && typeof value === "object") {
    return value as InspectionResultVO;
  }
  return {
    id: result?.id ?? "",
    name: result?.name ?? "",
    options: [],
  };
}
