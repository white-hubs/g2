// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { InteractiveMap } from "@g2-platform/pc-map";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { transformGCJ02ToWGS84, transformWGS84ToGCJ02 } from "@isvend/coord-transform";
import L from "leaflet";
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import { DEFAULT_ROUTE_COLOR } from "../data/gis-map";
import type { EvacuationRoute, FloorPlanImage, PlanTransform, RoutePoint } from "../data/types";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  OVERLAY_PANE,
  PLAN_EDIT_PANE,
  ROUTE_MARKER_PANE,
  ROUTE_POLYLINE_PANE,
} from "../map/constants";
import { cloneRoutePoints, computeRoutePointAngle, createArrowPinIcon, toLeafletBounds } from "../map/map-utils";
import type { EvacuationMapEngine, MapEngineOptions } from "./map-engine-types";
import { resolveInteractiveMapConfig } from "@/api/map-service-config";
import { message } from "@/pc-ui-runtime";
import { getFloorPlanImagePath, resolveFileUrl } from "@/utils/file-url";
import { getPlanAspectRatio } from "@/utils/plan-image-aspect";

let mapSeq = 0;

type PlanImageLayer = L.ImageOverlay & {
  evacuationPlanRotation?: number;
  evacuationRotationBound?: boolean;
  evacuationPlanId?: string;
  evacuationDragHandler?: (e: MouseEvent) => void;
  evacuationAspectRatio?: number;
  evacuationAspectLoadBound?: boolean;
};

function createFireIcon(): L.DivIcon {
  return L.divIcon({
    className: "evacuation-fire-marker",
    html: '<div class="evacuation-fire-marker__dot"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function useEvacuationMapEngine(options: MapEngineOptions): EvacuationMapEngine {
  const mapId = `evacuation-map-${++mapSeq}`;
  const loading = shallowRef(false);
  const mapReady = shallowRef(false);
  const mapSearch = ref("");

  const defaultCenter = options.defaultCenter ?? DEFAULT_MAP_CENTER;
  const defaultZoom = options.defaultZoom ?? DEFAULT_MAP_ZOOM;

  let cubeMap: InteractiveMap | null = null;
  let disposed = false;
  const planImageLayers = new Map<string, PlanImageLayer>();
  const routeMarkers: L.Marker[] = [];
  const overlayMarkers: L.Marker[] = [];
  let fireMarker: L.Marker | null = null;
  let renderScheduled = false;

  const readMapCenter = (): RoutePoint => {
    if (!cubeMap) {
      return { ...defaultCenter };
    }
    try {
      const info = cubeMap.getMapInfo();
      return { lng: info.center.lng, lat: info.center.lat };
    } catch {
      return { ...defaultCenter };
    }
  };

  const isPlanSelected = (planId: string): boolean => options.plan.selectedPlanId.value === planId;

  const syncMapDragState = (): void => {
    if (!cubeMap || planDragState) {
      return;
    }
    const map = cubeMap.getMapInstance();
    if (options.editablePlan && options.plan.selectedPlanId.value) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
    syncMarkerPointerEvents();
  };

  const syncMarkerPointerEvents = (): void => {
    const planEditing = options.editablePlan && Boolean(options.plan.selectedPlanId.value);
    routeMarkers.forEach((marker) => {
      const el = marker.getElement();
      if (el) {
        el.style.pointerEvents = planEditing ? "none" : "";
      }
      if (planEditing || !options.editableRoutes) {
        marker.dragging?.disable();
      } else if (!options.route.panMode.value) {
        marker.dragging?.enable();
      }
    });
  };

  const ensurePane = (name: string, zIndex: string): void => {
    const map = cubeMap!.getMapInstance();
    if (!map.getPane(name)) {
      map.createPane(name);
      const pane = map.getPane(name);
      if (pane) {
        pane.style.zIndex = zIndex;
      }
    }
  };

  const businessToLeafletLatLng = (point: RoutePoint): L.LatLngExpression => {
    if (cubeMap!.getMapType() === "TD_MAP") {
      const [lng, lat] = transformGCJ02ToWGS84(point.lng, point.lat);
      return [lat, lng];
    }
    return [point.lat, point.lng];
  };

  const resolvedLeafletBounds = (transform: PlanTransform, plan?: FloorPlanImage, layer?: PlanImageLayer): L.LatLngBoundsExpression => {
    const aspectRatio = layer?.evacuationAspectRatio ?? getPlanAspectRatio(plan);
    return toLeafletBounds(transform, cubeMap!.getMapType(), aspectRatio, transform.center.lat);
  };

  const applyPlanBounds = (layer: PlanImageLayer, plan: FloorPlanImage, planId: string): void => {
    const transform = options.plan.getPlanTransform(planId);
    if (!transform) {
      return;
    }
    layer.setBounds(resolvedLeafletBounds(transform, plan, layer));
    bindPlanRotationSync(layer);
  };

  const syncPlanAspectFromImage = (layer: PlanImageLayer, plan: FloorPlanImage, planId: string): void => {
    const img = layer.getElement();
    if (!img?.naturalWidth || !img?.naturalHeight) {
      return;
    }
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
      return;
    }
    const prev = layer.evacuationAspectRatio ?? getPlanAspectRatio(plan, 0);
    if (prev > 0 && Math.abs(prev - aspectRatio) < 0.001) {
      return;
    }
    layer.evacuationAspectRatio = aspectRatio;
    options.plan.setPlanAspectRatio?.(planId, aspectRatio);
    applyPlanBounds(layer, plan, planId);
  };

  const bindPlanAspectOnLoad = (layer: PlanImageLayer, plan: FloorPlanImage, planId: string): void => {
    if (layer.evacuationAspectLoadBound) {
      syncPlanAspectFromImage(layer, plan, planId);
      return;
    }
    layer.evacuationAspectLoadBound = true;
    layer.on("load", () => {
      syncPlanAspectFromImage(layer, plan, planId);
    });
    syncPlanAspectFromImage(layer, plan, planId);
  };

  const toBusinessPoint = (latlng: L.LatLng): RoutePoint => {
    if (cubeMap?.getMapType() === "TD_MAP") {
      const [lng, lat] = transformWGS84ToGCJ02(latlng.lng, latlng.lat);
      return { lng, lat };
    }
    return { lng: latlng.lng, lat: latlng.lat };
  };

  const applyPlanVisual = (layer: PlanImageLayer, planId: string, transform: PlanTransform): void => {
    const img = layer.getElement();
    if (!img) {
      return;
    }
    const selected = options.editablePlan && isPlanSelected(planId);
    layer.evacuationPlanRotation = transform.rotation;
    img.style.pointerEvents = selected ? "auto" : "none";
    img.style.cursor = selected ? "grab" : "default";
    img.classList.toggle("evacuation-plan-overlay--selected", selected);
    if (selected) {
      layer.bringToFront();
    }
    bindPlanRotationSync(layer);
  };

  const bindPlanRotationSync = (layer: PlanImageLayer): void => {
    const map = cubeMap?.getMapInstance();
    if (!map) {
      return;
    }
    const sync = (): void => {
      requestAnimationFrame(() => {
        const img = layer.getElement();
        if (!img) {
          return;
        }
        const rotation = layer.evacuationPlanRotation ?? 0;
        const base = (img.style.transform || "").replaceAll(/\s*rotate\([^)]*\)/g, "").trim();
        img.style.transform = rotation ? `${base} rotate(${rotation}deg)` : base;
        if (rotation) {
          img.style.transformOrigin = "center center";
        }
      });
    };
    if (layer.evacuationRotationBound) {
      sync();
      return;
    }
    layer.evacuationRotationBound = true;
    map.on("zoom move viewreset", sync);
    layer.on("remove", () => {
      map.off("zoom move viewreset", sync);
    });
    sync();
  };

  const createPlanImageLayer = (plan: FloorPlanImage, transform: PlanTransform, planId: string): PlanImageLayer => {
    ensurePane(PLAN_EDIT_PANE, "650");
    const layer = L.imageOverlay(resolveFileUrl(getFloorPlanImagePath(plan)), resolvedLeafletBounds(transform, plan), {
      interactive: options.editablePlan,
      opacity: 0.82,
      className: "evacuation-plan-overlay",
      pane: PLAN_EDIT_PANE,
    }) as PlanImageLayer;
    layer.evacuationPlanId = plan.id;
    if (plan.aspectRatio && plan.aspectRatio > 0) {
      layer.evacuationAspectRatio = plan.aspectRatio;
    }
    bindPlanAspectOnLoad(layer, plan, planId);
    return layer;
  };

  let planDragState: {
    planId: string;
    startBusiness: RoutePoint;
    startCenter: RoutePoint;
  } | null = null;
  /** 拖动平面图结束后的 click 会落到地图上，需忽略一次以免误提示 */
  let skipNextMapClick = false;

  const teardownPlanDrag = (): void => {
    L.DomEvent.off(document, "mousemove", onDocumentMouseMove);
    L.DomEvent.off(document, "mouseup", onDocumentMouseUp);
    planDragState = null;
    syncMapDragState();
  };

  const onDocumentMouseMove = (e: MouseEvent): void => {
    if (!planDragState || !cubeMap || !options.editablePlan) {
      return;
    }
    const layer = planImageLayers.get(planDragState.planId);
    if (!layer) {
      return;
    }
    const map = cubeMap.getMapInstance();
    const latlng = map.mouseEventToLatLng(e);
    const current = toBusinessPoint(latlng);
    const dLat = current.lat - planDragState.startBusiness.lat;
    const dLng = current.lng - planDragState.startBusiness.lng;
    const nextCenter = {
      lng: planDragState.startCenter.lng + dLng,
      lat: planDragState.startCenter.lat + dLat,
    };
    options.plan.setPlanCenter(planDragState.planId, nextCenter);
    const transform = options.plan.getPlanTransform(planDragState.planId);
    const plan = options.plan.uploadedImages.value.find((p) => p.id === planDragState.planId);
    if (transform && plan) {
      applyPlanBounds(layer, plan, planDragState.planId);
    }
  };

  const onDocumentMouseUp = (e: MouseEvent): void => {
    if (!planDragState) {
      return;
    }
    const { planId } = planDragState;
    skipNextMapClick = true;
    L.DomEvent.stopPropagation(e);
    teardownPlanDrag();
    const layer = planImageLayers.get(planId);
    const img = layer?.getElement();
    if (img) {
      img.style.cursor = "grab";
    }
  };

  const bindPlanDrag = (layer: PlanImageLayer, planId: string): void => {
    if (!options.editablePlan) {
      return;
    }
    const img = layer.getElement();
    if (!img) {
      return;
    }
    if (layer.evacuationDragHandler) {
      L.DomEvent.off(img, "mousedown", layer.evacuationDragHandler);
    }
    const onImgMouseDown = (e: MouseEvent): void => {
      if (!isPlanSelected(planId)) {
        return;
      }
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      const transform = options.plan.getPlanTransform(planId);
      if (!transform || !cubeMap) {
        return;
      }
      cubeMap.getMapInstance().dragging.disable();
      const map = cubeMap.getMapInstance();
      const latlng = map.mouseEventToLatLng(e);
      planDragState = {
        planId,
        startBusiness: toBusinessPoint(latlng),
        startCenter: { ...transform.center },
      };
      const imgEl = layer.getElement();
      if (imgEl) {
        imgEl.style.cursor = "grabbing";
      }
      L.DomEvent.on(document, "mousemove", onDocumentMouseMove);
      L.DomEvent.on(document, "mouseup", onDocumentMouseUp);
    };
    layer.evacuationDragHandler = onImgMouseDown;
    L.DomEvent.on(img, "mousedown", onImgMouseDown);
  };

  const removeAllPlanLayers = (): void => {
    if (!cubeMap) {
      planImageLayers.clear();
      return;
    }
    planImageLayers.forEach((layer) => {
      cubeMap!.removeImageLayer(layer);
    });
    planImageLayers.clear();
  };

  const refreshPlanLayer = (planId: string): void => {
    const plan = options.plan.uploadedImages.value.find((p) => p.id === planId);
    const transform = options.plan.getPlanTransform(planId);
    if (!getFloorPlanImagePath(plan) || !transform || !cubeMap || !plan) {
      return;
    }
    let layer = planImageLayers.get(planId);
    if (!layer) {
      layer = createPlanImageLayer(plan, transform, planId);
      cubeMap.addImageLayer(layer);
      planImageLayers.set(planId, layer);
      bindPlanDrag(layer, planId);
    } else {
      if (plan.aspectRatio && plan.aspectRatio > 0) {
        layer.evacuationAspectRatio = plan.aspectRatio;
      }
      applyPlanBounds(layer, plan, planId);
      bindPlanAspectOnLoad(layer, plan, planId);
    }
    applyPlanVisual(layer, planId, transform);
    bindPlanDrag(layer, planId);
  };

  const syncAllPlanLayers = (): void => {
    if (!cubeMap || !mapReady.value) {
      return;
    }
    teardownPlanDrag();
    const plans = options.plan.uploadedImages.value;
    const planIds = new Set(plans.map((p) => p.id));

    planImageLayers.forEach((layer, id) => {
      if (!planIds.has(id)) {
        cubeMap!.removeImageLayer(layer);
        planImageLayers.delete(id);
      }
    });

    plans.forEach((plan) => {
      if (!getFloorPlanImagePath(plan)) {
        return;
      }
      if (!options.plan.getPlanTransform(plan.id)) {
        options.plan.initPlanTransform(plan.id, readMapCenter());
      }
      refreshPlanLayer(plan.id);
    });
  };

  const applyPendingPlanCenter = (): void => {
    const planId = options.plan.pendingPlanCenterId.value;
    if (!planId || !mapReady.value || !cubeMap || !options.plan.placePlanAtCenter) {
      return;
    }
    options.plan.placePlanAtCenter(planId, readMapCenter());
    options.plan.pendingPlanCenterId.value = null;
    refreshPlanLayer(planId);
  };

  const clearOverlayMarkers = (): void => {
    const map = cubeMap?.getMapInstance();
    if (!map) {
      overlayMarkers.length = 0;
      fireMarker = null;
      return;
    }
    overlayMarkers.forEach((m) => m.remove());
    overlayMarkers.length = 0;
    if (fireMarker) {
      fireMarker.remove();
      fireMarker = null;
    }
  };

  const renderOverlays = (): void => {
    const map = cubeMap?.getMapInstance();
    if (!map || !options.overlay) {
      return;
    }
    ensurePane(OVERLAY_PANE, "670");
    clearOverlayMarkers();

    const fire = options.overlay.firePoint?.value;
    if (fire) {
      fireMarker = L.marker(businessToLeafletLatLng(fire), {
        icon: createFireIcon(),
        pane: OVERLAY_PANE,
        interactive: false,
      }).addTo(map);
    }
  };

  const addRoutePolyline = (points: RoutePoint[], color: string, weight: number, dashArray?: string, opacity = 1): void => {
    const map = cubeMap?.getMapInstance();
    if (!map || points.length < 2) {
      return;
    }
    ensurePane(ROUTE_POLYLINE_PANE, "655");
    L.polyline(
      points.map((point) => businessToLeafletLatLng(point)),
      {
        color,
        weight,
        opacity,
        dashArray: dashArray || undefined,
        pane: ROUTE_POLYLINE_PANE,
      },
    ).addTo(map);
  };

  const addPointMarker = (
    point: RoutePoint,
    color: string,
    angleDeg: number,
    draggable: boolean,
    onDragEnd: (next: RoutePoint) => void,
    opacity = 1,
  ): L.Marker => {
    const map = cubeMap?.getMapInstance();
    if (!map) {
      throw new Error("map not ready");
    }
    ensurePane(ROUTE_MARKER_PANE, "660");
    const marker = L.marker(businessToLeafletLatLng(point), {
      draggable,
      icon: createArrowPinIcon(color, angleDeg),
      pane: ROUTE_MARKER_PANE,
      opacity,
    });
    marker.on("dragend", () => {
      const next = toBusinessPoint(marker.getLatLng());
      onDragEnd(next);
      if (options.route.drawingHint) {
        options.route.drawingHint.value = `节点已调整（${next.lng.toFixed(6)}, ${next.lat.toFixed(6)}）`;
      }
    });
    marker.addTo(map);
    routeMarkers.push(marker);
    return marker;
  };

  const shouldRenderRoute = (route: EvacuationRoute): boolean => {
    if (!options.route.skipInactiveRoutes) {
      return true;
    }
    const commandRoute = route as EvacuationRoute & { active?: boolean };
    return commandRoute.active !== false;
  };

  const renderRouteLayers = (): void => {
    if (!cubeMap || !mapReady.value) {
      return;
    }
    cubeMap.clearMap();
    teardownPlanDrag();
    removeAllPlanLayers();
    routeMarkers.length = 0;
    clearOverlayMarkers();

    options.route.routes.value.forEach((route, routeIdx) => {
      if (!shouldRenderRoute(route)) {
        return;
      }
      const style = options.route.getRouteStyle?.(route, routeIdx) ?? {};
      const routePoints = cloneRoutePoints(route.points);
      if (routePoints.length >= 2) {
        addRoutePolyline(routePoints, route.color, style.weight ?? 4, style.dashArray, style.opacity ?? 1);
      }
      route.points.forEach((point, pointIdx) => {
        addPointMarker(
          point,
          route.color,
          computeRoutePointAngle(routePoints, pointIdx),
          options.editableRoutes && !options.route.panMode.value,
          (next) => {
            options.route.moveRoutePoint(routeIdx, pointIdx, next);
          },
          style.opacity ?? 1,
        );
      });
    });

    const current = cloneRoutePoints(options.route.currentPoints.value);
    const currentColor = DEFAULT_ROUTE_COLOR;
    if (current.length >= 2) {
      addRoutePolyline(current, currentColor, 3);
    }
    options.route.currentPoints.value.forEach((point, pointIdx) => {
      addPointMarker(
        point,
        currentColor,
        computeRoutePointAngle(current, pointIdx),
        options.editableRoutes && !options.route.panMode.value,
        (next) => {
          options.route.moveCurrentPoint(pointIdx, next);
        },
      );
    });

    syncAllPlanLayers();
    renderOverlays();
    syncMapDragState();
  };

  const scheduleRender = (): void => {
    if (renderScheduled) {
      return;
    }
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderRouteLayers();
    });
  };

  const bindMapClick = (): void => {
    if (!cubeMap || !options.route.placePoint) {
      return;
    }
    cubeMap.onMapClick = (event) => {
      if (skipNextMapClick) {
        skipNextMapClick = false;
        return;
      }
      if (options.route.panMode.value) {
        return;
      }
      if (options.editablePlan && options.plan.selectedPlanId.value) {
        message.warning("请保存平面图位置后重试");
        return;
      }
      options.route.placePoint?.({ lng: event.lng, lat: event.lat });
      scheduleRender();
    };
  };

  let initPromise: Promise<void> | null = null;

  const initMap = async (): Promise<void> => {
    if (mapReady.value && cubeMap) {
      invalidateMapSize();
      return;
    }
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async (): Promise<void> => {
      loading.value = true;
      try {
        await nextTick();
        const container = document.getElementById(mapId);
        if (!container) {
          throw new Error("地图容器未就绪");
        }
        if (disposed) {
          return;
        }
        // G2 InteractiveMap 使用 MapConfig，不再依赖 authStore token 门禁
        const mapConfig = await resolveInteractiveMapConfig();
        if (disposed) {
          return;
        }
        const { InteractiveMap: RemoteInteractiveMap } = await loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
        cubeMap = new RemoteInteractiveMap(mapConfig);
        await cubeMap.renderMap(mapId, {
          center: defaultCenter,
          zoomControl: false,
        });
        ensurePane(PLAN_EDIT_PANE, "650");
        cubeMap.getMapInstance().setZoom(defaultZoom);
        bindMapClick();
        mapReady.value = true;
        renderRouteLayers();
        applyPendingPlanCenter();
        syncMapDragState();
        setTimeout(() => {
          try {
            cubeMap?.getMapInstance().invalidateSize(true);
          } catch {
            /* ignore */
          }
        }, 200);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "地图加载失败";
        if (!disposed) {
          message.error(errorMessage);
        }
      } finally {
        loading.value = false;
        initPromise = null;
      }
    })();

    return initPromise;
  };

  const destroyMap = (): void => {
    initPromise = null;
    teardownPlanDrag();
    removeAllPlanLayers();
    clearOverlayMarkers();
    try {
      cubeMap?.destroy();
    } catch {
      /* ignore */
    }
    cubeMap = null;
    mapReady.value = false;
  };

  const handleSearch = async (): Promise<void> => {
    const keyword = mapSearch.value.trim();
    if (!keyword) {
      message.warning("请输入搜索地址");
      return;
    }
    if (!cubeMap) {
      return;
    }
    try {
      const { lng, lat } = await cubeMap.getLntLatByAddress(keyword);
      await cubeMap.setCenter(lng, lat);
      message.success("已定位到搜索位置");
    } catch {
      message.error("未找到该地址，请换个关键词试试");
    }
  };

  const zoomIn = (): void => {
    cubeMap?.getMapInstance().zoomIn();
  };

  const zoomOut = (): void => {
    cubeMap?.getMapInstance().zoomOut();
  };

  const resetView = (): void => {
    const map = cubeMap?.getMapInstance();
    if (!map) {
      return;
    }
    map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    message.info("地图已复位");
  };

  const invalidateMapSize = (): void => {
    try {
      cubeMap?.getMapInstance().invalidateSize(true);
    } catch {
      /* ignore */
    }
  };

  const focusOnPoint = async (point: RoutePoint, zoom = defaultZoom): Promise<void> => {
    if (!cubeMap) {
      return;
    }
    await cubeMap.setCenter(point.lng, point.lat);
    cubeMap.getMapInstance().setZoom(zoom);
    invalidateMapSize();
  };

  const refreshSelectedPlan = (): void => {
    const id = options.plan.selectedPlanId.value ?? undefined;
    if (!id) {
      return;
    }
    refreshPlanLayer(id);
  };

  const resetPlan = (): void => {
    const plan = options.plan.uploadedImages.value[0];
    const id = plan?.id;
    if (!id) {
      return;
    }
    options.plan.initPlanTransform(id, readMapCenter());
    refreshSelectedPlan();
  };

  watch(
    () => options.route.routes.value,
    () => scheduleRender(),
    { deep: true },
  );

  watch(
    () => options.route.currentPoints.value.length,
    () => scheduleRender(),
  );

  watch(
    () => options.route.panMode.value,
    () => scheduleRender(),
  );

  watch(
    () => options.plan.uploadedImages.value,
    () => {
      if (!mapReady.value) {
        return;
      }
      syncAllPlanLayers();
      if (options.plan.pendingPlanCenterId.value) {
        void nextTick(() => {
          requestAnimationFrame(() => applyPendingPlanCenter());
        });
      }
    },
    { deep: true },
  );

  watch(
    () => options.plan.selectedPlanId.value,
    () => {
      syncAllPlanLayers();
      syncMapDragState();
    },
  );

  if (options.overlay?.firePoint) {
    watch(options.overlay.firePoint, () => scheduleRender());
  }

  onBeforeUnmount(() => {
    disposed = true;
    destroyMap();
  });

  return {
    mapId,
    loading,
    mapReady,
    mapSearch,
    zoomIn,
    zoomOut,
    resetView,
    handleSearch,
    scheduleRender,
    refreshSelectedPlan,
    resetPlan,
    readMapCenter,
    initMap,
    destroyMap,
    invalidateMapSize,
    focusOnPoint,
  };
}
