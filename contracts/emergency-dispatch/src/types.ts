import type { Pagination, Paging } from "@g2-contract/base";

export type ResourceRefType = "DEVICE" | "PERSON" | "MATERIAL";

export type PageResult<T> = Pagination<T>;

export interface ResourceRefVO {
  id: string;
  refType: ResourceRefType;
  refId: string;
  resourceName?: string;
  resourceCode?: string;
  resourceType?: string;
  area?: string;
  areaId?: string | number;
}

export interface ResourceCandidate {
  id: string;
  name: string;
  code: string;
  type: ResourceRefType;
  typeName: string;
  category?: string;
  area?: string;
}

export interface ResourceRefStatistics {
  total?: number;
  counts?: Partial<Record<ResourceRefType, number>>;
}

export interface AreaTreeNode {
  id: string;
  name: string;
  children?: AreaTreeNode[];
}

export interface ResourcePageQuery extends Partial<Paging> {
  refType: ResourceRefType;
  refIds?: string[];
  keyword?: string;
  areaId?: string | number;
}

export interface CandidatePageQuery extends Partial<Paging> {
  keyword?: string;
  areaId?: string | number;
  type: ResourceRefType;
}

export interface ResourceRefPayload {
  refType: ResourceRefType;
  refId: string;
}

export interface AreaPlaneMapFileVO {
  id: number | string;
  name: string;
  suffix?: string;
  path?: string;
  size?: number;
  refCount?: number;
  type?: string;
  businessKey?: number | string;
  endpointPath?: string;
  createTime?: string;
}

export interface AreaPlaneMapVO {
  id: number | string;
  areaId: number | string;
  fileId: number | string;
  gpsLocation?: string;
  file?: AreaPlaneMapFileVO;
}

export interface AreaPlaneMapPayload {
  areaId: string;
  fileId: string;
  gpsLocation?: string;
}

/** 疏散路线优先级，与旧仓 emergency-dispatch service 对齐 */
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
