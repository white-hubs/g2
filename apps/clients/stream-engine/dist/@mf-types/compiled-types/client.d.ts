import type { PlatformContext } from "@g2-composition/contract";
import { type AttendanceHrClient } from "./attendance-hr-client";
export type { AttendanceHrClient, AttendanceHrPage } from "./attendance-hr-client";
export interface StreamEnginePage<T = Record<string, unknown>> {
    records: T[];
    total: number;
    pages?: number;
}
export interface FormFlowRecord {
    id?: string;
    name?: string;
    code?: string;
    application?: string;
    applicationName?: string;
    type?: string;
    status?: string | number | boolean;
    enable?: boolean;
    updateTime?: string;
    [key: string]: unknown;
}
export interface FormFlowBusiness {
    id?: string;
    formDefinitionId?: string;
    formKey?: string;
    formDefinitionVersion?: number;
    flowKey?: string;
    businessType?: string;
    businessTypeName?: string;
    application?: string;
    applicationName?: string;
    formJson?: string;
    formBizFieldMapList?: Array<{
        controlId: string;
        businessField: string;
    }>;
    [key: string]: unknown;
}
export interface ProcessTaskForm {
    processInstanceId?: string;
    taskId?: string;
    formJson?: string;
    formData?: string | Record<string, unknown>;
    data?: string | Record<string, unknown>;
    flowKey?: string;
    formDefinitionId?: string;
    formKey?: string;
    formDefinitionVersion?: number;
    businessType?: string;
    businessTypeName?: string;
    application?: string;
    applicationName?: string;
    status?: string;
    operations?: string[];
    [key: string]: unknown;
}
export interface FormFlowSubmitPayload {
    application: string;
    applicationName: string;
    businessType: string;
    businessKey?: string;
    data: string;
    flowKey: string;
    formDefinitionId: string;
    formDefinitionVersion: number;
    formKey: string;
    type: string;
    variables?: Record<string, unknown>;
    backLogTitle?: string;
    approveUsers?: Record<string, string>;
}
export interface FormFlowPrecheckPayload {
    formId: string | number;
    formData: string;
}
export interface ApprovalTypeItem {
    code: string;
    name: string;
}
export interface BusinessFieldItem {
    id?: string;
    name: string;
    businessField?: string;
    required?: boolean;
    controlId?: string;
    [key: string]: unknown;
}
export interface StreamEngineNamedTreeNode {
    id: string;
    name: string;
    children?: StreamEngineNamedTreeNode[];
}
export interface FormFlowGroup {
    id: string | number;
    name: string;
}
export interface CustomFormFlow extends FormFlowBusiness {
    name?: string;
    shortName?: string;
    formGroupId?: string | number;
    enable?: boolean;
    permissionType?: "ALL" | "USER" | "ROLE" | "DEPARTMENT";
    permissionIds?: Array<string | number>;
    permissionList?: Array<{
        id: string | number;
        name: string;
    }>;
}
export interface StreamEngineDeviceDetail {
    productPropVoList?: Array<{
        propCode: string;
        propName?: string;
        name?: string;
        unitName?: string;
        dataType?: string;
        dataConstraint?: Array<{
            value: string | number | boolean;
            label: string;
        }>;
    }>;
    snapshots?: Array<{
        key?: string;
        value?: string | number | boolean | null;
    }>;
}
export interface StreamEngineVehiclePeriod {
    begin?: string | null;
    end?: string | null;
}
export interface StreamEngineClient extends AttendanceHrClient {
    listProcessDepartments(): Promise<StreamEngineNamedTreeNode[]>;
    pageProcessRoles(params: {
        pageNumber: number;
        pageSize: number;
        name?: string;
    }): Promise<StreamEnginePage<StreamEngineNamedTreeNode>>;
    getDepartmentAssignments(id: string): Promise<{
        postList: StreamEngineNamedTreeNode[];
        positionList: StreamEngineNamedTreeNode[];
    }>;
    listFormFlowTypes(params?: Record<string, unknown>): Promise<unknown[]>;
    listFormFlowStatuses(params?: Record<string, unknown>): Promise<unknown[]>;
    listFormFlowApplications(params?: Record<string, unknown>): Promise<unknown[]>;
    pageFormFlows(params: Record<string, unknown>): Promise<StreamEnginePage<FormFlowRecord>>;
    deleteFormFlow(id: string | number): Promise<void>;
    enableFormFlow(params: Record<string, unknown>): Promise<void>;
    saveFormFlow(payload: Record<string, unknown>): Promise<unknown>;
    saveCustomFormFlow(payload: Record<string, unknown>): Promise<unknown>;
    getFormFlow(id: string | number): Promise<FormFlowBusiness>;
    getCustomFormFlow(id: string | number): Promise<CustomFormFlow>;
    listFormFlowGroups(params?: {
        application?: string;
    }): Promise<FormFlowGroup[]>;
    getFormFlowQrCode(params: Record<string, unknown>): Promise<unknown>;
    getFormFlowBusiness(params: {
        businessType: string;
    }): Promise<FormFlowBusiness>;
    getFormFlowBusinessFlow(businessType: string): Promise<string>;
    listFormFlows(params: {
        enable?: boolean;
        application?: string;
    }): Promise<FormFlowRecord[]>;
    getProcessTaskForm(id: string): Promise<ProcessTaskForm>;
    submitFormFlowFirst(payload: FormFlowSubmitPayload): Promise<unknown>;
    checkClassesChange(payload: FormFlowPrecheckPayload): Promise<unknown>;
    checkClockRepair(payload: {
        businessType: string;
        flowData: FormFlowPrecheckPayload;
    }): Promise<unknown>;
    submitAttendanceApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
    submitHotelApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
    submitVehicleApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
    submitVisitorApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
    submitPersonnelApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
    submitIllegalParking(payload: FormFlowSubmitPayload): Promise<unknown>;
    completeTask(payload: Record<string, unknown>): Promise<unknown>;
    rejectTask(payload: Record<string, unknown>): Promise<unknown>;
    repeatTask(payload: {
        processInstanceId: string;
    }): Promise<unknown>;
    undoTask(payload: {
        comment: string | null;
        processInstanceId: string;
    }): Promise<unknown>;
    withdrawTask(payload: Record<string, unknown>): Promise<unknown>;
    backTask(payload: Record<string, unknown>): Promise<unknown>;
    transferTask(payload: Record<string, unknown>): Promise<unknown>;
    getLastWriteSign(): Promise<unknown>;
    getProcessHistoricalPath(processInstanceId: string): Promise<unknown>;
    getProcessLine(params: {
        processInstanceId?: string;
        flowKey?: string;
    }): Promise<unknown>;
    appointApprover(payload: Record<string, unknown>): Promise<unknown>;
    reduceAppointApprover(payload: Record<string, unknown>): Promise<unknown>;
    firstTaskActive(processInstanceId: string): Promise<unknown>;
    pageHistoricalAll(params: Record<string, unknown>): Promise<StreamEnginePage>;
    exportHistorical(params: Record<string, unknown>): Promise<Blob>;
    getPrintNodes(processInstanceId: string): Promise<unknown>;
    submitFeedback(payload: Record<string, unknown>): Promise<unknown>;
    getFeedback(params: {
        processInstanceId: string;
        taskNodeKey: string;
    }): Promise<unknown>;
    getFinishedTaskNodes(processInstanceId: string): Promise<unknown>;
    listApprovalTypes(apiPrefix: string, applicationCode?: string): Promise<ApprovalTypeItem[]>;
    listBusinessFormFields(apiPrefix: string, params?: {
        type?: string;
    }): Promise<BusinessFieldItem[]>;
    saveFormFlowBusiness(payload: Record<string, unknown>): Promise<unknown>;
    pageHistorical(params: Record<string, unknown>): Promise<StreamEnginePage>;
    listHiddenDangerTypes(params?: Record<string, unknown>): Promise<unknown[]>;
    listHiddenDangerLevels(): Promise<unknown[]>;
    /** 故障类型：对齐旧 streamengine-pc 的 `/maintain/fault-type/list`。 */
    listFaultTypes(businessType: string): Promise<unknown[]>;
    pageWorkReportTypes(): Promise<StreamEnginePage>;
    listOutsourceCompanies(deviceId?: string): Promise<unknown[]>;
    listOutsourceModes(companyId?: string): Promise<unknown[]>;
    listProjectNames(): Promise<unknown[]>;
    /** 关联人员的车牌号：旧停车服务路径中的 vechicle 拼写需保持原样。 */
    getVehicleNumbers(id: string): Promise<string[]>;
    getVehicleNumberTime(vechicleNo: string): Promise<StreamEngineVehiclePeriod>;
    /** 故障耗材领用选择器的数据源。 */
    pageConsumableStock(params: Record<string, unknown>): Promise<StreamEnginePage>;
    listConsumableCategories(): Promise<StreamEngineNamedTreeNode[]>;
    listAssetClassifications(type: "assetSource" | "assetType" | "reasonForScrapping"): Promise<StreamEngineNamedTreeNode[]>;
    listAssetClassificationTree(type: "assetType"): Promise<StreamEngineNamedTreeNode[]>;
    listAssetWarehouses(): Promise<StreamEngineNamedTreeNode[]>;
    pageAssets(params: Record<string, unknown>): Promise<StreamEnginePage>;
    pageConsumables(params: Record<string, unknown>): Promise<StreamEnginePage>;
    checkAssetCodes(payload: {
        checkSerialNumberList: Array<{
            key?: string | null;
            value: string;
        }>;
    }): Promise<string[]>;
    listWorkPermitTypes(params?: {
        typeName?: string;
    }): Promise<unknown[]>;
    listWorkPermitLevels(params?: {
        typeName?: string;
    }): Promise<unknown[]>;
    pageWorkPermitItems(kind: "RISK_CHECK" | "ACCEPTANCE", params: {
        pageNumber: number;
        pageSize: number;
        typeName?: string;
        workPermitLevel?: string;
    }): Promise<StreamEnginePage>;
    recognizeWorkPermitItem(payload: {
        itemContent: string;
        fileIds: string[];
    }): Promise<unknown>;
    pageParkingVehicles(params: {
        pageNumber: number;
        pageSize: number;
        vehicleNo?: string;
    }): Promise<StreamEnginePage>;
    listParkingLots(): Promise<unknown[]>;
    listOfficialSeals(): Promise<StreamEngineNamedTreeNode[]>;
    listFocusWorkTypes(): Promise<StreamEngineNamedTreeNode[]>;
    getFocusWork(id: string): Promise<StreamEngineNamedTreeNode>;
    listFocusWork(): Promise<StreamEngineNamedTreeNode[]>;
    listFocusWorkStatuses(): Promise<StreamEngineNamedTreeNode[]>;
    getFocusWorkRequirement(id: string): Promise<StreamEngineNamedTreeNode>;
    getFocusWorkCompleteTime(id: string): Promise<StreamEngineNamedTreeNode>;
    getNorthDeviceDetail(deviceId: string): Promise<StreamEngineDeviceDetail>;
    pageTargetObjects(kind: string, params: Record<string, unknown>): Promise<StreamEnginePage>;
    listInspectPointTypes(): Promise<unknown[]>;
    listTargetDeviceProducts(): Promise<unknown[]>;
    listTargetDeviceCategories(): Promise<unknown[]>;
    listTargetDeviceTags(): Promise<unknown[]>;
    listTargetStallTypes(): Promise<unknown[]>;
    listTargetRiskSourceTypes(): Promise<unknown[]>;
    pageOutsourceDevices(params: Record<string, unknown>): Promise<StreamEnginePage>;
    pageAlarmRecords(params: Record<string, unknown>): Promise<StreamEnginePage>;
    /** 区域树：允许旧表单配置同源接口路径，默认 `/mdata/area/list`。 */
    listAreas(params?: Record<string, unknown>, api?: string): Promise<unknown[]>;
    /** 人员档案字段：沿用旧渲染端的员工属性与用户详情接口。 */
    getStaffInfo(params: {
        attr: string;
        id: string;
    }): Promise<{
        id?: string;
        name?: string;
    }>;
    getStaffDetail(id: string): Promise<{
        id?: string;
        name?: string;
    }>;
    listStaff(params: Record<string, unknown>): Promise<unknown>;
}
export interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createStreamEngineClient(http: HttpClient): StreamEngineClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<StreamEngineClient>;
//# sourceMappingURL=client.d.ts.map