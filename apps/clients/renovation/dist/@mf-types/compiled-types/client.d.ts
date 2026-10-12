import type { PlatformContext } from "@g2-composition/contract";
/** 更新改造单流程列表行，字段取自旧 `renovationList/list.vue`。 */
export interface RenovationRecord {
    id?: string | number;
    code?: string;
    instanceName?: string;
    objName?: string;
    submitedTime?: string | number;
    startUserName?: string;
    status?: string;
    activeNodeName?: string;
    handleResultName?: string;
    processInstanceId?: string;
    currentTaskId?: string;
    [key: string]: unknown;
}
export interface RenovationPage<T> {
    records: T[];
    total: number;
    pages: number;
}
export interface RenovationQuery {
    pageNumber?: number;
    pageSize?: number;
    businessType?: string;
    type?: string;
    status?: string;
    submitTime?: string;
}
/** 更新改造工单行，字段取自旧 `renovationOrder/list.vue`。 */
export interface RenovationTicket {
    id?: string | number;
    code?: string;
    retrofitObjectName?: string;
    expectSolveDate?: string | number;
    createTime?: string | number;
    status?: string;
    retrofitTicketStatus?: string;
    handleResultStatusName?: string;
    isCanHandle?: boolean;
    isCanAssessmented?: boolean;
    assessment?: RenovationTicketAssessment;
    processEventList?: RenovationProcessEvent[];
    [key: string]: unknown;
}
export interface RenovationTicketQuery {
    pageNumber?: number;
    pageSize?: number;
    /** 旧页 `retrofitTicketStatus`：WAITING_HANDLE / COMPLETED；「所有」不传。 */
    retrofitTicketStatus?: string;
    /** 旧 g-table `defaultDate: "period"`。 */
    period?: string;
    keyword?: string;
}
export interface RenovationTicketAssessment {
    retrofitTicketId?: string | number;
    score?: number | string;
    description?: string;
    imageIdList?: string[];
    imageList?: {
        id?: string;
        path?: string;
    }[];
    preAttribute?: RenovationAttributeStatus[];
    afterAttribute?: RenovationAttributeStatus[];
    [key: string]: unknown;
}
export interface RenovationAttributeStatus {
    id?: string;
    name?: string;
    value?: string;
    isNormal?: boolean;
}
export interface RenovationProcessEvent {
    id?: string;
    action?: string;
    createBy?: string;
    createTime?: string;
    [key: string]: unknown;
}
/** 通知方式枚举，旧页 `{ nodeModelName: label, notModel: value }`。 */
export interface RenovationNotifyChannel {
    nodeModelName?: string;
    notModel?: string;
    [key: string]: unknown;
}
export interface RenovationManagerConfig {
    mgmtType: string;
    mgmtValues: string[];
}
export interface RenovationTrafficConfig {
    id?: string | number | "";
    channelTypes: string[];
    configs: RenovationManagerConfig[];
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
/** 更新改造申请单详情（旧 `retrofit/receipt`）。 */
export interface RenovationReceipt {
    id?: string | number;
    code?: string;
    name?: string;
    [key: string]: unknown;
}
export interface RenovationClient {
    /** 更新改造 2.0 流程列表：`/api/maintain/retrofit-order/page`。 */
    pageOrders(query: RenovationQuery): Promise<RenovationPage<RenovationRecord>>;
    pageTickets(query: RenovationTicketQuery): Promise<RenovationPage<RenovationTicket>>;
    getTicket(id: string | number): Promise<RenovationTicket>;
    deleteTicket(id: string | number): Promise<void>;
    submitTicketAssessment(value: RenovationTicketAssessment): Promise<void>;
    getReceipt(id: string | number): Promise<RenovationReceipt>;
    listNotifyChannels(): Promise<RenovationNotifyChannel[]>;
    getTrafficConfig(): Promise<RenovationTrafficConfig | undefined>;
    saveTrafficConfig(value: RenovationTrafficConfig): Promise<void>;
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
export declare function createRenovationClient(http: HttpClient): RenovationClient;
export declare function create(ctx: PlatformContext): Promise<RenovationClient>;
//# sourceMappingURL=client.d.ts.map