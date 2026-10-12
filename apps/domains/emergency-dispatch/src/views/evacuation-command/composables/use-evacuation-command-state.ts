// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, onMounted, reactive, ref, shallowRef, watch } from "vue";

import {
  findAreaTreeItem,
  flattenAreaTreeItems,
  mapAreaTreesToTreeItems,
  walkAreaTreeItems,
} from "../../evacuation-route-config/data/area-tree";
import { useAreaPlaneMap } from "../../evacuation-shared/composables/use-area-plane-map";
import { useEvacuationRoutes } from "../../evacuation-shared/composables/use-evacuation-routes";
import { useRouteDeviceBind } from "../../evacuation-shared/composables/use-route-device-bind";
import type {
  AreaTreeItem,
  CommandRoute,
  EmergencyEvent,
  FeedCamera,
  PlanTransform,
  RoutePoint,
  RoutePriority,
} from "../../evacuation-shared/data/types";
import { DEFAULT_PLAN_TRANSFORM } from "../../evacuation-shared/data/types";
import { toCommandRoute } from "../../evacuation-shared/utils/command-route-mapper";
import {
  ALARM_EVENT_STATUS_FILTER_OPTIONS,
  type AlarmEventStatusFilter,
  DEFAULT_ALARM_EVENT_STATUSES,
  mapAlarmRecordToEmergencyEvent,
  mergeAlarmRecords,
  parseAlarmRecordsPageResult,
  type AlarmRecordsPageResult,
} from "../utils/alarm-record-mapper";
import { extractDeviceDisplayArea, extractDeviceDisplayName } from "../utils/device-display-name";
import { getAlarmRecordsPage, getDeviceInstanceDetail } from "@/api/device";
import { fetchMdataAreaTree } from "@/api/mdata";
import { message } from "@/pc-ui-runtime";

export type CommandDragState = { type: "route"; routeIdx: number; pointIdx: number } | { type: "current"; pointIdx: number } | null;

const ALARM_EVENTS_PAGE_SIZE = 20;

function mapAlarmRecordsToEvents(records: ReturnType<typeof mergeAlarmRecords>, fallbackPoint?: RoutePoint): EmergencyEvent[] {
  return records.map((record) => mapAlarmRecordToEmergencyEvent(record, fallbackPoint));
}

function getAlarmFallbackPoint(uploadedImages: { id: string }[], planTransforms: Record<string, PlanTransform>): RoutePoint | undefined {
  const plan = uploadedImages[0];
  return plan?.id ? planTransforms[plan.id]?.center : undefined;
}

function pickDefaultActiveEventId(list: EmergencyEvent[]): string | null {
  const processing = list.find((event) => event.status === "processing");
  return processing?.id ?? list[0]?.id ?? null;
}

export function useEvacuationCommandState() {
  const events = ref<EmergencyEvent[]>([]);
  const eventsLoading = ref(false);
  const eventKeyword = ref("");
  const eventStatusFilters = ref<AlarmEventStatusFilter[]>([...DEFAULT_ALARM_EVENT_STATUSES]);
  const eventPageNumber = ref(1);
  const eventTotal = ref(0);
  const eventPages = ref(0);
  const activeEventId = ref<string | null>(null);

  const areaTree = ref<AreaTreeItem[]>([]);
  const areaLoading = ref(false);
  const selectedAreaId = ref<string | null>(null);

  const { uploadedImages, planTransforms, planLoading, loadByAreaId } = useAreaPlaneMap();

  const {
    routes: apiRoutes,
    routesLoading,
    loadByAreaId: loadRoutesByAreaId,
    createRoute,
    updateRoute,
    updateRouteEnabled,
    removeRoute,
    updateRoutePoints,
    updateRouteDevices,
  } = useEvacuationRoutes();

  const selectedPlanId = ref<string | null>(null);
  const pendingPlanCenterId = ref<string | null>(null);

  const flatAreas = computed(() => flattenAreaTreeItems(areaTree.value));

  const selectedAreaName = computed(() => {
    if (!selectedAreaId.value) {
      return "选择区域";
    }
    return findAreaTreeItem(areaTree.value, selectedAreaId.value)?.name ?? "选择区域";
  });

  const routes = ref<CommandRoute[]>([]);
  const routeTogglingId = ref<string | null>(null);
  const currentPoints = ref<RoutePoint[]>([]);
  const editingRouteIndex = ref(-1);

  const selectedCameraId = ref<string | null>(null);
  /** null 表示展示全部路线监控；选中路线 id 后仅展示该路线绑定设备 */
  const selectedRouteId = ref<string | null>(null);
  const feedCamSearch = ref("");
  const cameraPreviewOpen = ref(false);
  const cameraPreviewDevice = ref<FeedCamera | null>(null);
  const monitorDeviceCatalog = ref<Map<string, { name: string; area: string }>>(new Map());

  const panMode = ref(false);
  const drawingHint = ref("在地图上点击放置路线节点，可拖动节点调整");
  const dragState = shallowRef<CommandDragState>(null);

  const routeModalOpen = ref(false);
  const routeModalTitle = ref("新增路线");
  const routeForm = reactive({ name: "", capacity: 200, priority: "高" as RoutePriority });

  const { tagCode, deviceModalTableRef, deviceList, bindRouteIndex, openRouteDevicePicker, resetBindRouteIndex } = useRouteDeviceBind();

  const activeEvent = computed(() => events.value.find((e) => e.id === activeEventId.value));

  const firePoint = computed(() => activeEvent.value?.firePoint ?? null);

  const processingEventCount = computed(() => eventTotal.value);

  async function fetchAlarmEventPage(pageNumber: number): Promise<AlarmRecordsPageResult> {
    const statuses = eventStatusFilters.value;
    if (statuses.length === 0) {
      return { records: [], total: 0, pages: 0 };
    }

    const keyword = eventKeyword.value.trim();
    const basePayload = {
      pageNumber,
      pageSize: ALARM_EVENTS_PAGE_SIZE,
      ...(keyword ? { keyword } : {}),
    };
    const pages = await Promise.all(statuses.map((alarmStatus) => getAlarmRecordsPage({ ...basePayload, alarmStatus })));
    const parsed = pages.map((res) => parseAlarmRecordsPageResult(res));
    const records = mergeAlarmRecords(
      parsed.flatMap((page) => page.records),
      ALARM_EVENTS_PAGE_SIZE,
    );
    const total = parsed.reduce((sum, page) => sum + page.total, 0);
    const pageCount = total > 0 ? Math.ceil(total / ALARM_EVENTS_PAGE_SIZE) : 0;
    return { records, total, pages: pageCount };
  }

  async function loadAlarmEvents(pageNumber = 1): Promise<void> {
    eventsLoading.value = true;

    try {
      const { records, total, pages } = await fetchAlarmEventPage(pageNumber);
      const fallbackPoint = getAlarmFallbackPoint(uploadedImages.value, planTransforms.value);
      const mapped = mapAlarmRecordsToEvents(records, fallbackPoint);

      events.value = mapped;
      if (!mapped.some((event) => event.id === activeEventId.value)) {
        activeEventId.value = pickDefaultActiveEventId(mapped);
      }

      eventPageNumber.value = pageNumber;
      eventTotal.value = total;
      eventPages.value = pages;
    } catch {
      events.value = [];
      activeEventId.value = null;
      eventPageNumber.value = 1;
      eventTotal.value = 0;
      eventPages.value = 0;
      message.error("加载报警记录失败");
    } finally {
      eventsLoading.value = false;
    }
  }

  function searchAlarmEvents(): void {
    void loadAlarmEvents(1);
  }

  function changeAlarmEventPage(pageNumber: number): void {
    void loadAlarmEvents(pageNumber);
  }

  function toggleEventStatusFilter(status: AlarmEventStatusFilter): void {
    const current = eventStatusFilters.value;
    if (current.includes(status)) {
      if (current.length <= 1) {
        return;
      }
      eventStatusFilters.value = current.filter((item) => item !== status);
    } else {
      eventStatusFilters.value = [...current, status];
    }
    void loadAlarmEvents(1);
  }

  function resolveFeedCameraName(deviceId: string, fallbackName: string): string {
    const catalogName = monitorDeviceCatalog.value.get(deviceId)?.name;
    if (catalogName) {
      return catalogName;
    }
    if (fallbackName && fallbackName !== deviceId) {
      return fallbackName;
    }
    return deviceId;
  }

  async function loadRouteDeviceDisplayInfo(): Promise<void> {
    const deviceIds = new Set<string>();
    for (const route of apiRoutes.value) {
      for (const camera of route.boundCameras) {
        if (camera.id) {
          deviceIds.add(camera.id);
        }
      }
    }
    if (deviceIds.size === 0) {
      monitorDeviceCatalog.value = new Map();
      return;
    }

    const entries = await Promise.all(
      [...deviceIds].map(async (deviceId) => {
        try {
          const detail = (await getDeviceInstanceDetail({ deviceId })) as Parameters<typeof extractDeviceDisplayName>[0];
          return [
            deviceId,
            {
              name: extractDeviceDisplayName(detail, deviceId),
              area: extractDeviceDisplayArea(detail),
            },
          ] as const;
        } catch {
          return [deviceId, { name: deviceId, area: "--" }] as const;
        }
      }),
    );
    monitorDeviceCatalog.value = new Map(entries);
  }

  const areaRouteCameras = computed<FeedCamera[]>(() => {
    const map = new Map<string, FeedCamera>();
    for (const route of routes.value) {
      route.boundCameras.forEach((cam) => {
        if (map.has(cam.id)) {
          return;
        }
        const catalog = monitorDeviceCatalog.value.get(cam.id);
        map.set(cam.id, {
          id: cam.id,
          name: resolveFeedCameraName(cam.id, cam.name),
          area: catalog?.area ?? cam.area,
          online: true,
        });
      });
    }
    return [...map.values()];
  });

  const feedCameras = computed<FeedCamera[]>(() => {
    if (!selectedRouteId.value) {
      return areaRouteCameras.value;
    }
    const route = routes.value.find((item) => item.id === selectedRouteId.value);
    if (!route) {
      return areaRouteCameras.value;
    }
    return route.boundCameras.map((cam) => {
      const catalog = monitorDeviceCatalog.value.get(cam.id);
      return {
        id: cam.id,
        name: resolveFeedCameraName(cam.id, cam.name),
        area: catalog?.area ?? cam.area,
        online: true,
      };
    });
  });

  const selectedRoute = computed(() => routes.value.find((route) => route.id === selectedRouteId.value));

  const feedFilteredCameras = computed(() => {
    const kw = feedCamSearch.value.trim().toLowerCase();
    const list = feedCameras.value;
    if (!kw) {
      return list;
    }
    return list.filter((c) => c.name.toLowerCase().includes(kw) || c.area.toLowerCase().includes(kw) || c.id.toLowerCase().includes(kw));
  });

  function getPlanTransform(planId: string): PlanTransform | undefined {
    return planTransforms.value[planId];
  }

  function initPlanTransform(planId: string, center: RoutePoint): PlanTransform {
    const existing = planTransforms.value[planId];
    if (existing) {
      return existing;
    }
    const next = DEFAULT_PLAN_TRANSFORM(center);
    planTransforms.value = { ...planTransforms.value, [planId]: next };
    return next;
  }

  function setPlanCenter(planId: string, center: RoutePoint): void {
    const current = planTransforms.value[planId];
    if (!current) {
      return;
    }
    planTransforms.value = {
      ...planTransforms.value,
      [planId]: { ...current, center: { ...center } },
    };
  }

  function setPlanAspectRatio(planId: string, aspectRatio: number): void {
    if (!aspectRatio || aspectRatio <= 0 || !Number.isFinite(aspectRatio)) {
      return;
    }
    const current = uploadedImages.value.find((plan) => plan.id === planId);
    if (!current || current.aspectRatio === aspectRatio) {
      return;
    }
    uploadedImages.value = uploadedImages.value.map((plan) => (plan.id === planId ? { ...plan, aspectRatio } : plan));
  }

  function placePlanAtCenter(planId: string, center: RoutePoint): void {
    const existing = planTransforms.value[planId];
    planTransforms.value = {
      ...planTransforms.value,
      [planId]: existing ? { ...existing, center: { ...center } } : DEFAULT_PLAN_TRANSFORM(center),
    };
  }

  async function loadAreaTree(): Promise<void> {
    areaLoading.value = true;
    try {
      const areas = await fetchMdataAreaTree();
      areaTree.value = mapAreaTreesToTreeItems(Array.isArray(areas) ? areas : []);
      walkAreaTreeItems(areaTree.value, (node) => {
        node.expanded = true;
      });
      if (!selectedAreaId.value && areaTree.value.length > 0) {
        selectedAreaId.value = areaTree.value[0].id;
      }
    } catch {
      areaTree.value = [];
      message.error("加载区域列表失败");
    } finally {
      areaLoading.value = false;
    }
  }

  function toggleAreaNode(id: string): void {
    const node = findAreaTreeItem(areaTree.value, id);
    if (node) {
      node.expanded = !node.expanded;
    }
  }

  function selectArea(id: string, options?: { silent?: boolean }): void {
    if (selectedAreaId.value === id) {
      return;
    }
    selectedAreaId.value = id;
    if (options?.silent) {
      return;
    }
    const name = findAreaTreeItem(areaTree.value, id)?.name;
    if (name) {
      message.info(`已切换至：${name}`);
    }
  }

  function resolveEventAreaId(event: EmergencyEvent): string | null {
    if (event.areaId && findAreaTreeItem(areaTree.value, event.areaId)) {
      return event.areaId;
    }
    if (event.areaName) {
      const matched = flatAreas.value.find((area) => area.name === event.areaName);
      if (matched) {
        return matched.id;
      }
    }
    return null;
  }

  watch(selectedAreaId, (areaId) => {
    currentPoints.value = [];
    selectedRouteId.value = null;
    drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
    void loadByAreaId(areaId);
    void loadRoutesByAreaId(areaId);
  });

  watch(apiRoutes, (list) => {
    routes.value = list.map(toCommandRoute);
    if (selectedRouteId.value && !list.some((route) => route.id === selectedRouteId.value)) {
      selectedRouteId.value = null;
    }
    void loadRouteDeviceDisplayInfo();
  });

  function selectEvent(id: string): void {
    activeEventId.value = id;
    const event = events.value.find((item) => item.id === id);
    if (!event) {
      return;
    }
    const areaId = resolveEventAreaId(event);
    if (areaId) {
      selectArea(areaId, { silent: true });
    }
  }

  function selectRoute(routeId: string): void {
    if (selectedRouteId.value === routeId) {
      selectedRouteId.value = null;
      return;
    }
    selectedRouteId.value = routeId;
    const route = routes.value.find((item) => item.id === routeId);
    if (!route) {
      return;
    }
    if (selectedCameraId.value && !route.boundCameras.some((cam) => cam.id === selectedCameraId.value)) {
      selectedCameraId.value = null;
      closeCameraPreview();
    }
  }

  function openCameraPreview(device: FeedCamera): void {
    const catalog = monitorDeviceCatalog.value.get(device.id);
    cameraPreviewDevice.value = {
      ...device,
      name: catalog?.name ?? resolveFeedCameraName(device.id, device.name),
      area: catalog?.area ?? device.area,
    };
    cameraPreviewOpen.value = true;
    selectedCameraId.value = device.id;
  }

  function closeCameraPreview(): void {
    cameraPreviewOpen.value = false;
    cameraPreviewDevice.value = null;
  }

  function togglePanMode(): void {
    panMode.value = !panMode.value;
    message.info(panMode.value ? "平移模式：拖动地图移动视图" : "标注模式：点击地图放置路线节点");
  }

  function undoLastPoint(): void {
    currentPoints.value.pop();
    if (currentPoints.value.length === 0) {
      drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
    }
  }

  function clearCurrentRoute(): void {
    currentPoints.value = [];
    drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
  }

  function placePoint(point: RoutePoint): void {
    currentPoints.value.push(point);
    drawingHint.value = `已放置 ${currentPoints.value.length} 个节点（${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}）`;
  }

  function moveRoutePoint(routeIdx: number, pointIdx: number, point: RoutePoint): void {
    const route = routes.value[routeIdx];
    if (!route) {
      return;
    }
    route.points[pointIdx] = point;
    void updateRoutePoints({ ...route, points: route.points.map((p) => ({ ...p })) });
  }

  function moveCurrentPoint(pointIdx: number, point: RoutePoint): void {
    currentPoints.value[pointIdx] = point;
  }

  async function toggleRoute(index: number): Promise<void> {
    const route = apiRoutes.value[index];
    if (!route?.id) {
      message.warning("路线数据未就绪");
      return;
    }
    if (routeTogglingId.value) {
      return;
    }
    const nextEnabled = !route.enabled;
    routeTogglingId.value = route.id;
    try {
      await updateRouteEnabled(route, nextEnabled);
    } finally {
      routeTogglingId.value = null;
    }
  }

  function openSaveRouteModal(): void {
    if (!selectedAreaId.value) {
      message.warning("请先选择区域");
      return;
    }
    if (currentPoints.value.length < 2) {
      message.warning("请先在地图上放置至少2个节点");
      return;
    }
    editingRouteIndex.value = -1;
    routeModalTitle.value = "新增路线";
    routeForm.name = "临时疏散路线";
    routeForm.capacity = 50;
    routeForm.priority = "中";
    routeModalOpen.value = true;
  }

  function openEditRouteModal(index: number): void {
    const route = routes.value[index];
    if (!route) {
      return;
    }
    editingRouteIndex.value = index;
    routeModalTitle.value = "编辑路线";
    routeForm.name = route.name;
    routeForm.capacity = route.capacity;
    routeForm.priority = route.priority;
    routeModalOpen.value = true;
  }

  function closeRouteModal(): void {
    routeModalOpen.value = false;
    editingRouteIndex.value = -1;
  }

  function confirmRouteModal(): void {
    const areaId = selectedAreaId.value;
    if (!areaId) {
      message.warning("请先选择区域");
      return;
    }
    const name = routeForm.name.trim() || `疏散路线 ${routes.value.length + 1}`;
    const capacity = routeForm.capacity > 0 ? routeForm.capacity : 200;
    const { priority } = routeForm;
    if (editingRouteIndex.value >= 0) {
      const route = routes.value[editingRouteIndex.value];
      if (route) {
        void updateRoute(route.id, { name, capacity, priority }, route.points).then((ok) => {
          if (ok) {
            closeRouteModal();
            message.success("路线已保存");
          }
        });
      }
      return;
    }
    void createRoute(
      areaId,
      { name, capacity, priority },
      currentPoints.value.map((p) => ({ ...p })),
    ).then((ok) => {
      if (ok) {
        currentPoints.value = [];
        drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
        closeRouteModal();
      }
    });
  }

  function deleteRoute(index: number): void {
    const route = routes.value[index];
    if (!route) {
      return;
    }
    void removeRoute(route.id);
  }

  function openCameraBindModal(routeIndex: number): void {
    const route = routes.value[routeIndex];
    openRouteDevicePicker(routeIndex, route?.boundCameras ?? []);
  }

  async function handleCameraBindOk(values: { id: string; name: string }[]): Promise<void> {
    const idx = bindRouteIndex.value;
    if (idx < 0) {
      return;
    }
    const route = routes.value[idx];
    if (!route) {
      return;
    }
    const ok = await updateRouteDevices(
      route.id,
      values.map((device) => String(device.id)),
    );
    resetBindRouteIndex();
    if (ok) {
      message.success(`路线「${route.name}」已绑定 ${values.length} 个设备`);
    }
  }

  function getRouteStyle(route: CommandRoute): { opacity?: number; dashArray?: string; weight?: number } {
    if (!route.active) {
      return { opacity: 0.4, dashArray: "4,4", weight: 3 };
    }
    if (route.trafficStatus === "阻断") {
      return { dashArray: "6,3", weight: 4 };
    }
    if (route.trafficStatus === "拥挤") {
      return { dashArray: "4,2", weight: 4 };
    }
    return { weight: 4 };
  }

  onMounted(() => {
    void loadAreaTree();
    void loadAlarmEvents();
    void loadRouteDeviceDisplayInfo();
  });

  return {
    events,
    eventsLoading,
    eventKeyword,
    eventStatusFilters,
    eventPageNumber,
    eventTotal,
    eventPages,
    activeEventId,
    activeEvent,
    processingEventCount,
    areaTree,
    areaLoading,
    flatAreas,
    selectedAreaId,
    selectedAreaName,
    planLoading,
    uploadedImages,
    selectedPlanId,
    pendingPlanCenterId,
    planTransforms,
    routes,
    routesLoading,
    routeTogglingId,
    currentPoints,
    editingRouteIndex,
    selectedCameraId,
    selectedRouteId,
    selectedRoute,
    feedCamSearch,
    areaRouteCameras,
    feedCameras,
    cameraPreviewOpen,
    cameraPreviewDevice,
    panMode,
    drawingHint,
    dragState,
    routeModalOpen,
    routeModalTitle,
    routeForm,
    tagCode,
    deviceModalTableRef,
    deviceList,
    feedFilteredCameras,
    firePoint,
    selectEvent,
    searchAlarmEvents,
    changeAlarmEventPage,
    toggleEventStatusFilter,
    alarmEventStatusFilterOptions: ALARM_EVENT_STATUS_FILTER_OPTIONS,
    selectArea,
    toggleAreaNode,
    selectRoute,
    openCameraPreview,
    closeCameraPreview,
    getPlanTransform,
    initPlanTransform,
    setPlanCenter,
    setPlanAspectRatio,
    placePlanAtCenter,
    togglePanMode,
    undoLastPoint,
    clearCurrentRoute,
    placePoint,
    moveRoutePoint,
    moveCurrentPoint,
    toggleRoute,
    openSaveRouteModal,
    openEditRouteModal,
    closeRouteModal,
    confirmRouteModal,
    deleteRoute,
    openCameraBindModal,
    handleCameraBindOk,
    getRouteStyle,
  };
}

export type EvacuationCommandState = ReturnType<typeof useEvacuationCommandState>;

/** 与配置页 modal 兼容的联合类型 */
export type EvacuationModalState = EvacuationCommandState;
