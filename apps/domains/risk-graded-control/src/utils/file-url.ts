import type { RiskControlFileVO } from "@/types/risk";

type FilePathLike = Pick<RiskControlFileVO, "path" | "endpointPath">;

/** 图片展示地址：优先 path（相对路径），path 为空时再回退 endpointPath */
export function toImageSrc(file: FilePathLike): string {
  const raw = file.path?.trim() || file.endpointPath?.trim() || "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

/** 从文件对象解析展示地址：严格优先 path */
export function resolveFileDisplayPath(file?: RiskControlFileVO | null): string {
  if (!file) return "";
  const fromPath = toImageSrc({ path: file.path, endpointPath: "" });
  if (fromPath) return fromPath;
  return toImageSrc({ path: "", endpointPath: file.endpointPath });
}

/** 上传/回显时规范化相对 path */
export function normalizeUploadPath(path?: string | null): string {
  return toImageSrc({ path: path?.trim() || "", endpointPath: "" });
}
