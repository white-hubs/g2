import type { DataDictionary } from "@g2-contract/dictionary";

import { configurationRecord, MAP_CONFIG_CODE } from "../dispatch-map-config/config";

export const BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/bmp", "image/webp", "image/svg+xml"];

export function validateBackgroundFile(file: Blob): string | undefined {
  return BACKGROUND_IMAGE_TYPES.includes(file.type) ? undefined : "请上传图片文件";
}

export function backgroundRecord(records: DataDictionary[], path: string): DataDictionary {
  return configurationRecord(records, MAP_CONFIG_CODE, "background", "背景图", path);
}
