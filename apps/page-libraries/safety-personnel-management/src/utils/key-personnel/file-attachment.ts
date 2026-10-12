import type { FileVO } from "@g2-contract/safety-personnel";

import { resolveFileUrl, toImageSrc } from "../file-url";

type FileLike = Pick<FileVO, "name" | "path" | "endpointPath" | "suffix" | "type">;

const IMAGE_SUFFIXES = new Set(["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"]);

/** 判断附件是否为可预览图片 */
export const isImageFile = (file: FileLike): boolean => {
  const suffix = file.suffix?.replace(/^\./, "").toLowerCase();
  if (suffix && IMAGE_SUFFIXES.has(suffix)) {
    return true;
  }
  if (file.type?.toLowerCase().includes("image")) {
    return true;
  }
  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext !== undefined && IMAGE_SUFFIXES.has(ext);
};

export { toImageSrc };

/** 点击下载/打开附件 */
export const downloadAttachment = (file: FileLike): void => {
  const url = resolveFileUrl(file);
  if (!url) {
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (file.name) {
    link.download = file.name;
  }
  document.body.append(link);
  link.click();
  document.body.removeChild(link);
};
