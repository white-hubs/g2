import type { Pagination } from "@g2-contract/base";
import type { DeviceGroup, DeviceInstance } from "@g2-contract/device-center";

import type {
  AiInspectionEmergencyRule,
  AiInspectionWorkOrderTemplate,
  CameraAiInspectionAlgorithm,
  CameraAiInspectionEvent,
  CameraAiInspectionActionRule,
  CameraAiInspectionPlanBase,
  CameraAiInspectionPlanCamera,
  CameraAiInspectionPlan,
  CameraAiInspectionPlanModifyParam,
  CameraAiInspectionPlanPatchParam,
  CameraAiInspectionTask,
  DeviceAuth,
  GenerateAiInspectionEventActionParam,
  GetAiInspectionCameraOptionsByIdsParams,
  IgnoreAiInspectionEventParam,
  ListAiInspectionPlanActionRulesParams,
  ListAiInspectionCameraOptionsParams,
  ListAiInspectionEmergencyRulesParams,
  ListAiInspectionEventsParams,
  PageAiInspectionPlanCamerasParams,
  ListAiInspectionPlansParams,
  ListAiInspectionTasksParams,
  ListAiInspectionWorkOrderTemplatesParams,
  VideoMonitorDeviceOption,
  AuthGroupModifyParam,
  ListDeviceAuthParams,
  ListVideoMonitorDeviceOfRuleParams,
  ListVideoMonitorDeviceParams,
  ListVideoMonitorGroupParams,
  QueryVideoMonitorDeviceIdsByAreaOrGroupAndTagParams,
} from "./main";

export interface VideoMonitorAuthGateway {
  createAuthGroup: (params: AuthGroupModifyParam) => Promise<string>;
  updateAuthGroup: (id: string, params: AuthGroupModifyParam) => Promise<void>;
  deleteAuthGroup: (id: string) => Promise<void>;
  getAuthGroup: (id: string) => Promise<DeviceAuth>;
  listAuthGroup: (params: ListDeviceAuthParams) => Promise<Pagination<DeviceAuth>>;
}

export interface VideoMonitorGroupGateway {
  listVideoMonitorGroup: (params: ListVideoMonitorGroupParams) => Promise<Pagination<DeviceGroup>>;
}

export interface VideoMonitorDeviceGateway {
  listVideoMonitorDeviceOfRule: (params: ListVideoMonitorDeviceOfRuleParams) => Promise<Pagination<DeviceInstance>>;
  listVideoMonitorDevice: (params: ListVideoMonitorDeviceParams) => Promise<Pagination<DeviceInstance>>;
  queryVideoMonitorDeviceByAreaOrGroupAndTag: (params: QueryVideoMonitorDeviceIdsByAreaOrGroupAndTagParams) => Promise<DeviceInstance[]>;
  listAiInspectionCameraOptions: (params: ListAiInspectionCameraOptionsParams) => Promise<Pagination<VideoMonitorDeviceOption>>;
  getAiInspectionCameraOptionsByIds: (params: GetAiInspectionCameraOptionsByIdsParams) => Promise<VideoMonitorDeviceOption[]>;
}

export interface VideoMonitorAiInspectionGateway {
  listAiInspectionAlgorithms: () => Promise<CameraAiInspectionAlgorithm[]>;
  listAiInspectionPlans: (params: ListAiInspectionPlansParams) => Promise<Pagination<CameraAiInspectionPlan>>;
  getAiInspectionPlan: (id: string) => Promise<CameraAiInspectionPlanBase>;
  pageAiInspectionPlanCameras: (id: string, params: PageAiInspectionPlanCamerasParams) => Promise<Pagination<CameraAiInspectionPlanCamera>>;
  listAiInspectionPlanActionRules: (id: string, params: ListAiInspectionPlanActionRulesParams) => Promise<CameraAiInspectionActionRule[]>;
  createAiInspectionPlan: (params: CameraAiInspectionPlanModifyParam) => Promise<string>;
  patchAiInspectionPlan: (id: string, params: CameraAiInspectionPlanPatchParam) => Promise<void>;
  updateAiInspectionPlanEnabled: (id: string, enabled: boolean) => Promise<void>;
  deleteAiInspectionPlan: (id: string) => Promise<void>;
  runAiInspectionPlanOnce: (id: string) => Promise<string>;
  listAiInspectionTasks: (params: ListAiInspectionTasksParams) => Promise<Pagination<CameraAiInspectionTask>>;
  getAiInspectionTask: (id: string) => Promise<CameraAiInspectionTask>;
  listAiInspectionEvents: (params: ListAiInspectionEventsParams) => Promise<Pagination<CameraAiInspectionEvent>>;
  getAiInspectionEvent: (id: string) => Promise<CameraAiInspectionEvent>;
  ignoreAiInspectionEvent: (id: string, params: IgnoreAiInspectionEventParam) => Promise<void>;
  generateAiInspectionEventAction: (id: string, params: GenerateAiInspectionEventActionParam) => Promise<void>;
  listAiInspectionEmergencyRules: (params: ListAiInspectionEmergencyRulesParams) => Promise<Pagination<AiInspectionEmergencyRule>>;
  listAiInspectionWorkOrderTemplates: (
    params: ListAiInspectionWorkOrderTemplatesParams,
  ) => Promise<Pagination<AiInspectionWorkOrderTemplate>>;
  getAiInspectionWorkOrderTemplate: (id: string) => Promise<AiInspectionWorkOrderTemplate>;
}
