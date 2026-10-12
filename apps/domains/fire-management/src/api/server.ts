import type { FireManagementClient } from "@g2-client/fire-management/client";

import { getFireManagementClient } from "../domain-context";

/**
 * 旧页面使用具名函数导入；MF Domain 的 client 在 install 阶段注入。
 * Proxy 保留原调用形态，同时确保所有 HTTP 都经 fireManagementClient/httpPlatform。
 */
function clientProxy(): FireManagementClient {
  return new Proxy({} as FireManagementClient, {
    get(_target, property) {
      const client = getFireManagementClient() as unknown as Record<PropertyKey, unknown>;
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

const proxy = clientProxy();

export const listFireDevices = (...args: Parameters<FireManagementClient["listFireDevices"]>) => proxy.listFireDevices(...args);
export const getFireDeviceDetail = (...args: Parameters<FireManagementClient["getFireDeviceDetail"]>) => proxy.getFireDeviceDetail(...args);
export const createFireDevice = (...args: Parameters<FireManagementClient["createFireDevice"]>) => proxy.createFireDevice(...args);
export const updateFireDevice = (...args: Parameters<FireManagementClient["updateFireDevice"]>) => proxy.updateFireDevice(...args);
export const deleteFireDevice = (...args: Parameters<FireManagementClient["deleteFireDevice"]>) => proxy.deleteFireDevice(...args);
export const listFireHosts = (...args: Parameters<FireManagementClient["listFireHosts"]>) => proxy.listFireHosts(...args);
export const getFireHostDetail = (...args: Parameters<FireManagementClient["getFireHostDetail"]>) => proxy.getFireHostDetail(...args);
export const createFireHost = (...args: Parameters<FireManagementClient["createFireHost"]>) => proxy.createFireHost(...args);
export const updateFireHost = (...args: Parameters<FireManagementClient["updateFireHost"]>) => proxy.updateFireHost(...args);
export const deleteFireHost = (...args: Parameters<FireManagementClient["deleteFireHost"]>) => proxy.deleteFireHost(...args);
export const listFirePoints = (...args: Parameters<FireManagementClient["listFirePoints"]>) => proxy.listFirePoints(...args);
export const getFirePointDetail = (...args: Parameters<FireManagementClient["getFirePointDetail"]>) => proxy.getFirePointDetail(...args);
export const createFirePoint = (...args: Parameters<FireManagementClient["createFirePoint"]>) => proxy.createFirePoint(...args);
export const updateFirePoint = (...args: Parameters<FireManagementClient["updateFirePoint"]>) => proxy.updateFirePoint(...args);
export const deleteFirePoint = (...args: Parameters<FireManagementClient["deleteFirePoint"]>) => proxy.deleteFirePoint(...args);
export const listFirePointEvents = (...args: Parameters<FireManagementClient["listFirePointEvents"]>) => proxy.listFirePointEvents(...args);
export const getFirePointEventOptions = (...args: Parameters<FireManagementClient["getFirePointEventOptions"]>) =>
  proxy.getFirePointEventOptions(...args);
export const listFirePointLocalEvents = (...args: Parameters<FireManagementClient["listFirePointLocalEvents"]>) =>
  proxy.listFirePointLocalEvents(...args);
export const batchFillFirePointEmptyFields = (...args: Parameters<FireManagementClient["batchFillFirePointEmptyFields"]>) =>
  proxy.batchFillFirePointEmptyFields(...args);
export const configFirePointDevices = (...args: Parameters<FireManagementClient["configFirePointDevices"]>) =>
  proxy.configFirePointDevices(...args);
export const downloadFirePointImportTemplate = (...args: Parameters<FireManagementClient["downloadFirePointImportTemplate"]>) =>
  proxy.downloadFirePointImportTemplate(...args);
export const listFireHostMethods = (...args: Parameters<FireManagementClient["listFireHostMethods"]>) => proxy.listFireHostMethods(...args);
export const listFireHostButtons = (...args: Parameters<FireManagementClient["listFireHostButtons"]>) => proxy.listFireHostButtons(...args);
export const saveFireHostButtons = (...args: Parameters<FireManagementClient["saveFireHostButtons"]>) => proxy.saveFireHostButtons(...args);
export const updateFireHostButtons = (...args: Parameters<FireManagementClient["updateFireHostButtons"]>) =>
  proxy.updateFireHostButtons(...args);
export const removeFireHostButton = (...args: Parameters<FireManagementClient["removeFireHostButton"]>) =>
  proxy.removeFireHostButton(...args);
export const listFireHostMonitorDevices = (...args: Parameters<FireManagementClient["listFireHostMonitorDevices"]>) =>
  proxy.listFireHostMonitorDevices(...args);
export const listFireHostMonitorDeviceCandidates = (...args: Parameters<FireManagementClient["listFireHostMonitorDeviceCandidates"]>) =>
  proxy.listFireHostMonitorDeviceCandidates(...args);
export const saveFireHostMonitorDevices = (...args: Parameters<FireManagementClient["saveFireHostMonitorDevices"]>) =>
  proxy.saveFireHostMonitorDevices(...args);
export const removeFireHostMonitorDevice = (...args: Parameters<FireManagementClient["removeFireHostMonitorDevice"]>) =>
  proxy.removeFireHostMonitorDevice(...args);
export const listFireHostOverviews = (...args: Parameters<FireManagementClient["listFireHostOverviews"]>) =>
  proxy.listFireHostOverviews(...args);
export const listFireHostAlarmRecords = (...args: Parameters<FireManagementClient["listFireHostAlarmRecords"]>) =>
  proxy.listFireHostAlarmRecords(...args);
export const sendFireHostControlCommand = (...args: Parameters<FireManagementClient["sendFireHostControlCommand"]>) =>
  proxy.sendFireHostControlCommand(...args);
export const getFireHostControlCommandStatus = (...args: Parameters<FireManagementClient["getFireHostControlCommandStatus"]>) =>
  proxy.getFireHostControlCommandStatus(...args);
export const listFireControlPoints = (...args: Parameters<FireManagementClient["listFireControlPoints"]>) =>
  proxy.listFireControlPoints(...args);
export const sendFirePointControlCommand = (...args: Parameters<FireManagementClient["sendFirePointControlCommand"]>) =>
  proxy.sendFirePointControlCommand(...args);
export const getFirePointControlCommandStatus = (...args: Parameters<FireManagementClient["getFirePointControlCommandStatus"]>) =>
  proxy.getFirePointControlCommandStatus(...args);
export const listFirePointControlPropertyOptions = (...args: Parameters<FireManagementClient["listFirePointControlPropertyOptions"]>) =>
  proxy.listFirePointControlPropertyOptions(...args);
export const saveFirePointControlConfig = (...args: Parameters<FireManagementClient["saveFirePointControlConfig"]>) =>
  proxy.saveFirePointControlConfig(...args);
export const getFireHostIndicatorLightConfig = (...args: Parameters<FireManagementClient["getFireHostIndicatorLightConfig"]>) =>
  proxy.getFireHostIndicatorLightConfig(...args);
export const saveFireHostIndicatorLightConfig = (...args: Parameters<FireManagementClient["saveFireHostIndicatorLightConfig"]>) =>
  proxy.saveFireHostIndicatorLightConfig(...args);
export const listFireUtilityMonitorCards = (...args: Parameters<FireManagementClient["listFireUtilityMonitorCards"]>) =>
  proxy.listFireUtilityMonitorCards(...args);
export const listFireUtilityDeviceCandidates = (...args: Parameters<FireManagementClient["listFireUtilityDeviceCandidates"]>) =>
  proxy.listFireUtilityDeviceCandidates(...args);
export const saveFireUtilityDevices = (...args: Parameters<FireManagementClient["saveFireUtilityDevices"]>) =>
  proxy.saveFireUtilityDevices(...args);
export const updateFireUtilityRange = (...args: Parameters<FireManagementClient["updateFireUtilityRange"]>) =>
  proxy.updateFireUtilityRange(...args);
export const removeFireUtilityDevice = (...args: Parameters<FireManagementClient["removeFireUtilityDevice"]>) =>
  proxy.removeFireUtilityDevice(...args);
export const listFireUtilityDeviceProperties = (...args: Parameters<FireManagementClient["listFireUtilityDeviceProperties"]>) =>
  proxy.listFireUtilityDeviceProperties(...args);
export const getFireUtilityPanel = (...args: Parameters<FireManagementClient["getFireUtilityPanel"]>) => proxy.getFireUtilityPanel(...args);
export const saveFireUtilityPanel = (...args: Parameters<FireManagementClient["saveFireUtilityPanel"]>) =>
  proxy.saveFireUtilityPanel(...args);
export const resetFireUtilityPanel = (...args: Parameters<FireManagementClient["resetFireUtilityPanel"]>) =>
  proxy.resetFireUtilityPanel(...args);
export const listOperationLogs = (...args: Parameters<FireManagementClient["listOperationLogs"]>) => proxy.listOperationLogs(...args);
export const listEvents = (...args: Parameters<FireManagementClient["listEvents"]>) => proxy.listEvents(...args);
export const listFirePointEventStatistics = (...args: Parameters<FireManagementClient["listFirePointEventStatistics"]>) =>
  proxy.listFirePointEventStatistics(...args);
export const addOperationLog = (...args: Parameters<FireManagementClient["addOperationLog"]>) => proxy.addOperationLog(...args);
export const listWaterSensors = (...args: Parameters<FireManagementClient["listWaterSensors"]>) => proxy.listWaterSensors(...args);
export const addFireManageDevice = (...args: Parameters<FireManagementClient["addFireManageDevice"]>) => proxy.addFireManageDevice(...args);
export const listFireManageDevicePage = (...args: Parameters<FireManagementClient["listFireManageDevicePage"]>) =>
  proxy.listFireManageDevicePage(...args);
export const sendCommand = (...args: Parameters<FireManagementClient["sendCommand"]>) => proxy.sendCommand(...args);
export const getFireManageStats = (...args: Parameters<FireManagementClient["getFireManageStats"]>) => proxy.getFireManageStats(...args);
export const getProductModelList = (...args: Parameters<FireManagementClient["getProductModelList"]>) => proxy.getProductModelList(...args);
export const getDeviceNameList = (...args: Parameters<FireManagementClient["getDeviceNameList"]>) => proxy.getDeviceNameList(...args);
export const getRefMonitorDeviceIds = (...args: Parameters<FireManagementClient["getRefMonitorDeviceIds"]>) =>
  proxy.getRefMonitorDeviceIds(...args);
export const getDeviceCenterInfo = (...args: Parameters<FireManagementClient["getDeviceCenterInfo"]>) => proxy.getDeviceCenterInfo(...args);
export const getAreaList = (...args: Parameters<FireManagementClient["getAreaList"]>) => proxy.getAreaList(...args);
export const getAreaPlaneMap = (...args: Parameters<FireManagementClient["getAreaPlaneMap"]>) => proxy.getAreaPlaneMap(...args);
export const setControlPassword = (...args: Parameters<FireManagementClient["setControlPassword"]>) => proxy.setControlPassword(...args);
export const batchFillEmptyFields = (...args: Parameters<FireManagementClient["batchFillEmptyFields"]>) =>
  proxy.batchFillEmptyFields(...args);

export const fireManagementService = proxy;
