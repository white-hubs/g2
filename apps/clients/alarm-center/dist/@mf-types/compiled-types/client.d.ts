import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
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
    getAlarmLevelPlayConfig: (query?: {
        alarmLevelCode?: string;
    }) => Promise<unknown>;
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
    getAlarmSafetyRecords: (query?: unknown) => Promise<unknown>;
    getAlarmSafetyTypes: (query?: unknown) => Promise<unknown>;
    getEnergyAlarmRulesPage: (query?: unknown) => Promise<unknown>;
    createEnergyAlarmRule: (payload?: unknown) => Promise<unknown>;
    updateEnergyAlarmRule: (id?: unknown, payload?: unknown) => Promise<unknown>;
    getEnergyAlarmRule: (id?: unknown) => Promise<unknown>;
    updateEnergyAlarmRuleStatus: (id?: unknown, status?: unknown) => Promise<unknown>;
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
export declare function createAlarmCenterClient(http: HttpClient): AlarmCenterClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<AlarmCenterClient>;
export {};
//# sourceMappingURL=client.d.ts.map