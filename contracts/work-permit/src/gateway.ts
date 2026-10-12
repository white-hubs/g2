import type {
  WorkPermitPageResult,
  WorkPermitAssociatedItemAiRecognitionRequest,
  WorkPermitAssociatedItemAiRecognitionResponse,
  WorkPermitTypeDetailVO,
  WorkPermitTypePayload,
  WorkPermitTypePageVO,
  WorkPermitLevelQuery,
  WorkPermitTypeQuery,
} from "./types";

export interface WorkPermitGateway {
  listWorkPermitTypes: (params: WorkPermitTypeQuery) => Promise<WorkPermitPageResult<WorkPermitTypePageVO>>;
  getWorkPermitTypeDetail: (id: string) => Promise<WorkPermitTypeDetailVO>;
  createWorkPermitType: (payload: WorkPermitTypePayload) => Promise<string>;
  updateWorkPermitType: (id: string, payload: WorkPermitTypePayload) => Promise<void>;
  deleteWorkPermitType: (id: string) => Promise<void>;
  listWorkPermitLevels: (params?: WorkPermitLevelQuery) => Promise<string[]>;
  exportWorkPermitTypes: (params: Omit<WorkPermitTypeQuery, "pageNumber" | "pageSize">) => Promise<Blob>;
  recognizeWorkPermitAssociatedItemByAi: (
    payload: WorkPermitAssociatedItemAiRecognitionRequest,
  ) => Promise<WorkPermitAssociatedItemAiRecognitionResponse>;
}
