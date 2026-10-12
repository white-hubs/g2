import type { ElectricalReferenceClient } from "@g2-contract/electrical-safety/references";

import { getElectricalSafetyClient } from "../domain-context";
export const listDeviceManagementPage: ElectricalReferenceClient["listDeviceManagementPage"] = (...args) =>
  getElectricalSafetyClient().listDeviceManagementPage(...args);
export const listDeviceProducts: ElectricalReferenceClient["listDeviceProducts"] = (...args) =>
  getElectricalSafetyClient().listDeviceProducts(...args);
export const getAlarmRecordPage: ElectricalReferenceClient["getAlarmRecordPage"] = (...args) =>
  getElectricalSafetyClient().getAlarmRecordPage(...args);
export const getAlarmStatisticsLevel: ElectricalReferenceClient["getAlarmStatisticsLevel"] = (...args) =>
  getElectricalSafetyClient().getAlarmStatisticsLevel(...args);
export const listAllArea: ElectricalReferenceClient["listAllArea"] = (...args) => getElectricalSafetyClient().listAllArea(...args);
export const listUsers: ElectricalReferenceClient["listUsers"] = (...args) => getElectricalSafetyClient().listUsers(...args);
