import type { Paging } from "@g2-contract/base";
import type {
  ListDeviceGroupParams,
  ListDeviceInstanceOfRuleConditionParams,
  ListDeviceInstancesParams,
  QueryDeviceIdsByAreaOrGroupAndTagParams,
} from "@g2-contract/device-center";

import type {
  CameraAiInspectionActionStatus,
  CameraAiInspectionActionType,
  CameraAiInspectionCycleType,
  CameraAiInspectionExecutionMode,
  CameraAiInspectionTaskStatus,
  DeviceAuthScopeType,
  DeviceAuthGrantTargetType,
} from "./enums";

export interface DeviceAuthScope {
  scopeType: DeviceAuthScopeType;
  scopeName: string;
  scopeId: string;
}

export interface DeviceAuthGrantTarget {
  targetType: DeviceAuthGrantTargetType;
  targetIds: string[];
}

export interface AuthGroupModifyParam {
  authScopes: DeviceAuthScope[];
  grantTargets: DeviceAuthGrantTarget[];
}

export interface ListDeviceAuthParams extends Partial<Paging> {
  keyword?: string;
}

export type ListVideoMonitorGroupParams = Omit<ListDeviceGroupParams, "tagCode">;

export type ListVideoMonitorDeviceOfRuleParams = Omit<ListDeviceInstanceOfRuleConditionParams, "ruleGroup">;

export type ListVideoMonitorDeviceParams = ListDeviceInstancesParams;

export type QueryVideoMonitorDeviceIdsByAreaOrGroupAndTagParams = Omit<QueryDeviceIdsByAreaOrGroupAndTagParams, "tagCode">;

export interface QueryPeriod {
  begin?: string;
  end?: string;
}

export interface ListAiInspectionCameraOptionsParams extends Partial<Paging> {
  keyword?: string;
  filterAreaIds?: string[];
  groupIds?: string[];
  deviceIds?: string[];
  anyMatchedAreaId?: string;
}

export interface GetAiInspectionCameraOptionsByIdsParams {
  deviceIds: string[];
}

export interface CameraAiInspectionPlanCameraParam {
  deviceId: string;
  algorithmId: string;
  sort?: number;
}

export interface CameraAiInspectionWorkOrderFieldParam {
  fieldKey: string;
  fieldName: string;
  fieldValue: string;
  fieldType?: string;
  sort?: number;
}

export interface CameraAiInspectionActionRuleParam {
  deviceId: string;
  enabled?: boolean;
  actionType?: CameraAiInspectionActionType;
  confidenceThreshold?: number;
  emergencyRuleId?: string;
  workOrderTemplateId?: string;
  workOrderFields?: CameraAiInspectionWorkOrderFieldParam[];
}

export interface CameraAiInspectionPlanModifyParam {
  name: string;
  principalUserId: string;
  executionMode: CameraAiInspectionExecutionMode;
  cycleType?: CameraAiInspectionCycleType;
  cycleValues?: string;
  executeTime?: string;
  startTime?: string;
  endTime?: string;
  enabled?: boolean;
  immediateExecute?: boolean;
  taskLimitMinutes?: number;
  remark?: string;
  cameras: CameraAiInspectionPlanCameraParam[];
  actionRules?: CameraAiInspectionActionRuleParam[];
}

export interface CameraAiInspectionPlanBasePatchParam {
  name: string;
  principalUserId: string;
  executionMode: CameraAiInspectionExecutionMode;
  cycleType?: CameraAiInspectionCycleType;
  cycleValues?: string;
  executeTime?: string;
  startTime?: string;
  endTime?: string;
  enabled?: boolean;
  taskLimitMinutes?: number;
  remark?: string;
}

export interface CameraAiInspectionPlanCameraAddParam {
  deviceId: string;
  algorithmId: string;
  sort?: number;
}

export interface CameraAiInspectionPlanCameraUpdateParam {
  id: string;
  algorithmId: string;
  sort?: number;
}

export interface CameraAiInspectionPlanCameraChangesParam {
  add?: CameraAiInspectionPlanCameraAddParam[];
  update?: CameraAiInspectionPlanCameraUpdateParam[];
  removeIds?: string[];
}

export interface CameraAiInspectionActionRuleUpsertParam {
  deviceId: string;
  actionType: CameraAiInspectionActionType;
  confidenceThreshold?: number;
  emergencyRuleId?: string;
  workOrderTemplateId?: string;
}

export interface CameraAiInspectionActionRuleChangesParam {
  upsert?: CameraAiInspectionActionRuleUpsertParam[];
  removeDeviceIds?: string[];
}

export interface CameraAiInspectionPlanPatchParam {
  base: CameraAiInspectionPlanBasePatchParam;
  cameraChanges?: CameraAiInspectionPlanCameraChangesParam;
  actionRuleChanges?: CameraAiInspectionActionRuleChangesParam;
  version?: string;
}

export interface PageAiInspectionPlanCamerasParams extends Partial<Paging> {}

export interface ListAiInspectionPlanActionRulesParams {
  deviceIds: string[];
}

export interface ListAiInspectionPlansParams extends Partial<Paging> {
  keyword?: string;
  enabled?: boolean;
  principalUserId?: string;
}

export interface ListAiInspectionTasksParams extends Partial<Paging> {
  planId?: string;
  keyword?: string;
  status?: CameraAiInspectionTaskStatus;
  period?: string;
}

export interface ListAiInspectionEventsParams extends Partial<Paging> {
  taskId?: string;
  planId?: string;
  deviceId?: string;
  actionStatus?: CameraAiInspectionActionStatus;
  ignored?: boolean;
  period?: QueryPeriod;
}

export interface IgnoreAiInspectionEventParam {
  reason?: string;
}

export interface GenerateAiInspectionEventActionParam {
  actionType: CameraAiInspectionActionType;
  emergencyRuleId?: string;
  workOrderTemplateId?: string;
  workOrderFields?: CameraAiInspectionWorkOrderFieldParam[];
}

export interface ListAiInspectionEmergencyRulesParams extends Partial<Paging> {
  applicationCode?: string;
  keyword?: string;
  alarmLevelId?: string;
}

export interface ListAiInspectionWorkOrderTemplatesParams extends Partial<Paging> {
  keyword?: string;
  status?: string;
  application?: string;
}
