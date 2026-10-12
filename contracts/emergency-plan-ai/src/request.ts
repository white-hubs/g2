export type EmergencyPlanSourceType = "RICH_TEXT" | "FILE";

export interface EmergencyPlanContext {
  name: string;
  levelCode?: string | null;
  fileTypeName?: string | null;
  emergencyEventTypeCode?: string | null;
  emergencyEventTypeName?: string | null;
}

export interface EmergencyPlanTaskDecomposeRequest {
  sourceType: EmergencyPlanSourceType;
  contentHtml?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  planContext: EmergencyPlanContext;
}
