import type { PlatformContext } from "@g2-composition/contract";
/** 维保计划列表/详情记录；字段名保持旧 `/api/maintain` 契约。 */
export interface MaintenancePlanRecord {
    id?: string | number;
    maintenancePlanName?: string;
    responsibilityType?: string;
    responsibilityPersonName?: string;
    maintenanceCycle?: number | string | null;
    timeUnit?: string;
    maintenanceTimePoint?: string | number;
    cronExpression?: string;
    planStartTime?: string | number;
    planEndTime?: string | number;
    taskNum?: number;
    status?: string;
    remark?: string;
    way?: string;
    receiveIds?: string[];
    receiveDeptIds?: string[];
    receivePostIds?: string[];
    ruleDetails?: MaintenanceRuleCondition[];
    maintenaceObjectsList?: MaintenancePlanObject[];
}
/** 计划详情中的维保对象（设备 + 已选维保项）。 */
export interface MaintenancePlanObject {
    id?: string | number;
    keyId?: string | number;
    objectName?: string;
    categoryName?: string;
    categoryCode?: string;
    areaName?: string;
    area?: string;
    objectProjects?: MaintenanceProjectItem[];
    /** 旧页提交时携带的已选维保项主键与数量。 */
    projectIds?: string[];
    itemNum?: number;
}
/** 规则触发条件表达式。 */
export interface MaintenanceRuleConditionExp {
    id?: string;
    propCode?: string;
    propName?: string;
    propUnit?: string;
    op?: string | null;
    oprand?: string;
    delayTime?: number;
    startDelayTime?: number;
    endDelayTime?: number;
    emergencyRuleConditionId?: string;
    emergencyRuleId?: string;
}
/** 规则触发条件。 */
export interface MaintenanceRuleCondition {
    id?: string;
    deviceProdCategoryCodeConcat?: string;
    deviceProdCategoryName?: string;
    deviceProdId?: string;
    deviceProdName?: string;
    conditionType?: string | null;
    deviceEventCode?: string;
    deviceEventName?: string;
    deviceEventType?: string;
    emergencyRuleConditionExps?: MaintenanceRuleConditionExp[];
}
/** 维保任务列表/详情记录。 */
export interface MaintenanceTaskRecord {
    id?: string | number;
    code?: string;
    planId?: string;
    maintenanceTime?: string | number;
    maintenancePlanName?: string;
    objectName?: string;
    categoryName?: string;
    responsibilityType?: string;
    responsibilityPersonName?: string;
    responsibilityPositionName?: string;
    maintenanceTaskStatus?: string;
    maintenanceFinishTime?: string | number;
    maintenanceTaskPerson?: string;
    taskRemark?: string;
    fileVOS?: MaintenanceFile[];
    maintenanceProgetRecordVos?: MaintenanceProgetRecord[];
}
export interface MaintenanceFile {
    id?: string | number;
    name?: string;
    path?: string;
    url?: string;
}
/** 维保结果记录行。 */
export interface MaintenanceProgetRecord {
    id?: string;
    taskId?: string;
    maintrenaceProject?: string;
    record?: string;
    maintenanceDescribe?: string;
}
/** 产品品类维保项配置列表行。 */
export interface MaintenanceProjectRecord {
    id?: string | number;
    categoryCode?: string;
    categoryName?: string;
    maintenanceItemNum?: number;
}
/** 单条维保内容。 */
export interface MaintenanceProjectItem {
    id?: string | number;
    code?: string;
    categoryCode?: string;
    categoryName?: string;
    maintenanceContent?: string;
    deleted?: boolean;
}
/** 维保统计行。 */
export interface MaintenanceStatisticsRecord {
    id?: string | number;
    name?: string;
    categoryName?: string;
    num?: number;
    lastTime?: string | number;
}
/** OUAA 岗位。 */
export interface MaintenanceAppointment {
    id: string;
    name: string;
}
/** 平台消息通道配置（旧 `/api/message/sat-msg-configs`）。 */
export interface SatMsgChannelConfig {
    terminal?: string;
    channelType?: string;
    terminalName?: string;
}
export interface SatMsgConfig {
    id?: string | number;
    satMsgDefineCode?: string;
    effectiveDays?: number;
    notifyExpression?: string;
    enabled?: boolean;
    msgTmpContent?: string;
    satMsgChannelConfigVOS?: SatMsgChannelConfig[];
    satMsgChannelConfigModifyParams?: SatMsgChannelConfig[];
}
export interface MaintenancePage<T> {
    records: T[];
    total: number;
    pages: number;
}
export interface MaintenancePlanQuery {
    pageNumber?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
}
export interface MaintenanceTaskQuery {
    pageNumber?: number;
    pageSize?: number;
    categoryCode?: string;
    objectName?: string;
    maintenanceTaskStatus?: string;
    period?: string;
}
export interface MaintenanceStatisticsQuery {
    pageNumber?: number;
    pageSize?: number;
    categoryCode?: string;
    keyword?: string;
    period?: string;
}
/** 保存计划提交体：与旧 `save-maintenance-plan` DTO 对齐。 */
export interface MaintenancePlanSavePayload extends Omit<MaintenancePlanRecord, "status" | "maintenaceObjectsList"> {
    status?: string;
    maintenanceObjectCommands?: MaintenancePlanObject[];
}
/** 维保执行提交体。 */
export interface MaintenanceProgetRecordPayload {
    id: string;
    planId?: string;
    taskRemark?: string;
    fileIds?: string[];
    maintenanceProgetRecordCommands?: MaintenanceProgetRecord[];
}
export interface MaintenanceClient {
    pagePlans(query: MaintenancePlanQuery): Promise<MaintenancePage<MaintenancePlanRecord>>;
    listPlanStatus(): Promise<{
        label: string;
        value: string;
    }[]>;
    getPlan(id: string | number): Promise<MaintenancePlanRecord>;
    savePlan(payload: MaintenancePlanSavePayload): Promise<void>;
    updatePlanStatus(payload: {
        id: string | number;
        status: string;
    }): Promise<void>;
    deletePlan(id: string | number): Promise<void>;
    pageTasks(query: MaintenanceTaskQuery): Promise<MaintenancePage<MaintenanceTaskRecord>>;
    getTask(id: string | number): Promise<MaintenanceTaskRecord>;
    saveProgetRecord(payload: MaintenanceProgetRecordPayload): Promise<void>;
    pageMaintenanceProjects(query: {
        pageNumber?: number;
        pageSize?: number;
        categoryCode?: string;
    }): Promise<MaintenancePage<MaintenanceProjectRecord>>;
    listMaintenanceProjectItems(query: {
        categoryCode?: string;
    }): Promise<MaintenanceProjectItem[]>;
    saveMaintenanceProjectItems(items: MaintenanceProjectItem[]): Promise<void>;
    pageDeviceStatistics(query: MaintenanceStatisticsQuery): Promise<MaintenancePage<MaintenanceStatisticsRecord>>;
    exportDeviceStatistics(query: MaintenanceStatisticsQuery): Promise<Blob>;
    listAppointments(query?: {
        enabled?: boolean;
    }): Promise<MaintenanceAppointment[]>;
    listSatMsgConfigs(satMsgDefineCodes: string): Promise<SatMsgConfig[]>;
    createSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
    updateSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
/** 旧 `getStatus` 可能返回字符串数组或 {code,name} 字典行，统一成 Select 的 label/value。 */
export declare function normalizePlanStatusOptions(rows: unknown[]): {
    label: string;
    value: string;
}[];
export declare function createMaintenanceClient(http: HttpClient): MaintenanceClient;
export declare function create(ctx: PlatformContext): Promise<MaintenanceClient>;
//# sourceMappingURL=client.d.ts.map