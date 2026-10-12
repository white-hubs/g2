import { priorityToRouteColor } from "../data/gis-map";
import type { CameraDevice, EvacuationRoute, RoutePoint, RoutePriority } from "../data/types";
import type { EvacuationRoutePriority, EvacuationRouteVO } from "@/types/evacuation-route";

const API_PRIORITY_TO_UI: Record<EvacuationRoutePriority, RoutePriority> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const UI_PRIORITY_TO_API: Record<RoutePriority, EvacuationRoutePriority> = {
  高: "HIGH",
  中: "MEDIUM",
  低: "LOW",
};

export function priorityToApi(priority: RoutePriority): EvacuationRoutePriority {
  return UI_PRIORITY_TO_API[priority];
}

export function priorityFromApi(priority: EvacuationRoutePriority, priorityName?: string): RoutePriority {
  if (priorityName?.includes("高")) {
    return "高";
  }
  if (priorityName?.includes("低")) {
    return "低";
  }
  if (priorityName?.includes("中")) {
    return "中";
  }
  return API_PRIORITY_TO_UI[priority] ?? "中";
}

export function serializePathConfig(points: RoutePoint[]): string {
  return JSON.stringify(points.map((p) => ({ lng: p.lng, lat: p.lat })));
}

export function parsePathConfig(json?: string | null): RoutePoint[] {
  if (!json?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (item && typeof item === "object" && "lng" in item && "lat" in item) {
          const lng = Number((item as RoutePoint).lng);
          const lat = Number((item as RoutePoint).lat);
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return { lng, lat };
          }
        }
        return null;
      })
      .filter((p): p is RoutePoint => p !== null);
  } catch {
    return [];
  }
}

function mapDeviceIds(deviceIds?: string[]): CameraDevice[] {
  if (!Array.isArray(deviceIds)) {
    return [];
  }
  return deviceIds.map((id) => ({
    id: String(id),
    name: String(id),
    category: "摄像机",
    area: "--",
  }));
}

export function mapEvacuationRouteVO(vo: EvacuationRouteVO): EvacuationRoute {
  const priority = priorityFromApi(vo.priority, vo.priorityName);
  return {
    id: String(vo.id),
    name: vo.routeName,
    capacity: vo.capacity,
    priority,
    points: parsePathConfig(vo.pathConfigJson),
    color: priorityToRouteColor(priority),
    boundCameras: mapDeviceIds(vo.deviceIds),
    enabled: vo.enabled !== false,
  };
}

export interface RouteFormValues {
  name: string;
  capacity: number;
  priority: RoutePriority;
}

export function toRouteUpdatePayload(form: RouteFormValues, points?: RoutePoint[], enabled?: boolean) {
  const payload = {
    routeName: form.name.trim(),
    capacity: form.capacity > 0 ? form.capacity : 200,
    priority: priorityToApi(form.priority),
    ...(enabled !== undefined ? { enabled } : {}),
  };
  if (points) {
    return {
      ...payload,
      pathConfigJson: serializePathConfig(points),
      nodeCount: points.length,
    };
  }
  return payload;
}

export function toRouteCreatePayload(areaId: string, form: RouteFormValues, points: RoutePoint[]) {
  return {
    routeName: form.name.trim(),
    areaId: String(areaId),
    capacity: form.capacity > 0 ? form.capacity : 200,
    priority: priorityToApi(form.priority),
    pathConfigJson: serializePathConfig(points),
    nodeCount: points.length,
    enabled: true,
  };
}
