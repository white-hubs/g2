import type { Ref } from "vue";

import type { EvacuationRoute, FloorPlanImage, PlanTransform, RoutePoint } from "../data/types";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../map/constants";

export interface MapEnginePlanContext {
  uploadedImages: Ref<FloorPlanImage[]>;
  selectedPlanId: Ref<string | null>;
  pendingPlanCenterId: Ref<string | null>;
  getPlanTransform: (planId: string) => PlanTransform | undefined;
  initPlanTransform: (planId: string, center: RoutePoint) => PlanTransform;
  setPlanCenter: (planId: string, center: RoutePoint) => void;
  placePlanAtCenter?: (planId: string, center: RoutePoint) => void;
  setPlanAspectRatio?: (planId: string, aspectRatio: number) => void;
}

export interface MapEngineRouteContext {
  routes: Ref<EvacuationRoute[]>;
  currentPoints: Ref<RoutePoint[]>;
  panMode: Ref<boolean>;
  drawingHint?: Ref<string>;
  moveRoutePoint: (routeIdx: number, pointIdx: number, point: RoutePoint) => void;
  moveCurrentPoint: (pointIdx: number, point: RoutePoint) => void;
  placePoint?: (point: RoutePoint) => void;
  /** command 模式：仅渲染 active 路线 */
  skipInactiveRoutes?: boolean;
  getRouteStyle?: (route: EvacuationRoute, index: number) => { opacity?: number; dashArray?: string; weight?: number };
}

export interface MapEngineOverlayContext {
  firePoint?: Ref<RoutePoint | null>;
}

export interface MapEngineOptions {
  editablePlan: boolean;
  editableRoutes: boolean;
  plan: MapEnginePlanContext;
  route: MapEngineRouteContext;
  overlay?: MapEngineOverlayContext;
  mapHeight?: number;
  defaultCenter?: RoutePoint;
  defaultZoom?: number;
}

export interface EvacuationMapEngine {
  mapId: string;
  loading: Ref<boolean>;
  mapReady: Ref<boolean>;
  mapSearch: Ref<string>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  handleSearch: () => Promise<void>;
  scheduleRender: () => void;
  refreshSelectedPlan: () => void;
  resetPlan: () => void;
  readMapCenter: () => RoutePoint;
  focusOnPoint: (point: RoutePoint, zoom?: number) => Promise<void>;
  initMap: () => Promise<void>;
  destroyMap: () => void;
  invalidateMapSize?: () => void;
  togglePanMode?: () => void;
}

export const MAP_ENGINE_DEFAULTS = {
  center: DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
};
