export interface LinkagePageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  enabled?: boolean;
  applicationCode?: string;
  businessType?: string;
  period?: string;
}

export interface LinkagePage<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface LinkageRow extends Record<string, unknown> {
  id: string;
  name?: string;
  enabled?: boolean;
  triggerNum?: number;
  updateTime?: string | number;
  createByName?: string;
  looped?: boolean;
  triggerTime?: string | number;
  operatorName?: string;
}

export interface LinkageClient {
  pageRules(kind: "condition" | "scene" | "time", query: LinkagePageQuery): Promise<LinkagePage<LinkageRow>>;
  pageEvents(query: LinkagePageQuery): Promise<LinkagePage<LinkageRow>>;
  getEvent(id: string): Promise<LinkageRow & Record<string, unknown>>;
  getEventDevices(eventId: string): Promise<Record<string, unknown>[]>;
  getEventDeviceRecords(eventId: string): Promise<Record<string, unknown>[]>;
  getEventVideos(eventId: string): Promise<Record<string, unknown>[]>;
  getEventVideoRecords(eventId: string): Promise<Record<string, unknown>[]>;
  getEventVideoFiles(eventId: string): Promise<Record<string, unknown>[]>;
  getEventMessageRecords(eventId: string): Promise<Record<string, unknown>[]>;
  getRule(id: string): Promise<Record<string, unknown>>;
  getMessageConfigs(codes: string[]): Promise<Record<string, unknown>[]>;
  saveMessageConfigs(method: "post" | "put", rows: Record<string, unknown>[]): Promise<unknown>;
  createRule(body: Record<string, unknown>): Promise<unknown>;
  updateRule(id: string, body: Record<string, unknown>): Promise<unknown>;
  deleteRule(id: string): Promise<unknown>;
  deleteRules(ids: string[]): Promise<unknown>;
  setRuleEnabled(id: string, enabled: boolean): Promise<unknown>;
  triggerScene(id: string, password: string): Promise<unknown>;
}
