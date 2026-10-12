import type { PlatformContext } from "@g2-composition/contract";
export interface ProblemRecord {
    id?: string | number;
    code?: string;
    submitedTime?: string | number;
    instanceName?: string;
    hiddenObjName?: string;
    hiddenType?: string;
    urgencyLevel?: string;
    startUserName?: string;
    status?: string;
    activeNodeName?: string;
    result?: string;
    processInstanceId?: string;
    currentTaskId?: string;
    name?: string;
    hiddenDangerCategoryId?: string;
    hiddenDangerCategoryName?: string;
    hiddenTypeName?: string;
    userName?: string;
    organizationName?: string;
    totalNumber?: number;
    waitNumber?: number;
    dealNumber?: number;
    dealRate?: string | number;
    avgWaitTime?: string;
    [key: string]: unknown;
}
export interface ProblemPage {
    records: ProblemRecord[];
    total: number;
    pages: number;
}
export interface ProblemQuery {
    pageNumber: number;
    pageSize: number;
    businessType?: string;
    applicationCode?: string;
    type?: string;
    status?: string;
    submitTime?: string;
    period?: string;
    hiddenDangerTypeId?: string;
    organizationId?: string;
    keyword?: string;
}
export interface ProblemConfig {
    id?: string | number;
    name: string;
    hiddenDangerCategoryId?: string | number;
    hiddenDangerCategoryName?: string;
}
export interface ProblemsClient {
    pagePersonal(query: ProblemQuery): Promise<ProblemPage>;
    pageRecords(query: ProblemQuery): Promise<ProblemPage>;
    pageOrderStatistics(query: ProblemQuery): Promise<ProblemPage>;
    pagePersonnelStatistics(query: ProblemQuery): Promise<ProblemPage>;
    listDegrees(): Promise<ProblemConfig[]>;
    createDegree(value: Pick<ProblemConfig, "name">): Promise<void>;
    updateDegree(value: ProblemConfig & {
        id: string | number;
    }): Promise<void>;
    deleteDegree(id: string | number): Promise<void>;
    listCategories(): Promise<ProblemConfig[]>;
    createCategory(value: Pick<ProblemConfig, "name">): Promise<void>;
    updateCategory(value: ProblemConfig & {
        id: string | number;
    }): Promise<void>;
    deleteCategory(id: string | number): Promise<void>;
    listTypes(query?: {
        hiddenDangerCategoryId?: string;
        pageNumber?: number;
        pageSize?: number;
    }): Promise<ProblemConfig[]>;
    createType(value: ProblemConfig): Promise<void>;
    updateType(value: ProblemConfig & {
        id: string | number;
    }): Promise<void>;
    deleteType(id: string | number): Promise<void>;
    listDepartments(): Promise<ProblemConfig[]>;
    exportOrderStatistics(query: ProblemQuery): Promise<Blob>;
    exportPersonnelStatistics(query: ProblemQuery): Promise<Blob>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createProblemsClient(http: HttpClient): ProblemsClient;
export declare function create(ctx: PlatformContext): Promise<ProblemsClient>;
//# sourceMappingURL=client.d.ts.map