import type { Pagination } from "@g2-contract/base";

import type {
  CreateFireDeviceParams,
  ListFireDeviceParams,
  UpdateFireDeviceParams,
  ListFireHostParams,
  CreateFireHostParams,
  UpdateFireHostParams,
  ListFirePointParams,
  CreateFirePointParams,
  UpdateFirePointParams,
  ListOperationLogParams,
  SaveFireManageDeviceParams,
  FireDeviceCommandParam,
  ListEventParams,
  FireEntityId,
  FirePointConfigParam,
  ListFirePointEventParams,
  ListFirePointLocalEventParams,
  ListFireHostMethodParams,
  SaveFireHostButtonsParam,
  UpdateFireHostButtonsParam,
  ListFireHostMonitorDeviceParams,
  SaveFireHostMonitorDevicesParam,
  ListFireHostOverviewParams,
  ListFireHostAlarmRecordsParams,
  FireHostControlCommandParam,
  ListFireControlPointParams,
  FirePointControlCommandParam,
  FirePointControlConfigParam,
  FireHostIndicatorLightConfigParam,
  FireUtilityMonitorType,
  ListFireUtilityDeviceCandidatesParams,
  SaveFireUtilityDevicesParam,
  UpdateFireUtilityRangeParam,
  SaveFireUtilityPanelParam,
  ListFirePointEventStatisticsParams,
} from "./request";
import type {
  FireDeviceRecord,
  FireHostRecord,
  FirePointRecord,
  OperationLogRecord,
  WaterSensorRecord,
  EventRecord,
  FirePointLocalEventRecord,
  FireProductMethodRecord,
  FireHostButtonConfigRecord,
  FireHostMonitorDeviceRecord,
  FireHostOverviewRecord,
  FireHostAlarmRecord,
  FirePointControlDeviceRecord,
  FireHostCommandRecord,
  FireHostCommandStatusRecord,
  FirePointControlCommandRecord,
  FirePointControlPropertyRecord,
  FireHostIndicatorLightConfigRecord,
  FireOperationLogRecord,
  FireUtilityMonitorCardRecord,
  FireUtilityDeviceCandidateRecord,
  FireUtilityPropertyRecord,
  FireUtilityPanelRecord,
  FirePointEventStatisticsRecord,
} from "./response";

export interface FireManagementGateway {
  // Fire Device (from test page)
  listFireDevices: (params: ListFireDeviceParams) => Promise<Pagination<FireDeviceRecord>>;
  getFireDeviceDetail: (id: string) => Promise<FireDeviceRecord | null>;
  createFireDevice: (params: CreateFireDeviceParams) => Promise<FireDeviceRecord>;
  updateFireDevice: (params: UpdateFireDeviceParams) => Promise<FireDeviceRecord>;
  deleteFireDevice: (id: string) => Promise<void>;

  // Fire Host
  listFireHosts: (params: ListFireHostParams) => Promise<Pagination<FireHostRecord>>;
  getFireHostDetail: (id: string) => Promise<FireHostRecord | null>;
  createFireHost: (params: CreateFireHostParams) => Promise<FireHostRecord>;
  updateFireHost: (params: UpdateFireHostParams) => Promise<FireHostRecord>;
  deleteFireHost: (id: string) => Promise<void>;

  // Fire Point
  listFirePoints: (params: ListFirePointParams) => Promise<Pagination<FirePointRecord>>;
  getFirePointDetail: (id: string) => Promise<FirePointRecord | null>;
  createFirePoint: (params: CreateFirePointParams) => Promise<FirePointRecord>;
  updateFirePoint: (params: UpdateFirePointParams) => Promise<FirePointRecord>;
  deleteFirePoint: (id: string) => Promise<void>;
  listFirePointEvents: (params: ListFirePointEventParams) => Promise<Pagination<EventRecord>>;
  getFirePointEventOptions: () => Promise<Record<string, string>>;
  listFirePointLocalEvents: (params: ListFirePointLocalEventParams) => Promise<Pagination<FirePointLocalEventRecord>>;
  batchFillFirePointEmptyFields: (file: File) => Promise<unknown>;
  configFirePointDevices: (params: FirePointConfigParam[]) => Promise<void>;
  downloadFirePointImportTemplate: () => Promise<Blob>;

  // Fire Host Button
  listFireHostMethods: (hostId: FireEntityId, params?: ListFireHostMethodParams) => Promise<FireProductMethodRecord[]>;
  listFireHostButtons: (hostId: FireEntityId) => Promise<FireHostButtonConfigRecord[]>;
  saveFireHostButtons: (hostId: FireEntityId, params: SaveFireHostButtonsParam) => Promise<void>;
  updateFireHostButtons: (hostId: FireEntityId, params: UpdateFireHostButtonsParam) => Promise<void>;
  removeFireHostButton: (hostId: FireEntityId, buttonId: FireEntityId) => Promise<void>;

  // Fire Host Monitor Device
  listFireHostMonitorDevices: (
    hostId: FireEntityId,
    params: ListFireHostMonitorDeviceParams,
  ) => Promise<Pagination<FireHostMonitorDeviceRecord>>;
  listFireHostMonitorDeviceCandidates: (
    hostId: FireEntityId,
    params: ListFireHostMonitorDeviceParams,
  ) => Promise<Pagination<FireHostMonitorDeviceRecord>>;
  saveFireHostMonitorDevices: (hostId: FireEntityId, params: SaveFireHostMonitorDevicesParam) => Promise<void>;
  removeFireHostMonitorDevice: (hostId: FireEntityId, monitorDeviceId: FireEntityId) => Promise<void>;

  // Fire Host Remote Control
  listFireHostOverviews: (params: ListFireHostOverviewParams) => Promise<Pagination<FireHostOverviewRecord>>;
  listFireHostAlarmRecords: (params: ListFireHostAlarmRecordsParams) => Promise<Pagination<FireHostAlarmRecord>>;
  sendFireHostControlCommand: (hostId: FireEntityId, params: FireHostControlCommandParam) => Promise<FireHostCommandRecord>;
  getFireHostControlCommandStatus: (hostId: FireEntityId, commandHandle: string) => Promise<FireHostCommandStatusRecord>;
  listFireControlPoints: (hostId: FireEntityId, params: ListFireControlPointParams) => Promise<Pagination<FirePointControlDeviceRecord>>;
  sendFirePointControlCommand: (
    hostId: FireEntityId,
    pointId: FireEntityId,
    params: FirePointControlCommandParam,
  ) => Promise<FirePointControlCommandRecord>;
  getFirePointControlCommandStatus: (
    hostId: FireEntityId,
    pointId: FireEntityId,
    commandHandle: string,
  ) => Promise<FirePointControlCommandRecord>;
  listFirePointControlPropertyOptions: (hostId: FireEntityId, pointId: FireEntityId) => Promise<FirePointControlPropertyRecord[]>;
  saveFirePointControlConfig: (hostId: FireEntityId, pointId: FireEntityId, params: FirePointControlConfigParam) => Promise<void>;
  getFireHostIndicatorLightConfig: (hostId: FireEntityId) => Promise<FireHostIndicatorLightConfigRecord>;
  saveFireHostIndicatorLightConfig: (hostId: FireEntityId, params: FireHostIndicatorLightConfigParam) => Promise<void>;

  listFireUtilityMonitorCards: (hostId: FireEntityId, monitorType: FireUtilityMonitorType) => Promise<FireUtilityMonitorCardRecord[]>;
  listFireUtilityDeviceCandidates: (
    hostId: FireEntityId,
    monitorType: FireUtilityMonitorType,
    params: ListFireUtilityDeviceCandidatesParams,
  ) => Promise<Pagination<FireUtilityDeviceCandidateRecord>>;
  saveFireUtilityDevices: (hostId: FireEntityId, monitorType: FireUtilityMonitorType, params: SaveFireUtilityDevicesParam) => Promise<void>;
  updateFireUtilityRange: (
    hostId: FireEntityId,
    monitorType: FireUtilityMonitorType,
    relationId: FireEntityId,
    params: UpdateFireUtilityRangeParam,
  ) => Promise<void>;
  removeFireUtilityDevice: (hostId: FireEntityId, monitorType: FireUtilityMonitorType, relationId: FireEntityId) => Promise<void>;
  listFireUtilityDeviceProperties: (
    hostId: FireEntityId,
    monitorType: FireUtilityMonitorType,
    relationId: FireEntityId,
  ) => Promise<FireUtilityPropertyRecord[]>;
  getFireUtilityPanel: (hostId: FireEntityId, monitorType: FireUtilityMonitorType) => Promise<FireUtilityPanelRecord>;
  saveFireUtilityPanel: (hostId: FireEntityId, monitorType: FireUtilityMonitorType, params: SaveFireUtilityPanelParam) => Promise<void>;
  resetFireUtilityPanel: (hostId: FireEntityId, monitorType: FireUtilityMonitorType) => Promise<void>;

  // Operation Logs
  listOperationLogs: (params: ListOperationLogParams) => Promise<Pagination<FireOperationLogRecord>>;
  addOperationLog: (operator: string, type: string, content: string, result: "success" | "failed") => Promise<OperationLogRecord>;
  listEvents: (params: ListEventParams) => Promise<Pagination<EventRecord>>;
  listFirePointEventStatistics: (params: ListFirePointEventStatisticsParams) => Promise<Pagination<FirePointEventStatisticsRecord>>;

  // Water Sensors
  listWaterSensors: () => Promise<WaterSensorRecord[]>;

  // Fire Manage Device
  addFireManageDevice: (params: SaveFireManageDeviceParams) => Promise<unknown>;
  listFireManageDevicePage: (params: ListFireHostParams) => Promise<Pagination<FireHostRecord>>;
  sendCommand: (params: FireDeviceCommandParam) => Promise<unknown>;
}
