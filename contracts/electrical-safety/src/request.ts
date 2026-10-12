import type { Paging } from "@g2-contract/base";

import type { DeviceKind, LongId } from "./enums";

export interface ListFacilitiesParams extends Partial<Paging> {
  keyword?: string;
}

export interface FacilityModifyRequest {
  facilityName: string;
  areaId: LongId;
  floorArea?: number | null;
  fireRatingCode: string;
  fireResistanceLevelCode?: string | null;
  responsibleId?: LongId | null;
  remark?: string | null;
}

export interface FacilityDeviceAssociateRequest {
  deviceKind: DeviceKind;
  deviceIds: LongId[];
}

export interface DeviceConfigSaveRequest {
  deviceType?: string;
  config: Record<string, unknown>;
}

export interface ListMonitoringFacilitiesParams extends Partial<Paging> {
  keyword?: string;
}
export interface ListMonitoringDevicesParams {
  keyword?: string;
  productCode?: string;
  onlineStatus?: "ONLINE" | "OFFLINE";
}
export interface DeviceMethodInvokeRequest {
  inputParams: Record<string, unknown>;
}
export interface DevicePropertyControlRequest {
  propValue: string;
}
export interface DeviceCardConfigSaveRequest {
  items: { propertyCode: string; rangeRule: ProductPropertyRangeRule }[];
}
export interface MonitorPanelConfigSaveRequest {
  items: { deviceId: LongId; propertyCode: string }[];
}
export interface ElectricalCenterScadaBindingSaveRequest {
  /** 前端序列化后的电气中心与二维组态关系，后端仅按字符串存储。 */
  content: string;
}
export interface FacilityScadaBindingSaveRequest {
  /** 前端序列化后的设施房与二维组态关系，后端仅按字符串存储。 */
  content: string;
}
export type ProductPropertyRangeRuleType = "BETWEEN" | "GT" | "GTE" | "LT" | "LTE" | "EQ";
export interface ProductPropertyRangeRule {
  type: ProductPropertyRangeRuleType;
  lower?: number | null;
  upper?: number | null;
  lowerInclusive?: boolean | null;
  upperInclusive?: boolean | null;
  value?: number | null;
}
export interface EnvironmentParameterMappingSaveItem {
  propertyCode: string;
  parameterTypeCode: string;
}

export interface EnvironmentDeviceParameterConfigSaveRequest {
  items: EnvironmentParameterMappingSaveItem[];
}

export interface ListRemoteInspectionTemplatesParams extends Partial<Paging> {
  keyword?: string;
  facilityId?: LongId;
  enabled?: boolean;
}

export type RemoteInspectionColumnType = "REMOTE_PARAMETER" | "DATE_TIME" | "MANUAL_CONTENT";

export interface RemoteInspectionTemplateColumnRequest {
  columnType: RemoteInspectionColumnType;
  firstHeader: string;
  secondHeader?: string;
  propertyCode?: string;
  propertyName?: string;
  unit?: string;
  productCategoryCode?: string;
  productCategoryName?: string;
  productId?: string;
  productName?: string;
  sort: number;
}

export interface RemoteInspectionTemplateSaveRequest {
  templateName: string;
  facilityId: LongId;
  frequencyHours: number;
  showRealtimeData?: boolean;
  enabled?: boolean;
  remark?: string;
  columns: RemoteInspectionTemplateColumnRequest[];
}

export interface RemoteInspectionTemplateEnabledRequest {
  enabled: boolean;
}

export interface RemoteInspectionDataParams extends Partial<Paging> {
  startTime?: string;
  endTime?: string;
}
