import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  CompleteFumigationWorkPayload,
  CreateFumigationWorkPayload,
  FumigationApprovalAction,
  FumigationApprovalNode,
  FumigationApplicationMethodCode,
  FumigationArchiveQuery,
  FumigationArchiveRecord,
  FumigationArchiveDocument,
  FumigationAttachment,
  FumigationCameraOption,
  FumigationCheckPropertyValue,
  FumigationCheckStatus,
  FumigationDeviceOption,
  FumigationDeviceProperty,
  FumigationEnumOption,
  FumigationGrainVarietyOption,
  FumigationLinkedDevice,
  FumigationPageResult,
  FumigationPesticideTypeCode,
  FumigationPrecheckResult,
  FumigationPrecheckStepId,
  FumigationRealtimeSituation,
  FumigationRealtimeSituationAlarmItem,
  FumigationRealtimeSituationDeviceItem,
  FumigationRealtimeSituationStats,
  FumigationRealtimeSituationWarehouseItem,
  FumigationRealtimeSituationWorkItem,
  FumigationRealtimeSituationWorks,
  FumigationWarehouseOption,
  FumigationWorkerOption,
  FumigationWorkPerson,
  FumigationWork,
  FumigationWorkQuery,
  RunFumigationPrecheckPayload,
  SendFumigationNotificationPayload,
  SubmitFumigationApprovalPayload,
  TerminateFumigationWorkPayload,
} from "@g2-contract/fumigation-operation";
import type { EmployeeCertVO, PersonVO } from "@g2-contract/safety-personnel";

import { ProxyClient } from "@/clients/proxy-client";
import { DeviceCenterProxyService } from "@/services/proxy/device-center/device-center-proxy.service";
import { OuaaProxyService } from "@/services/proxy/ouaa/ouaa-proxy.service";
import { SafetyPersonnelProxyService } from "@/services/proxy/safety-personnel/safety-personnel-proxy.service";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data: T;
}

interface BackendPage<T> {
  pages?: number;
  records?: T[];
  total?: number;
}

interface BackendApprovalRecord {
  id?: string | number;
  approvalNode?: string;
  node?: string;
  nodeName?: string;
  approvalNodeName?: string;
  action?: string;
  approvalAction?: string;
  approverUserId?: string | number;
  approvalUserId?: string | number;
  operatorId?: string | number;
  userId?: string | number;
  operatorName?: string;
  approvalUserName?: string;
  approverName?: string;
  opinion?: string;
  approvalOpinion?: string;
  approvalTime?: string;
  at?: string;
}

interface BackendCheckRecord {
  id?: string | number;
  deviceId?: string | number;
  stepCode?: string;
  stepName?: string;
  result?: string;
  message?: string;
  propertyValues?: string | Record<string, unknown> | unknown[];
  rule?: string | Record<string, unknown>;
  valuesJson?: string | Record<string, unknown> | unknown[];
  values?: string | Record<string, unknown> | unknown[];
  checkedTime?: string | number;
}

interface BackendOperationPerson {
  id?: string | number;
  userId?: string | number;
  userName?: string;
  name?: string;
  personName?: string;
  phone?: string;
  deptName?: string;
  department?: string;
  postName?: string;
  positionName?: string;
  role?: string;
  certId?: string | number;
  certName?: string;
  certNo?: string;
  certValidEnd?: string;
  validEnd?: string;
  certExpireStatus?: string;
  certValidAtCreate?: boolean;
}

interface BackendFileVO {
  id?: string | number;
  name?: string;
  path?: string;
  suffix?: string;
  size?: number;
  type?: string;
  businessKey?: string | number | null;
}

interface BackendAttachment {
  id?: string | number;
  name?: string;
  path?: string;
  suffix?: string;
  size?: number;
  sceneCode?: string;
  fileVO?: BackendFileVO;
  fileVo?: BackendFileVO;
}

interface BackendWork {
  id?: string | number;
  operationNo?: string;
  status?: string;
  statusName?: string;
  warehouseId?: string | number;
  warehouseCode?: string;
  warehouseName?: string;
  grainVarietyId?: string;
  grainVarietyName?: string;
  associatedDeviceId?: string | number;
  associatedDeviceName?: string;
  associatedDeviceCode?: string;
  grainQuantity?: number;
  pesticideTypeCode?: string;
  pesticideTypeName?: string;
  pesticideDosage?: string;
  applicationMethodCode?: string;
  applicationMethodName?: string;
  sealedDays?: number;
  expectedVentilationTime?: string;
  expectedVentilationAt?: string;
  expectedDurationMinutes?: number;
  createTime?: string;
  plannedStartTime?: string;
  archiveTime?: string;
  actualPeopleCount?: number;
  currentApprovalNode?: string | null;
  currentApprovalNodeName?: string;
  approvalRecords?: BackendApprovalRecord[];
  checkRecords?: BackendCheckRecord[];
  people?: BackendOperationPerson[];
  completionDesc?: string;
  terminationReason?: string;
  safetyMeasures?: string;
  attachmentsSceneCode?: string;
  attachments?: BackendAttachment[];
  remark?: string;
  applicantName?: string;
  availableActions?: string[];
}

interface BackendCheckOverview {
  records?: BackendCheckRecord[];
}

interface BackendDevice {
  id?: string | number;
  deviceId?: string | number;
  deviceCode?: string;
  deviceName?: string;
  areaName?: string;
  properties?: BackendDeviceProperty[];
  cameras?: BackendDeviceVideo[];
  linkedDevices?: BackendDevice[];
  alarmFlow?: BackendAlarmTimeline[];
  indoorPh3Trend?: BackendTrendPoint[];
}

interface BackendDeviceVideo {
  id?: string | number;
  name?: string;
  code?: string;
  thirdPartyId?: string;
}

interface BackendAlarmTimeline {
  alarmId?: string | number;
  alarmEventName?: string;
  alarmLevelName?: string;
  status?: string;
  alarmTime?: string;
  content?: string;
}

interface BackendTrendPoint {
  time?: string;
  value?: number | string;
  unit?: string;
}

interface BackendAlarmRecord {
  id?: string | number;
  alarmEventName?: string;
  alarmTime?: string | number;
  alarmStatusName?: string;
}

interface BackendRealtimeSituationStats {
  inProgressCount?: number;
  completedTodayCount?: number;
  monthCreatedCount?: number;
  precheckPassRate?: number | string;
  lastMonthWorkCount?: number;
  currentMonthWorkCount?: number;
  lastMonthPrecheckPassRate?: number | string;
  currentMonthPrecheckPassRate?: number | string;
}

interface BackendRealtimeSituationWorkItem {
  id?: number | string;
  code?: string;
  warehouseId?: number | string;
  warehouseName?: string;
  grainVarietyName?: string;
  pesticideSummary?: string;
  workerCount?: number;
  remainingLabel?: string;
  completedTime?: string;
  status?: string;
}

interface BackendRealtimeSituationWarehouseItem {
  warehouseId?: string;
  warehouseName?: string;
  grainType?: string;
  statusLabel?: string;
  status?: string;
}

interface FumigationRealtimeSituationBackend {
  stats?: BackendRealtimeSituationStats;
  inProgressWorks?: BackendRealtimeSituationWorkItem[];
  completedTodayWorks?: BackendRealtimeSituationWorkItem[];
  warehouses?: BackendRealtimeSituationWarehouseItem[];
}

interface BackendDeviceProperty {
  code?: string;
  name?: string;
  value?: unknown;
  unit?: string;
  ts?: string | number;
}

interface FrontendRemarkPayload {
  plannedDosage?: string;
  warehouseCode?: string;
  grainQuantity?: number;
  pesticideType?: string;
  pesticideTypeCode?: string;
  pesticideTypeName?: string;
  pesticideDosage?: string;
  applicationMethod?: string;
  applicationMethodCode?: string;
  applicationMethodName?: string;
  sealedDays?: number;
  expectedVentilationAt?: string;
  safetyLead?: string;
  technicalLead?: string;
  siteLeader?: string;
  safetyDisclosure?: string;
  emergencyPlan?: string;
  safetyMeasures?: string;
  attachmentsSceneCode?: string;
  attachments?: BackendAttachment[];
}

const hasData = <T>(value: unknown): value is LegacyResponse<T> => value !== null && typeof value === "object" && "data" in value;

const STATUS_TO_FRONT: Record<string, FumigationWork["status"]> = {
  SAFETY_APPROVING: "SAFETY_APPROVING",
  TECH_APPROVING: "TECH_APPROVING",
  PENDING_CHECK: "PENDING_CHECK",
  CHECK_FAILED: "CHECK_FAILED",
  PENDING_START: "PENDING_START",
  EXECUTING: "PENDING_START",
  ARCHIVED: "ARCHIVED",
  REJECTED: "REJECTED",
};

const STATUS_TO_BACKEND: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_FRONT).map(([backend, front]) => [front, backend]),
);

const NODE_TO_FRONT: Record<string, FumigationApprovalNode> = {
  SAFETY_APPROVAL: "safety",
  TECH_APPROVAL: "technical",
};

const ACTION_TO_FRONT: Record<string, FumigationApprovalAction> = {
  APPROVE: "approved",
  REJECT: "rejected",
};

const ACTION_TO_BACKEND: Record<FumigationApprovalAction, string> = {
  approved: "APPROVE",
  rejected: "REJECT",
};

const STEP_TO_BACKEND: Record<FumigationPrecheckStepId, string> = {
  VENTILATION_DURATION: "VENTILATION_DURATION",
  PH3_CONCENTRATION: "PH3_CONCENTRATION",
  OXYGEN_CONCENTRATION: "OXYGEN_CONCENTRATION",
};

const PRECHECK_STEP_ORDER: FumigationPrecheckStepId[] = ["VENTILATION_DURATION", "PH3_CONCENTRATION", "OXYGEN_CONCENTRATION"];

const STEP_TO_FRONT: Record<string, FumigationPrecheckStepId> = {
  VENTILATION_DURATION: "VENTILATION_DURATION",
  PH3_CONCENTRATION: "PH3_CONCENTRATION",
  OXYGEN_CONCENTRATION: "OXYGEN_CONCENTRATION",
};

const CHECK_STATUS_TO_FRONT: Record<string, FumigationCheckStatus> = {
  PASS: "passed",
  FAIL: "failed",
};

const PESTICIDE_TYPE_NAME: Record<string, string> = {
  ALUMINUM_PHOSPHIDE: "磷化铝",
  PHOSPHINE: "磷化氢",
  SULFURYL_FLUORIDE: "硫酰氟",
};

const APPLICATION_METHOD_NAME: Record<string, string> = {
  MANUAL_DOSING: "人工投药",
  MECHANICAL_DOSING: "机械施药",
  PIPELINE_DOSING: "管道投药",
};

const DEFAULT_PRECHECKS: Record<FumigationPrecheckStepId, FumigationPrecheckResult> = {
  VENTILATION_DURATION: {
    stepId: "VENTILATION_DURATION",
    title: "通风时长检测",
    status: "pending",
    message: "待校验",
    checkedAt: "",
    values: [],
    propertyValues: [],
  },
  PH3_CONCENTRATION: {
    stepId: "PH3_CONCENTRATION",
    title: "磷化氢浓度检测",
    status: "pending",
    message: "待校验",
    checkedAt: "",
    values: [],
    propertyValues: [],
  },
  OXYGEN_CONCENTRATION: {
    stepId: "OXYGEN_CONCENTRATION",
    title: "氧气浓度检测",
    status: "pending",
    message: "待校验",
    checkedAt: "",
    values: [],
    propertyValues: [],
  },
};

@Injectable()
export class FumigationOperationProxyService {
  private readonly baseUrl: string;

  public constructor(
    private readonly proxyClient: ProxyClient,
    private readonly safetyPersonnelProxy: SafetyPersonnelProxyService,
    private readonly ouaaProxyService: OuaaProxyService,
    private readonly deviceCenterProxy: DeviceCenterProxyService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.securityManagementUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): FumigationPageResult<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async listWorks(params: FumigationWorkQuery): Promise<FumigationPageResult<FumigationWork>> {
    const page = await this.forwardGet<BackendPage<BackendWork>>(
      "/fumigation-operations",
      {
        ...params,
        status: params.status ? STATUS_TO_BACKEND[params.status] : undefined,
      },
      this.emptyPage(),
    );
    const records = page.records ?? [];
    await this.enrichWorksApprovalRecordOperatorNames(records);
    return {
      total: Number(page.total ?? 0),
      pages: Number(page.pages ?? 0),
      records: records.map((item) => this.toFumigationWork(item)),
    };
  }

  public async getWork(id: string): Promise<FumigationWork> {
    const detail = await this.forwardGet<BackendWork>(`/fumigation-operations/${id}`, undefined, {} as BackendWork);
    await this.enrichWorkDetailRelations(detail, id);
    await this.enrichWorksApprovalRecordOperatorNames([detail]);
    return this.toFumigationWork(detail);
  }

  public async createWork(payload: CreateFumigationWorkPayload): Promise<FumigationWork> {
    const detail = await this.forwardPost<BackendWork>("/fumigation-operations", this.toBackendCreatePayload(payload));
    await this.enrichWorksApprovalRecordOperatorNames([detail]);
    return this.toFumigationWork(detail);
  }

  public async submitApproval(id: string, payload: SubmitFumigationApprovalPayload): Promise<FumigationWork> {
    const detail = await this.forwardPost<BackendWork>(`/fumigation-operations/${id}/approvals`, {
      action: ACTION_TO_BACKEND[payload.action],
      opinion: payload.opinion,
    });
    await this.enrichWorksApprovalRecordOperatorNames([detail]);
    return this.toFumigationWork(detail);
  }

  public async runPrecheck(id: string, payload: RunFumigationPrecheckPayload): Promise<FumigationPrecheckResult> {
    const stepCode = STEP_TO_BACKEND[payload.stepId];
    const record = await this.forwardPost<BackendCheckRecord>(`/fumigation-operations/${id}/checks/${stepCode}/trigger`, {});
    return this.toPrecheckResult(record);
  }

  public async runPrechecks(id: string): Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>> {
    const results: FumigationPrecheckResult[] = [];
    for (const stepId of PRECHECK_STEP_ORDER) {
      results.push(await this.runPrecheck(id, { stepId }));
    }
    const mapped: Record<FumigationPrecheckStepId, FumigationPrecheckResult> = {
      VENTILATION_DURATION: { ...DEFAULT_PRECHECKS.VENTILATION_DURATION },
      PH3_CONCENTRATION: { ...DEFAULT_PRECHECKS.PH3_CONCENTRATION },
      OXYGEN_CONCENTRATION: { ...DEFAULT_PRECHECKS.OXYGEN_CONCENTRATION },
    };
    for (const result of results) {
      mapped[result.stepId] = result;
    }
    return mapped;
  }

  public async getPrechecks(id: string): Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>> {
    const overview = await this.forwardGet<BackendCheckOverview>(`/fumigation-operations/${id}/checks`, undefined, { records: [] });
    return buildPrechecks(overview.records ?? []);
  }

  public async completeWork(id: string, payload: CompleteFumigationWorkPayload): Promise<FumigationWork> {
    const description = payload.description?.trim() ?? "";
    const detail = await this.forwardPost<BackendWork>(`/fumigation-operations/${id}/complete`, {
      completionConfirmed: true,
      completionDesc: description === "" ? "正常完工" : description,
    });
    await this.enrichWorksApprovalRecordOperatorNames([detail]);
    return this.toFumigationWork(detail);
  }

  public async terminateWork(id: string, payload: TerminateFumigationWorkPayload): Promise<FumigationWork> {
    const detail = await this.forwardPost<BackendWork>(`/fumigation-operations/${id}/terminate`, {
      terminationReason: payload.reason || "强制终止",
    });
    await this.enrichWorksApprovalRecordOperatorNames([detail]);
    return this.toFumigationWork(detail);
  }

  public async sendNotification(id: string, payload: SendFumigationNotificationPayload): Promise<void> {
    const receiverUserIds = payload.receiverUserIds
      .map((userId) => String(userId).trim())
      .filter(Boolean)
      .map((userId) => toNumber(userId));
    await this.forwardPost<void>(`/fumigation-operations/${id}/notifications`, {
      receiverUserIds,
      content: payload.content.trim(),
    });
  }

  public async listWarehouses(params?: { keyword?: string; areaId?: string }): Promise<FumigationWarehouseOption[]> {
    return await this.forwardGet<FumigationWarehouseOption[]>("/fumigation-operations/support/warehouses", { ...params }, []);
  }

  public async listGrainVarieties(warehouseId: string): Promise<FumigationGrainVarietyOption[]> {
    return await this.forwardGet<FumigationGrainVarietyOption[]>(
      `/fumigation-operations/support/warehouses/${warehouseId}/grain-varieties`,
      undefined,
      [],
    );
  }

  public async listPesticideTypes(): Promise<FumigationEnumOption<FumigationPesticideTypeCode>[]> {
    return await this.forwardGet<FumigationEnumOption<FumigationPesticideTypeCode>[]>(
      "/fumigation-operations/support/pesticide-types",
      undefined,
      Object.entries(PESTICIDE_TYPE_NAME).map(([code, name]) => ({ code: code as FumigationPesticideTypeCode, name })),
    );
  }

  public async listApplicationMethods(): Promise<FumigationEnumOption<FumigationApplicationMethodCode>[]> {
    return await this.forwardGet<FumigationEnumOption<FumigationApplicationMethodCode>[]>(
      "/fumigation-operations/support/application-methods",
      undefined,
      Object.entries(APPLICATION_METHOD_NAME).map(([code, name]) => ({ code: code as FumigationApplicationMethodCode, name })),
    );
  }

  public async listDevices(params?: {
    warehouseId?: string;
    pageNumber?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<FumigationDeviceOption[]> {
    const page = await this.forwardGet<BackendPage<BackendDevice>>(
      "/fumigation-operations/support/devices",
      {
        warehouseId: params?.warehouseId,
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 100,
        keyword: params?.keyword,
      },
      this.emptyPage(),
    );
    const records = page.records ?? [];
    return await Promise.all(records.map((item) => this.toDeviceOption(item, params?.warehouseId)));
  }

  public async getDeviceMonitor(deviceId: string): Promise<FumigationDeviceOption> {
    const detail = await this.forwardGet<BackendDevice>(
      `/fumigation-operations/support/devices/${deviceId}/monitor`,
      undefined,
      {} as BackendDevice,
    );
    const mapped = this.mapDeviceMonitor(detail, deviceId);
    if ((mapped.properties?.length ?? 0) === 0) {
      mapped.properties = await this.getDeviceProperties(deviceId);
    }
    return mapped;
  }

  public async getDeviceProperties(deviceId: string, propertyCodes?: string[]): Promise<FumigationDeviceProperty[]> {
    const list = await this.forwardGet<BackendDeviceProperty[]>(
      `/fumigation-operations/support/devices/${deviceId}/properties`,
      propertyCodes?.length ? { propertyCodes: propertyCodes.join(",") } : undefined,
      [],
    );
    return list.map((item) => this.toDeviceProperty(item));
  }

  public async listLinkedDevices(deviceId: string): Promise<FumigationLinkedDevice[]> {
    if (deviceId.trim() === "") {
      return [];
    }
    try {
      const list = await this.deviceCenterProxy.getAssociatedVideos(deviceId);
      return this.toLinkedDevicesFromDeviceCenter(list).filter((item) => item.id !== deviceId);
    } catch {
      const list = await this.forwardGet<BackendDevice[]>(
        `/fumigation-operations/support/devices/${deviceId}/linked-devices`,
        undefined,
        [],
      );
      return this.toLinkedDevices(list).filter((item) => item.id !== deviceId);
    }
  }

  /** @deprecated 监护看板关联设备请使用 listLinkedDevices */
  public async listAssociatedVideos(deviceId: string): Promise<FumigationCameraOption[]> {
    if (deviceId.trim() === "") {
      return [];
    }
    try {
      const list = await this.deviceCenterProxy.getAssociatedVideos(deviceId);
      return this.toDeviceCameras(list as BackendDeviceVideo[]) ?? [];
    } catch {
      const monitor = await this.getDeviceMonitor(deviceId);
      return monitor.cameras ?? [];
    }
  }

  public async listWorkers(): Promise<FumigationWorkerOption[]> {
    const peoplePage = await this.safetyPersonnelProxy.forwardGet<Pagination<PersonVO>>(
      "/persons",
      { pageNumber: 1, pageSize: 200, status: "ACTIVE" },
      this.safetyPersonnelProxy.emptyPage(),
    );
    return await Promise.all((peoplePage.records ?? []).map((person) => this.toWorkerOption(person)));
  }

  public async listArchives(params: FumigationArchiveQuery): Promise<FumigationPageResult<FumigationArchiveRecord>> {
    try {
      const archives = await this.forwardGet<BackendPage<BackendArchive> | BackendArchive[]>(
        "/fumigation-operation-archives",
        { operationId: params.workId, pageNumber: params.pageNumber, pageSize: params.pageSize },
        this.emptyPage(),
      );
      if (Array.isArray(archives)) {
        return { total: archives.length, pages: 1, records: archives.map((item) => this.toArchiveRecord(item)) };
      }
      return {
        total: Number(archives.total ?? 0),
        pages: Number(archives.pages ?? 0),
        records: (archives.records ?? []).map((item) => this.toArchiveRecord(item)),
      };
    } catch (error) {
      if (error instanceof Response && error.status === 404) {
        return this.emptyPage();
      }
      throw error;
    }
  }

  public async generateArchive(workId: string): Promise<FumigationArchiveRecord> {
    const archive = await this.forwardPost<BackendArchive>("/fumigation-operation-archives", { operationId: workId });
    return this.toArchiveRecord(archive);
  }

  public async getArchiveDocument(archiveId: string): Promise<FumigationArchiveDocument> {
    const document = await this.forwardGet<BackendArchiveDocument>(`/fumigation-operation-archives/${archiveId}/document`);
    return this.toArchiveDocument(document);
  }

  public async getRealtimeSituation(applicationCode = "FUMIGATION_OPERATION"): Promise<FumigationRealtimeSituation> {
    const [stats, works, warehouses, devices, todayAlarms] = await Promise.all([
      this.getRealtimeSituationStats(),
      this.getRealtimeSituationWorks(),
      this.listRealtimeSituationWarehouses(),
      this.listRealtimeSituationDevices(),
      this.listRealtimeSituationAlarms(applicationCode),
    ]);

    return {
      stats,
      inProgressWorks: works.inProgressWorks,
      completedTodayWorks: works.completedTodayWorks,
      warehouses,
      devices,
      todayAlarms,
    };
  }

  public async getRealtimeSituationStats(): Promise<FumigationRealtimeSituationStats> {
    const stats = await this.forwardGet<BackendRealtimeSituationStats>(
      "/fumigation-operations/realtime-situation/stats",
      undefined,
      emptyRealtimeSituationBackend().stats ?? {},
    );
    return mapRealtimeStats(stats);
  }

  public async getRealtimeSituationWorks(): Promise<FumigationRealtimeSituationWorks> {
    const backend = await this.forwardGet<Pick<FumigationRealtimeSituationBackend, "inProgressWorks" | "completedTodayWorks">>(
      "/fumigation-operations/realtime-situation/works",
      undefined,
      { inProgressWorks: [], completedTodayWorks: [] },
    );
    return {
      inProgressWorks: (backend.inProgressWorks ?? []).map(mapRealtimeWorkItem),
      completedTodayWorks: (backend.completedTodayWorks ?? []).map(mapRealtimeWorkItem),
    };
  }

  public async listRealtimeSituationWarehouses(): Promise<FumigationRealtimeSituationWarehouseItem[]> {
    const warehouses = await this.forwardGet<BackendRealtimeSituationWarehouseItem[]>(
      "/fumigation-operations/realtime-situation/warehouses",
      undefined,
      [],
    );
    return warehouses.map(mapRealtimeWarehouseItem);
  }

  public async listRealtimeSituationDevices(): Promise<FumigationRealtimeSituationDeviceItem[]> {
    const devices = await this.forwardGet<FumigationRealtimeSituationDeviceItem[]>(
      "/fumigation-operations/realtime-situation/devices",
      { applicationCode: "FUMIGATION_OPERATION", limit: 7 },
      [],
    );
    return devices.map((item) => ({
      id: asString(item.id),
      name: item.name,
      status: item.status === "online" ? "online" : "offline",
    }));
  }

  public async listRealtimeSituationAlarms(applicationCode = "FUMIGATION_OPERATION"): Promise<FumigationRealtimeSituationAlarmItem[]> {
    return this.listTodayAlarms(applicationCode);
  }

  private async resolveDeviceRuntimeStatuses(deviceIds: string[]): Promise<Map<string, "online" | "offline">> {
    const map = new Map<string, "online" | "offline">();
    if (deviceIds.length === 0) {
      return map;
    }
    try {
      const instances = await this.deviceCenterProxy.queryDeviceInstances({
        matchedDeviceIds: deviceIds,
        withDeviceExpandInfo: true,
      });
      for (const instance of instances) {
        const raw = instance as unknown as LooseRecord & { id?: string; status?: { onlineState?: boolean | number } };
        map.set(asString(instance.id ?? raw.id), this.resolveDeviceOnlineStatus(raw));
      }
    } catch {
      // 设备中心不可用时降级为离线
    }
    for (const id of deviceIds) {
      if (!map.has(id)) {
        map.set(id, "offline");
      }
    }
    return map;
  }

  private async listTodayAlarms(applicationCode: string): Promise<FumigationRealtimeSituationAlarmItem[]> {
    const alarmBase = this.resolveAlarmBaseUrl();
    if (alarmBase === "") {
      return [];
    }
    const period = formatTodayPeriod();
    const url = buildUrl(`${alarmBase}/alarm-records`, {
      applicationCode,
      pageNumber: 1,
      pageSize: 5,
      period,
    });
    try {
      const response = await this.proxyClient.request<
        LegacyResponse<{ records?: BackendAlarmRecord[] }> | { records?: BackendAlarmRecord[] }
      >(url, { method: "GET" });
      const payload = response.data;
      const data = hasData(payload) ? payload.data : payload;
      return (data?.records ?? []).slice(0, 5).map((item) => {
        const raw = item as BackendAlarmRecord & LooseRecord;
        return {
          id: asString(item.id ?? pickString(raw, "id")),
          alarmEventName: item.alarmEventName ?? pickString(raw, "alarm_event_name", "alarmEventName") ?? "报警事件",
          alarmTime: item.alarmTime ?? pickString(raw, "alarm_time", "alarmTime") ?? "",
          alarmStatusName: item.alarmStatusName ?? pickString(raw, "alarm_status_name", "alarmStatusName") ?? "--",
        };
      });
    } catch {
      return [];
    }
  }

  private resolveAlarmBaseUrl(): string {
    const deviceCenterUrl = this.configService.get<string>("app.deviceCenterUrl") ?? "";
    const match = deviceCenterUrl.match(/^(https?:\/\/[^/]+)/);
    return match ? `${match[1]}/alarm` : "";
  }

  private async toDeviceOption(item: BackendDevice, warehouseId?: string): Promise<FumigationDeviceOption> {
    const id = asString(item.deviceId ?? item.id);
    const properties = id ? await this.listDeviceProperties(id) : [];
    return {
      id,
      code: item.deviceCode ?? id,
      name: item.deviceName ?? item.deviceCode ?? id,
      warehouseId: warehouseId ?? "",
      locationName: item.areaName ?? "",
      properties,
      cameras: [],
      linkedDevices: [],
      alarmFlow: [],
      indoorPh3Trend: [],
    };
  }

  private mapDeviceMonitor(item: BackendDevice, fallbackDeviceId: string): FumigationDeviceOption {
    const raw = item as BackendDevice & LooseRecord;
    const id = asString(item.deviceId ?? pickString(raw, "device_id") ?? fallbackDeviceId);
    const propertiesRaw = item.properties ?? pickArray<BackendDeviceProperty>(raw, "properties") ?? [];
    const properties = propertiesRaw.length > 0 ? propertiesRaw.map((property) => this.toDeviceProperty(property)) : [];
    return {
      id,
      code: item.deviceCode ?? pickString(raw, "device_code") ?? id,
      name: item.deviceName ?? pickString(raw, "device_name") ?? item.deviceCode ?? id,
      warehouseId: "",
      locationName: item.areaName ?? pickString(raw, "area_name") ?? "",
      properties,
      cameras: this.toDeviceCameras(item.cameras ?? pickArray<BackendDeviceVideo>(raw, "cameras") ?? []),
      linkedDevices: this.toLinkedDevices(item.linkedDevices ?? pickArray<BackendDevice>(raw, "linked_devices", "linkedDevices") ?? []),
      alarmFlow: this.toAlarmFlowEvents(item.alarmFlow ?? pickArray<BackendAlarmTimeline>(raw, "alarm_flow", "alarmFlow") ?? []),
      indoorPh3Trend: this.toTrendPoints(
        item.indoorPh3Trend ?? pickArray<BackendTrendPoint>(raw, "indoor_ph3_trend", "indoorPh3Trend") ?? [],
      ),
    };
  }

  private toDeviceProperty(item: BackendDeviceProperty): FumigationDeviceProperty {
    const raw = item as BackendDeviceProperty & LooseRecord;
    const rawValue = item.value ?? pickNumber(raw, "value");
    const value =
      typeof rawValue === "number" && Number.isFinite(rawValue)
        ? rawValue
        : typeof rawValue === "string" && rawValue.trim() !== ""
          ? Number(rawValue)
          : 0;
    return {
      code: item.code ?? pickString(raw, "code") ?? "",
      name: item.name ?? pickString(raw, "name") ?? "",
      value: Number.isFinite(value) ? value : 0,
      unit: item.unit ?? pickString(raw, "unit") ?? "",
      updatedAt: item.ts == null ? undefined : formatDateLike(item.ts),
    };
  }

  private toDeviceCameras(items: BackendDeviceVideo[]): FumigationCameraOption[] {
    return items.map((item) => {
      const raw = item as BackendDeviceVideo & LooseRecord;
      const deviceId = asString(item.id ?? pickString(raw, "id"));
      const thirdPartyId = asString(item.thirdPartyId ?? pickString(raw, "third_party_id") ?? "");
      return {
        id: deviceId,
        thirdPartyId: thirdPartyId === "" ? undefined : thirdPartyId,
        name: item.name ?? pickString(raw, "name") ?? deviceId,
        channelNo: item.code ?? pickString(raw, "code") ?? "",
      };
    });
  }

  private toLinkedDevices(items: BackendDevice[]): FumigationLinkedDevice[] {
    return items.map((item) => {
      const raw = item as BackendDevice & LooseRecord;
      const id = asString(item.deviceId ?? item.id ?? pickString(raw, "device_id", "id"));
      return {
        id,
        name: item.deviceName ?? pickString(raw, "device_name") ?? id,
        type: item.deviceCode ?? pickString(raw, "device_code") ?? "设备",
        status: this.resolveDeviceOnlineStatus(raw),
      };
    });
  }

  private toLinkedDevicesFromDeviceCenter(items: unknown[]): FumigationLinkedDevice[] {
    return items
      .map((item) => {
        const raw = item as LooseRecord & {
          id?: string | number;
          name?: string;
          code?: string;
          status?: { onlineState?: boolean | number };
          productInfo?: { productCategory?: { name?: string }; name?: string };
        };
        const id = asString(raw.id ?? pickString(raw, "id"));
        const productInfo = raw.productInfo;
        const categoryName = productInfo?.productCategory?.name?.trim();
        const productName = productInfo?.name?.trim();
        const code = asString(raw.code ?? pickString(raw, "code"));
        const type = categoryName || productName || (this.looksLikeUuid(code) ? "监控设备" : code) || "关联设备";
        return {
          id,
          name: asString(raw.name ?? pickString(raw, "name")) || id,
          type,
          status: this.resolveDeviceOnlineStatus(raw),
        };
      })
      .filter((item) => item.id !== "");
  }

  private resolveDeviceOnlineStatus(raw: LooseRecord & { status?: { onlineState?: boolean | number } }): "online" | "offline" {
    const onlineState = raw.status?.onlineState;
    if (onlineState === true || onlineState === 1) {
      return "online";
    }
    if (onlineState === false || onlineState === 0) {
      return "offline";
    }
    const legacy = pickString(raw, "onlineState", "online_state", "deviceState", "device_state");
    if (legacy != null && (legacy === "1" || legacy.toLowerCase() === "true" || legacy.toLowerCase() === "online")) {
      return "online";
    }
    return "offline";
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private toAlarmFlowEvents(items: BackendAlarmTimeline[]): FumigationDeviceOption["alarmFlow"] {
    return items.map((item) => {
      const raw = item as BackendAlarmTimeline & LooseRecord;
      const id = asString(item.alarmId ?? pickString(raw, "alarm_id", "alarmId"));
      return {
        id,
        time: formatDateLike(item.alarmTime ?? pickString(raw, "alarm_time", "alarmTime") ?? ""),
        title: item.alarmEventName ?? pickString(raw, "alarm_event_name", "alarmEventName") ?? "设备告警",
        handler: item.status ?? pickString(raw, "status") ?? "系统",
        result: item.content ?? item.alarmLevelName ?? pickString(raw, "alarm_level_name", "alarmLevelName") ?? "",
      };
    });
  }

  private toTrendPoints(items: BackendTrendPoint[]): FumigationDeviceOption["indoorPh3Trend"] {
    return items
      .map((item) => {
        const raw = item as BackendTrendPoint & LooseRecord;
        const value = Number(item.value ?? pickNumber(raw, "value"));
        if (!Number.isFinite(value)) {
          return null;
        }
        return {
          time: asString(item.time ?? pickString(raw, "time")),
          value,
        };
      })
      .filter((item): item is NonNullable<FumigationDeviceOption["indoorPh3Trend"]>[number] => item != null && item.time !== "");
  }

  private async listDeviceProperties(deviceId: string): Promise<FumigationDeviceProperty[]> {
    return await this.getDeviceProperties(deviceId);
  }

  private async toWorkerOption(person: PersonVO): Promise<FumigationWorkerOption> {
    const personId = asString(person.id);
    const userId = asString(person.userId ?? person.id);
    const certificates = personId
      ? await this.safetyPersonnelProxy.forwardGet<EmployeeCertVO[]>(`/persons/${personId}/certificates`, undefined, [])
      : [];
    return {
      id: userId,
      name: person.userName ?? userId,
      role: person.postName ?? "作业人员",
      department: person.deptName ?? person.companyName ?? "",
      phone: person.phone ?? "",
      certificates: certificates.slice(0, 1).map((item) => ({
        id: asString(item.id),
        name: item.certName ?? item.typeName ?? "安全证书",
        no: item.certNo ?? "",
        expireAt: item.validEnd ?? "",
      })),
    };
  }

  private toBackendCreatePayload(payload: CreateFumigationWorkPayload): Record<string, unknown> {
    const plannedDosage = buildPlannedDosage(payload);
    const safetyMeasures = payload.safetyMeasures ?? payload.safetyDisclosure ?? "";
    return {
      warehouseId: payload.warehouseId,
      warehouseName: payload.warehouseName,
      grainVarietyId: payload.grainVarietyId,
      grainVarietyName: payload.grainVarietyName,
      grainQuantity: payload.grainQuantity,
      associatedDeviceId: payload.deviceId,
      associatedDeviceName: payload.deviceName,
      associatedDeviceCode: payload.deviceCode,
      pesticideTypeCode: payload.pesticideTypeCode,
      pesticideDosage: payload.pesticideDosage,
      applicationMethodCode: payload.applicationMethodCode,
      sealedDays: payload.sealedDays,
      expectedVentilationTime: payload.expectedVentilationAt,
      expectedDurationMinutes: Math.max(Math.round(payload.expectedDurationHours * 60), 1),
      plannedStartTime: payload.plannedStartAt,
      people: payload.workerIds.map((userId, index) => ({
        userId,
        role: index === 0 ? "GUARDIAN" : "WORKER",
      })),
      safetyMeasures,
      attachmentsSceneCode: payload.attachmentsSceneCode,
      attachments: payload.attachments ?? [],
      remark: JSON.stringify({
        plannedDosage,
        warehouseCode: payload.warehouseCode,
        grainQuantity: payload.grainQuantity,
        pesticideTypeCode: payload.pesticideTypeCode,
        pesticideTypeName: PESTICIDE_TYPE_NAME[payload.pesticideTypeCode] ?? payload.pesticideTypeCode,
        pesticideDosage: payload.pesticideDosage,
        applicationMethodCode: payload.applicationMethodCode,
        applicationMethodName: APPLICATION_METHOD_NAME[payload.applicationMethodCode] ?? payload.applicationMethodCode,
        sealedDays: payload.sealedDays,
        expectedVentilationAt: payload.expectedVentilationAt,
        safetyLead: payload.safetyLead,
        technicalLead: payload.technicalLead,
        siteLeader: payload.siteLeader,
        safetyDisclosure: safetyMeasures,
        emergencyPlan: payload.emergencyPlan,
        safetyMeasures,
        attachmentsSceneCode: payload.attachmentsSceneCode,
        attachments: payload.attachments ?? [],
      } satisfies FrontendRemarkPayload),
    };
  }

  private toFumigationWork(item: BackendWork): FumigationWork {
    const raw = item as BackendWork & LooseRecord;
    const remark = parseFrontendRemark(item.remark);
    const people = readBackendPeople(item);
    const workers = people.map((person) => this.toWorkPerson(person));
    const checkRecords = item.checkRecords ?? [];
    const status = item.status ? (STATUS_TO_FRONT[item.status] ?? "SAFETY_APPROVING") : "SAFETY_APPROVING";
    const id = asString(item.id);
    const warehouseName = item.warehouseName ?? pickString(raw, "warehouse_name") ?? "";
    const pesticideTypeName =
      item.pesticideTypeName ?? pickString(raw, "pesticide_type_name") ?? remark.pesticideTypeName ?? legacyPesticideName(remark);
    const plannedStartTime = item.plannedStartTime ?? pickString(raw, "planned_start_time") ?? "";
    const expectedDurationMinutes = item.expectedDurationMinutes ?? pickNumber(raw, "expected_duration_minutes") ?? 0;
    const approvalRecordsRaw = readBackendApprovalRecords(item);
    const applicantName = this.resolveApplicantName(item);
    const currentApprovalNode = (() => {
      const node = item.currentApprovalNode ?? pickString(raw, "current_approval_node");
      if (node) {
        return NODE_TO_FRONT[node] ?? null;
      }
      if (status === "SAFETY_APPROVING") {
        return "safety";
      }
      if (status === "TECH_APPROVING") {
        return "technical";
      }
      return null;
    })();
    const availableActions = item.availableActions ?? pickArray<string>(raw, "available_actions", "availableActions") ?? [];
    return {
      id,
      code: item.operationNo ?? pickString(raw, "operation_no") ?? id,
      title: `${warehouseName || "仓房"}熏蒸作业`,
      warehouseId: asString(item.warehouseId ?? pickString(raw, "warehouse_id")),
      warehouseCode: item.warehouseCode ?? pickString(raw, "warehouse_code") ?? remark.warehouseCode ?? asString(item.warehouseId),
      warehouseName,
      grainVarietyId: item.grainVarietyId ?? pickString(raw, "grain_variety_id") ?? "",
      grainVarietyName: item.grainVarietyName ?? pickString(raw, "grain_variety_name") ?? "",
      deviceId: asString(item.associatedDeviceId ?? pickString(raw, "associated_device_id")),
      deviceCode: item.associatedDeviceCode ?? pickString(raw, "associated_device_code"),
      deviceName: item.associatedDeviceName ?? pickString(raw, "associated_device_name"),
      expectedDurationHours: Number((expectedDurationMinutes / 60).toFixed(1)),
      createdAt: item.createTime ?? pickString(raw, "create_time") ?? "",
      plannedStartAt: plannedStartTime,
      plannedDosage: remark.plannedDosage ?? buildDisplayDosage(item, remark),
      grainQuantity: item.grainQuantity ?? remark.grainQuantity,
      pesticideTypeCode: item.pesticideTypeCode ?? pickString(raw, "pesticide_type_code") ?? remark.pesticideTypeCode,
      pesticideTypeName,
      pesticideType: pesticideTypeName,
      pesticideDosage: item.pesticideDosage ?? pickString(raw, "pesticide_dosage") ?? remark.pesticideDosage,
      applicationMethodCode: item.applicationMethodCode ?? pickString(raw, "application_method_code") ?? remark.applicationMethodCode,
      applicationMethodName:
        item.applicationMethodName ??
        pickString(raw, "application_method_name") ??
        remark.applicationMethodName ??
        legacyApplicationMethodName(remark),
      applicationMethod:
        item.applicationMethodName ??
        pickString(raw, "application_method_name") ??
        remark.applicationMethodName ??
        legacyApplicationMethodName(remark),
      sealedDays: item.sealedDays ?? pickNumber(raw, "sealed_days") ?? remark.sealedDays,
      expectedVentilationAt:
        item.expectedVentilationTime ??
        item.expectedVentilationAt ??
        pickString(raw, "expected_ventilation_time", "expected_ventilation_at") ??
        remark.expectedVentilationAt,
      applicantName,
      safetyLead: remark.safetyLead ?? "",
      technicalLead: remark.technicalLead ?? "",
      siteLeader: remark.siteLeader ?? "",
      safetyDisclosure: remark.safetyDisclosure ?? "",
      emergencyPlan: remark.emergencyPlan ?? "",
      safetyMeasures: item.safetyMeasures ?? pickString(raw, "safety_measures") ?? remark.safetyMeasures ?? remark.safetyDisclosure ?? "",
      attachmentsSceneCode: item.attachmentsSceneCode ?? pickString(raw, "attachments_scene_code") ?? remark.attachmentsSceneCode,
      attachments: this.toAttachments(item.attachments ?? remark.attachments ?? []),
      workerIds: workers.map((person) => person.userId).filter(Boolean),
      workers,
      actualWorkerCount: Number(item.actualPeopleCount ?? pickNumber(raw, "actual_people_count") ?? workers.length),
      status,
      currentApprovalNode,
      approvalRecords: approvalRecordsRaw.map((record) => this.toApprovalRecord(record)),
      prechecks: buildPrechecks(checkRecords),
      completionDescription: item.completionDesc ?? pickString(raw, "completion_desc"),
      terminationReason: item.terminationReason ?? pickString(raw, "termination_reason"),
      archivedAt: item.archiveTime ?? pickString(raw, "archive_time"),
      availableActions:
        availableActions.length > 0 || !["SAFETY_APPROVING", "TECH_APPROVING"].includes(status) ? availableActions : ["APPROVE", "REJECT"],
    };
  }

  private toWorkPerson(person: BackendOperationPerson): FumigationWorkPerson {
    const raw = person as BackendOperationPerson & LooseRecord;
    const userId = asString(person.userId ?? pickString(raw, "user_id"));
    const certExpireAt = person.certValidEnd ?? person.validEnd ?? pickString(raw, "cert_valid_end", "valid_end") ?? "";
    const certExpired = person.certExpireStatus === "EXPIRED" || person.certValidAtCreate === false;
    return {
      id: userId,
      userId,
      name: person.userName ?? person.name ?? person.personName ?? pickString(raw, "user_name", "name", "person_name") ?? "",
      phone: person.phone ?? pickString(raw, "phone"),
      department: person.deptName ?? person.department ?? pickString(raw, "dept_name", "department") ?? "",
      postName: person.postName ?? person.positionName ?? pickString(raw, "post_name", "position_name") ?? "",
      role: person.role ?? pickString(raw, "role") ?? "",
      certId: asString(person.certId ?? pickString(raw, "cert_id")),
      certName: person.certName ?? pickString(raw, "cert_name") ?? "",
      certNo: person.certNo ?? pickString(raw, "cert_no") ?? "",
      certExpireAt,
      certExpired,
    };
  }

  private resolveApplicantName(item: BackendWork): string {
    const raw = item as BackendWork & LooseRecord;
    return item.applicantName ?? pickString(raw, "applicant_name", "applicantName") ?? "";
  }

  private async enrichWorkDetailRelations(item: BackendWork, id: string): Promise<void> {
    const approvalRecords = readBackendApprovalRecords(item);
    if (approvalRecords.length === 0) {
      try {
        const records = await this.forwardGet<BackendApprovalRecord[]>(`/fumigation-operations/${id}/approval-records`, undefined, []);
        if (records.length > 0) {
          item.approvalRecords = records;
        }
      } catch {
        // 审批记录缺失时保持详情返回值，避免阻断详情页打开。
      }
    }
  }

  private toApprovalRecord(record: BackendApprovalRecord): FumigationWork["approvalRecords"][number] {
    const raw = record as BackendApprovalRecord & LooseRecord;
    const nodeCode = record.approvalNode ?? record.node ?? pickString(raw, "approval_node", "node") ?? "";
    const actionCode = record.approvalAction ?? record.action ?? pickString(raw, "approval_action", "action") ?? "";
    return {
      id: asString(record.id),
      node: NODE_TO_FRONT[nodeCode] ?? "safety",
      nodeName: record.nodeName ?? record.approvalNodeName ?? pickString(raw, "node_name", "approval_node_name") ?? "",
      action: ACTION_TO_FRONT[actionCode] ?? "approved",
      operatorName: this.resolveApprovalOperatorName(record),
      opinion: record.approvalOpinion ?? record.opinion ?? pickString(raw, "approval_opinion", "opinion") ?? "",
      at: record.approvalTime ?? record.at ?? pickString(raw, "approval_time", "at") ?? "",
    };
  }

  private async enrichWorksApprovalRecordOperatorNames(items: BackendWork[]): Promise<void> {
    const records = items.flatMap((item) => readBackendApprovalRecords(item));
    const userIds = [
      ...new Set(
        records.flatMap((record) => {
          if (!this.isBlankPersonName(this.resolveApprovalOperatorName(record))) {
            return [];
          }
          const userId = this.resolveApprovalOperatorId(record);
          return userId === "" ? [] : [userId];
        }),
      ),
    ];
    if (userIds.length === 0) {
      return;
    }
    let nameById = new Map<string, string>();
    try {
      const users = await this.ouaaProxyService.getUsersByIds(userIds);
      nameById = new Map(
        users
          .filter((user) => user.id && user.name && !this.isBlankPersonName(user.name))
          .map((user) => [String(user.id), user.name.trim()]),
      );
    } catch {
      nameById = new Map();
    }
    for (const record of records) {
      if (!this.isBlankPersonName(this.resolveApprovalOperatorName(record))) {
        continue;
      }
      const userId = this.resolveApprovalOperatorId(record);
      const resolved = userId === "" ? undefined : nameById.get(userId);
      if (resolved == null || resolved === "") {
        continue;
      }
      record.operatorName = resolved;
      record.approvalUserName = resolved;
      record.approverName = resolved;
    }
  }

  private resolveApprovalOperatorName(record: BackendApprovalRecord): string {
    const raw = record as BackendApprovalRecord & LooseRecord;
    return (
      record.approvalUserName ??
      record.operatorName ??
      record.approverName ??
      pickString(raw, "approval_user_name", "operator_name", "approver_name", "approvalUserName", "operatorName", "approverName") ??
      ""
    );
  }

  private resolveApprovalOperatorId(record: BackendApprovalRecord): string {
    const raw = record as BackendApprovalRecord & LooseRecord;
    return asString(
      record.approverUserId ??
        record.approvalUserId ??
        record.operatorId ??
        record.userId ??
        pickString(
          raw,
          "approver_user_id",
          "approval_user_id",
          "operator_id",
          "user_id",
          "approverUserId",
          "approvalUserId",
          "operatorId",
          "userId",
        ),
    );
  }

  private toAttachments(rawList: unknown): FumigationAttachment[] {
    if (!Array.isArray(rawList)) {
      return [];
    }
    return rawList.map((item) => this.toAttachment(item as BackendAttachment));
  }

  private toFileVO(raw: BackendFileVO | undefined): FumigationAttachment["fileVO"] | undefined {
    if (raw == null) {
      return undefined;
    }
    const fileRaw = raw as BackendFileVO & LooseRecord;
    const id = raw.id ?? pickString(fileRaw, "id");
    if (id == null || String(id).trim() === "") {
      return undefined;
    }
    return {
      id,
      name: raw.name ?? pickString(fileRaw, "name") ?? "",
      path: raw.path ?? pickString(fileRaw, "path"),
      suffix: raw.suffix ?? pickString(fileRaw, "suffix"),
      size: raw.size ?? pickNumber(fileRaw, "size"),
      type: raw.type ?? pickString(fileRaw, "type"),
      businessKey: raw.businessKey ?? pickString(fileRaw, "business_key", "businessKey"),
    };
  }

  private toAttachment(item: BackendAttachment): FumigationAttachment {
    const raw = item as BackendAttachment & LooseRecord;
    const nestedFile = item.fileVO ?? item.fileVo ?? this.readNestedFileVO(raw);
    const fileVO = this.toFileVO(nestedFile);
    const id = asString(item.id ?? fileVO?.id ?? pickString(raw, "id"));
    return {
      id,
      name: item.name ?? fileVO?.name ?? pickString(raw, "name") ?? "",
      path: item.path ?? fileVO?.path ?? pickString(raw, "path"),
      suffix: item.suffix ?? fileVO?.suffix ?? pickString(raw, "suffix"),
      size: item.size ?? fileVO?.size ?? pickNumber(raw, "size"),
      sceneCode: item.sceneCode ?? pickString(raw, "scene_code", "sceneCode"),
      fileVO,
    };
  }

  private readNestedFileVO(raw: LooseRecord): BackendFileVO | undefined {
    const candidate = raw.fileVO ?? raw.fileVo ?? raw.file_vo;
    if (candidate == null || typeof candidate !== "object") {
      return undefined;
    }
    return candidate as BackendFileVO;
  }

  private isBlankPersonName(name: string | undefined): boolean {
    const value = name?.trim() ?? "";
    return value === "";
  }

  private toPrecheckResult(record: BackendCheckRecord): FumigationPrecheckResult {
    const raw = record as BackendCheckRecord & LooseRecord;
    const stepId = STEP_TO_FRONT[record.stepCode ?? pickString(raw, "step_code") ?? ""] ?? "VENTILATION_DURATION";
    const checkedAt = record.checkedTime ?? raw.checked_time ?? raw.checkedAt ?? raw.checked_at ?? "";
    const parsedPayload = parseCheckPayload(readCheckValuesPayload(raw), stepId);
    const deviceId = pickString(raw, "deviceId", "device_id") ?? parsedPayload.deviceId;
    const rule = pickCheckRule(raw, "rule", "threshold") ?? parsedPayload.rule;
    return {
      ...DEFAULT_PRECHECKS[stepId],
      stepId,
      title: record.stepName ?? DEFAULT_PRECHECKS[stepId].title,
      status: CHECK_STATUS_TO_FRONT[record.result ?? ""] ?? "pending",
      message: record.message ?? "",
      checkedAt: asString(checkedAt),
      values: parsedPayload.values,
      propertyValues: parsedPayload.propertyValues,
      ...(deviceId != null ? { deviceId } : {}),
      ...(rule != null ? { rule } : {}),
    };
  }

  private toArchiveRecord(item: BackendArchive): FumigationArchiveRecord {
    return {
      id: asString(item.id ?? (item as { archiveId?: string | number }).archiveId),
      workId: asString(item.operationId),
      archiveNo: item.archiveNo,
      generatedAt: item.generatedTime ?? "",
      generatedBy: item.generatedByName ?? asString(item.generatedBy),
    };
  }

  private toArchiveDocument(item: BackendArchiveDocument): FumigationArchiveDocument {
    return {
      archiveId: asString(item.archiveId ?? item.id),
      archiveNo: item.archiveNo,
      workId: asString(item.workId),
      workCode: item.workCode,
      generatedTime: item.generatedTime,
      generatedByName: item.generatedByName,
      cover: item.cover
        ? {
            warehouseCode: item.cover.warehouseCode,
            warehouseName: item.cover.warehouseName,
            grainVarietyName: item.cover.grainVarietyName,
            grainQuantity: toOptionalNumber(item.cover.grainQuantity),
            grainQuantityUnit: item.cover.grainQuantityUnit,
            pesticideTypeName: item.cover.pesticideTypeName,
            pesticideDosage: item.cover.pesticideDosage,
            applicationMethodName: item.cover.applicationMethodName,
            sealedDays: item.cover.sealedDays,
            workDateLabel: item.cover.workDateLabel,
          }
        : undefined,
      summary: item.summary
        ? {
            actualDurationLabel: item.summary.actualDurationLabel,
            workerCount: item.summary.workerCount,
            operationNo: item.summary.operationNo,
            applicantName: item.summary.applicantName,
            applyTime: item.summary.applyTime,
            warehouseCode: item.summary.warehouseCode,
            warehouseName: item.summary.warehouseName,
            grainVarietyName: item.summary.grainVarietyName,
            grainQuantity: toOptionalNumber(item.summary.grainQuantity),
            grainQuantityUnit: item.summary.grainQuantityUnit,
            pesticideTypeName: item.summary.pesticideTypeName,
            pesticideDosage: item.summary.pesticideDosage,
            applicationMethodName: item.summary.applicationMethodName,
            sealedDays: item.summary.sealedDays,
            finalStatusName: item.summary.finalStatusName,
            archiveTime: item.summary.archiveTime,
          }
        : undefined,
      approvals: (item.approvals ?? []).map((row) => ({
        index: row.index ?? 0,
        approvalTime: row.approvalTime,
        approverName: row.approverName,
        roleName: row.roleName,
        actionName: row.actionName,
        opinion: row.opinion,
      })),
      prechecks: item.prechecks
        ? {
            checkedTime: item.prechecks.checkedTime,
            resultLabel: item.prechecks.resultLabel,
            rows: (item.prechecks.rows ?? []).map((row) => ({
              stepLabel: row.stepLabel,
              itemName: row.itemName,
              detectedValue: row.detectedValue,
              thresholdRule: row.thresholdRule,
              resultLabel: row.resultLabel,
              sensorCode: row.sensorCode,
              firstInStep: row.firstInStep,
            })),
          }
        : undefined,
      ph3Monitoring: item.ph3Monitoring
        ? {
            sampleCount: item.ph3Monitoring.sampleCount,
            sensorCodes: item.ph3Monitoring.sensorCodes,
            indoorMaxPpm: toOptionalNumber(item.ph3Monitoring.indoorMaxPpm),
            indoorMinPpm: toOptionalNumber(item.ph3Monitoring.indoorMinPpm),
            indoorAvgPpm: toOptionalNumber(item.ph3Monitoring.indoorAvgPpm),
            outdoorMaxPpm: toOptionalNumber(item.ph3Monitoring.outdoorMaxPpm),
            trend: (item.ph3Monitoring.trend ?? []).map((point) => ({
              timeLabel: point.timeLabel,
              valuePpm: toOptionalNumber(point.valuePpm),
            })),
            periodStart: item.ph3Monitoring.periodStart,
            periodEnd: item.ph3Monitoring.periodEnd,
          }
        : undefined,
      alarms: (item.alarms ?? []).map((row) => ({
        alarmId: asString(row.alarmId),
        alarmTime: row.alarmTime,
        alarmEventName: row.alarmEventName,
        alarmLevelName: row.alarmLevelName,
        alarmStatusName: row.alarmStatusName,
        content: row.content,
      })),
      completion: item.completion
        ? {
            archiveTypeName: item.completion.archiveTypeName,
            completionDesc: item.completion.completionDesc,
            confirmedTime: item.completion.confirmedTime,
            rows: (item.completion.rows ?? []).map((row) => ({
              itemName: row.itemName,
              detail: row.detail,
              resultLabel: row.resultLabel,
              confirmedTime: row.confirmedTime,
            })),
          }
        : undefined,
    };
  }

  private unwrap<T>(value: unknown): T {
    return hasData<T>(value) ? value.data : (value as T);
  }

  private async forwardGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!this.baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const response = await this.proxyClient.request<unknown>(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardPost<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("securityManagementUrl is not configured");
    }
    const response = await this.proxyClient.request<unknown>(`${this.baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }
}

interface BackendArchive {
  id?: string | number;
  operationId?: string | number;
  archiveNo?: string;
  generatedBy?: string | number;
  generatedByName?: string;
  generatedTime?: string;
}

interface BackendArchiveDocument {
  archiveId?: string | number;
  id?: string | number;
  archiveNo?: string;
  workId?: string | number;
  workCode?: string;
  generatedTime?: string;
  generatedByName?: string;
  cover?: {
    warehouseCode?: string;
    warehouseName?: string;
    grainVarietyName?: string;
    grainQuantity?: number | string;
    grainQuantityUnit?: string;
    pesticideTypeName?: string;
    pesticideDosage?: string;
    applicationMethodName?: string;
    sealedDays?: number;
    workDateLabel?: string;
  };
  summary?: {
    actualDurationLabel?: string;
    workerCount?: number;
    operationNo?: string;
    applicantName?: string;
    applyTime?: string;
    warehouseCode?: string;
    warehouseName?: string;
    grainVarietyName?: string;
    grainQuantity?: number | string;
    grainQuantityUnit?: string;
    pesticideTypeName?: string;
    pesticideDosage?: string;
    applicationMethodName?: string;
    sealedDays?: number;
    finalStatusName?: string;
    archiveTime?: string;
  };
  approvals?: Array<{
    index?: number;
    approvalTime?: string;
    approverName?: string;
    roleName?: string;
    actionName?: string;
    opinion?: string;
  }>;
  prechecks?: {
    checkedTime?: string;
    resultLabel?: string;
    rows?: Array<{
      stepLabel?: string;
      itemName?: string;
      detectedValue?: string;
      thresholdRule?: string;
      resultLabel?: string;
      sensorCode?: string;
      firstInStep?: boolean;
    }>;
  };
  ph3Monitoring?: {
    sampleCount?: number;
    sensorCodes?: string;
    indoorMaxPpm?: number | string;
    indoorMinPpm?: number | string;
    indoorAvgPpm?: number | string;
    outdoorMaxPpm?: number | string;
    trend?: Array<{ timeLabel?: string; valuePpm?: number | string }>;
    periodStart?: string;
    periodEnd?: string;
  };
  alarms?: Array<{
    alarmId?: string | number;
    alarmTime?: string;
    alarmEventName?: string;
    alarmLevelName?: string;
    alarmStatusName?: string;
    content?: string;
  }>;
  completion?: {
    archiveTypeName?: string;
    completionDesc?: string;
    confirmedTime?: string;
    rows?: Array<{
      itemName?: string;
      detail?: string;
      resultLabel?: string;
      confirmedTime?: string;
    }>;
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPrechecks(records: BackendCheckRecord[]): Record<FumigationPrecheckStepId, FumigationPrecheckResult> {
  const mapped: Record<FumigationPrecheckStepId, FumigationPrecheckResult> = {
    VENTILATION_DURATION: { ...DEFAULT_PRECHECKS.VENTILATION_DURATION },
    PH3_CONCENTRATION: { ...DEFAULT_PRECHECKS.PH3_CONCENTRATION },
    OXYGEN_CONCENTRATION: { ...DEFAULT_PRECHECKS.OXYGEN_CONCENTRATION },
  };
  for (const record of records) {
    const stepId = STEP_TO_FRONT[record.stepCode ?? ""];
    if (stepId) {
      const raw = record as BackendCheckRecord & LooseRecord;
      const checkedAt = record.checkedTime ?? raw.checked_time ?? raw.checkedAt ?? raw.checked_at ?? "";
      const parsedPayload = parseCheckPayload(readCheckValuesPayload(raw), stepId);
      const deviceId = pickString(raw, "deviceId", "device_id") ?? parsedPayload.deviceId;
      const rule = pickCheckRule(raw, "rule", "threshold") ?? parsedPayload.rule;
      mapped[stepId] = {
        ...mapped[stepId],
        title: record.stepName ?? mapped[stepId].title,
        status: CHECK_STATUS_TO_FRONT[record.result ?? ""] ?? "pending",
        message: record.message ?? "",
        checkedAt: asString(checkedAt),
        values: parsedPayload.values,
        propertyValues: parsedPayload.propertyValues,
        ...(deviceId != null ? { deviceId } : {}),
        ...(rule != null ? { rule } : {}),
      };
    }
  }
  return mapped;
}

interface ParsedCheckPayload {
  values: Array<{ label: string; value: string }>;
  propertyValues: FumigationCheckPropertyValue[];
  deviceId?: string;
  rule?: string;
}

function readCheckValuesPayload(record: BackendCheckRecord & LooseRecord): unknown {
  return firstPresentCheckPayload(
    record.valuesJson,
    record.values_json,
    record.propertyValues,
    record.property_values,
    record.values,
    record.checkValues,
    record.check_values,
  );
}

function firstPresentCheckPayload(...values: unknown[]): unknown {
  for (const value of values) {
    if (value != null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function parseCheckPayload(valuesPayload: unknown, stepId?: FumigationPrecheckStepId): ParsedCheckPayload {
  if (valuesPayload == null || valuesPayload === "") {
    return { values: [], propertyValues: [] };
  }
  try {
    const parsed = typeof valuesPayload === "string" ? (JSON.parse(valuesPayload) as unknown) : valuesPayload;
    if (Array.isArray(parsed)) {
      const propertyValues = parseCheckPropertyValues(parsed.filter(isDevicePropertyRecord));
      if (propertyValues.length > 0) {
        return {
          values: parseDevicePropertyValues(propertyValues, stepId),
          propertyValues,
          rule: precheckRuleText(stepId),
        };
      }
      return {
        values: parsed.map((item, index) => parseCheckValueItem(item, index)),
        propertyValues: [],
      };
    }
    if (parsed !== null && typeof parsed === "object") {
      const record = parsed as LooseRecord;
      const properties = pickArray<LooseRecord>(record, "properties", "propertyValues", "property_values");
      const rule = pickCheckRule(record, "rule", "threshold") ?? precheckRuleText(stepId);
      const deviceId = pickString(record, "deviceId", "device_id", "associatedDeviceId", "associated_device_id");
      if (properties != null && properties.length > 0) {
        const propertyValues = parseCheckPropertyValues(properties);
        return {
          values: parseDevicePropertyValues(propertyValues, stepId, rule),
          propertyValues,
          ...(deviceId != null ? { deviceId } : {}),
          rule,
        };
      }
      const nestedValues = pickArray<unknown>(record, "values", "checkValues", "check_values");
      if (nestedValues != null && nestedValues.length > 0) {
        return {
          values: nestedValues.map((item, index) => parseCheckValueItem(item, index)),
          propertyValues: [],
          ...(deviceId != null ? { deviceId } : {}),
          ...(rule != null ? { rule } : {}),
        };
      }
      if ("value" in record || "actual" in record || "message" in record) {
        return {
          values: [parseCheckValueItem(record, 0)],
          propertyValues: [],
          ...(deviceId != null ? { deviceId } : {}),
          ...(rule != null ? { rule } : {}),
        };
      }
    }
    return { values: [], propertyValues: [] };
  } catch {
    return { values: [], propertyValues: [] };
  }
}

function parseCheckPropertyValues(properties: unknown[]): FumigationCheckPropertyValue[] {
  return properties
    .filter((item): item is LooseRecord => item !== null && typeof item === "object")
    .map((item) => parseCheckPropertyValue(item));
}

function parseCheckPropertyValue(property: LooseRecord): FumigationCheckPropertyValue {
  const code = asString(property.code ?? property.propertyCode ?? property.property_code);
  const name = asString(property.name ?? property.label ?? property.propertyName ?? property.property_name ?? code);
  const value = normalizeCheckPropertyValue(property.value ?? property.actual ?? property.actualValue ?? property.actual_value);
  const unit = pickString(property, "unit");
  const ts = property.ts ?? property.time ?? property.timestamp ?? property.collectTime ?? property.collect_time;
  const pass = typeof property.pass === "boolean" ? property.pass : typeof property.passed === "boolean" ? property.passed : undefined;
  const message = pickString(property, "message", "resultMessage", "result_message");
  return {
    code,
    name,
    value,
    ...(unit != null ? { unit } : {}),
    ...(ts != null && ts !== "" ? { ts: ts as string | number } : {}),
    ...(pass != null ? { pass } : {}),
    ...(message != null ? { message } : {}),
  };
}

function normalizeCheckPropertyValue(value: unknown): string | number | boolean | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return asString(value);
}

function isDevicePropertyRecord(item: unknown): item is LooseRecord {
  if (item === null || typeof item !== "object") {
    return false;
  }
  const record = item as LooseRecord;
  return (
    pickString(record, "code", "propertyCode", "property_code") != null ||
    pickString(record, "unit") != null ||
    "pass" in record ||
    "passed" in record ||
    "ts" in record ||
    "timestamp" in record ||
    "collectTime" in record ||
    "collect_time" in record
  );
}

function parseCheckValueItem(item: unknown, index: number): { label: string; value: string } {
  if (item !== null && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return {
      label: asString(record.name ?? record.label ?? record.code ?? `校验值${index + 1}`),
      value: asString(record.value ?? record.actual ?? record.message ?? ""),
    };
  }
  return { label: `校验值${index + 1}`, value: asString(item) };
}

function parseDevicePropertyValues(
  properties: FumigationCheckPropertyValue[],
  stepId?: FumigationPrecheckStepId,
  rule?: string,
): Array<{ label: string; value: string }> {
  const ruleText = rule ?? precheckRuleText(stepId);
  const actualValues = properties.map(devicePropertyValueText).filter((value) => value !== "");
  return [
    {
      label: `${DEFAULT_PRECHECKS[stepId ?? "VENTILATION_DURATION"].title} ${ruleText}`,
      value: actualValues.length > 0 ? actualValues.join(" / ") : "--",
    },
  ];
}

function precheckRuleText(stepId?: FumigationPrecheckStepId): string {
  if (stepId === "PH3_CONCENTRATION") {
    return "< 0.3 ppm";
  }
  if (stepId === "OXYGEN_CONCENTRATION") {
    return ">= 19.5%";
  }
  return ">= 30 min";
}

function devicePropertyValueText(property: FumigationCheckPropertyValue): string {
  const name = asString(property.name ?? property.code);
  const value = property.value;
  if (value == null || value === "") {
    return name === "" ? "--" : `${name} --`;
  }
  const unit = asString(property.unit);
  const valueText = `${asString(value)}${unit === "" ? "" : ` ${unit}`}`;
  return name === "" ? valueText : `${name} ${valueText}`;
}

function parseFrontendRemark(value: string | undefined): FrontendRemarkPayload {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as FrontendRemarkPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildPlannedDosage(payload: CreateFumigationWorkPayload): string {
  if (payload.plannedDosage?.trim()) {
    return payload.plannedDosage.trim();
  }
  const pesticideName = PESTICIDE_TYPE_NAME[payload.pesticideTypeCode] ?? payload.pesticideTypeCode;
  return [pesticideName, payload.pesticideDosage].filter((item): item is string => Boolean(item?.trim())).join(" ");
}

function buildDisplayDosage(item: BackendWork, remark: FrontendRemarkPayload): string {
  return [item.pesticideTypeName ?? remark.pesticideTypeName ?? legacyPesticideName(remark), item.pesticideDosage ?? remark.pesticideDosage]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function legacyPesticideName(remark: FrontendRemarkPayload): string | undefined {
  if (remark.pesticideTypeName?.trim()) {
    return remark.pesticideTypeName;
  }
  if (remark.pesticideTypeCode?.trim()) {
    return PESTICIDE_TYPE_NAME[remark.pesticideTypeCode] ?? remark.pesticideTypeCode;
  }
  return remark.pesticideType;
}

function legacyApplicationMethodName(remark: FrontendRemarkPayload): string | undefined {
  if (remark.applicationMethodName?.trim()) {
    return remark.applicationMethodName;
  }
  if (remark.applicationMethodCode?.trim()) {
    return APPLICATION_METHOD_NAME[remark.applicationMethodCode] ?? remark.applicationMethodCode;
  }
  return remark.applicationMethod;
}

type LooseRecord = Record<string, unknown>;

function pickString(obj: LooseRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return undefined;
}

function pickCheckRule(obj: LooseRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeCheckRule(obj[key]);
    if (value != null) {
      return value;
    }
  }
  return undefined;
}

function normalizeCheckRule(value: unknown): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  return pickString(value as LooseRecord, "description", "label", "name", "value", "rule");
}

function pickNumber(obj: LooseRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function pickArray<T>(obj: LooseRecord, ...keys: string[]): T[] | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }
  return undefined;
}

function pickArrayOrJson<T>(obj: LooseRecord, ...keys: string[]): T[] | undefined {
  const direct = pickArray<T>(obj, ...keys);
  if (direct != null) {
    return direct;
  }
  for (const key of keys) {
    const value = obj[key];
    if (typeof value !== "string" || value.trim() === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function readBackendPeople(item: BackendWork): BackendOperationPerson[] {
  const raw = item as BackendWork & LooseRecord;
  return (
    item.people ??
    pickArrayOrJson<BackendOperationPerson>(
      raw,
      "people",
      "persons",
      "workers",
      "operationPeople",
      "operationPersons",
      "people_json",
      "persons_json",
      "workers_json",
      "operation_people",
      "operation_persons",
    ) ??
    []
  );
}

function readBackendApprovalRecords(item: BackendWork): BackendApprovalRecord[] {
  const raw = item as BackendWork & LooseRecord;
  return item.approvalRecords ?? pickArray<BackendApprovalRecord>(raw, "approval_records", "approvalRecords") ?? [];
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function toNumber(value: string | number): number | string {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

function formatDateLike(value: string | number): string {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  return value;
}

function emptyRealtimeSituationBackend(): FumigationRealtimeSituationBackend {
  return {
    stats: {
      inProgressCount: 0,
      completedTodayCount: 0,
      monthCreatedCount: 0,
      precheckPassRate: 0,
      lastMonthWorkCount: 0,
      currentMonthWorkCount: 0,
      lastMonthPrecheckPassRate: 0,
      currentMonthPrecheckPassRate: 0,
    },
    inProgressWorks: [],
    completedTodayWorks: [],
    warehouses: [],
  };
}

function toRateNumber(value: number | string | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapRealtimeStats(stats: BackendRealtimeSituationStats | undefined): FumigationRealtimeSituationStats {
  return {
    inProgressCount: Number(stats?.inProgressCount ?? 0),
    completedTodayCount: Number(stats?.completedTodayCount ?? 0),
    monthCreatedCount: Number(stats?.monthCreatedCount ?? 0),
    precheckPassRate: toRateNumber(stats?.precheckPassRate),
    lastMonthWorkCount: Number(stats?.lastMonthWorkCount ?? 0),
    currentMonthWorkCount: Number(stats?.currentMonthWorkCount ?? 0),
    lastMonthPrecheckPassRate: toRateNumber(stats?.lastMonthPrecheckPassRate),
    currentMonthPrecheckPassRate: toRateNumber(stats?.currentMonthPrecheckPassRate),
  };
}

function mapRealtimeWorkItem(item: BackendRealtimeSituationWorkItem): FumigationRealtimeSituationWorkItem {
  return {
    id: asString(item.id),
    code: item.code ?? asString(item.id),
    warehouseId: asString(item.warehouseId),
    warehouseName: item.warehouseName ?? "--",
    grainVarietyName: item.grainVarietyName ?? "--",
    pesticideSummary: item.pesticideSummary ?? "--",
    workerCount: Number(item.workerCount ?? 0),
    remainingLabel: item.remainingLabel,
    completedTime: item.completedTime,
    status: (item.status ?? "SAFETY_APPROVING") as FumigationWork["status"],
  };
}

function mapRealtimeWarehouseItem(item: BackendRealtimeSituationWarehouseItem): FumigationRealtimeSituationWarehouseItem {
  const warehouseId = item.warehouseId ?? "";
  return {
    warehouseId,
    warehouseName: item.warehouseName ?? warehouseId,
    grainType: item.grainType,
    statusLabel: item.statusLabel ?? (item.status === "working" ? "作业中" : "空闲"),
    status: item.status === "working" ? "working" : "idle",
  };
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatTodayPeriod(): string {
  const now = new Date();
  return `${formatLocalDateTime(startOfLocalDay(now))},${formatLocalDateTime(endOfLocalDay(now))}`;
}
