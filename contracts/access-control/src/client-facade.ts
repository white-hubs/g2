export interface AccessControlClient {
  getEnterpriseDirectory: (params?: unknown) => Promise<unknown>;
  getDoorRanking: (params?: unknown) => Promise<unknown>;
  getDoorEvents: (params?: unknown) => Promise<unknown>;
  passedTodayNum: (params?: unknown) => Promise<unknown>;
  getDoorTend: (params?: unknown) => Promise<unknown>;
  generDeviceIsWord: (params?: unknown) => Promise<unknown>;
  controlDoorverify: (params?: unknown) => Promise<unknown>;
  generDevice: (params?: unknown) => Promise<unknown>;
  getDoorType: (params?: unknown) => Promise<unknown>;
  addDoorDevices: (params?: unknown) => Promise<unknown>;
  getDoorDevicePage: (params?: unknown) => Promise<unknown>;
  removeDoorDevice: (params?: unknown) => Promise<unknown>;
  removeDoorDeviceBatch: (params?: unknown) => Promise<unknown>;
  controlDoor: (params?: unknown) => Promise<unknown>;
  getDoorEventRecord: (params?: unknown) => Promise<unknown>;
  getToDayEventTrend: (params?: unknown) => Promise<unknown>;
  getAbnormalEvent: (params?: unknown) => Promise<unknown>;
  inspectgetStatus: (params?: unknown) => Promise<unknown>;
  getDeviceProduct: (params?: unknown) => Promise<unknown>;
  getDeviceList: (params?: unknown) => Promise<unknown>;
  getProductAll: (params?: unknown) => Promise<unknown>;
}
