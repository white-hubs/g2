import type {
  AddBroadcastRule,
  BroadcastPageResult,
  BroadcastPlayByCirculatePayload,
  BroadcastPlayByNumPayload,
  BroadcastPlayRecord,
  BroadcastPlayRecordPageParams,
  BroadcastPlayRulePage,
  BroadcastPlayRulePageParams,
  BroadcastTemplateOption,
  BroadcastTemplatePage,
  BroadcastTemplatePageParams,
  BroadcastTemplatePayload,
} from "./types";

/** 广播中心网关：方法名与旧 CubeBroadcastService 对齐 */
export interface BroadcastCenterGateway {
  /** 广播记录分页 */
  getBroadcastPlayRecordPage: (payload: BroadcastPlayRecordPageParams) => Promise<BroadcastPageResult<BroadcastPlayRecord>>;

  /** 广播模板分页 */
  broadcastTemplatePage: (payload: BroadcastTemplatePageParams) => Promise<BroadcastPageResult<BroadcastTemplatePage>>;

  /** 广播记录分页（旧别名方法） */
  broadcastPlayRecordPage: (payload: BroadcastPlayRecordPageParams) => Promise<BroadcastPageResult<BroadcastPlayRecord>>;

  /** 广播规则详情 */
  getBroadcastRuleInfo: (id: string) => Promise<AddBroadcastRule>;

  /** 广播规则分页 */
  broadcastPlayRulePage: (payload: BroadcastPlayRulePageParams) => Promise<BroadcastPageResult<BroadcastPlayRulePage>>;

  /** 删除广播模板 */
  deleteBroadcastTemplate: (id: string) => Promise<void>;

  /** 删除广播规则 */
  deleteBroadcastPlayRule: (id: string) => Promise<void>;

  /** 新增广播模板 */
  broadcastTemplate: (payload: BroadcastTemplatePayload) => Promise<unknown>;

  /** 新增广播规则 */
  addBroadcastRule: (payload: AddBroadcastRule) => Promise<unknown>;

  /** 编辑广播规则 */
  updateBroadcastRule: (id: string, payload: AddBroadcastRule) => Promise<unknown>;

  /** 编辑广播模板 */
  editBroadcast: (id: string, payload: BroadcastTemplatePayload) => Promise<unknown>;

  /** 更新规则启用禁用 */
  broadcastPlayRuleEnabled: (id: string, checked: boolean) => Promise<unknown>;

  /** 广播模板列表 */
  getBroadcastTemplates: (keyword?: string) => Promise<BroadcastTemplateOption[]>;

  /** 广播文本播放 */
  broadcastPlayByNum: (payload: BroadcastPlayByNumPayload) => Promise<void>;

  /** 广播文本循环播放 */
  broadcastPlayByCirculate: (payload: BroadcastPlayByCirculatePayload) => Promise<void>;
}
