import type { ElectricalSafetyGateway } from "@g2-contract/electrical-safety";

import { getElectricalSafetyClient } from "../domain-context";
import { reportRequest } from "./report-request";
export const listBusinessDictionaryItems: ElectricalSafetyGateway["listBusinessDictionaryItems"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listBusinessDictionaryItems(...args));
export const getHomeFacilityOverviews: ElectricalSafetyGateway["getHomeFacilityOverviews"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getHomeFacilityOverviews(...args));
export const getDeviceOnlineRate: ElectricalSafetyGateway["getDeviceOnlineRate"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceOnlineRate(...args));
export const getDeviceHealthDistribution: ElectricalSafetyGateway["getDeviceHealthDistribution"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceHealthDistribution(...args));
export const getSafetyScore: ElectricalSafetyGateway["getSafetyScore"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getSafetyScore(...args));
export const getMonthlyLineLoss: ElectricalSafetyGateway["getMonthlyLineLoss"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getMonthlyLineLoss(...args));
export const listFacilities: ElectricalSafetyGateway["listFacilities"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listFacilities(...args));
export const getFacility: ElectricalSafetyGateway["getFacility"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getFacility(...args));
export const createFacility: ElectricalSafetyGateway["createFacility"] = (...args) =>
  reportRequest(getElectricalSafetyClient().createFacility(...args));
export const updateFacility: ElectricalSafetyGateway["updateFacility"] = (...args) =>
  reportRequest(getElectricalSafetyClient().updateFacility(...args));
export const deleteFacility: ElectricalSafetyGateway["deleteFacility"] = (...args) =>
  reportRequest(getElectricalSafetyClient().deleteFacility(...args));
export const listFacilityDevices: ElectricalSafetyGateway["listFacilityDevices"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listFacilityDevices(...args));
export const associateFacilityDevices: ElectricalSafetyGateway["associateFacilityDevices"] = (...args) =>
  reportRequest(getElectricalSafetyClient().associateFacilityDevices(...args));
export const removeFacilityDevice: ElectricalSafetyGateway["removeFacilityDevice"] = (...args) =>
  reportRequest(getElectricalSafetyClient().removeFacilityDevice(...args));
export const listElectricalDeviceTypeParameterConfigs: ElectricalSafetyGateway["listElectricalDeviceTypeParameterConfigs"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listElectricalDeviceTypeParameterConfigs(...args));
export const getDeviceConfig: ElectricalSafetyGateway["getDeviceConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceConfig(...args));
export const saveDeviceConfig: ElectricalSafetyGateway["saveDeviceConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveDeviceConfig(...args));
export const getEnvironmentDeviceParameterConfig: ElectricalSafetyGateway["getEnvironmentDeviceParameterConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getEnvironmentDeviceParameterConfig(...args));
export const saveEnvironmentDeviceParameterConfig: ElectricalSafetyGateway["saveEnvironmentDeviceParameterConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveEnvironmentDeviceParameterConfig(...args));
export const listMonitoringFacilities: ElectricalSafetyGateway["listMonitoringFacilities"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listMonitoringFacilities(...args));
export const getMonitoringOverview: ElectricalSafetyGateway["getMonitoringOverview"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getMonitoringOverview(...args));
export const listMonitoringDevices: ElectricalSafetyGateway["listMonitoringDevices"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listMonitoringDevices(...args));
export const getMonitoringDevice: ElectricalSafetyGateway["getMonitoringDevice"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getMonitoringDevice(...args));
export const getDeviceRealtimeProperties: ElectricalSafetyGateway["getDeviceRealtimeProperties"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceRealtimeProperties(...args));
export const controlDeviceProperty: ElectricalSafetyGateway["controlDeviceProperty"] = (...args) =>
  reportRequest(getElectricalSafetyClient().controlDeviceProperty(...args));
export const listDeviceControlRecords: ElectricalSafetyGateway["listDeviceControlRecords"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listDeviceControlRecords(...args));
export const listDeviceAlarmRecords: ElectricalSafetyGateway["listDeviceAlarmRecords"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listDeviceAlarmRecords(...args));
export const listDeviceMaintenanceRecords: ElectricalSafetyGateway["listDeviceMaintenanceRecords"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listDeviceMaintenanceRecords(...args));
export const invokeDeviceMethod: ElectricalSafetyGateway["invokeDeviceMethod"] = (...args) =>
  reportRequest(getElectricalSafetyClient().invokeDeviceMethod(...args));
export const getDeviceAiAnalysis: ElectricalSafetyGateway["getDeviceAiAnalysis"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceAiAnalysis(...args));
export const listConfigurableProducts: ElectricalSafetyGateway["listConfigurableProducts"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listConfigurableProducts(...args));
export const listProductCategoryTree: ElectricalSafetyGateway["listProductCategoryTree"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listProductCategoryTree(...args));
export const listProductsByCategory: ElectricalSafetyGateway["listProductsByCategory"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listProductsByCategory(...args));
export const listProductProperties: ElectricalSafetyGateway["listProductProperties"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listProductProperties(...args));
export const getDeviceCardConfig: ElectricalSafetyGateway["getDeviceCardConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getDeviceCardConfig(...args));
export const saveDeviceCardConfig: ElectricalSafetyGateway["saveDeviceCardConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveDeviceCardConfig(...args));
export const getMonitorPanelConfig: ElectricalSafetyGateway["getMonitorPanelConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getMonitorPanelConfig(...args));
export const saveMonitorPanelConfig: ElectricalSafetyGateway["saveMonitorPanelConfig"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveMonitorPanelConfig(...args));
export const getElectricalCenterScadaBinding: ElectricalSafetyGateway["getElectricalCenterScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getElectricalCenterScadaBinding(...args));
export const saveElectricalCenterScadaBinding: ElectricalSafetyGateway["saveElectricalCenterScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveElectricalCenterScadaBinding(...args));
export const deleteElectricalCenterScadaBinding: ElectricalSafetyGateway["deleteElectricalCenterScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().deleteElectricalCenterScadaBinding(...args));
export const getFacilityScadaBinding: ElectricalSafetyGateway["getFacilityScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getFacilityScadaBinding(...args));
export const saveFacilityScadaBinding: ElectricalSafetyGateway["saveFacilityScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().saveFacilityScadaBinding(...args));
export const deleteFacilityScadaBinding: ElectricalSafetyGateway["deleteFacilityScadaBinding"] = (...args) =>
  reportRequest(getElectricalSafetyClient().deleteFacilityScadaBinding(...args));
export const listRemoteInspectionTemplates: ElectricalSafetyGateway["listRemoteInspectionTemplates"] = (...args) =>
  reportRequest(getElectricalSafetyClient().listRemoteInspectionTemplates(...args));
export const getRemoteInspectionTemplate: ElectricalSafetyGateway["getRemoteInspectionTemplate"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getRemoteInspectionTemplate(...args));
export const createRemoteInspectionTemplate: ElectricalSafetyGateway["createRemoteInspectionTemplate"] = (...args) =>
  reportRequest(getElectricalSafetyClient().createRemoteInspectionTemplate(...args));
export const updateRemoteInspectionTemplate: ElectricalSafetyGateway["updateRemoteInspectionTemplate"] = (...args) =>
  reportRequest(getElectricalSafetyClient().updateRemoteInspectionTemplate(...args));
export const deleteRemoteInspectionTemplate: ElectricalSafetyGateway["deleteRemoteInspectionTemplate"] = (...args) =>
  reportRequest(getElectricalSafetyClient().deleteRemoteInspectionTemplate(...args));
export const updateRemoteInspectionTemplateEnabled: ElectricalSafetyGateway["updateRemoteInspectionTemplateEnabled"] = (...args) =>
  reportRequest(getElectricalSafetyClient().updateRemoteInspectionTemplateEnabled(...args));
export const getRemoteInspectionData: ElectricalSafetyGateway["getRemoteInspectionData"] = (...args) =>
  reportRequest(getElectricalSafetyClient().getRemoteInspectionData(...args));
export const exportRemoteInspectionData: ElectricalSafetyGateway["exportRemoteInspectionData"] = (...args) =>
  reportRequest(getElectricalSafetyClient().exportRemoteInspectionData(...args));
