import type { PlatformContext } from "@g2-composition/contract";
/** 委外维修单流程列表行，字段取自旧 `views/repair/repairList/list.vue` 的列定义。 */
export interface OutsourceRecord {
    id?: string | number;
    code?: string;
    instanceName?: string;
    objName?: string;
    submitedTime?: string | number;
    startUserName?: string;
    status?: string;
    activeNodeName?: string;
    /** 旧页处理结果列用 `handleResult`，与故障报修的 `result` 不同。 */
    handleResult?: string;
    activeNodeAssignee?: string;
    processInstanceId?: string;
    currentTaskId?: string;
    [key: string]: unknown;
}
export interface OutsourcePage<T> {
    records: T[];
    total: number;
    pages: number;
}
export interface OutsourceQuery {
    pageNumber?: number;
    pageSize?: number;
    businessType?: string;
    type?: string;
    status?: string;
    submitTime?: string;
}
/** 委外模式。 */
export interface OutsourceMode {
    id?: string | number;
    name: string;
}
/** 委外公司；列表返回 `outsourceModel` / `outsourceScope` 名称数组，提交用 IdList。 */
export interface OutsourceCompany {
    id?: string | number;
    name?: string;
    outsourceModel?: {
        id?: string | number;
        name?: string;
    }[];
    outsourceScope?: {
        id?: string | number;
        name?: string;
    }[];
    outsourceModelIdList?: string[];
    outsourceScopeIdList?: string[];
    responsiblePerson?: string;
    responsiblePersonPhone?: string;
    [key: string]: unknown;
}
/** 委外设备台账行。 */
export interface OutsourceDevice {
    deviceId?: string;
    deviceCode?: string;
    deviceName?: string;
    deviceCategory?: string;
    deviceBrand?: string;
    areaName?: string;
    [key: string]: unknown;
}
export interface OutsourceDeviceQuery {
    pageNumber?: number;
    pageSize?: number;
    keyword?: string;
    applicationCode?: string;
}
/** 通知方式枚举，旧页字段映射 `{ nodeModelName: label, notModel: value }`。 */
export interface OutsourceNotifyChannel {
    nodeModelName?: string;
    notModel?: string;
    [key: string]: unknown;
}
/** 管理人员配置行：MANAGEMENT / DEPARTMENT / POST / PERSONNAL。 */
export interface OutsourceManagerConfig {
    mgmtType: string;
    mgmtValues: string[];
}
/** 故障自动生成委外的开关与去重设置。 */
export interface OutsourceDeDuplicationConfig {
    switchSetting: boolean;
    duration: number | null;
    deDuplicationPeriod: number | null;
}
export interface OutsourceTrafficConfig {
    id?: string | number | "";
    channelTypes: string[];
    configs: OutsourceManagerConfig[];
    deDuplicationConfig: OutsourceDeDuplicationConfig;
}
export interface SatMsgChannelConfig {
    terminal?: string;
    channelType?: string;
    terminalName?: string;
}
export interface SatMsgConfig {
    id?: string | number;
    satMsgDefineCode?: string;
    effectiveDays?: number;
    name?: string;
    notifyExpression?: string;
    enabled?: boolean;
    msgTmpContent?: string;
    satMsgChannelConfigVOS?: SatMsgChannelConfig[];
    satMsgChannelConfigModifyParams?: SatMsgChannelConfig[];
}
/** 委外维修工单行，字段取自旧 `views/repair/repairOrder/list.vue` 的列定义。 */
export interface OutsourceTicket {
    id?: string | number;
    code?: string;
    deviceObjectName?: string;
    outsourceCompanyName?: string;
    outsourceModelName?: string;
    createTime?: string | number;
    ticketStatus?: string;
    handleResult?: string;
    /** 旧页「评价」按钮的可用性由后端下发（注意旧字段名多了个 ed）。 */
    isCanAssessmented?: boolean;
    /** 工单详情附带的委外维修单信息。 */
    applicationReceiptId?: string;
    repairReceiptName?: string;
    /** 工单详情用 `status` 判断是否可验收，列表用 `ticketStatus`。 */
    status?: string;
    taskId?: string;
    checkProcessEvent?: OutsourceProcessEvent[];
    [key: string]: unknown;
}
export interface OutsourceTicketQuery {
    pageNumber?: number;
    pageSize?: number;
    outsourceCompanyId?: string;
    ticketStatus?: string;
    name?: string;
    /** 旧 g-table `defaultDate: "period"`：`开始 00:00:00,结束 23:59:59`。 */
    period?: string;
}
/** 工单评价提交体，旧页 `repairOrderEval`。 */
export interface OutsourceTicketAssessment {
    outsourceRepairTicketId?: string | number;
    score?: number | string;
    description?: string;
    imageIdList?: string[];
    /** 回显用：后端返回已上传图片。 */
    imageList?: {
        id?: string;
        path?: string;
    }[];
    [key: string]: unknown;
}
/** 流程时间线节点，旧页 steps 的数据源。 */
export interface OutsourceProcessEvent {
    id?: string;
    action?: string;
    createBy?: string;
    createTime?: string;
    handleUserName?: string;
    taskId?: string;
    [key: string]: unknown;
}
/** 三段流程事件线：申请 / 处理 / 验收。 */
export interface OutsourceReceiptEventLine {
    checkProcessEvent?: OutsourceProcessEvent[];
    handleProcessEvent?: OutsourceProcessEvent[];
    acceptanceProcessEvent?: OutsourceProcessEvent[];
}
/** 委外确认信息，旧 `repairList/details.vue` 的 `confirmInfo`。 */
export interface OutsourceConfirmInfo {
    confirmUsername?: string;
    confirmResult?: string;
    confirmTime?: string;
    outsourceCompanyName?: string;
    outsourceModelName?: string;
    applicationCheckProcessName?: string;
    acceptanceProcessName?: string;
    taskId?: string;
    [key: string]: unknown;
}
/** 委外维修单（申请单）详情。 */
export interface OutsourceReceipt {
    id?: string | number;
    code?: string;
    name?: string;
    deviceObjectName?: string;
    faultTime?: string;
    submitUserName?: string;
    createTime?: string;
    repairReason?: string;
    files?: {
        id?: string;
        path?: string;
        name?: string;
    }[];
    status?: string;
    ticketId?: string;
    taskId?: string;
    waitConfirmUsers?: {
        id?: string;
        name?: string;
    }[];
    confirmInfo?: OutsourceConfirmInfo;
    isCanConfirm?: boolean;
    isCanAcceptance?: boolean;
    isCanAssessment?: boolean;
    isCanCheck?: boolean;
    [key: string]: unknown;
}
/** 维修确认提交体，旧页 `repairListConfirm`。 */
export interface OutsourceReceiptConfirmPayload {
    applicationReceiptId?: string;
    confirmResult?: string;
    outsourceCompanyId?: string;
    outsourceModelId?: string;
    applicationCheckProcessKey?: string;
    acceptanceProcessKey?: string;
    description?: string;
    imageIdList?: string[];
}
/** 流程任务表单项（`formItemVOS`）。 */
export interface ProcessFormItem {
    id?: string;
    name?: string;
    type?: string;
    defaultValue?: string;
    [key: string]: unknown;
}
/** `GET /api/process/form/task/{taskId}` 返回的待处理表单。 */
export interface ProcessTaskForm {
    id?: string;
    formName?: string;
    actions?: string[];
    formItemVOS?: ProcessFormItem[];
    /** 旧页把自定义表单设计 JSON 放在 `definition`（字符串）。 */
    definition?: string;
    [key: string]: unknown;
}
/** `POST /api/process/user-tasks/complete` 提交体。 */
export interface ProcessTaskCompletePayload {
    taskId?: string;
    outcome?: string;
    formValueModifyParam?: {
        processId?: string;
        formId?: string;
        formValues?: {
            formItemId?: string;
            val?: unknown;
        }[];
        formData?: unknown[];
    };
}
/** 流程定义下拉项，旧 g-select `field: { name: "label", key: "value" }`。 */
export interface ProcessDefinition {
    id?: string;
    key?: string;
    name?: string;
    [key: string]: unknown;
}
/** 已办结节点的表单回显，旧页 `processForm`。 */
export interface ProcessEventForm {
    formName?: string;
    operation?: string;
    formValues?: {
        formItemId?: string;
        formItemName?: string;
        val?: unknown;
    }[];
    formData?: unknown;
    [key: string]: unknown;
}
export interface OutsourceRepairClient {
    pagePersonal(query: OutsourceQuery): Promise<OutsourcePage<OutsourceRecord>>;
    listModes(): Promise<OutsourceMode[]>;
    createMode(value: OutsourceMode): Promise<void>;
    updateMode(value: OutsourceMode & {
        id: string | number;
    }): Promise<void>;
    deleteMode(id: string | number): Promise<void>;
    listCompanies(): Promise<OutsourceCompany[]>;
    getCompany(id: string | number): Promise<OutsourceCompany>;
    createCompany(value: OutsourceCompany): Promise<void>;
    updateCompany(value: OutsourceCompany & {
        id: string | number;
    }): Promise<void>;
    deleteCompany(id: string | number): Promise<void>;
    pageDevices(query: OutsourceDeviceQuery): Promise<OutsourcePage<OutsourceDevice>>;
    importDevices(deviceInstanceIds: string[]): Promise<void>;
    removeDevice(deviceId: string | number): Promise<void>;
    batchRemoveDevices(deviceInstanceIds: string[]): Promise<void>;
    listNotifyChannels(): Promise<OutsourceNotifyChannel[]>;
    getTrafficConfig(): Promise<OutsourceTrafficConfig | undefined>;
    saveTrafficConfig(value: OutsourceTrafficConfig): Promise<void>;
    listSatMsgConfigs(satMsgDefineCodes: string): Promise<SatMsgConfig[]>;
    createSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
    updateSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
    pageTickets(query: OutsourceTicketQuery): Promise<OutsourcePage<OutsourceTicket>>;
    getTicket(id: string | number): Promise<OutsourceTicket>;
    submitTicketAssessment(value: OutsourceTicketAssessment): Promise<void>;
    getTicketAssessment(ticketId: string | number): Promise<OutsourceTicketAssessment | undefined>;
    getReceipt(id: string | number): Promise<OutsourceReceipt>;
    deleteReceipt(id: string | number): Promise<void>;
    confirmReceipt(value: OutsourceReceiptConfirmPayload): Promise<void>;
    getReceiptEventLine(receiptId: string | number): Promise<OutsourceReceiptEventLine>;
    getProcessTaskForm(taskId: string | number): Promise<ProcessTaskForm | undefined>;
    completeProcessTask(value: ProcessTaskCompletePayload): Promise<void>;
    listProcessDefinitions(): Promise<ProcessDefinition[]>;
    getProcessForm(eventId: string | number): Promise<ProcessEventForm | undefined>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createOutsourceRepairClient(http: HttpClient): OutsourceRepairClient;
export declare function create(ctx: PlatformContext): Promise<OutsourceRepairClient>;
//# sourceMappingURL=client.d.ts.map