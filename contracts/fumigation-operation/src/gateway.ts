import type {
  CompleteFumigationWorkPayload,
  CreateFumigationWorkPayload,
  FumigationArchiveQuery,
  FumigationArchiveRecord,
  FumigationArchiveDocument,
  FumigationApplicationMethodCode,
  FumigationCameraOption,
  FumigationDeviceOption,
  FumigationDeviceProperty,
  FumigationDispatchMapConfig,
  FumigationEnumOption,
  FumigationGrainVarietyOption,
  FumigationLinkedDevice,
  FumigationMonitorPersonnelLocation,
  FumigationPageResult,
  FumigationPesticideTypeCode,
  FumigationPrecheckResult,
  FumigationPrecheckStepId,
  FumigationRealtimeSituation,
  FumigationRealtimeSituationAlarmItem,
  FumigationRealtimeSituationDeviceItem,
  FumigationRealtimeSituationStats,
  FumigationRealtimeSituationWarehouseItem,
  FumigationRealtimeSituationWorks,
  FumigationWarehouseOption,
  FumigationWorkerOption,
  FumigationWork,
  FumigationWorkQuery,
  RunFumigationPrecheckPayload,
  SendFumigationNotificationPayload,
  SubmitFumigationApprovalPayload,
  TerminateFumigationWorkPayload,
} from "./types";

export interface FumigationOperationGateway {
  listFumigationWorks: (params: FumigationWorkQuery) => Promise<FumigationPageResult<FumigationWork>>;
  getFumigationWork: (id: string) => Promise<FumigationWork>;
  createFumigationWork: (payload: CreateFumigationWorkPayload) => Promise<FumigationWork>;
  submitFumigationApproval: (id: string, payload: SubmitFumigationApprovalPayload) => Promise<FumigationWork>;
  getFumigationPrechecks: (id: string) => Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>>;
  runFumigationPrecheck: (id: string, payload: RunFumigationPrecheckPayload) => Promise<FumigationPrecheckResult>;
  runFumigationPrechecks: (id: string) => Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>>;
  completeFumigationWork: (id: string, payload: CompleteFumigationWorkPayload) => Promise<FumigationWork>;
  terminateFumigationWork: (id: string, payload: TerminateFumigationWorkPayload) => Promise<FumigationWork>;
  sendFumigationNotification: (id: string, payload: SendFumigationNotificationPayload) => Promise<void>;
  listFumigationWarehouses: (params?: { keyword?: string; areaId?: string }) => Promise<FumigationWarehouseOption[]>;
  listFumigationGrainVarieties: (warehouseId: string) => Promise<FumigationGrainVarietyOption[]>;
  listFumigationPesticideTypes: () => Promise<FumigationEnumOption<FumigationPesticideTypeCode>[]>;
  listFumigationApplicationMethods: () => Promise<FumigationEnumOption<FumigationApplicationMethodCode>[]>;
  listFumigationDevices: (params?: {
    warehouseId?: string;
    pageNumber?: number;
    pageSize?: number;
    keyword?: string;
  }) => Promise<FumigationDeviceOption[]>;
  getFumigationDeviceMonitor: (deviceId: string) => Promise<FumigationDeviceOption>;
  getFumigationDeviceProperties: (deviceId: string, propertyCodes?: string[]) => Promise<FumigationDeviceProperty[]>;
  listFumigationLinkedDevices: (deviceId: string) => Promise<FumigationLinkedDevice[]>;
  listFumigationAssociatedVideos: (deviceId: string) => Promise<FumigationCameraOption[]>;
  listFumigationWorkers: () => Promise<FumigationWorkerOption[]>;
  listFumigationArchives: (params: FumigationArchiveQuery) => Promise<FumigationPageResult<FumigationArchiveRecord>>;
  generateFumigationArchive: (workId: string) => Promise<FumigationArchiveRecord>;
  getFumigationArchiveDocument: (archiveId: string) => Promise<FumigationArchiveDocument>;
  getFumigationRealtimeSituation: (applicationCode?: string) => Promise<FumigationRealtimeSituation>;
  getFumigationRealtimeSituationStats: () => Promise<FumigationRealtimeSituationStats>;
  getFumigationRealtimeSituationWorks: () => Promise<FumigationRealtimeSituationWorks>;
  listFumigationRealtimeSituationWarehouses: () => Promise<FumigationRealtimeSituationWarehouseItem[]>;
  listFumigationRealtimeSituationDevices: () => Promise<FumigationRealtimeSituationDeviceItem[]>;
  listFumigationRealtimeSituationAlarms: (applicationCode?: string) => Promise<FumigationRealtimeSituationAlarmItem[]>;
  getFumigationDispatchMapConfig: () => Promise<FumigationDispatchMapConfig | null>;
  listFumigationMonitorPersonnelLocations: (userIds: string[]) => Promise<FumigationMonitorPersonnelLocation[]>;
}
