import type { PlatformContext } from "@g2-composition/contract";
import type { PageResult, SafetyManagementClient } from "@g2-contract/safety-management";

interface HttpClient {
  get(url: string, init?: RequestInit): Promise<unknown>;
  post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  delete(url: string, init?: RequestInit): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

const SAFETY_API = "/api/safety-management";
const ALARM_API = "/api/alarm";
const METRIC_API = "/api/metric";

function query(url: string, params?: Record<string, unknown>): string {
  if (!params) {
    return url;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
    } else {
      search.append(key, String(value));
    }
  }
  const suffix = search.toString();
  return suffix ? `${url}?${suffix}` : url;
}

function pageParams(params: Record<string, unknown>): Record<string, unknown> {
  return {
    keyword: params.keyword,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
  };
}

function unwrap(value: unknown): unknown {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (current === null || typeof current !== "object" || Array.isArray(current) || !("data" in current)) {
      break;
    }
    current = (current as { data: unknown }).data;
  }
  return current;
}

function list(value: unknown): Record<string, unknown>[] {
  const body = unwrap(value);
  if (Array.isArray(body)) {
    return body.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }
  if (body !== null && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["records", "list", "items", "content", "result", "data"]) {
      if (Array.isArray(record[key])) {
        return record[key].filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
      }
      if (record[key] && typeof record[key] === "object") {
        const nested = list(record[key]);
        if (nested.length > 0) {
          return nested;
        }
      }
    }
  }
  return [];
}

function page(value: unknown): PageResult {
  const body = unwrap(value);
  const record = body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const records = list(body);
  const total = Number(record.total ?? record.totalCount ?? record.count ?? records.length) || 0;
  return {
    records,
    total,
    pageNumber: Number(record.pageNumber ?? record.page ?? 1) || 1,
    pageSize: Number(record.pageSize ?? record.size ?? records.length) || records.length,
  };
}

function channelCodes(value: unknown): Set<string> {
  const body = unwrap(value);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return new Set();
  }
  const codes = (body as Record<string, unknown>).channelCodes;
  return new Set(Array.isArray(codes) ? codes.map(String) : []);
}

function toBlobDownload(raw: unknown, fallback: string): void {
  if (!(raw instanceof Blob)) {
    return;
  }
  const url = URL.createObjectURL(raw);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallback;
  link.click();
  URL.revokeObjectURL(url);
}

export function createSafetyManagementClient(http: HttpClient): SafetyManagementClient {
  return {
    listHeadMonthlyReports: async (params) =>
      page(await http.get(query(`${SAFETY_API}/monthly/report/manage/queryByPage`, pageParams(params)))),
    listAllMarketReportsByHeadReport: async (reportId) =>
      list(await http.get(`${SAFETY_API}/market-monthly-reports/${encodeURIComponent(reportId)}/by-monthly-report`)),
    listReportedMarketReportsByHeadReport: async (reportId) =>
      list(await http.get(`${SAFETY_API}/public/market-monthly-reports/wind-up/${encodeURIComponent(reportId)}/by-monthly-report`)),
    listUnreportedMarketReportsByHeadReport: async (reportId) =>
      list(await http.get(`${SAFETY_API}/public/market-monthly-reports/non-wind-up/${encodeURIComponent(reportId)}/by-monthly-report`)),
    listSecurityReports: async (params) => page(await http.get(query(`${SAFETY_API}/alarm/securityReportPage`, pageParams(params)))),
    listMarketMonthlyReports: async (params) =>
      page(await http.get(query("/api/centerApi/safety-management/public/market-monthly-report/queryByPage", params))),
    getMarketMonthlyReport: async (id, market) =>
      unwrap(
        await http.get(`/${market ? "api/centerApi" : "api"}/safety-management/public/market-monthly-report/${encodeURIComponent(id)}`),
      ),
    saveMarketMonthlyReport: async (id, reportData, market) =>
      unwrap(
        await http.post(`/${market ? "api/centerApi" : "api"}/safety-management/public/market-monthly-report`, {
          id,
          reportData: JSON.stringify(reportData),
        }),
      ),
    escalateMarketMonthlyReport: async (id) =>
      unwrap(await http.put(`/api/centerApi/safety-management/public/market-monthly-report/escalation/${encodeURIComponent(id)}`, {})),
    listMonthlyLinks: async (params) => page(await http.get(query(`${SAFETY_API}/market_month_report_url/page`, params))),
    updateMonthlyLink: async (id, enabled) =>
      unwrap(await http.put(`${SAFETY_API}/market_month_report_url/${encodeURIComponent(id)}/enabled/${enabled}`, {})),
    listMarketConfigs: async (params) => page(await http.get(query("/api/dataintegrate/market-config/page", params))),
    createMarketConfig: async (payload) => unwrap(await http.post("/api/dataintegrate/market-config", payload)),
    updateMarketConfig: async (payload) => {
      const id = encodeURIComponent(String(payload.id ?? ""));
      return unwrap(await http.put(`/api/dataintegrate/market-config/${id}`, payload));
    },
    deleteMarketConfig: async (id) => unwrap(await http.delete(`/api/dataintegrate/market-config/${encodeURIComponent(id)}`)),
    listAlarmTypes: async (params = {}) => page(await http.get(query(`${SAFETY_API}/alarm-type/page`, params))),
    listAlarmTypeOptions: async (params = {}) => list(await http.get(query(`${SAFETY_API}/alarm-types`, params))),
    listAlarmLevels: async (params = {}) => list(await http.get(query(`${SAFETY_API}/sat-alarm-levels`, params))),
    listAlarmConfig: async (alarmTypeCode) =>
      list(await http.get(`${SAFETY_API}/alarm-config/${encodeURIComponent(alarmTypeCode)}/levels`)),
    updateAlarmConfig: async (alarmTypeCode, levelCode, timeout) =>
      unwrap(
        await http.put(
          query(`${SAFETY_API}/alarm-config/${encodeURIComponent(alarmTypeCode)}/level/${encodeURIComponent(levelCode)}`, {
            timeout,
          }),
          {},
        ),
      ),
    deleteAlarmConfig: async (alarmTypeCode, levelCode) =>
      unwrap(await http.delete(`${SAFETY_API}/alarm-config/${encodeURIComponent(alarmTypeCode)}/level/${encodeURIComponent(levelCode)}`)),
    listMarkets: async (params = {}) => list(await http.get(query("/api/dataintegrate/market-config/list", params))),
    listDepartments: async (params = {}) =>
      list(await http.get(query("/api/ouaa/authenticated/organizations/list", { enabled: true, ...params }))),
    listEventTypes: async (params = {}) => list(await http.get(query("/api/emergency/emergency-event-types", params))),
    listHeadAlarmRecords: async (params) => page(await http.get(query(`${SAFETY_API}/alarm-record/page`, params))),
    listMarketAlarmRecords: async (params) => page(await http.get(query(`${ALARM_API}/alarm-records`, params))),
    listSafetyReport: async (params) => page(await http.get(query(`${SAFETY_API}/alarm-record/report`, params))),
    exportSafetyReport: async (params) => {
      const result = await http.post(`${SAFETY_API}/alarm-record/report/export`, params);
      toBlobDownload(result, "安全月报.xlsx");
      return unwrap(result);
    },
    getAlarmDetail: async (id) => unwrap(await http.get(`${ALARM_API}/alarm-record/${encodeURIComponent(id)}`)),
    getAlarmOperatorRecords: async (id) => unwrap(await http.get(`${ALARM_API}/alarm-record/operatorLogs/${encodeURIComponent(id)}`)),
    getAlarmLinkageActions: async (eventId) => unwrap(await http.get(`/api/linkage/event-iot-device-pros/${encodeURIComponent(eventId)}`)),
    getAlarmLinkageExecuteRecords: async (eventId) =>
      unwrap(await http.get(`/api/linkage/event-iot-device-pro-records/${encodeURIComponent(eventId)}`)),
    getAlarmVideoEventFiles: async (eventId) =>
      unwrap(await http.get(`/api/linkage/event-video-file-paths/${encodeURIComponent(eventId)}`)),
    executeAlarmLinkage: async (payload) => unwrap(await http.put(`/api/linkage/event-iot-device-pro/ctrl`, payload)),
    exportAlarmRecords: async (params) => {
      const result = await http.post(`${SAFETY_API}/alarm-record/export`, params);
      toBlobDownload(result, "安全报警记录.xlsx");
      return unwrap(result);
    },
    listMetricReports: async (params) => page(await http.get(query(`${METRIC_API}/safety/reports`, params))),
    getMetricReport: async (id) => unwrap(await http.get(`${METRIC_API}/safety/reports/${encodeURIComponent(id)}`)),
    listMetricLibraries: async (params) => page(await http.get(query(`${METRIC_API}/metric-libraries`, params))),
    listAllMetricLibraries: async () => list(await http.get(`${METRIC_API}/metric-libraries/all`)),
    createMetricLibrary: async (payload) => unwrap(await http.post(`${METRIC_API}/metric-libraries`, payload)),
    updateMetricLibrary: async (payload) => unwrap(await http.put(`${METRIC_API}/metric-libraries`, payload)),
    deleteMetricLibrary: async (id) => unwrap(await http.delete(`${METRIC_API}/metric-libraries/${encodeURIComponent(id)}`)),
    listRuleLibraries: async () => list(await http.get(`${METRIC_API}/rule-libraries/tree`)),
    saveRuleLibrary: async (payload) => unwrap(await http.post(`${METRIC_API}/rule-libraries`, payload)),
    updateRuleLibrary: async (payload) => unwrap(await http.put(`${METRIC_API}/rule-libraries`, payload)),
    deleteRuleLibrary: async (id) => unwrap(await http.delete(`${METRIC_API}/rule-libraries/${encodeURIComponent(id)}`)),
    listAlarmReport: async (params) => page(await http.get(query(`${ALARM_API}/alarm/record/safety-report`, params))),
    listDepartmentReport: async (params) => page(await http.get(query(`${ALARM_API}/alarm/record/safety-report/department`, params))),
    listUserReport: async (params) => page(await http.get(query(`${ALARM_API}/alarm-statistics/user-status-page`, params))),
    exportAlarmReport: async (kind, params) => {
      const paths = {
        alarm: `${ALARM_API}/alarm/record/safety-report/export`,
        department: `${ALARM_API}/alarm/record/safety-report/department/export`,
        user: `${ALARM_API}/alarm-statistics/user-status/list/export`,
      } as const;
      const result = await http.post(paths[kind], params);
      toBlobDownload(result, `${kind === "department" ? "部门" : kind === "user" ? "人员" : "报警"}统计.xlsx`);
      return unwrap(result);
    },
    getNoticeConfig: async (businessType) => unwrap(await http.get(query("/api/bracing/message/getConfigInfo", { businessType }))),
    getNoticeChannels: async (sceneCode) => {
      const [channels, receive] = await Promise.all([
        http.get("/api/message2/sat-msg-channels"),
        http.get(`/api/message2/sat-msg-scene-receive/code/${encodeURIComponent(sceneCode)}`),
      ]);
      const selected = channelCodes(receive);
      return list(channels)
        .filter((item) => selected.has(String(item.channelCode ?? item.code ?? "")))
        .map((item) => ({
          label: String(item.channelName ?? item.name ?? item.channelCode ?? ""),
          value: String(item.channelCode ?? item.code ?? ""),
        }));
    },
    saveNoticeConfig: async (payload) => unwrap(await http.post("/api/bracing/message/addConfig", payload)),
    getAnalysisSummary: async (params) => unwrap(await http.get(query(`${SAFETY_API}/safety-alarm-statistics/situation`, params))),
    getMarketClientAuthorization: async () => {
      const data = unwrap(await http.get("/api/ouaa/tenant-client"));
      return data !== null && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    },
    generateMarketClientAuthorization: async () => {
      const data = unwrap(await http.post("/api/ouaa/tenant-client/generate", {}));
      return data !== null && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    },
    grantMarketClientScope: async (clientCode, scopeCode) =>
      unwrap(await http.post(`/api/ouaa/tenant-client/${encodeURIComponent(clientCode)}/${encodeURIComponent(scopeCode)}`, {})),
    revokeMarketClientScope: async (clientCode, scopeCode) =>
      unwrap(await http.delete(`/api/ouaa/tenant-client/${encodeURIComponent(clientCode)}/${encodeURIComponent(scopeCode)}`)),
  };
}

export async function create(ctx: PlatformContext): Promise<SafetyManagementClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSafetyManagementClient(httpModule.createHttpClientForPlatform(ctx));
}
