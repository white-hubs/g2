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
} from "./types";

export interface EmergencyDispatchClient {
  pageResourceRefs: (query: ResourcePageQuery) => Promise<PageResult<ResourceRefVO>>;
  listResourceRefs: (query: Pick<ResourcePageQuery, "refType" | "refIds">) => Promise<ResourceRefVO[]>;
  createResourceRef: (payload: ResourceRefPayload[]) => Promise<void>;
  deleteResourceRef: (id: string) => Promise<void>;
  getResourceRefStatistics: () => Promise<ResourceRefStatistics>;
  getAreaTree: () => Promise<AreaTreeNode[]>;
  pageResourceCandidates: (query: CandidatePageQuery) => Promise<PageResult<ResourceCandidate>>;
  createAreaPlaneMap: (payload: AreaPlaneMapPayload) => Promise<AreaPlaneMapVO | void>;
  updateAreaPlaneMap: (id: string, payload: AreaPlaneMapPayload) => Promise<AreaPlaneMapVO | void>;
  deleteAreaPlaneMap: (id: string) => Promise<void>;
  listAreaPlaneMapsByAreaId: (areaId: string | number) => Promise<AreaPlaneMapVO[]>;
  pageEvacuationRoutes: (query: EvacuationRoutePageQuery) => Promise<PageResult<EvacuationRouteVO>>;
  createEvacuationRoute: (payload: EvacuationRouteCreatePayload) => Promise<EvacuationRouteVO | void>;
  updateEvacuationRoute: (id: string, payload: EvacuationRouteUpdatePayload) => Promise<EvacuationRouteVO | void>;
  deleteEvacuationRoute: (id: string) => Promise<void>;
  updateEvacuationRouteDevices: (id: string, payload: EvacuationRouteDevicesPayload) => Promise<void>;
}
