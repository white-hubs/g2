import type { InspectionAnalyzeRequest, InspectionResultOptionVO, InspectionResultVO } from "./request";

export type InspectionStatus = "normal" | "abnormal" | "unrecognized";

export type InspectionStatusName = "正常" | "异常" | "未识别";

export type InspectionOverallResult = "normal" | "abnormal" | "partial" | "unrecognized";

export type InspectionRecognitionStatus = "recognized" | "unrecognized";

export interface InspectionSummary {
  totalCount: number;
  normalCount: number;
  abnormalCount: number;
  unrecognizedCount: number;
  overallResult: InspectionOverallResult;
}

export interface InspectionMatchedResult extends InspectionResultOptionVO {
  id: string;
  name: string;
}

export interface InspectionItemResult {
  standardId: string;
  standardName: string;
  itemId: string;
  itemName: string;
  status: InspectionStatus;
  statusName: InspectionStatusName;
  result: InspectionMatchedResult | null;
  problemDescription: string;
  evidence: string;
  confidence: number;
  needManualReview: boolean;
}

export interface InspectionStandardStatusResult {
  standardId: string;
  standardName: string;
  standardItems: InspectionAnalyzedStandardItemVO[];
  problemDescription: string;
  evidence: string;
  confidence: number;
  needManualReview: boolean;
}

export interface InspectionAnalyzedStandardItemVO {
  itemId: string;
  itemName: string;
  resultVO: InspectionResultVO;
  result: InspectionMatchedResult | null;
  /** AI 识别状态（flow 原始字段） */
  recognitionStatus?: InspectionRecognitionStatus;
  /** 归一化后的巡检项状态 */
  status?: InspectionStatus;
  statusName?: InspectionStatusName;
  /** 未识别/异常原因说明（flow 字段 problemDescription） */
  problemDescription?: string;
  /** 识别依据或处置建议（flow 字段 evidence） */
  evidence?: string;
  confidence?: number;
  needManualReview?: boolean;
  [key: string]: unknown;
}

export interface InspectionAnalyzeResponseData {
  targetName: string;
  images: string[];
  safetyTips: string[];
  totalCount: number;
  normalCount: number;
  abnormalCount: number;
  unrecognizedCount: number;
  normalItems: InspectionStandardStatusResult[];
  abnormalItems: InspectionStandardStatusResult[];
  unrecognizedItems: InspectionStandardStatusResult[];
}

export interface InspectionApiError {
  code: string;
  message: string;
}

export interface AiInspectionAnalyzeResult {
  targetName: string;
  imageAnalysisSummary?: string;
  items: AiInspectionItemResult[];
}

export interface AiInspectionItemResult {
  standardId: string;
  itemId: string;
  recognitionStatus: InspectionRecognitionStatus;
  matchedResult: InspectionResultOptionVO | null;
  problemDescription: string;
  evidence: string;
  confidence: number;
}

export type InspectionAnalyzeGatewayResponse = InspectionAnalyzeResponseData;

export type InspectionAnalyzeGatewayRequest = InspectionAnalyzeRequest;
