import type { Paging } from "@g2-contract/base";

export enum DeviceConditionFieldEnum {
  PRODUCT = "PRODUCT",
  AREA = "AREA",
  DEVICE = "DEVICE",
}

export enum DeviceConditionOperatorEnum {
  GREATER_THAN = ">",
  GREATER_THAN_OR_EQUAL = ">=",
  LESS_THAN = "<",
  LESS_THAN_OR_EQUAL = "<=",
  IN = "in",
  NOT_IN = "not in",
  LIKE = "like",
  EQ = "eq",
}

export interface RuleField {
  field: DeviceConditionFieldEnum;
  operator: DeviceConditionOperatorEnum;
  value: string[];
}

export interface Rule {
  ruleFields: RuleField[];
}

export interface RuleGroup {
  rules: Rule[];
}

export interface ListDeviceInstanceOfRuleConditionParams extends Partial<Paging> {
  ruleGroup: RuleGroup;
}

export interface ListDeviceGroupParams extends Partial<Paging> {
  keyword?: string;
  tagCode: string;
}

export interface ListDeviceInstancesParams extends Partial<Paging> {
  keyword?: string;
  productId?: string;
  categoryCode?: string;
  tagCodes?: string[];
  filterTagCodes?: string[];
  filterAreaIds?: string[];
  // 左匹配，sequence
  anyMatchedAreaId?: string;
  // 模糊匹配 sequence
  anyAreaId?: string;
}

export interface QueryDeviceInstancesParams {
  keywordLike?: string;
  productId?: string;
  categoryCode?: string;
  tagCodes?: string[];
  matchedDeviceIds?: string[];
  anyMatchedAreaId?: string;
  anyMatchedDepartmentId?: string;
  withDeviceExpandInfo?: boolean;
  withDeviceTagInfo?: boolean;
}

export interface QueryDeviceIdsByAreaOrGroupAndTagParams {
  tagCode: string;
  areaIds?: string[];
  groupIds?: string[];
  deviceIds?: string[];
}
