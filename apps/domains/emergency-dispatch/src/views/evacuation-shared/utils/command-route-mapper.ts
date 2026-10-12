import type { CommandRoute, EvacuationRoute } from "../data/types";

export function toCommandRoute(route: EvacuationRoute): CommandRoute {
  const enabled = route.enabled !== false;
  return {
    ...route,
    active: enabled,
    trafficStatus: enabled ? "畅通" : "已禁用",
    capacityPerMin: route.capacity,
    isSystem: false,
  };
}
