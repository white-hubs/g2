import type * as CompositionContract from "@g2-composition/contract";
import type {
  AppointmentRecord,
  AppointmentRoom,
  BookRoomDetail,
  ConferenceGoods,
  ConferenceRoom,
  ConferenceType,
  FieldConfiguration,
  IdleDatum,
  IntervalSeries,
  MeetRoomClient,
  PageResult,
  RoomScreenConfig,
  UsageDatum,
} from "@g2-contract/meet-room";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const API = "/api";
const CONFERENCE = `${API}/conference`;

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object" || response instanceof Blob) {
    return response as T;
  }
  const envelope = response as Record<string, unknown>;
  if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
    throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "请求失败"));
  }
  const keys = Object.keys(envelope);
  const isEnvelope =
    "data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || "msg" in envelope || keys.length === 1);
  return (isEnvelope ? envelope.data : response) as T;
}

function list<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<Partial<PageResult<T>>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}

export function createMeetRoomClient(http: HttpClient): MeetRoomClient {
  return {
    pageConferenceRooms: async (query) => page<ConferenceRoom>(await http.get(withQuery(`${CONFERENCE}/getConferenceInfo`, query))),
    listConferenceRooms: async (query) => list<ConferenceRoom>(await http.get(withQuery(`${CONFERENCE}/get-conference-list`, query))),
    getConferenceRoom: async (id) => unwrap<ConferenceRoom>(await http.get(`${CONFERENCE}/getConferenceInfo/${encodeURIComponent(id)}`)),
    createConferenceRoom: async (body) => unwrap(await http.post(`${CONFERENCE}/insertConference`, body)),
    updateConferenceRoom: async (body) => unwrap(await http.put(`${CONFERENCE}/updateConference`, body)),
    setConferenceRoomStatus: async (id, status) =>
      unwrap(await http.put(withQuery(`${CONFERENCE}/conference/${encodeURIComponent(id)}`, { status }))),
    deleteConferenceRoom: async (id) => unwrap(await http.delete(`${CONFERENCE}/conference/${encodeURIComponent(id)}`)),

    pageConferenceGoods: async (query) => page<ConferenceGoods>(await http.get(withQuery(`${CONFERENCE}/conference-goods/page`, query))),
    listConferenceGoods: async (query) => list<ConferenceGoods>(await http.get(withQuery(`${CONFERENCE}/conference-goods/list`, query))),
    createConferenceGoods: async (body) => unwrap(await http.post(`${CONFERENCE}/add-conference-goods`, body)),
    updateConferenceGoods: async (id, body) => unwrap(await http.put(`${CONFERENCE}/conference-goods/${encodeURIComponent(id)}`, body)),
    deleteConferenceGoods: async (id) => unwrap(await http.delete(`${CONFERENCE}/conference-goods/delete/${encodeURIComponent(id)}`)),
    batchDeleteConferenceGoods: async (ids) => unwrap(await http.post(`${CONFERENCE}/conference-goods/batch-delete`, { ids })),

    pageConferenceTypes: async (query) => page<ConferenceType>(await http.get(withQuery(`${CONFERENCE}/conference-type-page`, query))),
    listConferenceTypes: async () => list<ConferenceType>(await http.get(`${CONFERENCE}/conference-type-list`)),
    createConferenceType: async (body) => unwrap(await http.post(`${CONFERENCE}/add-conference-type`, body)),
    updateConferenceType: async (id, body) =>
      unwrap(await http.put(`${CONFERENCE}/update-conference-type/${encodeURIComponent(id)}`, body)),
    deleteConferenceType: async (id) => unwrap(await http.delete(`${CONFERENCE}/delete-conference-type/${encodeURIComponent(id)}`)),

    pageRoomTypes: async (query) =>
      page<ConferenceType>(await http.get(withQuery(`${CONFERENCE}/conference-room/type/conference-type-page`, query))),
    listRoomTypes: async (query) =>
      list<ConferenceType>(await http.get(withQuery(`${CONFERENCE}/conference-room/type/conference-type-list`, query))),
    saveRoomType: async (body) => unwrap(await http.post(`${CONFERENCE}/conference-room/type/save-or-update`, body)),
    deleteRoomType: async (id) => unwrap(await http.delete(`${CONFERENCE}/conference-room/type/${encodeURIComponent(id)}`)),

    listFieldConfigurations: async (query) =>
      page<FieldConfiguration>(await http.get(withQuery(`${CONFERENCE}/required/field/configuration`, query))),
    updateFieldConfiguration: async (body) => unwrap(await http.post(`${CONFERENCE}/update/required/configuration`, body)),

    pageAppointmentRooms: async (query) => page<AppointmentRoom>(await http.get(withQuery(`${CONFERENCE}/appointment`, query))),
    createBookRoom: async (body) => unwrap(await http.post(`${CONFERENCE}/book-room`, body)),
    getBookRoom: async (id) => unwrap<BookRoomDetail>(await http.get(`${CONFERENCE}/bookroom/${encodeURIComponent(id)}`)),
    cancelBookRoom: async (id, cancelReason) =>
      unwrap(await http.delete(withQuery(`${CONFERENCE}/book-room-cancel/${encodeURIComponent(id)}`, { isCancel: true, cancelReason }))),
    pageAppointmentRecords: async (query) =>
      page<AppointmentRecord>(await http.get(withQuery(`${CONFERENCE}/book-room/appointmentPage`, query))),

    getConferenceUsage: async (query) => list<UsageDatum>(await http.get(withQuery(`${CONFERENCE}/getConferenceUsage`, query))),
    getConferenceCount: async (query) => unwrap(await http.get(withQuery(`${CONFERENCE}/getConferenceCount`, query))),
    getConferenceIdle: async (query) => list<IdleDatum>(await http.get(withQuery(`${CONFERENCE}/getConferenceIdle`, query))),
    getTimeIntervalLog: async (query) => list<IntervalSeries>(await http.get(withQuery(`${CONFERENCE}/getTimeIntervalLog`, query))),

    listRoomScreenConfigs: async (query) =>
      list<RoomScreenConfig>(await http.get(withQuery(`${CONFERENCE}/room/screen/config/list`, query))),
    saveRoomScreenConfig: async (body) => unwrap(await http.post(`${CONFERENCE}/room/screen/config/save`, body)),
    openRoomScreenConfig: async (body) => unwrap(await http.post(`${CONFERENCE}/room/screen/config/open`, body)),
    deleteRoomScreenConfig: async (id) => unwrap(await http.delete(`${CONFERENCE}/room/screen/config/delete/${encodeURIComponent(id)}`)),
    pageAvailableDevices: async (query) => page(await http.post(`${API}/securitymanagement/screen-out-existing-data`, query)),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<MeetRoomClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createMeetRoomClient(module.createHttpClientForPlatform(ctx));
}

export type { MeetRoomClient };
