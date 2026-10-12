import type { PageQuery, PageResult, WorkOrderBusinessType, WorkOrderRecord, WorkOrderStatistics } from "./types";

export interface WorkOrderCenterGateway {
  pageWorkOrders(query: PageQuery): Promise<PageResult<WorkOrderRecord>>;
  deleteWorkOrders(ids: string[]): Promise<boolean>;
  pageStatistics(query: PageQuery): Promise<PageResult<WorkOrderStatistics>>;
  exportStatistics(query: Record<string, unknown>): Promise<Blob>;
  listBusinessTypes(): Promise<WorkOrderBusinessType[]>;
}

export type WorkOrderCenterClient = WorkOrderCenterGateway;
