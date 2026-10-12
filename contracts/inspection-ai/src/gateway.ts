import type { InspectionAnalyzeRequest } from "./request";
import type { InspectionAnalyzeResponseData } from "./response";

export interface InspectionAiGateway {
  analyzeInspectionImage: (params: InspectionAnalyzeRequest) => Promise<InspectionAnalyzeResponseData>;
}
