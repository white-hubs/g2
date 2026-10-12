import type { Pagination, Paging } from "@g2-contract/base";

import type { BusinessDictionaryType, DeviceKind, LongId } from "./enums";
import type {
  DeviceCardConfigSaveRequest,
  DeviceConfigSaveRequest,
  DeviceMethodInvokeRequest,
  DevicePropertyControlRequest,
  ElectricalCenterScadaBindingSaveRequest,
  EnvironmentDeviceParameterConfigSaveRequest,
  FacilityDeviceAssociateRequest,
  FacilityModifyRequest,
  FacilityScadaBindingSaveRequest,
  ListFacilitiesParams,
  ListMonitoringDevicesParams,
  ListMonitoringFacilitiesParams,
  ListRemoteInspectionTemplatesParams,
  MonitorPanelConfigSaveRequest,
  RemoteInspectionDataParams,
  RemoteInspectionTemplateEnabledRequest,
  RemoteInspectionTemplateSaveRequest,
} from "./request";
import type {
  ConfigurableProduct,
  DeviceAiAnalysis,
  DeviceAlarmRecord,
  DeviceBasicInfo,
  DeviceCardConfig,
  DeviceConfig,
  DeviceControlRecord,
  DeviceMaintenanceRecord,
  DevicePropertyControlResponse,
  DeviceRealtimeProperties,
  DictionaryItem,
  ElectricalCenterScadaBindingContent,
  ElectricalDeviceHealthDistribution,
  ElectricalDeviceOnlineRate,
  ElectricalDeviceTypeParameterConfig,
  ElectricalFacilityOverview,
  ElectricalSafetyScore,
  EnvironmentDeviceParameterConfig,
  FacilityDetail,
  FacilityDevice,
  FacilityListItem,
  FacilityScadaBindingContent,
  MonitorPanelConfig,
  MonitoringDevice,
  MonitoringFacility,
  MonitoringOverview,
  ProductCategoryTree,
  ProductPropertyReference,
  ProductReference,
  RemoteInspectionData,
  RemoteInspectionTemplateDetail,
  RemoteInspectionTemplateListItem,
} from "./response";

export const ELECTRICAL_MANAGEMENT_GATEWAY_PREFIX = "/api/electrical-management";

export interface ElectricalSafetyGateway {
  getHomeFacilityOverviews: () => Promise<ElectricalFacilityOverview[]>;
  getDeviceOnlineRate: () => Promise<ElectricalDeviceOnlineRate>;
  getDeviceHealthDistribution: () => Promise<ElectricalDeviceHealthDistribution>;
  getSafetyScore: () => Promise<ElectricalSafetyScore>;
  getMonthlyLineLoss: () => Promise<unknown>;
  listBusinessDictionaryItems: (dictType: BusinessDictionaryType) => Promise<DictionaryItem[]>;
  listFacilities: (params: ListFacilitiesParams) => Promise<Pagination<FacilityListItem>>;
  getFacility: (id: LongId) => Promise<FacilityDetail>;
  createFacility: (payload: FacilityModifyRequest) => Promise<LongId>;
  updateFacility: (id: LongId, payload: FacilityModifyRequest) => Promise<void>;
  deleteFacility: (id: LongId) => Promise<void>;
  listFacilityDevices: (facilityId: LongId, deviceKind: DeviceKind) => Promise<FacilityDevice[]>;
  associateFacilityDevices: (facilityId: LongId, payload: FacilityDeviceAssociateRequest) => Promise<void>;
  removeFacilityDevice: (facilityId: LongId, deviceId: LongId) => Promise<void>;
  listElectricalDeviceTypeParameterConfigs: () => Promise<ElectricalDeviceTypeParameterConfig[]>;
  getDeviceConfig: (facilityId: LongId, deviceId: LongId) => Promise<DeviceConfig>;
  saveDeviceConfig: (facilityId: LongId, deviceId: LongId, payload: DeviceConfigSaveRequest) => Promise<void>;
  getEnvironmentDeviceParameterConfig: (facilityId: LongId, deviceId: LongId) => Promise<EnvironmentDeviceParameterConfig>;
  saveEnvironmentDeviceParameterConfig: (
    facilityId: LongId,
    deviceId: LongId,
    payload: EnvironmentDeviceParameterConfigSaveRequest,
  ) => Promise<void>;
  listMonitoringFacilities: (params: ListMonitoringFacilitiesParams) => Promise<Pagination<MonitoringFacility>>;
  getMonitoringOverview: (facilityId: LongId) => Promise<MonitoringOverview>;
  listMonitoringDevices: (facilityId: LongId, params: ListMonitoringDevicesParams) => Promise<MonitoringDevice[]>;
  getMonitoringDevice: (deviceId: LongId) => Promise<DeviceBasicInfo>;
  getDeviceRealtimeProperties: (deviceId: LongId) => Promise<DeviceRealtimeProperties>;
  controlDeviceProperty: (
    deviceId: LongId,
    propertyCode: string,
    payload: DevicePropertyControlRequest,
  ) => Promise<DevicePropertyControlResponse>;
  listDeviceControlRecords: (deviceId: LongId, params: Partial<Paging>) => Promise<Pagination<DeviceControlRecord>>;
  listDeviceAlarmRecords: (deviceId: LongId, params: Partial<Paging>) => Promise<Pagination<DeviceAlarmRecord>>;
  listDeviceMaintenanceRecords: (deviceId: LongId, params: Partial<Paging>) => Promise<Pagination<DeviceMaintenanceRecord>>;
  invokeDeviceMethod: (
    deviceId: LongId,
    methodCode: string,
    payload: DeviceMethodInvokeRequest,
  ) => Promise<{ commandSeq: string; commandHandle: string; statusCode: string; message: string; outputParams: Record<string, unknown> }>;
  getDeviceAiAnalysis: (deviceId: LongId) => Promise<DeviceAiAnalysis>;
  listConfigurableProducts: (facilityId: LongId) => Promise<ConfigurableProduct[]>;
  listProductCategoryTree: () => Promise<ProductCategoryTree[]>;
  listProductsByCategory: (categoryCode: string) => Promise<ProductReference[]>;
  listProductProperties: (productCode: string) => Promise<ProductPropertyReference[]>;
  getDeviceCardConfig: (facilityId: LongId, productCode: string) => Promise<DeviceCardConfig>;
  saveDeviceCardConfig: (facilityId: LongId, productCode: string, payload: DeviceCardConfigSaveRequest) => Promise<boolean>;
  getMonitorPanelConfig: (facilityId: LongId) => Promise<MonitorPanelConfig>;
  saveMonitorPanelConfig: (facilityId: LongId, payload: MonitorPanelConfigSaveRequest) => Promise<boolean>;
  getElectricalCenterScadaBinding: () => Promise<ElectricalCenterScadaBindingContent | null>;
  saveElectricalCenterScadaBinding: (payload: ElectricalCenterScadaBindingSaveRequest) => Promise<void>;
  deleteElectricalCenterScadaBinding: () => Promise<void>;
  getFacilityScadaBinding: (facilityId: LongId) => Promise<FacilityScadaBindingContent | null>;
  saveFacilityScadaBinding: (facilityId: LongId, payload: FacilityScadaBindingSaveRequest) => Promise<void>;
  deleteFacilityScadaBinding: (facilityId: LongId) => Promise<void>;
  listRemoteInspectionTemplates: (params: ListRemoteInspectionTemplatesParams) => Promise<Pagination<RemoteInspectionTemplateListItem>>;
  getRemoteInspectionTemplate: (id: LongId) => Promise<RemoteInspectionTemplateDetail>;
  createRemoteInspectionTemplate: (payload: RemoteInspectionTemplateSaveRequest) => Promise<LongId>;
  updateRemoteInspectionTemplate: (id: LongId, payload: RemoteInspectionTemplateSaveRequest) => Promise<boolean>;
  deleteRemoteInspectionTemplate: (id: LongId) => Promise<boolean>;
  updateRemoteInspectionTemplateEnabled: (id: LongId, payload: RemoteInspectionTemplateEnabledRequest) => Promise<boolean>;
  getRemoteInspectionData: (id: LongId, params: RemoteInspectionDataParams) => Promise<RemoteInspectionData>;
  exportRemoteInspectionData: (id: LongId, params: RemoteInspectionDataParams) => Promise<Blob>;
}
