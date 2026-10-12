import type { PlatformContext } from "@g2-composition/contract";
import type {
  AssistantSkillOption,
  WorkbenchCard,
  WorkbenchClient,
  WorkbenchNoUseCardQuery,
  WorkbenchUserMemoModifyParam,
  WorkbenchUserMemoPage,
  WorkbenchUserMemoPageQuery,
} from "@g2-contract/workbench";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

type StatDateUnit = "day" | "week" | "month" | "year" | "quarter";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatYmdHms(date: Date): string {
  return `${formatYmd(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/** 对齐旧仓 epp DateUtils + zh-cn：周从周一开始。 */
function toDateUnit(type: unknown): StatDateUnit {
  switch (type) {
    case "THIS_WEEK":
      return "week";
    case "THIS_MONTH":
      return "month";
    case "THIS_QUARTER":
      return "quarter";
    case "THIS_YEAR":
      return "year";
    case "TODAY":
    default:
      return "day";
  }
}

function startOfUnit(date: Date, unit: StatDateUnit): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  switch (unit) {
    case "week": {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d;
    }
    case "month":
      d.setDate(1);
      return d;
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3) * 3;
      d.setMonth(q, 1);
      return d;
    }
    case "year":
      d.setMonth(0, 1);
      return d;
    case "day":
    default:
      return d;
  }
}

function endOfUnit(date: Date, unit: StatDateUnit): Date {
  const d = new Date(date.getTime());
  switch (unit) {
    case "week": {
      const start = startOfUnit(date, "week");
      start.setDate(start.getDate() + 6);
      start.setHours(23, 59, 59, 999);
      return start;
    }
    case "month":
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      return d;
    case "quarter": {
      const start = startOfUnit(date, "quarter");
      start.setMonth(start.getMonth() + 3, 0);
      start.setHours(23, 59, 59, 999);
      return start;
    }
    case "year":
      d.setMonth(11, 31);
      d.setHours(23, 59, 59, 999);
      return d;
    case "day":
    default:
      d.setHours(23, 59, 59, 999);
      return d;
  }
}

/**
 * 对齐旧仓 CubeAlarmStatService：period=`YYYY-MM-DD,YYYY-MM-DD`（日界）。
 * UI 仍传 `{ time, type }`，不可直接 String(Date) 进 query。
 * `includeType`：仅 trend 接口需要额外 type 参数。
 */
function toAlarmPeriodQuery(params?: Record<string, unknown>, includeType = false): Record<string, unknown> {
  const time = params?.time instanceof Date ? params.time : new Date();
  const unit = toDateUnit(params?.type);
  const query: Record<string, unknown> = {
    period: `${formatYmd(startOfUnit(time, unit))},${formatYmd(endOfUnit(time, unit))}`,
  };
  if (includeType && params?.type !== undefined) {
    query.type = params.type;
  }
  return query;
}

/**
 * 对齐旧仓 CubeSafetyManagementService：
 * period=`YYYY-MM-DD HH:mm:ss,YYYY-MM-DD HH:mm:ss`，tenantID → marketTenant。
 */
function toSafetyPeriodQuery(params?: Record<string, unknown>): Record<string, unknown> {
  const time = params?.time instanceof Date ? params.time : new Date();
  const unit = toDateUnit(params?.type);
  return {
    period: `${formatYmdHms(startOfUnit(time, unit))},${formatYmdHms(endOfUnit(time, unit))}`,
    marketTenant: params?.tenantID ?? "",
    type: params?.type,
  };
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

/** 旧仓 cube-protocol BASE_API=/api；工作台本域卡片走 ouaa。 */
const OUAA_API = "/api/ouaa";
const TODO_API = "/api/todo";
const MANAGEMENT_API = "/api/management";
const ENERGY_API = "/api/energymanagement";
const DEVICE_API = "/api/device-center";
const ALARM_API = "/api/alarm";
const SAFETY_API = "/api/safety-management";
const DATA_INTEGRATE_API = "/api/dataintegrate";
const AI_CENTER_API = "/api/ai-center/agent/console";

function unwrapData<T>(resp: unknown): T {
  if (resp !== null && typeof resp === "object" && "data" in resp) {
    return (resp as { data: T }).data;
  }
  return resp as T;
}

/**
 * 兼容多种列表信封：
 * - 直接数组
 * - OUAA `{ data: [] }`
 * - AI Center `{ items: [] }`（agent-sdk itemsOf）
 * - 网关再包一层 `{ data: { items: [] } }`
 */
function unwrapList(resp: unknown): Record<string, unknown>[] {
  const body = unwrapData<unknown>(resp);
  if (Array.isArray(body)) {
    return body.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object");
  }
  if (body !== null && typeof body === "object" && "items" in body) {
    const items = (body as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object");
    }
  }
  return [];
}

function toCard(record: Record<string, unknown>): WorkbenchCard {
  return {
    id: record.id as string,
    applicationCode: record.applicationCode as string,
    applicationId: record.applicationId as string,
    cardSize: record.cardSize as string,
    code: record.code as string,
    defaultCard: record.defaultCard === true,
    name: record.name as string,
    sort: record.sort as number,
  };
}

/** 对齐旧仓 CubeAppService：API 字段 applicationPageVOS → 卡片侧 apps。 */
function toApplicationGroup(group: Record<string, unknown>): {
  id: string;
  name: string;
  apps: Array<{ id: string; name: string; icon: string; code: string; applicationGroupId?: string }>;
} {
  const appsRaw = group.applicationPageVOS ?? group.apps;
  const apps = Array.isArray(appsRaw) ? appsRaw : [];
  return {
    id: String(group.id ?? ""),
    name: String(group.name ?? ""),
    apps: apps
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
      .map((app) => ({
        id: String(app.id ?? ""),
        name: String(app.name ?? ""),
        icon: String(app.icon ?? ""),
        code: String(app.code ?? ""),
        applicationGroupId: app.applicationGroupId != null ? String(app.applicationGroupId) : undefined,
      })),
  };
}

const INTERNAL_SKILL_IDS = new Set(["default-reasoning", "chart-output"]);

export function createWorkbenchClient(http: HttpClient): WorkbenchClient {
  return {
    getCards: async () => {
      const resp = await http.get(`${OUAA_API}/context/terminal-home-cards`);
      return unwrapList(resp).map(toCard);
    },
    getNoUseCards: async (query: WorkbenchNoUseCardQuery) => {
      const resp = await http.get(withQuery(`${OUAA_API}/context/terminal-cards`, { ...query }));
      return unwrapList(resp).map(toCard);
    },
    deleteHomeCard: async (code: string) => {
      await http.delete(`${OUAA_API}/home-application-card/${encodeURIComponent(code)}`);
    },
    saveHomeCard: async (cards: Record<string, unknown>[]) => {
      await http.post(`${OUAA_API}/home-application-card/batch`, { cardModifyParams: cards });
    },
    getUserMemoPage: async (query: WorkbenchUserMemoPageQuery) => {
      const resp = await http.get(withQuery(`${OUAA_API}/user-memos/page`, { ...query }));
      return unwrapData<WorkbenchUserMemoPage>(resp);
    },
    createUserMemo: async (payload: WorkbenchUserMemoModifyParam) => {
      const resp = await http.post(`${OUAA_API}/user-memos`, payload);
      return unwrapData<number>(resp);
    },
    updateUserMemo: async (id: string, payload: WorkbenchUserMemoModifyParam) => {
      await http.put(`${OUAA_API}/user-memos/${encodeURIComponent(id)}`, payload);
    },
    deleteUserMemo: async (id: string) => {
      await http.delete(`${OUAA_API}/user-memos/${encodeURIComponent(id)}`);
    },
    getFrequentMenus: async () => unwrapList(await http.get(`${OUAA_API}/context/frequent-menus`)),
    getApplicationGroups: async () => unwrapList(await http.get(`${OUAA_API}/context/terminal-application-groups`)).map(toApplicationGroup),

    getTodoTaskCount: async () => unwrapData<number>(await http.get(`${TODO_API}/todo-task-statistics`)),
    getTodoTaskTags: async () => unwrapList(await http.get(`${TODO_API}/todo-task-tag-statistics`)),
    getDoneTaskCount: async () => unwrapData<number>(await http.get(`${TODO_API}/done-task-statistics`)),
    getDoneTaskTags: async () => unwrapList(await http.get(`${TODO_API}/done-task-tag-statistics`)),

    listAnnouncement: async (params) => unwrapData(await http.get(withQuery(`${MANAGEMENT_API}/announcement/page`, params))),

    getSummaryStat: async (params) => unwrapData(await http.get(withQuery(`${ENERGY_API}/energy-daily-usage/stat/type/ringRatio`, params))),
    getStatTrend: async (params) => unwrapData(await http.get(withQuery(`${ENERGY_API}/energy-daily-usage/dc/stat/trend`, params))),
    ClassifySettingsPage: async (params) => unwrapData(await http.get(withQuery(`${ENERGY_API}/energy-collect-config/page`, params))),
    getEnergyStatProject: async (params) =>
      unwrapData(await http.get(withQuery(`${ENERGY_API}/energy-daily-usage/project/stat/category`, params))),

    getDeviceStatusCountByTagCode: async (params) =>
      unwrapData(await http.get(withQuery(`${DEVICE_API}/device/tagCode/status/count`, params))),

    alarmSummaryStat: async (params) => unwrapData(await http.get(withQuery(`${ALARM_API}/alarm-statistics`, toAlarmPeriodQuery(params)))),
    alarmSummaryStatByTypeRank: async (params) =>
      unwrapData(await http.get(withQuery(`${ALARM_API}/alarm-statistics/type-rank`, toAlarmPeriodQuery(params)))),
    alarmTrendStat: async (params) =>
      unwrapData(await http.get(withQuery(`${ALARM_API}/alarm-statistics/trend`, toAlarmPeriodQuery(params, true)))),

    alarmStatusStat: async (params) =>
      unwrapData(await http.get(withQuery(`${SAFETY_API}/safety-alarm-statistics/status`, toSafetyPeriodQuery(params)))),
    alarmActualRatioStat: async (params) =>
      unwrapData(await http.get(withQuery(`${SAFETY_API}/safety-alarm-statistics/model/actual-ratio`, toSafetyPeriodQuery(params)))),
    propertyFilingStat: async (params) =>
      unwrapData(await http.get(withQuery(`${SAFETY_API}/property/propertyFilingStatistics`, toSafetyPeriodQuery(params)))),
    listMarket: async (params) => unwrapData(await http.get(withQuery(`${DATA_INTEGRATE_API}/market-config/list`, params))),

    fetchAssistantSkills: async () => {
      const [shelfResp, systemResp, tenantResp] = await Promise.all([
        http.get(`${AI_CENTER_API}/my/skills`).catch(() => ({ items: [] })),
        http.get(withQuery(`${AI_CENTER_API}/library/skills`, { tier: "system" })).catch(() => ({ items: [] })),
        http.get(withQuery(`${AI_CENTER_API}/library/skills`, { tier: "tenant" })).catch(() => ({ items: [] })),
      ]);
      // AI Center 返回 { items }（对齐 agent-sdk-console itemsOf），不是 OUAA 的 { data }
      const shelf = unwrapList(shelfResp);
      const systemSkills = unwrapList(systemResp);
      const tenantSkills = unwrapList(tenantResp);
      const libraryNameByRef = new Map<string, string>();
      for (const item of [...systemSkills, ...tenantSkills]) {
        const ref = typeof item.ref === "string" ? item.ref : "";
        const name = typeof item.displayName === "string" ? item.displayName.trim() : "";
        if (ref && name) libraryNameByRef.set(ref, name);
      }
      const existingIds = new Set<string>();
      return shelf
        .filter((item) => item.targetKind === "skill" && item.runnableStatus === "runnable")
        .filter((item) => typeof item.targetId === "string" && item.targetId && !INTERNAL_SKILL_IDS.has(item.targetId))
        .filter((item) => {
          const id = item.targetId as string;
          if (existingIds.has(id)) return false;
          existingIds.add(id);
          return true;
        })
        .map(
          (item): AssistantSkillOption => ({
            id: item.targetId as string,
            label: libraryNameByRef.get(item.targetId as string) ?? (String(item.displayName ?? "").trim() || (item.targetId as string)),
          }),
        );
    },
  };
}

/** MF `./client` 入口 */
export async function create(ctx: PlatformContext): Promise<WorkbenchClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createWorkbenchClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { WorkbenchClient };
