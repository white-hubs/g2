import type { AttendanceSelectionApi } from "@g2-contract/attendance/api/selection";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/selection";
export const getUserPage: AttendanceSelectionApi["getUserPage"] = async (...args) => (await getAttendanceClient()).getUserPage(...args);
export const deptList: AttendanceSelectionApi["deptList"] = async (...args) => (await getAttendanceClient()).deptList(...args);
export const getRole: AttendanceSelectionApi["getRole"] = async (...args) => (await getAttendanceClient()).getRole(...args);
export const getPositionList: AttendanceSelectionApi["getPositionList"] = async (...args) =>
  (await getAttendanceClient()).getPositionList(...args);
export const getAppointmentList: AttendanceSelectionApi["getAppointmentList"] = async (...args) =>
  (await getAttendanceClient()).getAppointmentList(...args);
export const getRoleList: AttendanceSelectionApi["getRoleList"] = async (...args) => (await getAttendanceClient()).getRoleList(...args);
export const getDeviceInstancePageAll: AttendanceSelectionApi["getDeviceInstancePageAll"] = async (...args) =>
  (await getAttendanceClient()).getDeviceInstancePageAll(...args);
export const getIotProductCategoryTree: AttendanceSelectionApi["getIotProductCategoryTree"] = async (...args) =>
  (await getAttendanceClient()).getIotProductCategoryTree(...args);
export const getProductListAll: AttendanceSelectionApi["getProductListAll"] = async (...args) =>
  (await getAttendanceClient()).getProductListAll(...args);
export const getCustomerTagListAll: AttendanceSelectionApi["getCustomerTagListAll"] = async (...args) =>
  (await getAttendanceClient()).getCustomerTagListAll(...args);
export const getAreaTree: AttendanceSelectionApi["getAreaTree"] = async (...args) => (await getAttendanceClient()).getAreaTree(...args);
export const getDictionaryByItem: AttendanceSelectionApi["getDictionaryByItem"] = async (...args) =>
  (await getAttendanceClient()).getDictionaryByItem(...args);
export const getDictionaryItemByCode: AttendanceSelectionApi["getDictionaryItemByCode"] = async (...args) =>
  (await getAttendanceClient()).getDictionaryItemByCode(...args);
