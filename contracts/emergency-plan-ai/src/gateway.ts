import type { EmergencyPlanTaskDecomposeRequest } from "./request";
import type { EmergencyPlanTaskDecomposeResponse } from "./response";

export interface EmergencyPlanAiGateway {
  decomposeTasks: (params: EmergencyPlanTaskDecomposeRequest) => Promise<EmergencyPlanTaskDecomposeResponse>;
}
