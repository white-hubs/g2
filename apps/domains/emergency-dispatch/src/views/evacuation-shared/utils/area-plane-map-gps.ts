import type { PlanTransform, RoutePoint } from "../data/types";
import { DEFAULT_PLAN_TRANSFORM } from "../data/types";

interface GpsLocationJson {
  lng?: number;
  lat?: number;
  scale?: number;
  rotation?: number;
}

export function serializePlanTransform(transform: PlanTransform): string {
  return JSON.stringify({
    lng: transform.center.lng,
    lat: transform.center.lat,
    scale: transform.scale,
    rotation: transform.rotation,
  });
}

export function parsePlanTransform(raw: string | null | undefined, fallbackCenter?: RoutePoint): PlanTransform | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return fallbackCenter ? DEFAULT_PLAN_TRANSFORM(fallbackCenter) : null;
  }
  try {
    const parsed = JSON.parse(trimmed) as GpsLocationJson;
    if (typeof parsed.lng !== "number" || typeof parsed.lat !== "number") {
      return fallbackCenter ? DEFAULT_PLAN_TRANSFORM(fallbackCenter) : null;
    }
    return {
      center: { lng: parsed.lng, lat: parsed.lat },
      scale: typeof parsed.scale === "number" ? parsed.scale : 1,
      rotation: typeof parsed.rotation === "number" ? parsed.rotation : 0,
    };
  } catch {
    return fallbackCenter ? DEFAULT_PLAN_TRANSFORM(fallbackCenter) : null;
  }
}
