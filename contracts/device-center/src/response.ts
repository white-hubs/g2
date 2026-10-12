export interface DeviceInstance {
  id: string;
  name: string;
  code: string;
  thirdPartyId: string;
  //...其他设备信息
}

export interface DeviceTagRule {
  id: string;
  // JsonString
  rule: string;
  tagCode: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  remark: string;
}

export interface DeviceGroupDetail extends DeviceGroup {
  deviceCount: number;
  devices: DeviceInstance[];
}
