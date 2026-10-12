import type { AttendanceSelectionApi } from "@g2-contract/attendance/api/selection";

import type { AttendanceTransport } from "../transport";

/** 选择器沿用旧 OUAA、设备中心、主数据和字典服务契约。 */
export function createAttendanceSelectionApi({ Get, Post }: AttendanceTransport): AttendanceSelectionApi {
  return {
    getUserPage: (params) => Get("/ouaa/authenticated/user-under-tenant/page", { params: { ...params, enabled: true } }),
    deptList: () => Get("/ouaa/authenticated/organizations/list?enabled=true"),
    getRole: (params) => Get("/ouaa/authenticated/product/role/page", { params }),
    getPositionList: () => Get("/ouaa/authenticated/position/list?enabled=true"),
    getAppointmentList: () => Get("/ouaa/appointment/page?enabled=true&pageNumber=1&pageSize=1000"),
    getRoleList: () => Get("/ouaa/authenticated/role/list-by-product"),
    getDeviceInstancePageAll: async (params, tenant) =>
      (
        await Post<Awaited<ReturnType<AttendanceSelectionApi["getDeviceInstancePageAll"]>>>("/device-center/device/instance/page", params, {
          headers: tenant ? { tenant } : undefined,
        })
      ).data,
    getIotProductCategoryTree: async (tenant) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getIotProductCategoryTree"]>>>("/device-center/iot/product/category-tree", {
          params: { tenant },
          headers: tenant ? { tenant } : undefined,
        })
      ).data,
    getProductListAll: async (tenant) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getProductListAll"]>>>("/device-center/things/product/list/all", {
          headers: tenant ? { tenant } : undefined,
        })
      ).data,
    getCustomerTagListAll: async (params) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getCustomerTagListAll"]>>>("/device-center/tag/customer/list", {
          params,
          headers: params.tenant ? { tenant: params.tenant } : undefined,
        })
      ).data,
    getAreaTree: async (tenant) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getAreaTree"]>>>("/mdata/area/list", {
          headers: tenant ? { tenant } : undefined,
        })
      ).data,
    getDictionaryByItem: async (params) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getDictionaryByItem"]>>>("/dictionary/getDataDictionaryByItem", {
          params,
          headers: params.tenant ? { tenant: params.tenant } : undefined,
        })
      ).data,
    getDictionaryItemByCode: async (params) =>
      (
        await Get<Awaited<ReturnType<AttendanceSelectionApi["getDictionaryItemByCode"]>>>(
          `/dictionary/getDictionaryItemByCode/${encodeURIComponent(params.code)}`,
        )
      ).data,
  };
}
