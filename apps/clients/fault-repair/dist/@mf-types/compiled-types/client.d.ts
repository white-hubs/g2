import type { PlatformContext } from "@g2-composition/contract";
export interface FaultRecord {
    id?: string | number;
    code?: string;
    submitedTime?: string | number;
    instanceName?: string;
    objName?: string;
    faultType?: string;
    faultTypeName?: string;
    urgencyLevel?: string;
    startUserName?: string;
    status?: string;
    activeNodeName?: string;
    result?: string;
    processInstanceId?: string;
    currentTaskId?: string;
    confirmTime?: string | number;
    completeTime?: string | number;
    timeConsuming?: string | number;
    name?: string;
    productCategoryName?: string;
    typeName?: string;
    createTime?: string | number;
    userName?: string;
    organizationName?: string;
    totalNumber?: number;
    waitNumber?: number;
    dealNumber?: number;
    dealRate?: string | number;
    avgWaitTime?: string;
    [key: string]: unknown;
}
export interface FaultPage {
    records: FaultRecord[];
    total: number;
    pages: number;
}
export interface FaultQuery {
    pageNumber?: number;
    pageSize?: number;
    businessType?: string;
    applicationCode?: string;
    type?: string;
    status?: string;
    submitTime?: string;
    period?: string;
    faultTypeId?: string;
    organizationId?: string;
    keyword?: string;
    progress?: string;
    reportTime?: string;
    productCategoryCode?: string;
}
export interface FaultType {
    id?: string | number;
    name: string;
    [key: string]: unknown;
}
export interface FaultCategory {
    categoryCode: string;
    categoryName: string;
    deviceNum?: number;
    children?: FaultCategory[];
}
export interface FaultAttachment {
    id: string | number;
    name?: string;
    path?: string;
    url?: string;
    type?: string;
    suffix?: string;
}
export interface FaultTrend {
    total: number;
    months: {
        timeFlag: string;
        num: number;
    }[];
}
export interface FaultRepairClient {
    pagePersonal(query: FaultQuery): Promise<FaultPage>;
    pageRecords(query: FaultQuery): Promise<FaultPage>;
    pageOrderStatistics(query: FaultQuery): Promise<FaultPage>;
    pagePersonnelStatistics(query: FaultQuery): Promise<FaultPage>;
    exportOrderStatistics(query: FaultQuery): Promise<Blob>;
    exportPersonnelStatistics(query: FaultQuery): Promise<Blob>;
    listTypes(query?: FaultQuery): Promise<FaultType[]>;
    createType(value: Pick<FaultType, "name"> & {
        applicationCode?: string;
    }): Promise<void>;
    updateType(value: FaultType & {
        id: string | number;
        applicationCode?: string;
    }): Promise<void>;
    deleteType(id: string | number): Promise<void>;
    pageCases(query: FaultQuery): Promise<FaultPage>;
    getCase(id: string | number): Promise<FaultRecord>;
    createCase(value: FaultRecord): Promise<void>;
    updateCase(value: FaultRecord & {
        id: string | number;
    }): Promise<void>;
    deleteCase(id: string | number): Promise<void>;
    pageReports(query: FaultQuery): Promise<FaultPage>;
    reportTypes(): Promise<{
        value: string;
        label: string;
    }[]>;
    createReport(value: {
        type: string;
        reportTime: string;
        applicationCode: string;
    }): Promise<void>;
    deleteReport(id: string | number): Promise<void>;
    reportOverview(id: string | number): Promise<FaultRecord>;
    listDepartments(): Promise<FaultType[]>;
    listFlowNodeNames(query: {
        businessType: string;
    }): Promise<string[]>;
    listCaseCategories(query?: FaultQuery): Promise<FaultCategory[]>;
    listProductCategories(): Promise<FaultCategory[]>;
    uploadCaseFile(file: Blob): Promise<FaultAttachment>;
    getCaseTrend(id: string | number): Promise<FaultTrend>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
/** 旧接口的字典行可能使用 code/name 或 type/typeName，统一交给 Select 的 label/value。 */
export declare function normalizeReportTypes(rows: unknown[]): {
    value: string;
    label: string;
}[];
export declare function createFaultRepairClient(http: HttpClient): FaultRepairClient;
export declare function create(ctx: PlatformContext): Promise<FaultRepairClient>;
//# sourceMappingURL=client.d.ts.map