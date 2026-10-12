import type { BaseAPIResult } from "../common";

export interface SelectionRecord {
  id: string;
  name: string;
  [key: string]: unknown;
}
export interface SelectionPage {
  records: SelectionRecord[];
  total: number;
  pages?: number;
}
export interface UserPageParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  roleId?: string;
  positionId?: string;
  appointmentId?: string;
  organizationId?: string;
  [key: string]: unknown;
}
export interface DevicePageParams {
  pageNumber: number;
  pageSize: number;
  anyAreaId?: string;
  departmentId?: string;
  keyword?: string;
  lastAreaId?: string;
  prodCategoryCode?: string;
  productId?: string;
  tagCodes?: string[];
  filterTagCodes?: string[];
  filterIds?: string[];
  matchedDeviceIds?: string[];
  categoryCode?: string;
  deviceSort?: string;
  deviceState?: boolean;
  anyMatchedAreaId?: string;
}
export interface CustomerTagParams {
  tenant?: string;
  deviceId?: string | number;
  pageNumber?: number;
  pageSize?: number;
  period?: string;
  status?: number;
  tagName?: string;
}
export interface DictionaryItem {
  id: string;
  name: string;
  code: string;
  remarks: string;
  version: string;
  flag: boolean;
  variable: string;
  itemCode: string;
  userId?: string | number;
}
export interface DictionaryParams {
  itemCode: string;
  name?: string;
  code?: string;
  tenant?: string;
}
export interface AttendanceSelectionApi {
  getUserPage(params: UserPageParams): Promise<BaseAPIResult<SelectionPage>>;
  deptList(): Promise<BaseAPIResult<SelectionRecord[]>>;
  getRole(params: {
    keyword?: string;
    cascaderIds?: string;
    pageNumber: number;
    pageSize: number;
    enabled?: boolean;
  }): Promise<BaseAPIResult<SelectionPage>>;
  getPositionList(): Promise<BaseAPIResult<SelectionRecord[]>>;
  getAppointmentList(): Promise<BaseAPIResult<SelectionPage>>;
  getRoleList(): Promise<BaseAPIResult<SelectionRecord[]>>;
  getDeviceInstancePageAll(params: DevicePageParams, tenant?: string): Promise<SelectionPage>;
  getIotProductCategoryTree(tenant?: string): Promise<SelectionRecord[]>;
  getProductListAll(tenant?: string): Promise<SelectionRecord[]>;
  getCustomerTagListAll(params: CustomerTagParams): Promise<SelectionRecord[]>;
  getAreaTree(tenant?: string): Promise<SelectionRecord[]>;
  getDictionaryByItem(params: DictionaryParams): Promise<DictionaryItem[]>;
  getDictionaryItemByCode(params: { code: string }): Promise<DictionaryItem[]>;
}
