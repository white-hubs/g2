/** 疏散路线相关类型：Client 尚未合入前由领域侧自持，方法名与旧仓 service 对齐。 */
export type EvacuationRoutePriority = "HIGH" | "MEDIUM" | "LOW";

export interface EvacuationRouteVO {
  id: string | number;
  routeName: string;
  areaId: string | number;
  capacity: number;
  priority: EvacuationRoutePriority;
  priorityName?: string;
  nodeCount?: number;
  boundDeviceCount?: number;
  pathConfigJson?: string;
  enabled?: boolean;
  deviceIds?: string[];
}

export interface EvacuationRoutePageQuery {
  pageNumber?: number;
  pageSize?: number;
  areaId?: string;
}

export interface EvacuationRouteCreatePayload {
  routeName: string;
  areaId: string;
  capacity: number;
  priority: EvacuationRoutePriority;
  pathConfigJson?: string;
  nodeCount?: number;
  enabled?: boolean;
}

export interface EvacuationRouteUpdatePayload {
  routeName: string;
  capacity: number;
  priority: EvacuationRoutePriority;
  pathConfigJson?: string;
  nodeCount?: number;
  enabled?: boolean;
}

export interface EvacuationRouteDevicesPayload {
  deviceIds: string[];
}

export interface PageResult<T> {
  pages?: number;
  records: T[];
  total: number;
}
