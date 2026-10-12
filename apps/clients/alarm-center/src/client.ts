// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type AlarmCenterClient = {
  getAlarmRecordPage: (query?: unknown) => Promise<unknown>;
  getAlarmRecordsCommonPage: (query?: unknown) => Promise<unknown>;
  deleteAlarmRecords: (payload?: unknown) => Promise<unknown>;
  transferAlarmRecord: (id?: unknown, payload?: unknown) => Promise<unknown>;
  assignAlarmRecord: (id?: unknown, payload?: unknown) => Promise<unknown>;
  suspendAlarmRecord: (id?: unknown, payload?: unknown) => Promise<unknown>;
  handleAlarmRecord: (id?: unknown, payload?: unknown) => Promise<unknown>;
  batchHandleAlarmRecords: (payload?: unknown) => Promise<unknown>;
  confirmAlarmRecord: (id?: unknown) => Promise<unknown>;
  urgeAlarmRecords: (payload?: unknown) => Promise<unknown>;
  repeatPushAlarm: (businessKey?: unknown) => Promise<unknown>;
  getAlarmRecordDetail: (id?: unknown) => Promise<unknown>;
  /** 弹窗详情补全：与 getAlarmRecordDetail 同 path */
  getAlarmDetails: (businessKey?: unknown) => Promise<unknown>;
  /** 联动：按事件取关联摄像机 */
  getVideoListByEventId: (businessKey?: unknown) => Promise<unknown>;
  /** 联动：按事件获取视频动作产生的抓拍图和录像附件 */
  getAlarmVideoEventFiles: (businessKey?: unknown) => Promise<unknown>;
  /** 告警级别音效配置 */
  getAlarmLevelPlayConfig: (query?: { alarmLevelCode?: string }) => Promise<unknown>;
  getAlarmOperatorRecords: (id?: unknown) => Promise<unknown>;
  getAlarmStateEventOperates: (id?: unknown) => Promise<unknown>;
  createAlarmFollow: (payload?: unknown) => Promise<unknown>;
  getAlarmFollowList: (id?: unknown) => Promise<unknown>;
  getAlarmReasons: () => Promise<unknown>;
  getAlarmLevels: (query?: unknown) => Promise<unknown>;
  getEmergencyEventTypes: (query?: unknown) => Promise<unknown>;
  getAlarmLinkageActions: (eventId?: unknown) => Promise<unknown>;
  getAlarmLinkageExecuteRecords: (eventId?: unknown) => Promise<unknown>;
  executeAlarmLinkage: (payload?: unknown) => Promise<unknown>;
  oneKeyExecuteAlarmLinkage: (eventId?: unknown) => Promise<unknown>;
  getAlarmNearbyDevices: (query?: unknown) => Promise<unknown>;
  exportAlarmRecords: (payload?: unknown) => Promise<unknown>;
  // statistics / analysis (GEM)
  getAlarmStatisticByEvent: (query?: unknown) => Promise<unknown>;
  getAlarmStatisticByUser: (query?: unknown) => Promise<unknown>;
  getAlarmLevelStatistic: (query?: unknown) => Promise<unknown>;
  getAlarmAreaStatistic: (query?: unknown) => Promise<unknown>;
  getAlarmAreaTopTen: (query?: unknown) => Promise<unknown>;
  getAlarmDeviceTopTen: (query?: unknown) => Promise<unknown>;
  getAlarmEventStatistic: (query?: unknown) => Promise<unknown>;
  getAlarmTrendAnalysis: (query?: unknown) => Promise<unknown>;
  getAlarmEventAnalysis: (query?: unknown) => Promise<unknown>;
  getAlarmAreaAnalysis: (query?: unknown) => Promise<unknown>;
  getAlarmHandlerAnalysis: (query?: unknown) => Promise<unknown>;
  getAlarmHandlerEfficiencyAnalysis: (query?: unknown) => Promise<unknown>;
  getUserHandlerTopAnalysis: (query?: unknown) => Promise<unknown>;
  getUserHandlerLastTopAnalysis: (query?: unknown) => Promise<unknown>;
  getAlarmTotalStatistic: (query?: unknown) => Promise<unknown>;
  getAlarmStatusGroupStatistics: (query?: unknown) => Promise<unknown>;
  getAlarmTargetStatistic: (query?: unknown) => Promise<unknown>;
  exportAlarmStatisticByEvent: (payload?: unknown) => Promise<unknown>;
  exportAlarmStatisticByUser: (payload?: unknown) => Promise<unknown>;
  // safety-management
  getAlarmSafetyRecords: (query?: unknown) => Promise<unknown>;
  getAlarmSafetyTypes: (query?: unknown) => Promise<unknown>;
  // energy alarm config
  getEnergyAlarmRulesPage: (query?: unknown) => Promise<unknown>;
  createEnergyAlarmRule: (payload?: unknown) => Promise<unknown>;
  updateEnergyAlarmRule: (id?: unknown, payload?: unknown) => Promise<unknown>;
  getEnergyAlarmRule: (id?: unknown) => Promise<unknown>;
  updateEnergyAlarmRuleStatus: (id?: unknown, status?: unknown) => Promise<unknown>;
  // emergency / plan rules (GEM alarmConfigList)
  getEmergencyRulesPage: (query?: unknown) => Promise<unknown>;
  getEmergencyRule: (id?: unknown) => Promise<unknown>;
  createEmergencyRule: (payload?: unknown) => Promise<unknown>;
  updateEmergencyRule: (payload?: unknown) => Promise<unknown>;
  setEmergencyRuleEnabled: (payload?: unknown) => Promise<unknown>;
  deleteEmergencyRule: (id?: unknown) => Promise<unknown>;
  /** 消息中心：全部通知渠道 */
  getSatMsgChannels: () => Promise<unknown>;
  /** 消息中心：场景已选通知渠道 */
  getSatMsgSceneReceive: (sceneCode?: unknown) => Promise<unknown>;
};

export function createAlarmCenterClient(http: HttpClient): AlarmCenterClient {
  return {
    getAlarmRecordPage: async (query?: unknown) => http.get(withQuery(`/api/alarm/alarm-records`, { ...query } as Record<string, unknown>)),
    getAlarmRecordsCommonPage: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-records/common-page`, { ...query } as Record<string, unknown>)),
    deleteAlarmRecords: async (payload?: unknown) => http.post(`/api/alarm/alarm-record/batch-deleted`, { ...payload }),
    transferAlarmRecord: async (id?: unknown, payload?: unknown) => http.put(`/api/alarm/alarm-record/transfer/${id}`, { ...payload }),
    assignAlarmRecord: async (id?: unknown, payload?: unknown) => http.put(`/api/alarm/alarm-record/assign/${id}`, { ...payload }),
    suspendAlarmRecord: async (id?: unknown, payload?: unknown) => http.put(`/api/alarm/alarm-record/suspend/${id}`, { ...payload }),
    handleAlarmRecord: async (id?: unknown, payload?: unknown) => http.put(`/api/alarm/alarm-record/handler/${id}`, { ...payload }),
    batchHandleAlarmRecords: async (payload?: unknown) => http.put(`/api/alarm/alarm-records/batch-handler`, { ...payload }),
    confirmAlarmRecord: async (id?: unknown) => http.put(`/api/alarm/alarm-record/confirmed/${id}`, undefined),
    urgeAlarmRecords: async (payload?: unknown) => http.put(`/api/alarm/alarm-record/urging`, { ...payload }),
    repeatPushAlarm: async (businessKey?: unknown) => http.get(`/api/linkage/rule/re-trigger-event/${businessKey}`),
    getAlarmRecordDetail: async (id?: unknown) => http.get(`/api/alarm/alarm-record/${id}`),
    getAlarmDetails: async (businessKey?: unknown) => http.get(`/api/alarm/alarm-record/${businessKey}`),
    // 对齐 cube-linkage-service：`/api/linkage/event-video/:id`（勿写成 `/linkage/linkage/...`）
    getVideoListByEventId: async (businessKey?: unknown) => http.get(`/api/linkage/event-video/${businessKey}`),
    getAlarmVideoEventFiles: async (businessKey?: unknown) => http.get(`/api/linkage/event-video-file-paths/${businessKey}`),
    getAlarmLevelPlayConfig: async (query?: { alarmLevelCode?: string }) =>
      http.get(withQuery(`/api/alarm/alarm-level/play-config/${query?.alarmLevelCode ?? ""}`, undefined)),
    getAlarmOperatorRecords: async (id?: unknown) => http.get(`/api/alarm/alarm-record/operatorLogs/${id}`),
    getAlarmStateEventOperates: async (id?: unknown) => http.get(`/api/alarm/alarm-record/state-event-operates/${id}`),
    createAlarmFollow: async (payload?: unknown) => http.post(`/api/alarm/alarm-record/follow-up`, { ...payload }),
    getAlarmFollowList: async (id?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-record/${id}/follow-ups`, { id } as Record<string, unknown>)),
    getAlarmReasons: async () => http.get(`/api/alarm/alarm-reasons`),
    getAlarmLevels: async (query?: unknown) => http.get(withQuery(`/api/alarm/sat-alarm-levels`, { ...query } as Record<string, unknown>)),
    getEmergencyEventTypes: async (query?: unknown) =>
      http.get(withQuery(`/api/emergency/emergency-event-types`, { ...query } as Record<string, unknown>)),
    getAlarmLinkageActions: async (eventId?: unknown) => http.get(`/api/linkage/event-iot-device-pros/${eventId}`),
    getAlarmLinkageExecuteRecords: async (eventId?: unknown) => http.get(`/api/linkage/event-iot-device-pro-records/${eventId}`),
    executeAlarmLinkage: async (payload?: unknown) => http.put(`/api/linkage/event-iot-device-pro/ctrl`, { ...payload }),
    oneKeyExecuteAlarmLinkage: async (eventId?: unknown) => http.post(`/api/linkage/event/${eventId}/iot-device-pro/hand/ctrl`, undefined),
    getAlarmNearbyDevices: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-records/ref/devices`, { ...query } as Record<string, unknown>)),
    exportAlarmRecords: async (payload?: unknown) => http.post(`/api/alarm/alarm-records/export`, { ...payload }),
    getAlarmStatisticByEvent: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/event-status-page`, { ...query } as Record<string, unknown>)),
    getAlarmStatisticByUser: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/user-status-page`, { ...query } as Record<string, unknown>)),
    getAlarmLevelStatistic: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/level`, { ...query } as Record<string, unknown>)),
    getAlarmAreaStatistic: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/area-group`, { ...query } as Record<string, unknown>)),
    getAlarmAreaTopTen: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/area-top-ten`, { ...query } as Record<string, unknown>)),
    getAlarmDeviceTopTen: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/device-top-ten`, { ...query } as Record<string, unknown>)),
    getAlarmEventStatistic: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/event-group`, { ...query } as Record<string, unknown>)),
    getAlarmTrendAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/trend-analysis`, { ...query } as Record<string, unknown>)),
    getAlarmEventAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/event-analysis`, { ...query } as Record<string, unknown>)),
    getAlarmAreaAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/area-analysis`, { ...query } as Record<string, unknown>)),
    getAlarmHandlerAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/user-handler-analysis`, { ...query } as Record<string, unknown>)),
    getAlarmHandlerEfficiencyAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/level-handler-efficiency-analysis`, { ...query } as Record<string, unknown>)),
    getUserHandlerTopAnalysis: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/user-handler-efficiency-top-ten-analysis`, { ...query } as Record<string, unknown>)),
    getUserHandlerLastTopAnalysis: async (query?: unknown) =>
      http.get(
        withQuery(`/api/alarm/alarm-statistics/user-handler-efficiency-last-top-ten-analysis`, {
          ...query,
        } as Record<string, unknown>),
      ),
    getAlarmTotalStatistic: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/ring-ratio-analysis`, { ...query } as Record<string, unknown>)),
    getAlarmStatusGroupStatistics: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/status-group`, { ...query } as Record<string, unknown>)),
    getAlarmTargetStatistic: async (query?: unknown) =>
      http.get(withQuery(`/api/alarm/alarm-statistics/target-type`, { ...query } as Record<string, unknown>)),
    exportAlarmStatisticByEvent: async (payload?: unknown) =>
      http.post(`/api/alarm/alarm-statistics/event-status/list/export`, { ...payload }),
    exportAlarmStatisticByUser: async (payload?: unknown) =>
      http.post(`/api/alarm/alarm-statistics/user-status/list/export`, { ...payload }),
    getAlarmSafetyRecords: async (query?: unknown) =>
      http.get(withQuery(`/api/safety-management/alarm-record/page`, { ...query } as Record<string, unknown>)),
    getAlarmSafetyTypes: async (query?: unknown) =>
      http.get(withQuery(`/api/safety-management/alarm-types`, { ...query } as Record<string, unknown>)),
    getEnergyAlarmRulesPage: async (query?: unknown) =>
      http.get(withQuery(`/api/energymanagement/alarm-rules/page`, { ...query } as Record<string, unknown>)),
    createEnergyAlarmRule: async (payload?: unknown) => http.post(`/api/energymanagement/alarm-rules`, { ...payload }),
    updateEnergyAlarmRule: async (id?: unknown, payload?: unknown) => http.put(`/api/energymanagement/alarm-rules/${id}`, { ...payload }),
    getEnergyAlarmRule: async (id?: unknown) => http.get(`/api/energymanagement/alarm-rules/${id}`),
    updateEnergyAlarmRuleStatus: async (id?: unknown, status?: unknown) =>
      http.put(`/api/energymanagement/alarm-rules/updateStatus/${id}/${status}`, undefined),
    getEmergencyRulesPage: async (query?: unknown) =>
      http.get(withQuery(`/api/emergency/emergency-rule/list-page`, { ...query } as Record<string, unknown>)),
    getEmergencyRule: async (id?: unknown) => http.get(`/api/emergency/emergency-rule/${id}`),
    createEmergencyRule: async (payload?: unknown) => http.post(`/api/emergency/emergency-rule`, { ...payload }),
    updateEmergencyRule: async (payload?: unknown) => http.put(`/api/emergency/emergency-rule`, { ...payload }),
    setEmergencyRuleEnabled: async (payload?: unknown) => http.put(`/api/emergency/emergency-rule/enabled`, { ...payload }),
    deleteEmergencyRule: async (id?: unknown) => http.delete(`/api/emergency/emergency-rule/delete/${id}`),
    getSatMsgChannels: async () => http.get(`/api/message2/sat-msg-channels`),
    getSatMsgSceneReceive: async (sceneCode?: unknown) =>
      http.get(`/api/message2/sat-msg-scene-receive/code/${encodeURIComponent(String(sceneCode ?? ""))}`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<AlarmCenterClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createAlarmCenterClient(httpModule.createHttpClientForPlatform(ctx));
}
