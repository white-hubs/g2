export interface WorkPermitPageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface WorkPermitLevelQuery {
  typeName?: string;
}

export interface WorkPermitTypeQuery {
  pageNumber?: number;
  pageSize?: number;
  typeName?: string;
  workPermitLevel?: string;
}

export interface WorkPermitAssociatedItem {
  id?: string;
  itemName: string;
  aiRecognitionEnabled?: boolean;
  sortNo?: number;
}

export interface WorkPermitTypePayload {
  typeName: string;
  workPermitLevel: string;
  levelDefinition: string;
  permitValidHours: number;
  riskCheckItems: WorkPermitAssociatedItem[];
  acceptanceItems: WorkPermitAssociatedItem[];
}

export interface WorkPermitTypePageVO {
  id: string;
  typeName: string;
  workPermitLevel: string;
  levelDefinition: string;
  riskCheckCount: number;
  acceptanceCount: number;
  permitValidHours: number;
}

export interface WorkPermitTypeDetailVO extends WorkPermitTypePageVO {
  riskCheckItems: WorkPermitAssociatedItem[];
  acceptanceItems: WorkPermitAssociatedItem[];
}

export type WorkPermitAssociatedItemConfirmResult = "NORMAL" | "ABNORMAL";

export type WorkPermitAssociatedItemRecognitionStatus = "recognized" | "unrecognized";

export interface WorkPermitAssociatedItemAiRecognitionRequest {
  /** 检查项/验收项内容。 */
  itemContent: string;
  /** 图片文件 ID 集合。 */
  fileIds: string[];
}

export interface WorkPermitAssociatedItemAiRecognitionResponse {
  confirmResult?: WorkPermitAssociatedItemConfirmResult;
  description?: string;
  recognitionStatus: WorkPermitAssociatedItemRecognitionStatus;
  confidence?: number;
  needManualReview: boolean;
  raw?: unknown;
}
