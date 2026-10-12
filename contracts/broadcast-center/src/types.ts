/** 广播播放记录 */
export interface BroadcastPlayRecord {
  /** 广播内容，变量替换后的内容 */
  broadcastPlayContent: string;
  /** 广播终端，多个设备以逗号分隔 */
  broadcastPlayDevices: string;
  /** 广播次数 */
  broadcastPlayNum: string;
  /** 广播模板原内容 */
  broadcastTemplateContent: string;
  /** 广播模板参数 */
  broadcastTemplateContentParam: string;
  /** 广播模板名称 */
  broadcastTemplateName: string;
  /** 广播时间 */
  broadcastTime: string;
  id: string;
  /** 操作人部门名称 */
  operatorByDeptName: string;
  /** 操作人名称 */
  operatorByName: string;
}

export interface BroadcastTemplateFileVO {
  path: string;
  name: string;
  id: string;
}

/** 广播模板分页行 */
export interface BroadcastTemplatePage {
  id: string;
  name: string;
  content: string;
  contentType: string;
  defaulted: boolean;
  updateBy: string;
  updateByName: string;
  updateTime: number | string;
  fileVOList?: BroadcastTemplateFileVO[];
}

/** 广播规则分页行 */
export interface BroadcastPlayRulePage {
  id: string;
  name: string;
  enabled: boolean;
  remark: string;
  defaulted?: boolean;
}

export interface Device {
  areaId?: string;
  areaName?: string;
  /** 所属区域序列号 */
  deviceAreaId?: string;
  /** 区域名称 */
  deviceAreaName?: string;
  /** 设备主键 */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
  /** 产品品类编号 */
  deviceProdCategoryCode: string;
  /** 产品品类编号序列号 */
  deviceProdCategoryCodeConcat: string;
  /** 产品品类名称 */
  deviceProdCategoryName: string;
  /** 设备产品主键 */
  deviceProdId: string;
  /** 设备产品名称 */
  deviceProdName: string;
}

export interface Template {
  /** 模板内容 */
  templateContent: string;
  /** 模板主键 */
  templateId: string;
  /** 模板名称 */
  templateName: string;
}

export interface AddBroadcastRule {
  devices: Device[];
  enabled: boolean;
  name: string;
  remark?: string;
  templates: Template[];
}

/** 分页结果（对齐旧服务 records/total/pages） */
export interface BroadcastPageResult<T> {
  records: T[];
  total: number;
  pages?: number;
}

export interface BroadcastPlayRecordPageParams {
  pageSize: number;
  pageNumber: number;
  keyword?: string;
  templateId?: string;
}

export interface BroadcastTemplatePageParams {
  pageSize: number;
  pageNumber: number;
  keyword?: string;
  contentType?: string;
}

export interface BroadcastPlayRulePageParams {
  pageSize: number;
  pageNumber: number;
  keyword?: string;
}

export interface BroadcastTemplatePayload {
  content: string;
  name: string;
  contentType?: string;
  code?: string;
  audioContent?: string;
  audioContentId?: string;
}

export interface BroadcastTemplateOption {
  id: string;
  name: string;
  content: string;
  defaulted: string;
}

export interface BroadcastPlayDevice {
  id: string;
  code: string;
  name: string;
  thirdPartyCode: string;
}

export interface BroadcastTemplateContentParam {
  name: string;
  value: string;
}

export interface BroadcastPlayByNumPayload {
  /** 播放终端设备，为空时默认为所有设备 */
  broadcastPlayDevices?: BroadcastPlayDevice[];
  /** 播放次数 */
  broadcastPlayNum: number;
  /** 广播模板参数（旧字段名保留） */
  broadcastTemplateCidontentParam: BroadcastTemplateContentParam[];
  /** 模板主键 */
  id: string;
}

export interface BroadcastPlayByCirculatePayload {
  broadcastPlayDevices?: BroadcastPlayDevice[];
  startTime: string;
  endTime: string;
  broadcastTemplateCidontentParam: BroadcastTemplateContentParam[];
  id: string;
}

/** 设备选择器最小字段（对齐安防设备分页行） */
export interface SecurityDeviceRecord {
  id?: string;
  deviceId: string;
  deviceName?: string;
  code?: string;
  deviceProdCategoryCode?: string;
  deviceProdCategoryCodeConcat?: string;
  deviceProdCategoryName?: string;
  deviceProdId?: string;
  deviceProdName?: string;
  brandName?: string;
  areaId?: string;
  areaName?: string;
}
