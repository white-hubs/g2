import type { Pagination } from "@g2-contract/base";

import type { ListDeviceInstanceOfRuleConditionParams, QueryDeviceIdsByAreaOrGroupAndTagParams } from "./request";
import type { DeviceInstance, DeviceTagRule } from "./response";

export interface DeviceCenterGateway {
  listDeviceInstanceOfRuleCondition: (params: ListDeviceInstanceOfRuleConditionParams) => Promise<Pagination<DeviceInstance>>;
  getDeviceTagRule: (tagCode: string) => Promise<DeviceTagRule>;
  queryDeviceIdsByAreaOrGroupAndTag: (params: QueryDeviceIdsByAreaOrGroupAndTagParams) => Promise<string[]>;
}
