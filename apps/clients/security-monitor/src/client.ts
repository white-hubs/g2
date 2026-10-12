import type { PlatformContext } from "@g2-composition/contract";
import type { SecurityMonitorBffBasePath } from "@g2-contract/security-monitor";

export interface SecurityMonitorPage<T = Record<string, unknown>> {
  records: T[];
  total: number;
  pages?: number;
  current?: number;
  size?: number;
}

export type SecurityMonitorRecord = Record<string, unknown>;

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string, init?: RequestInit) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

// Contract packages are type-only in browser MF bundles.
const BFF_BASE: SecurityMonitorBffBasePath = "/gw-bff/security-monitor";
const VMONITOR_BASE = `${BFF_BASE}/vmonitor`;

function withQuery(url: string, query?: Record<string, unknown>): string {
  if (!query) return url;
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    })
    .join("&");
  return search ? `${url}?${search}` : url;
}

function boundedPageQuery(query: Record<string, unknown>, maxPageSize = 1000): Record<string, unknown> {
  const requested = Number(query.pageSize);
  return Number.isFinite(requested) && requested > maxPageSize ? { ...query, pageSize: maxPageSize } : query;
}

export class SecurityMonitorClient {
  public constructor(private readonly http: HttpClient) {}

  public listVideoDevices(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/multiple-video/devices`, boundedPageQuery(query)));
  }

  public getVideoDeviceTree(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/multiple-video/area-tree-devices`, query));
  }

  public listVideoCollections(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/multiple-video-collects`, boundedPageQuery(query)));
  }

  public getVideoCollection(id: string): Promise<unknown> {
    return this.http.get(`${VMONITOR_BASE}/multiple-video-collect/${encodeURIComponent(id)}`);
  }

  public createVideoCollection(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/multiple-video-collect`, payload);
  }

  public updateVideoCollection(id: string, payload: unknown): Promise<unknown> {
    return this.http.put(`${VMONITOR_BASE}/multiple-video-collect/${encodeURIComponent(id)}`, payload);
  }

  public deleteVideoCollection(id: string): Promise<unknown> {
    return this.http.delete(`${VMONITOR_BASE}/multiple-video-collect/${encodeURIComponent(id)}`);
  }

  public listDeviceAuthorizations(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/security/device/auth/getPage`, boundedPageQuery(query)));
  }

  public listUserDeviceAuthorizations(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/security/user/device/auth/getPage`, boundedPageQuery(query)));
  }

  public assignDeviceAuthorization(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/security/device/auth/insert`, payload);
  }

  public removeDeviceAuthorization(userId: string, securityDeviceId: string): Promise<unknown> {
    return this.http.delete(withQuery(`${VMONITOR_BASE}/security/device/auth/delete`, { userId, securityDeviceId }));
  }

  public clearUserDeviceAuthorizations(userIds: string[]): Promise<unknown> {
    return this.http.delete(`${VMONITOR_BASE}/security/auth/batch/delete/users`, {
      body: JSON.stringify({ userIds }),
    });
  }

  public clearDeviceUserAuthorizations(deviceIds: string[]): Promise<unknown> {
    return this.http.delete(`${VMONITOR_BASE}/security/auth/batch/delete/devices`, {
      body: JSON.stringify({ deviceIds }),
    });
  }

  public listPatrolLines(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-lines`, query));
  }

  public listAllPatrolLines(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-line/list`, query));
  }

  public getPatrolLine(id: string): Promise<unknown> {
    return this.http.get(`${VMONITOR_BASE}/camera-patrol-line/${encodeURIComponent(id)}`);
  }

  public createPatrolLine(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-line`, payload);
  }

  public updatePatrolLine(id: string, payload: unknown): Promise<unknown> {
    return this.http.put(`${VMONITOR_BASE}/camera-patrol-line/${encodeURIComponent(id)}`, payload);
  }

  public togglePatrolLine(id: string, enabled: boolean): Promise<unknown> {
    return this.http.put(`${VMONITOR_BASE}/camera-patrol-line/${encodeURIComponent(id)}/${enabled}`);
  }

  public deletePatrolLine(id: string): Promise<unknown> {
    return this.http.delete(`${VMONITOR_BASE}/camera-patrol-line/${encodeURIComponent(id)}`);
  }

  public deletePatrolLines(ids: string[]): Promise<unknown> {
    return this.http.delete(withQuery(`${VMONITOR_BASE}/camera-patrol-line/batch`, { ids }));
  }

  public listPatrolRecords(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-records`, query));
  }

  public getPatrolRecord(id: string): Promise<unknown> {
    return this.http.get(`${VMONITOR_BASE}/camera-patrol-record/${encodeURIComponent(id)}`);
  }

  public listPatrolRecordDevices(id: string): Promise<unknown> {
    return this.http.get(`${VMONITOR_BASE}/camera-patrol-record-devices/${encodeURIComponent(id)}`);
  }

  public startPatrol(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-record`, payload);
  }

  public capturePatrolSnapshot(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-record/snap-capture`, payload);
  }

  public submitPatrolRecordDevice(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-record-device`, payload);
  }

  public listPatrolAbnormalRecords(id: string): Promise<unknown> {
    return this.http.get(`${VMONITOR_BASE}/camera-patrol-record-device-remarks/${encodeURIComponent(id)}`);
  }

  public listPatrolStatistics(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-line-statistics/page`, query));
  }

  public getPatrolAbnormalGroup(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-line-statistics/group-abnormal`, query));
  }

  public getPatrolAbnormalSummary(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-line-statistics/abnormal`, query));
  }

  public getPatrolAbnormalGrowth(query: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(withQuery(`${VMONITOR_BASE}/camera-patrol-line-statistics/abnormal-growth-rate`, query));
  }

  public exportPatrolStatistics(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-line-statistics/list/export`, payload);
  }

  public exportPatrolRecords(payload: unknown): Promise<unknown> {
    return this.http.post(`${VMONITOR_BASE}/camera-patrol-records/export`, payload);
  }
}

export async function create(ctx: PlatformContext): Promise<SecurityMonitorClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return new SecurityMonitorClient(httpModule.createHttpClientForPlatform(ctx));
}
