import type { Pagination } from "@g2-contract/base";

import type {
  AlarmAssignPayload,
  AlarmFollowPayload,
  AlarmHandlePayload,
  AlarmLinkageExecutePayload,
  AlarmNearbyDeviceQuery,
  AlarmRecordBatchDeletePayload,
  AlarmRecordPageQuery,
  AlarmSuspendPayload,
  AlarmTransferPayload,
  AlarmUrgePayload,
} from "./request";
import type {
  AlarmDetail,
  AlarmFollowRecord,
  AlarmLinkageActionDevice,
  AlarmLinkageExecuteRecord,
  AlarmNearbyDevice,
  AlarmOperatorRecord,
  AlarmReason,
  AlarmRecord,
} from "./response";

export interface AlarmCenterGateway {
  getAlarmRecordPage: (query: AlarmRecordPageQuery) => Promise<Pagination<AlarmRecord>>;
  deleteAlarmRecords: (payload: AlarmRecordBatchDeletePayload) => Promise<void>;
  transferAlarmRecord: (id: string, payload: AlarmTransferPayload) => Promise<void>;
  assignAlarmRecord: (id: string, payload: AlarmAssignPayload) => Promise<void>;
  suspendAlarmRecord: (id: string, payload: AlarmSuspendPayload) => Promise<void>;
  handleAlarmRecord: (id: string, payload: AlarmHandlePayload) => Promise<void>;
  confirmAlarmRecord: (id: string) => Promise<void>;
  urgeAlarmRecords: (payload: AlarmUrgePayload) => Promise<void>;
  repeatPushAlarm: (businessKey: string) => Promise<unknown>;
  getAlarmRecordDetail: (id: string) => Promise<AlarmDetail>;
  getAlarmOperatorRecords: (id: string) => Promise<AlarmOperatorRecord[]>;
  createAlarmFollow: (payload: AlarmFollowPayload) => Promise<unknown>;
  getAlarmFollowList: (id: string) => Promise<AlarmFollowRecord[]>;
  getAlarmReasons: () => Promise<AlarmReason[]>;
  getAlarmLinkageActions: (eventId: string) => Promise<AlarmLinkageActionDevice[]>;
  getAlarmLinkageExecuteRecords: (eventId: string) => Promise<AlarmLinkageExecuteRecord[]>;
  executeAlarmLinkage: (payload: AlarmLinkageExecutePayload) => Promise<void>;
  oneKeyExecuteAlarmLinkage: (eventId: string) => Promise<void>;
  getAlarmNearbyDevices: (query: AlarmNearbyDeviceQuery) => Promise<Pagination<AlarmNearbyDevice>>;
}
