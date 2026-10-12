import { getFloorPlanImagePath, resolveFileUrl } from "./file-url";
import type { FloorPlanImage } from "@/views/evacuation-shared/data/types";

/** 读取图片 naturalWidth / naturalHeight（宽/高），用于地图叠加保持原始比例 */
export async function resolveImageAspectRatio(file?: Pick<FloorPlanImage, "path" | "endpointPath"> | null): Promise<number | undefined> {
  const url = resolveFileUrl(getFloorPlanImagePath(file));
  if (!url) {
    return undefined;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = (): void => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img.naturalWidth / img.naturalHeight);
        return;
      }
      resolve(undefined);
    };
    img.onerror = (): void => resolve(undefined);
    img.src = url;
  });
}

export async function enrichFloorPlanAspect(plan: FloorPlanImage): Promise<FloorPlanImage> {
  if (plan.aspectRatio && plan.aspectRatio > 0) {
    return plan;
  }
  const aspectRatio = await resolveImageAspectRatio(plan);
  if (!aspectRatio) {
    return plan;
  }
  return { ...plan, aspectRatio };
}

export function getPlanAspectRatio(plan?: Pick<FloorPlanImage, "aspectRatio">, fallback = 1): number {
  const ratio = plan?.aspectRatio;
  return ratio && ratio > 0 && Number.isFinite(ratio) ? ratio : fallback;
}
