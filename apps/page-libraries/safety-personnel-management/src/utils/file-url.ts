import type { FileVO } from "@g2-contract/safety-personnel";

import type { OSSFile } from "../components/file-upload";

type FilePathLike = Pick<FileVO, "path" | "endpointPath">;

/**
 * 图片展示地址（img / Image / FileUpload url）
 * 与 cube-app-design FileUpload、daily-task、grid-management 等一致：优先 path，相对路径原样返回
 */
export function toImageSrc(file: FilePathLike): string {
  const raw = file.path?.trim() || file.endpointPath?.trim() || "";
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  return `/${raw}`;
}

/** @deprecated 使用 toImageSrc */
export const toDisplayFilePath = toImageSrc;

/** 下载或新窗口打开时拼绝对地址 */
export function resolveFileUrl(file: FilePathLike): string {
  const raw = toImageSrc(file);
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `${window.location.origin}${raw}`;
}

/** FileUpload 回显 path（相对路径，勿拼 origin） */
export function toOssPreviewPath(file: FilePathLike): string {
  return toImageSrc(file);
}

export function withPreviewPath(file: OSSFile): OSSFile {
  const path = toOssPreviewPath(file);
  return path && path !== file.path ? { ...file, path } : file;
}

export function withPreviewPaths(files: OSSFile[]): OSSFile[] {
  return files.map(withPreviewPath);
}
