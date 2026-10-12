import { transformGCJ02ToWGS84 } from "@isvend/coord-transform";
import L from "leaflet";

import type { PlanTransform, RoutePoint } from "../data/types";
import { ARROW_MARKER_ICON_SIZE, PLAN_BASE_SPAN } from "./constants";

export function cloneRoutePoints(points: RoutePoint[]): RoutePoint[] {
  return points.map((p) => ({ lng: p.lng, lat: p.lat }));
}

export function darkenHex(hex: string, ratio = 0.72): string {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const num = Number.parseInt(expanded, 16);
  const r = Math.floor(((num >> 16) & 255) * ratio);
  const g = Math.floor(((num >> 8) & 255) * ratio);
  const b = Math.floor((num & 255) * ratio);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function computeRoutePointAngle(points: RoutePoint[], index: number): number {
  if (points.length < 2) {
    return 0;
  }
  const current = points[index];
  const from = index < points.length - 1 ? current : points[index - 1];
  const to = index < points.length - 1 ? points[index + 1] : current;
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

export function createArrowPinIcon(color: string, angleDeg: number): L.Icon {
  const stroke = darkenHex(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${angleDeg}, 12, 12)"><path fill="${color}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" d="M12 3 L19 19 L12 15 L5 19 Z"/></g></svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: ARROW_MARKER_ICON_SIZE,
    iconAnchor: [ARROW_MARKER_ICON_SIZE[0] / 2, ARROW_MARKER_ICON_SIZE[1] / 2],
    popupAnchor: [0, -ARROW_MARKER_ICON_SIZE[1] / 2],
  });
}

function planSpans(transform: PlanTransform, aspectRatio = 1, centerLat = transform.center.lat): { spanLat: number; spanLng: number } {
  const baseSpan = PLAN_BASE_SPAN * transform.scale;
  const ratio = aspectRatio > 0 && Number.isFinite(aspectRatio) ? aspectRatio : 1;
  const latRad = (centerLat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.01);
  return {
    spanLat: baseSpan,
    // 经纬度在地图上投影比例不同，按纬度修正后屏幕显示比例才与图片一致
    spanLng: (baseSpan * ratio) / cosLat,
  };
}

function planBounds(transform: PlanTransform, aspectRatio = 1, centerLat = transform.center.lat): L.LatLngBoundsExpression {
  const { spanLat, spanLng } = planSpans(transform, aspectRatio, centerLat);
  return [
    [transform.center.lat - spanLat, transform.center.lng - spanLng],
    [transform.center.lat + spanLat, transform.center.lng + spanLng],
  ];
}

function planBoundsGcj(
  transform: PlanTransform,
  aspectRatio = 1,
  centerLat = transform.center.lat,
): [{ lng: number; lat: number }, { lng: number; lat: number }] {
  const { spanLat, spanLng } = planSpans(transform, aspectRatio, centerLat);
  return [
    { lng: transform.center.lng - spanLng, lat: transform.center.lat - spanLat },
    { lng: transform.center.lng + spanLng, lat: transform.center.lat + spanLat },
  ];
}

export function toLeafletBounds(
  transform: PlanTransform,
  mapType: string,
  aspectRatio = 1,
  centerLat = transform.center.lat,
): L.LatLngBoundsExpression {
  const gcj = planBoundsGcj(transform, aspectRatio, centerLat);
  if (mapType === "TD_MAP") {
    const sw = transformGCJ02ToWGS84(gcj[0].lng, gcj[0].lat);
    const ne = transformGCJ02ToWGS84(gcj[1].lng, gcj[1].lat);
    return [
      [sw[1], sw[0]],
      [ne[1], ne[0]],
    ];
  }
  return planBounds(transform, aspectRatio, centerLat);
}
