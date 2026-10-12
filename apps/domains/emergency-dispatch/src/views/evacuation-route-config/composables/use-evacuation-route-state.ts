// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, onMounted, reactive, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { useAreaPlaneMap } from "../../evacuation-shared/composables/use-area-plane-map";
import { useEvacuationRoutes } from "../../evacuation-shared/composables/use-evacuation-routes";
import { useRouteDeviceBind } from "../../evacuation-shared/composables/use-route-device-bind";
import type { AreaTreeItem, FloorPlanImage, PlanTransform, RoutePoint, RoutePriority } from "../../evacuation-shared/data/types";
import { DEFAULT_PLAN_TRANSFORM } from "../../evacuation-shared/data/types";
import { findAreaTreeItem, mapAreaTreesToTreeItems, walkAreaTreeItems } from "../data/area-tree";
import { fetchMdataAreaTree } from "@/api/mdata";
import { message } from "@/pc-ui-runtime";
import type { OSSFile } from "@/types/oss-file";
import { enrichFloorPlanAspect } from "@/utils/plan-image-aspect";

export type DragState = { type: "route"; routeIdx: number; pointIdx: number } | { type: "current"; pointIdx: number } | null;

const ROUTE_POINTS_PERSIST_MS = 500;

export function useEvacuationRouteState() {
  const route = useRoute();
  const areaTree = ref<AreaTreeItem[]>([]);
  const areaLoading = ref(false);
  const areaSearch = ref("");
  const selectedAreaId = ref<string | null>(null);

  const {
    areaPlaneMapId,
    uploadedImages,
    planTransforms,
    planLoading,
    loadByAreaId,
    createPlan,
    updatePlan,
    removePlan,
    setPendingUploadFileId,
  } = useAreaPlaneMap();

  const {
    routes,
    routesLoading,
    loadByAreaId: loadRoutesByAreaId,
    createRoute,
    updateRoute,
    updateRoutePoints,
    removeRoute,
    updateRouteDevices,
  } = useEvacuationRoutes();

  const selectedAreaName = computed(() => {
    if (!selectedAreaId.value) {
      return "";
    }
    return findAreaTreeItem(areaTree.value, selectedAreaId.value)?.name ?? "";
  });

  const selectedPlanId = ref<string | null>(null);
  const pendingPlanCenterId = ref<string | null>(null);
  const pendingPersistAfterCenter = ref(false);
  const planSaving = ref(false);
  const routeSaving = ref(false);

  const currentPoints = ref<RoutePoint[]>([]);
  const editingRouteIndex = ref(-1);

  const panMode = ref(false);
  const drawingHint = ref("在地图上点击放置路线节点，可拖动节点调整");
  const dragState = shallowRef<DragState>(null);

  const routeModalOpen = ref(false);
  const routeModalTitle = ref("新增路线");
  const routeForm = reactive({ name: "", capacity: 200, priority: "高" as RoutePriority });

  let routePointsPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const { tagCode, deviceModalTableRef, deviceList, bindRouteIndex, openRouteDevicePicker, resetBindRouteIndex } = useRouteDeviceBind();

  const selectedPlan = computed(() => {
    if (!selectedPlanId.value) {
      return;
    }
    return uploadedImages.value[0]?.id === selectedPlanId.value ? uploadedImages.value[0] : undefined;
  });

  const floorPlan = computed(() => uploadedImages.value[0]);

  const selectedPlanTransform = computed(() => {
    const id = selectedPlanId.value;
    if (!id) {
      return;
    }
    return planTransforms.value[id];
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

  function patchPlanTransform(planId: string, patch: Partial<PlanTransform>): void {
    const current = planTransforms.value[planId];
    if (!current) {
      return;
    }
    planTransforms.value = {
      ...planTransforms.value,
      [planId]: { ...current, ...patch },
    };
  }

  function setPlanCenter(planId: string, center: RoutePoint): void {
    patchPlanTransform(planId, { center: { ...center } });
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

  function adjustPlanScale(planId: string, delta: number): void {
    const current = planTransforms.value[planId];
    if (!current) {
      return;
    }
    const scale = Math.max(0.2, Math.min(4, Number((current.scale + delta).toFixed(2))));
    patchPlanTransform(planId, { scale });
  }

  function setPlanScale(planId: string, scale: number): void {
    patchPlanTransform(planId, { scale: Math.max(0.2, Math.min(4, Number(scale.toFixed(2)))) });
  }

  function adjustPlanRotation(planId: string, delta: number): void {
    const current = planTransforms.value[planId];
    if (!current) {
      return;
    }
    let rotation = (current.rotation + delta) % 360;
    if (rotation < 0) {
      rotation += 360;
    }
    patchPlanTransform(planId, { rotation });
  }

  function setPlanRotation(planId: string, rotation: number): void {
    let next = rotation % 360;
    if (next < 0) {
      next += 360;
    }
    patchPlanTransform(planId, { rotation: Math.round(next) });
  }

  function resetPlanTransform(planId: string, center: RoutePoint): void {
    planTransforms.value = {
      ...planTransforms.value,
      [planId]: DEFAULT_PLAN_TRANSFORM(center),
    };
    message.info("平面图位置与变换已复位");
  }

  async function persistPlanAfterCenter(planId: string, center: RoutePoint): Promise<void> {
    const areaId = selectedAreaId.value;
    const file = uploadedImages.value[0];
    if (!areaId || !file || file.id !== planId) {
      return;
    }
    const transform = planTransforms.value[planId] ?? DEFAULT_PLAN_TRANSFORM(center);
    if (areaPlaneMapId.value) {
      await updatePlan(areaId, transform);
    } else {
      await createPlan(areaId, transform);
    }
  }

  function placePlanAtCenter(planId: string, center: RoutePoint): void {
    const existing = planTransforms.value[planId];
    planTransforms.value = {
      ...planTransforms.value,
      [planId]: existing ? { ...existing, center: { ...center } } : DEFAULT_PLAN_TRANSFORM(center),
    };
    if (pendingPersistAfterCenter.value) {
      pendingPersistAfterCenter.value = false;
      void persistPlanAfterCenter(planId, center);
    }
  }

  function selectPlan(planId: string): void {
    selectedPlanId.value = selectedPlanId.value === planId ? null : planId;
  }

  function deselectPlan(): void {
    selectedPlanId.value = null;
  }

  function removePlanTransform(planId: string): void {
    const next = { ...planTransforms.value };
    delete next[planId];
    planTransforms.value = next;
    if (selectedPlanId.value === planId) {
      selectedPlanId.value = null;
    }
  }

  async function persistPlanEdit(): Promise<void> {
    const areaId = selectedAreaId.value;
    const plan = floorPlan.value;
    const planId = selectedPlanId.value;
    if (!areaId || !plan || !planId) {
      deselectPlan();
      return;
    }
    const transform = planTransforms.value[planId];
    if (!transform) {
      deselectPlan();
      return;
    }
    planSaving.value = true;
    try {
      const isUpdate = Boolean(areaPlaneMapId.value);
      const ok = isUpdate ? await updatePlan(areaId, transform) : await createPlan(areaId, transform);
      if (ok) {
        deselectPlan();
        if (isUpdate) {
          message.success("平面图已保存");
        }
      }
    } finally {
      planSaving.value = false;
    }
  }

  async function deletePlanFromServer(): Promise<void> {
    selectedPlanId.value = null;
    pendingPlanCenterId.value = null;
    pendingPersistAfterCenter.value = false;
    planSaving.value = true;
    try {
      await removePlan(selectedAreaId.value);
    } finally {
      planSaving.value = false;
    }
  }

  function resetDrawingOnAreaChange(): void {
    currentPoints.value = [];
    drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
  }

  function expandAllAreaNodes(): void {
    walkAreaTreeItems(areaTree.value, (node) => {
      node.expanded = true;
    });
  }

  function toggleAreaNode(id: string): void {
    const node = findAreaTreeItem(areaTree.value, id);
    if (node) {
      node.expanded = !node.expanded;
    }
  }

  function selectArea(id: string): void {
    selectedAreaId.value = id;
    resetDrawingOnAreaChange();
  }

  async function loadAreaTree(): Promise<void> {
    areaLoading.value = true;
    try {
      const areas = await fetchMdataAreaTree();
      areaTree.value = mapAreaTreesToTreeItems(Array.isArray(areas) ? areas : []);
      const queryAreaId = typeof route.query.areaId === "string" ? route.query.areaId.trim() : "";
      if (queryAreaId && findAreaTreeItem(areaTree.value, queryAreaId)) {
        selectedAreaId.value = queryAreaId;
      } else if (!selectedAreaId.value && areaTree.value.length > 0) {
        selectedAreaId.value = areaTree.value[0].id;
      }
    } catch {
      areaTree.value = [];
      message.error("加载区域列表失败");
    } finally {
      areaLoading.value = false;
    }
  }

  watch(selectedAreaId, (areaId) => {
    selectedPlanId.value = null;
    pendingPlanCenterId.value = null;
    pendingPersistAfterCenter.value = false;
    void loadByAreaId(areaId);
    void loadRoutesByAreaId(areaId);
    resetDrawingOnAreaChange();
  });

  onMounted(() => {
    void loadAreaTree();
  });

  async function onFloorPlansChange(files: OSSFile[]): Promise<void> {
    const file = files.length > 0 ? (files.at(-1) as FloorPlanImage) : undefined;
    if (!file) {
      return;
    }
    if (!selectedAreaId.value) {
      message.warning("请先选择区域");
      return;
    }

    const enriched = await enrichFloorPlanAspect(file);
    const isReplace = uploadedImages.value[0]?.id !== enriched.id;
    uploadedImages.value = [enriched];

    if (isReplace) {
      planTransforms.value = {};
      selectedPlanId.value = null;
      pendingPlanCenterId.value = enriched.id;
      pendingPersistAfterCenter.value = true;
      setPendingUploadFileId(String(enriched.id));
      message.success(`平面图「${enriched.name}」已上传，已定位到当前地图中心`);
    }
  }

  function togglePanMode(): void {
    if (!panMode.value) {
      selectedPlanId.value = null;
    }
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

  function schedulePersistRoutePoints(routeIdx: number): void {
    if (routePointsPersistTimer) {
      clearTimeout(routePointsPersistTimer);
    }
    routePointsPersistTimer = setTimeout(() => {
      routePointsPersistTimer = null;
      const selectedRoute = routes.value[routeIdx];
      if (!selectedRoute) {
        return;
      }
      void updateRoutePoints({ ...selectedRoute, points: selectedRoute.points.map((p) => ({ ...p })) });
    }, ROUTE_POINTS_PERSIST_MS);
  }

  function moveRoutePoint(routeIdx: number, pointIdx: number, point: RoutePoint): void {
    const selectedRoute = routes.value[routeIdx];
    if (!selectedRoute) {
      return;
    }
    selectedRoute.points[pointIdx] = point;
    schedulePersistRoutePoints(routeIdx);
  }

  function moveCurrentPoint(pointIdx: number, point: RoutePoint): void {
    currentPoints.value[pointIdx] = point;
  }

  function setDragState(state: DragState): void {
    dragState.value = state;
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
    routeForm.name = `疏散路线 ${routes.value.length + 1}`;
    routeForm.capacity = 200;
    routeForm.priority = "高";
    routeModalOpen.value = true;
  }

  function openEditRouteModal(index: number): void {
    const selectedRoute = routes.value[index];
    if (!selectedRoute) {
      return;
    }
    editingRouteIndex.value = index;
    routeModalTitle.value = "编辑路线";
    routeForm.name = selectedRoute.name;
    routeForm.capacity = selectedRoute.capacity;
    routeForm.priority = selectedRoute.priority;
    routeModalOpen.value = true;
  }

  function closeRouteModal(): void {
    routeModalOpen.value = false;
    editingRouteIndex.value = -1;
  }

  async function confirmRouteModal(): Promise<void> {
    const areaId = selectedAreaId.value;
    if (!areaId) {
      message.warning("请先选择区域");
      return;
    }
    const form = {
      name: routeForm.name.trim() || `疏散路线 ${routes.value.length + 1}`,
      capacity: routeForm.capacity > 0 ? routeForm.capacity : 200,
      priority: routeForm.priority,
    };
    routeSaving.value = true;
    try {
      if (editingRouteIndex.value >= 0) {
        const selectedRoute = routes.value[editingRouteIndex.value];
        if (!selectedRoute) {
          return;
        }
        const ok = await updateRoute(selectedRoute.id, form, selectedRoute.points);
        if (ok) {
          closeRouteModal();
          message.success("路线已更新");
        }
      } else {
        const ok = await createRoute(
          areaId,
          form,
          currentPoints.value.map((p) => ({ ...p })),
        );
        if (ok) {
          currentPoints.value = [];
          drawingHint.value = "在地图上点击放置路线节点，可拖动节点调整";
          closeRouteModal();
        }
      }
    } finally {
      routeSaving.value = false;
    }
  }

  async function deleteRoute(index: number): Promise<void> {
    const selectedRoute = routes.value[index];
    if (!selectedRoute) {
      return;
    }
    const ok = await removeRoute(selectedRoute.id);
    if (ok && editingRouteIndex.value === index) {
      editingRouteIndex.value = -1;
    }
  }

  function openCameraBindModal(routeIndex: number): void {
    const selectedRoute = routes.value[routeIndex];
    openRouteDevicePicker(routeIndex, selectedRoute?.boundCameras ?? []);
  }

  async function handleCameraBindOk(values: { id: string; name: string }[]): Promise<void> {
    const idx = bindRouteIndex.value;
    if (idx < 0) {
      return;
    }
    const selectedRoute = routes.value[idx];
    if (!selectedRoute) {
      return;
    }
    const ok = await updateRouteDevices(
      selectedRoute.id,
      values.map((device) => String(device.id)),
    );
    resetBindRouteIndex();
    if (ok) {
      message.success(`路线「${selectedRoute.name}」已绑定 ${values.length} 个设备`);
    }
  }

  return {
    areaTree,
    areaLoading,
    areaSearch,
    selectedAreaId,
    selectedAreaName,
    uploadedImages,
    floorPlan,
    selectedPlanId,
    selectedPlan,
    pendingPlanCenterId,
    planTransforms,
    selectedPlanTransform,
    planLoading,
    planSaving,
    areaPlaneMapId,
    routes,
    routesLoading,
    routeSaving,
    currentPoints,
    editingRouteIndex,
    panMode,
    drawingHint,
    dragState,
    routeModalOpen,
    routeModalTitle,
    routeForm,
    tagCode,
    deviceModalTableRef,
    deviceList,
    expandAllAreaNodes,
    toggleAreaNode,
    selectArea,
    loadAreaTree,
    onFloorPlansChange,
    selectPlan,
    deselectPlan,
    persistPlanEdit,
    deletePlanFromServer,
    getPlanTransform,
    initPlanTransform,
    setPlanCenter,
    setPlanAspectRatio,
    adjustPlanScale,
    setPlanScale,
    adjustPlanRotation,
    setPlanRotation,
    resetPlanTransform,
    placePlanAtCenter,
    removePlanTransform,
    togglePanMode,
    undoLastPoint,
    clearCurrentRoute,
    placePoint,
    moveRoutePoint,
    moveCurrentPoint,
    setDragState,
    openSaveRouteModal,
    openEditRouteModal,
    closeRouteModal,
    confirmRouteModal,
    deleteRoute,
    openCameraBindModal,
    handleCameraBindOk,
  };
}

export type EvacuationRouteState = ReturnType<typeof useEvacuationRouteState>;
