import type { AreaPlaneMapVO } from "@g2-contract/emergency-dispatch";

import type { FloorPlanImage, PlanTransform } from "../data/types";
import { DEFAULT_PLAN_TRANSFORM } from "../data/types";
import { parsePlanTransform } from "./area-plane-map-gps";

export interface MappedAreaPlaneMap {
  recordId: string;
  /** 接口提交用的 fileId（来自详情 vo.fileId） */
  serverFileId: string;
  floorPlan: FloorPlanImage;
  transform: PlanTransform;
}

export function mapAreaPlaneMapToFloorPlan(vo: AreaPlaneMapVO): MappedAreaPlaneMap | null {
  const file = vo.file;
  if (!file) {
    return null;
  }
  const serverFileId = String(vo.fileId);
  const displayFileId = String(file.id);
  const path = file.endpointPath?.trim() || file.path?.trim() || "";
  const floorPlan: FloorPlanImage = {
    id: displayFileId,
    name: file.name ?? "",
    path,
    endpointPath: file.endpointPath?.trim() || path,
    suffix: file.suffix ?? "",
    size: file.size ?? 0,
    refCount: file.refCount ?? 0,
    type: file.type ?? "",
    businessKey: file.businessKey == null ? null : String(file.businessKey),
  };
  const transform = parsePlanTransform(vo.gpsLocation) ?? DEFAULT_PLAN_TRANSFORM({ lng: 0, lat: 0 });
  return {
    recordId: String(vo.id),
    serverFileId,
    floorPlan,
    transform,
  };
}
