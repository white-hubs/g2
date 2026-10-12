/** 图片展示地址：相对路径原样返回，绝对 URL 直接使用 */
export function toImageSrc(path?: string | null): string {
  const raw = path?.trim() ?? "";
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

/** 下载或跨域资源时使用绝对地址 */
export function resolveFileUrl(path?: string | null): string {
  const raw = toImageSrc(path);
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (typeof window === "undefined") {
    return raw;
  }
  return `${window.location.origin}${raw}`;
}

/** 平面图文件地址：兼容服务端 endpointPath 与上传 path */
export function getFloorPlanImagePath(file?: { path?: string | null; endpointPath?: string | null } | null): string {
  if (!file) {
    return "";
  }
  return file.endpointPath?.trim() || file.path?.trim() || "";
}
