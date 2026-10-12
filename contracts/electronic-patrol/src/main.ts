export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export type PatrolRow = Record<string, unknown> & { id: string };

export interface PatrolPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  period?: string;
  status?: string;
  taskState?: string;
  patrolCycle?: string;
  executeData?: string;
  depId?: string;
  areaId?: string;
  admin?: boolean;
}

export interface PatrolOverview {
  total: number;
  toBeReceived: number;
  inExecution: number;
  finished: number;
}

export interface PatrolCount {
  name: string;
  value: number;
}

export interface PatrolArea {
  id: string;
  name: string;
  children?: PatrolArea[];
}

export interface PatrolDepartment {
  id: string;
  name: string;
  children?: PatrolDepartment[];
}

export interface PatrolUser {
  id: string;
  name: string;
  username?: string;
  organizationName?: string;
}

export interface PatrolMessageConfig {
  label?: string;
  sceneCode?: string;
  value?: string | number;
  noticeWays?: { noticeWay?: string }[];
}

export interface ElectronicPatrolClient {
  pagePlans(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  listPlanStatus(): Promise<PatrolCount[]>;
  getPlan(id: string): Promise<PatrolRow>;
  createPlan(body: Record<string, unknown>): Promise<unknown>;
  updatePlan(body: Record<string, unknown>): Promise<unknown>;
  changePlanStatus(body: { id: string; status: string }): Promise<unknown>;
  deletePlan(id: string): Promise<unknown>;
  calculatePeriods(query: { startStr: string; endStr: string; intervalHour: number }): Promise<{ periodList: string[]; tip?: string }>;
  getAttendanceEnabled(): Promise<boolean>;

  pageTasks(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  getTaskOverview(): Promise<PatrolOverview>;
  getTask(id: string): Promise<PatrolRow>;
  getTaskLocations(query: { taskId: string; executePeriod: string }): Promise<PatrolRow[]>;
  createTask(body: Record<string, unknown>): Promise<unknown>;
  acceptTask(id: string): Promise<unknown>;
  removeTasks(ids: string[]): Promise<unknown>;

  pageRecords(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  exportRecords(query: PatrolPageQuery): Promise<Blob>;

  pagePoints(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  createPoint(body: Record<string, unknown>): Promise<unknown>;
  updatePoint(body: Record<string, unknown>): Promise<unknown>;
  deletePoint(id: string): Promise<unknown>;
  downloadPointTemplate(): Promise<Blob>;
  importPoints(file: Blob): Promise<unknown>;
  downloadPointQrcodes(items: { entityId: string; entityName: string }[]): Promise<Blob>;

  pageNfc(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  listNfc(deviceId?: string): Promise<PatrolRow[]>;
  createNfc(body: Record<string, unknown>): Promise<unknown>;
  updateNfc(body: Record<string, unknown>): Promise<unknown>;
  deleteNfc(id: string): Promise<unknown>;
  downloadNfcTemplate(): Promise<Blob>;
  importNfc(file: Blob): Promise<unknown>;

  pageRoutes(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  listRoutes(): Promise<PatrolRow[]>;
  getRoute(id: string): Promise<PatrolRow>;
  createRoute(body: Record<string, unknown>): Promise<unknown>;
  updateRoute(body: Record<string, unknown>): Promise<unknown>;
  deleteRoute(id: string): Promise<unknown>;

  getDictionary(itemCode: string, code?: string): Promise<PatrolRow[]>;
  createDictionary(body: Record<string, unknown>): Promise<unknown>;
  updateDictionary(body: Record<string, unknown>): Promise<unknown>;

  pagePointStatistics(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  pagePersonnelStatistics(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  pageRouteStatistics(query: PatrolPageQuery): Promise<PageResult<PatrolRow>>;
  exportPointStatistics(query: PatrolPageQuery): Promise<Blob>;
  exportPersonnelStatistics(query: PatrolPageQuery): Promise<Blob>;
  exportRouteStatistics(query: PatrolPageQuery): Promise<Blob>;

  listAreas(): Promise<PatrolArea[]>;
  listDepartments(): Promise<PatrolDepartment[]>;
  pageUsers(query: PatrolPageQuery): Promise<PageResult<PatrolUser>>;
  getTenantLocation(tenantCode: string): Promise<{ lat?: number; lng?: number; lntAndLat?: string }>;
}
