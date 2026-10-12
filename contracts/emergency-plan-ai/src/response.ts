export type EmergencyPlanTaskSourceType = "TEMPLATE" | "AI" | "MANUAL";
export type EmergencyPlanTaskExecutorType = "DEPARTMENT" | "ROLE" | "POST" | "PERSON";

export interface EmergencyPlanSemanticSignals {
  summary: string;
  scenes: string[];
  keywords: string[];
  taskIntents: string[];
  eventTypeHints: string[];
}

export interface EmergencyPlanMatchedTemplate {
  templateId: string;
  templateName: string;
  score: number;
  matchedReasons: string[];
  matchingKeywords: string[];
  applicableScenes: string[];
  standardSteps: string[];
  standardEquipment: string[];
}

export interface EmergencyPlanTaskExecutorDraft {
  clientKey?: string;
  executorType: EmergencyPlanTaskExecutorType;
  executorId: string;
}

export interface EmergencyPlanTaskDraft {
  clientKey: string;
  name: string;
  sortNo: number;
  durationMinutes: number | null;
  executionContents: string[];
  equipment: string[];
  locationDesc: string;
  longitude?: number | null;
  latitude?: number | null;
  remark: string;
  sourceType: EmergencyPlanTaskSourceType;
  sourceTemplateId: string | null;
  templateName: string | null;
  templateConfidence: number | null;
  templateReason: string | null;
  executors: EmergencyPlanTaskExecutorDraft[];
}

export interface EmergencyPlanTaskDecomposeResponse {
  traceId: string;
  sourceDigest: string;
  signals: EmergencyPlanSemanticSignals;
  matchedTemplates: EmergencyPlanMatchedTemplate[];
  tasks: EmergencyPlanTaskDraft[];
  warnings: string[];
}

export interface EmergencyPlanAiApiError {
  code: string;
  message: string;
  traceId?: string;
}
