import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { ListDeviceInstancesParams } from "@g2-contract/device-center";
import type {
  AreaPlaneMapPayload,
  AreaPlaneMapVO,
  AreaTreeNode,
  CandidatePageQuery,
  EvacuationRouteCreatePayload,
  EvacuationRouteDevicesPayload,
  EvacuationRoutePageQuery,
  EvacuationRouteUpdatePayload,
  EvacuationRouteVO,
  PageResult,
  ResourceCandidate,
  ResourcePageQuery,
  ResourceRefPayload,
  ResourceRefStatistics,
  ResourceRefVO,
  ResourceRefType,
} from "@g2-contract/emergency-dispatch";

import { ProxyClient } from "@/clients/proxy-client";
import { DeviceCenterProxyService } from "@/services/proxy/device-center/device-center-proxy.service";
import { StaffProxyService, type StaffPageQuery } from "@/services/proxy/staff/staff-proxy.service";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data: T;
}

const hasData = <T>(value: unknown): value is LegacyResponse<T> => {
  return value !== null && typeof value === "object" && "data" in value;
};

@Injectable()
export class EmergencyDispatchProxyService {
  private readonly emergencyBaseUrl: string;
  private readonly propertyBaseUrl: string;
  private readonly metadataBaseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    private readonly deviceCenterProxyService: DeviceCenterProxyService,
    private readonly staffProxyService: StaffProxyService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.emergencyBaseUrl = (this.configService.get<string>("app.emergencyUrl") ?? "").replace(/\/$/, "");
    this.propertyBaseUrl = (this.configService.get<string>("app.propertyUrl") ?? "").replace(/\/$/, "");
    this.metadataBaseUrl = (this.configService.get<string>("app.metadataUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): PageResult<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async pageResourceRefs(query: ResourcePageQuery): Promise<PageResult<ResourceRefVO>> {
    return await this.forwardEmergencyGet("/resource-refs/page", { ...query }, this.emptyPage<ResourceRefVO>());
  }

  public async listResourceRefs(query: Pick<ResourcePageQuery, "refType" | "refIds">): Promise<ResourceRefVO[]> {
    return await this.forwardEmergencyPost("/resource-refs/resources", query, []);
  }

  public async createResourceRef(payload: ResourceRefPayload[]): Promise<void> {
    await this.forwardEmergencyPost("/resource-refs", payload);
  }

  public async deleteResourceRef(id: string): Promise<void> {
    await this.forwardDelete(this.emergencyBaseUrl, `/resource-refs/${id}`);
  }

  public async getResourceRefStatistics(): Promise<ResourceRefStatistics> {
    return await this.forwardEmergencyGet("/resource-refs/statistics", undefined, { counts: {} });
  }

  public async getAreaTree(): Promise<AreaTreeNode[]> {
    return await this.forwardGet(this.metadataBaseUrl, "/area/list", undefined, []);
  }

  public async createAreaPlaneMap(payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
    return await this.forwardEmergencyPost("/area-plane-maps", payload);
  }

  public async updateAreaPlaneMap(id: string, payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
    return await this.forwardEmergencyPut(`/area-plane-maps/${id}`, payload);
  }

  public async deleteAreaPlaneMap(id: string): Promise<void> {
    await this.forwardDelete(this.emergencyBaseUrl, `/area-plane-maps/${id}`);
  }

  public async listAreaPlaneMapsByAreaId(areaId: string | number): Promise<AreaPlaneMapVO[]> {
    return await this.forwardEmergencyGet(`/area-plane-maps/area/${areaId}`, undefined, []);
  }

  /** 疏散路线分页：对齐旧仓 GET /api/emergency/evacuation-routes/page */
  public async pageEvacuationRoutes(query: EvacuationRoutePageQuery): Promise<PageResult<EvacuationRouteVO>> {
    const payload: Record<string, unknown> = {
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 10,
    };
    if (query.areaId != null && query.areaId !== "") {
      payload.areaId = String(query.areaId);
    }
    const data = await this.forwardEmergencyGet<PageResult<EvacuationRouteVO>>(
      "/evacuation-routes/page",
      payload,
      this.emptyPage<EvacuationRouteVO>(),
    );
    return this.asPage<EvacuationRouteVO>(data);
  }

  public async createEvacuationRoute(payload: EvacuationRouteCreatePayload): Promise<EvacuationRouteVO | void> {
    return await this.forwardEmergencyPost("/evacuation-routes", payload);
  }

  public async updateEvacuationRoute(id: string, payload: EvacuationRouteUpdatePayload): Promise<EvacuationRouteVO | void> {
    return await this.forwardEmergencyPut(`/evacuation-routes/${id}`, payload);
  }

  public async deleteEvacuationRoute(id: string): Promise<void> {
    await this.forwardDelete(this.emergencyBaseUrl, `/evacuation-routes/${id}`);
  }

  public async updateEvacuationRouteDevices(id: string, payload: EvacuationRouteDevicesPayload): Promise<void> {
    await this.forwardEmergencyPut(`/evacuation-routes/${id}/devices`, payload);
  }

  public async pageResourceCandidates(query: CandidatePageQuery): Promise<PageResult<ResourceCandidate>> {
    const page = await this.fetchCandidatePage(query);
    const normalized = this.asPage<Record<string, unknown>>(page);
    return {
      ...normalized,
      records: normalized.records
        .map((record) => this.normalizeCandidate(record, query.type))
        .filter((item): item is ResourceCandidate => Boolean(item)),
    };
  }

  private async fetchCandidatePage(query: CandidatePageQuery): Promise<unknown> {
    if (query.type === "DEVICE") {
      return await this.deviceCenterProxyService.listDeviceInstances(this.deviceCandidatePayload(query));
    }
    if (query.type === "PERSON") {
      return await this.staffProxyService.pageStaff(this.staffCandidatePayload(query));
    }
    return await this.forwardGet(
      this.propertyBaseUrl,
      "/risk/source/ledger/page",
      this.materialCandidatePayload(query),
      this.emptyPage<Record<string, unknown>>(),
    );
  }

  private candidateBasePayload(query: CandidatePageQuery): StaffPageQuery {
    return {
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
    };
  }

  private deviceCandidatePayload(query: CandidatePageQuery): ListDeviceInstancesParams {
    const base = this.candidateBasePayload(query);
    return {
      ...base,
      anyAreaId: query.areaId == null ? undefined : String(query.areaId),
      anyMatchedAreaId: query.areaId == null ? undefined : String(query.areaId),
    };
  }

  private staffCandidatePayload(query: CandidatePageQuery): StaffPageQuery {
    return {
      ...this.candidateBasePayload(query),
      areaId: query.areaId,
    };
  }

  private materialCandidatePayload(query: CandidatePageQuery): Record<string, unknown> {
    const base = {
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
    };
    return {
      ...base,
      areaId: query.areaId,
    };
  }

  private async forwardEmergencyGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    return await this.forwardGet(this.emergencyBaseUrl, path, query, empty);
  }

  private async forwardEmergencyPost<T>(path: string, body?: unknown, empty?: T): Promise<T> {
    return await this.forwardPost(this.emergencyBaseUrl, path, body, empty);
  }

  private async forwardEmergencyPut<T>(path: string, body?: unknown, empty?: T): Promise<T> {
    return await this.forwardPut(this.emergencyBaseUrl, path, body, empty);
  }

  private async forwardGet<T>(baseUrl: string, path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const response = await this.proxyClient.request<unknown>(buildUrl(`${baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardPost<T>(baseUrl: string, path: string, body?: unknown, empty?: T): Promise<T> {
    if (!baseUrl) {
      return (empty ?? undefined) as T;
    }
    const response = await this.proxyClient.request<unknown>(`${baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardPut<T>(baseUrl: string, path: string, body?: unknown, empty?: T): Promise<T> {
    if (!baseUrl) {
      return (empty ?? undefined) as T;
    }
    const response = await this.proxyClient.request<unknown>(`${baseUrl}${path}`, {
      method: "PUT",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardDelete(baseUrl: string, path: string): Promise<void> {
    if (!baseUrl) {
      return;
    }
    await this.proxyClient.request(`${baseUrl}${path}`, {
      method: "DELETE",
      passthroughError: true,
    });
  }

  private unwrap<T>(value: unknown): T {
    return hasData<T>(value) ? value.data : (value as T);
  }

  private asPage<T>(value: unknown): PageResult<T> {
    const obj = this.unwrap<Partial<PageResult<T>> & { list?: T[]; rows?: T[] }>(value);
    if (Array.isArray(obj?.records)) {
      return obj as PageResult<T>;
    }
    if (Array.isArray(obj?.list)) {
      return { records: obj.list, total: obj.list.length, pages: obj.list.length > 0 ? 1 : 0 };
    }
    if (Array.isArray(obj?.rows)) {
      return { records: obj.rows, total: obj.rows.length, pages: obj.rows.length > 0 ? 1 : 0 };
    }
    return this.emptyPage<T>();
  }

  private normalizeCandidate(record: Record<string, unknown>, type: ResourceRefType): ResourceCandidate | null {
    const id = this.toId(this.first(record, this.idFields(type)));
    if (!id) {
      return null;
    }
    return {
      id,
      type,
      typeName: this.typeText(type),
      name: this.toStringValue(this.first(record, this.nameFields(type))) || `资源-${id}`,
      code: this.toStringValue(this.first(record, this.codeFields(type))) || id,
      category: this.categoryName(record, type),
      area: this.areaName(record, type),
    };
  }

  private idFields(type: ResourceRefType): string[] {
    if (type === "DEVICE") {
      return ["id", "deviceId", "deviceInstanceId"];
    }
    if (type === "PERSON") {
      return ["id", "staffId", "userId"];
    }
    return ["id", "riskSourceId", "ledgerId"];
  }

  private nameFields(type: ResourceRefType): string[] {
    if (type === "PERSON") {
      return ["name", "staffName", "personName", "username"];
    }
    if (type === "MATERIAL") {
      return ["name", "riskSourceName", "sourceName", "ledgerName"];
    }
    return ["name", "deviceName", "instanceName"];
  }

  private codeFields(type: ResourceRefType): string[] {
    if (type === "PERSON") {
      return ["job_number", "jobNumber", "code", "staffCode", "jobNo", "mobile", "username"];
    }
    if (type === "MATERIAL") {
      return ["code", "serialNumber", "riskSourceCode", "ledgerCode"];
    }
    return ["code", "deviceCode", "sn", "instanceCode"];
  }

  private categoryName(record: Record<string, unknown>, type: ResourceRefType): string {
    if (type === "DEVICE") {
      const productInfo = this.objectValue(record.productInfo);
      return (
        this.toStringValue(this.first(productInfo, ["name", "productName", "categoryName", "prodName"])) ||
        this.toStringValue(this.first(record, ["resourceType", "productCategoryName", "deviceTypeName"]))
      );
    }
    if (type === "PERSON") {
      return this.toStringValue(this.first(record, ["appointmentName", "postNames", "typeName", "stateName"]));
    }
    return this.toStringValue(this.first(record, ["typeName", "resourceType", "categoryName"]));
  }

  private areaName(record: Record<string, unknown>, type: ResourceRefType): string {
    if (type === "DEVICE") {
      const area = this.objectValue(record.area);
      return (
        this.toStringValue(this.first(area, ["pathName", "name", "areaName", "fullName"])) ||
        this.toStringValue(this.first(record, ["areaName", "areaFullName", "regionName", "spaceName", "locationName"]))
      );
    }
    if (type === "PERSON") {
      return this.joinAreaNameList(record.areaNameList) || this.toStringValue(this.first(record, ["organizationName", "areaName"]));
    }
    return this.toStringValue(this.first(record, ["areaName", "areaFullName", "regionName", "spaceName", "locationName"]));
  }

  private first(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
        return record[key];
      }
    }
    return undefined;
  }

  private toId(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }
    return "";
  }

  private toStringValue(value: unknown): string {
    return value == null ? "" : String(value);
  }

  private joinAreaNameList(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.toStringValue(item).trim())
        .filter(Boolean)
        .join("-");
    }
    if (typeof value === "string") {
      return value
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join("-");
    }
    return "";
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private typeText(type: ResourceRefType): string {
    if (type === "PERSON") {
      return "人员";
    }
    if (type === "MATERIAL") {
      return "物资";
    }
    return "设备";
  }
}
