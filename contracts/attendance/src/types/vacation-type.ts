export interface PageResult {
  total: number;
  page: number;
  records: unknown[];
}

export interface UploadRes {
  accessPrefix: string;
  businessKey: null | string;
  id: string;
  name: string;
  path: string;
  refCount: 0;
  size: 687;
  suffix: string;
  tag: string;
  type: string;
}
export interface ImportType {
  fail: number;
  errorMsg: string[];
  success: number;
}
export const businessTypeMap = new Map([
  ["REPAIR_CLOCK", "补卡申请"],
  ["OVERTIME", "加班申请"],
  ["CHANGE_CLASSES", "换班申请"],
  ["LEAVE", "请假申请"],
  ["LEAVE_THE_POST", "离岗申请"],
  ["CANCEL_LEAVE", "销假申请"],
  ["AWAY_BUSINESS", "出差申请"],
]);
