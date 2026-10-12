import type { PlatformContext } from "@g2-composition/contract";
export type SmallEngineeringRecord = Record<string, unknown> & {
    id?: string;
    processInstanceId?: string;
};
export interface SmallEngineeringPage<T = SmallEngineeringRecord> {
    records: T[];
    total: number;
    pages: number;
}
export interface SmallEngineeringStatistics {
    total?: number;
    apply?: number;
    signing?: number;
    underway?: number;
    completed?: number;
    waitAccept?: number;
    abnormal?: number;
    normal?: number;
    ringRatio?: number;
}
export interface SmallEngineeringClient {
    projectStatistics(params?: Record<string, unknown>): Promise<SmallEngineeringStatistics>;
    projectHomeStatistics(params?: Record<string, unknown>): Promise<SmallEngineeringStatistics>;
    listProjectNodes(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    listProjectApplies(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    listSignContracts(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    getProjectDetail(id: string): Promise<SmallEngineeringRecord>;
    listSchedules(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    getScheduleDetail(id: string): Promise<SmallEngineeringRecord>;
    listScheduleTracks(id: string): Promise<SmallEngineeringRecord[]>;
    listScheduleFeedbacks(params: {
        feedbackType: string;
        scheduleId: string;
    }): Promise<SmallEngineeringRecord[]>;
    getFeedbackDetail(id: string): Promise<SmallEngineeringRecord>;
    saveSchedule(value: SmallEngineeringRecord): Promise<unknown>;
    updateSchedule(value: SmallEngineeringRecord): Promise<unknown>;
    deleteSchedules(ids: string[]): Promise<unknown>;
    submitScheduleFeedback(value: SmallEngineeringRecord): Promise<unknown>;
    submitScheduleAcceptance(value: SmallEngineeringRecord): Promise<unknown>;
    listProjectTypes(params?: Record<string, unknown>): Promise<SmallEngineeringRecord[]>;
    pageProjectTypes(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    saveProjectType(value: {
        id?: string;
        name: string;
    }): Promise<unknown>;
    deleteProjectType(id: string): Promise<unknown>;
    listReforms(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    reformAnalysis(params: Record<string, unknown>): Promise<SmallEngineeringRecord>;
    listTemporaryPatrols(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
    getTemporaryPatrol(id: string): Promise<SmallEngineeringRecord>;
    isProjectAbnormal(id: string): Promise<string>;
    submitTemporaryPatrol(value: SmallEngineeringRecord): Promise<unknown>;
    listOrganizations(): Promise<SmallEngineeringRecord[]>;
    getMessageConfig(params: {
        businessType: string;
        label: string;
    }): Promise<SmallEngineeringRecord[]>;
    saveMessageConfig(value: SmallEngineeringRecord): Promise<unknown>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createSmallEngineeringClient(http: HttpClient): SmallEngineeringClient;
export declare function create(ctx: PlatformContext): Promise<SmallEngineeringClient>;
//# sourceMappingURL=client.d.ts.map