export interface AlarmCenterClient {
  getAlarmRecordPage: (query) => Promise<unknown>;
  deleteAlarmRecords: (payload) => Promise<unknown>;
  transferAlarmRecord: (id, payload) => Promise<unknown>;
  assignAlarmRecord: (id, payload) => Promise<unknown>;
  suspendAlarmRecord: (id, payload) => Promise<unknown>;
  handleAlarmRecord: (id, payload) => Promise<unknown>;
  confirmAlarmRecord: (id) => Promise<unknown>;
  urgeAlarmRecords: (payload) => Promise<unknown>;
  repeatPushAlarm: (businessKey) => Promise<unknown>;
  getAlarmRecordDetail: (id) => Promise<unknown>;
  getAlarmOperatorRecords: (id) => Promise<unknown>;
  createAlarmFollow: (payload) => Promise<unknown>;
  getAlarmFollowList: (id) => Promise<unknown>;
  getAlarmReasons: () => Promise<unknown>;
  getAlarmLinkageActions: (eventId) => Promise<unknown>;
  getAlarmLinkageExecuteRecords: (eventId) => Promise<unknown>;
  executeAlarmLinkage: (payload) => Promise<unknown>;
  oneKeyExecuteAlarmLinkage: (eventId) => Promise<unknown>;
  getAlarmNearbyDevices: (query) => Promise<unknown>;
}
