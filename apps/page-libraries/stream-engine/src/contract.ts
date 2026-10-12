import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";

export { contractInfo, type StreamEngineContractInfo } from "./contract-info";

export type StreamEnginePageProps = {
  title?: string;
  applicationCode?: string;
  /** 渲染端 query：add | detail */
  type?: string;
  businessType?: string;
  /** 关联业务记录，例如督办反馈的原事项 ID。 */
  businessKey?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  status?: string;
  notOperates?: string | boolean;
  appName?: string;
  /** 设计器：表单 id */
  formId?: string;
  formType?: "FORM" | "FLOW" | "FLOW_FORM" | "CUSTOM_FORM";
  isCopy?: boolean;
  groupId?: string | number;
  returnUrl?: string;
  getClient: () => Promise<StreamEngineClient>;
  /** 附件上传（FileUpload 控件） */
  getFileClient?: () => Promise<FileClient>;
  /** 人员选择（UserPicker 控件） */
  getOuaaClient?: () => Promise<OuaaClient>;
  /** 审批字段接口前缀：默认 /api/attendance；投诉/故障等由宿主覆盖 */
  approvalApiPrefix?: string;
  onNavigate?: (payload: { page: string; query?: Record<string, string | undefined> }) => void;
  onClose?: () => void;
};

export const STREAM_ENGINE_PAGE_KEYS = {
  FlowformList: "FlowformList",
  FormProcessDesign: "FormProcessDesign",
  WorkOrderDesign: "WorkOrderDesign",
  StreamEngineRender: "StreamEngineRender",
  ApprovalConfig: "ApprovalConfig",
} as const;
