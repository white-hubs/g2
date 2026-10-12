import { ref } from "vue";

import type { EvacuationRoute, RoutePoint } from "../data/types";
import { mapEvacuationRouteVO, toRouteCreatePayload, toRouteUpdatePayload, type RouteFormValues } from "../utils/evacuation-route-mapper";
import {
  createEvacuationRoute,
  deleteEvacuationRoute,
  pageEvacuationRoutes,
  updateEvacuationRoute,
  updateEvacuationRouteDevices,
} from "@/api/evacuation-route";
import { message } from "@/pc-ui-runtime";

const ROUTES_PAGE_SIZE = 500;

export function useEvacuationRoutes() {
  const routes = ref<EvacuationRoute[]>([]);
  const routesLoading = ref(false);
  const currentAreaId = ref<string | null>(null);

  async function loadByAreaId(areaId: string | null): Promise<void> {
    currentAreaId.value = areaId;
    if (!areaId) {
      routes.value = [];
      return;
    }
    routesLoading.value = true;
    try {
      const page = await pageEvacuationRoutes({
        areaId: String(areaId),
        pageNumber: 1,
        pageSize: ROUTES_PAGE_SIZE,
      });
      routes.value = (page.records ?? []).map(mapEvacuationRouteVO);
    } catch {
      routes.value = [];
      message.error("加载疏散路线失败");
    } finally {
      routesLoading.value = false;
    }
  }

  async function reloadCurrentArea(): Promise<void> {
    if (currentAreaId.value) {
      await loadByAreaId(currentAreaId.value);
    }
  }

  async function createRoute(areaId: string, form: RouteFormValues, points: RoutePoint[]): Promise<boolean> {
    if (points.length < 2) {
      message.warning("请先在地图上放置至少2个节点");
      return false;
    }
    try {
      await createEvacuationRoute(toRouteCreatePayload(areaId, form, points));
      await reloadCurrentArea();
      message.success("路线已保存");
      return true;
    } catch {
      message.error("保存路线失败");
      return false;
    }
  }

  async function updateRoute(routeId: string, form: RouteFormValues, points?: RoutePoint[]): Promise<boolean> {
    try {
      await updateEvacuationRoute(routeId, toRouteUpdatePayload(form, points));
      await reloadCurrentArea();
      return true;
    } catch {
      message.error("更新路线失败");
      return false;
    }
  }

  async function updateRoutePoints(route: EvacuationRoute): Promise<boolean> {
    return updateRoute(route.id, { name: route.name, capacity: route.capacity, priority: route.priority }, route.points);
  }

  async function removeRoute(routeId: string): Promise<boolean> {
    try {
      await deleteEvacuationRoute(routeId);
      await reloadCurrentArea();
      message.success("已删除路线");
      return true;
    } catch {
      message.error("删除路线失败");
      return false;
    }
  }

  async function updateRouteDevices(routeId: string, deviceIds: string[]): Promise<boolean> {
    try {
      await updateEvacuationRouteDevices(routeId, {
        deviceIds: deviceIds.map((id) => String(id)),
      });
      await reloadCurrentArea();
      return true;
    } catch {
      message.error("更新绑定设备失败");
      return false;
    }
  }

  async function updateRouteEnabled(route: EvacuationRoute, enabled: boolean): Promise<boolean> {
    try {
      await updateEvacuationRoute(
        route.id,
        toRouteUpdatePayload({ name: route.name, capacity: route.capacity, priority: route.priority }, route.points, enabled),
      );
      await reloadCurrentArea();
      message.success(enabled ? "路线已启用" : "路线已禁用");
      return true;
    } catch {
      message.error(enabled ? "启用路线失败" : "禁用路线失败");
      return false;
    }
  }

  return {
    routes,
    routesLoading,
    loadByAreaId,
    createRoute,
    updateRoute,
    updateRouteEnabled,
    updateRoutePoints,
    removeRoute,
    updateRouteDevices,
  };
}
