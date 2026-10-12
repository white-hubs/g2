import { ref } from "vue";

import type { PlanTransform } from "../data/types";
import { serializePlanTransform } from "../utils/area-plane-map-gps";
import { mapAreaPlaneMapToFloorPlan } from "../utils/area-plane-map-mapper";
import { createAreaPlaneMap, deleteAreaPlaneMap, listAreaPlaneMapsByAreaId, updateAreaPlaneMap } from "@/api/area-plane-map";
import { message } from "@/pc-ui-runtime";
import { enrichFloorPlanAspect } from "@/utils/plan-image-aspect";

function toStringId(value: string | number | undefined | null, label: string): string | null {
  if (value == null || value === "") {
    return null;
  }
  const str = String(value).trim();
  if (!str) {
    message.error(`${label}无效`);
    return null;
  }
  return str;
}

function clearPlanState(
  areaPlaneMapId: { value: string | null },
  serverFileId: { value: string | null },
  pendingUploadFileId: { value: string | null },
  uploadedImages: { value: import("../data/types").FloorPlanImage[] },
  planTransforms: { value: Record<string, PlanTransform> },
): void {
  uploadedImages.value = [];
  planTransforms.value = {};
  areaPlaneMapId.value = null;
  serverFileId.value = null;
  pendingUploadFileId.value = null;
}

function applyMappedPlan(
  mapped: ReturnType<typeof mapAreaPlaneMapToFloorPlan>,
  areaPlaneMapId: { value: string | null },
  serverFileId: { value: string | null },
  pendingUploadFileId: { value: string | null },
  uploadedImages: { value: import("../data/types").FloorPlanImage[] },
  planTransforms: { value: Record<string, PlanTransform> },
): void {
  if (!mapped) {
    clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
    return;
  }
  areaPlaneMapId.value = mapped.recordId;
  serverFileId.value = String(mapped.serverFileId);
  pendingUploadFileId.value = null;
  uploadedImages.value = [mapped.floorPlan];
  planTransforms.value = { [mapped.floorPlan.id]: mapped.transform };
}

async function applyMappedPlanWithAspect(
  mapped: ReturnType<typeof mapAreaPlaneMapToFloorPlan>,
  areaPlaneMapId: { value: string | null },
  serverFileId: { value: string | null },
  pendingUploadFileId: { value: string | null },
  uploadedImages: { value: import("../data/types").FloorPlanImage[] },
  planTransforms: { value: Record<string, PlanTransform> },
): Promise<void> {
  if (!mapped) {
    clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
    return;
  }
  const floorPlan = await enrichFloorPlanAspect(mapped.floorPlan);
  applyMappedPlan({ ...mapped, floorPlan }, areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
}

export function useAreaPlaneMap() {
  const areaPlaneMapId = ref<string | null>(null);
  /** 详情中的 fileId，未重新上传时使用 */
  const serverFileId = ref<string | null>(null);
  /** upload/temporary 上传后返回的 id，重新上传时使用 */
  const pendingUploadFileId = ref<string | null>(null);
  const uploadedImages = ref<import("../data/types").FloorPlanImage[]>([]);
  const planTransforms = ref<Record<string, PlanTransform>>({});
  const planLoading = ref(false);

  function setPendingUploadFileId(fileId: string | null): void {
    pendingUploadFileId.value = fileId == null ? null : String(fileId);
  }

  /** 提交接口用的 fileId：有新上传用临时 id，否则用详情 fileId */
  function resolvePersistFileId(): string | null {
    return pendingUploadFileId.value ?? serverFileId.value;
  }

  async function loadByAreaId(areaId: string | null): Promise<void> {
    if (!areaId) {
      clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
      return;
    }
    planLoading.value = true;
    try {
      const list = await listAreaPlaneMapsByAreaId(areaId);
      const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
      await applyMappedPlanWithAspect(
        first ? mapAreaPlaneMapToFloorPlan(first) : null,
        areaPlaneMapId,
        serverFileId,
        pendingUploadFileId,
        uploadedImages,
        planTransforms,
      );
    } catch {
      clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
      message.error("加载区域平面图失败");
    } finally {
      planLoading.value = false;
    }
  }

  async function createPlan(areaId: string, transform: PlanTransform): Promise<boolean> {
    const stringAreaId = toStringId(areaId, "区域 ID");
    const fileId = resolvePersistFileId();
    const stringFileId = toStringId(fileId, "文件 ID");
    if (stringAreaId == null || stringFileId == null) {
      if (!fileId) {
        message.error("请先上传平面图");
      }
      return false;
    }
    try {
      await createAreaPlaneMap({
        areaId: stringAreaId,
        fileId: stringFileId,
        gpsLocation: serializePlanTransform(transform),
      });
      await loadByAreaId(areaId);
      message.success("平面图已保存");
      return true;
    } catch {
      message.error("保存平面图失败");
      return false;
    }
  }

  async function updatePlan(areaId: string, transform: PlanTransform): Promise<boolean> {
    if (!areaPlaneMapId.value) {
      message.error("未找到平面图记录");
      return false;
    }
    const stringAreaId = toStringId(areaId, "区域 ID");
    const fileId = resolvePersistFileId();
    const stringFileId = toStringId(fileId, "文件 ID");
    if (stringAreaId == null || stringFileId == null) {
      if (!fileId) {
        message.error("文件 ID 无效");
      }
      return false;
    }
    try {
      await updateAreaPlaneMap(areaPlaneMapId.value, {
        areaId: stringAreaId,
        fileId: stringFileId,
        gpsLocation: serializePlanTransform(transform),
      });
      await loadByAreaId(areaId);
      return true;
    } catch {
      message.error("更新平面图失败");
      return false;
    }
  }

  async function removePlan(areaId: string | null): Promise<boolean> {
    if (!areaPlaneMapId.value) {
      clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
      return true;
    }
    try {
      await deleteAreaPlaneMap(areaPlaneMapId.value);
      clearPlanState(areaPlaneMapId, serverFileId, pendingUploadFileId, uploadedImages, planTransforms);
      message.success("平面图已删除");
      if (areaId) {
        await loadByAreaId(areaId);
      }
      return true;
    } catch {
      message.error("删除平面图失败");
      return false;
    }
  }

  return {
    areaPlaneMapId,
    serverFileId,
    pendingUploadFileId,
    uploadedImages,
    planTransforms,
    planLoading,
    setPendingUploadFileId,
    resolvePersistFileId,
    loadByAreaId,
    createPlan,
    updatePlan,
    removePlan,
  };
}
