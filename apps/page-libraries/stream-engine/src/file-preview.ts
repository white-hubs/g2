export interface PreviewFile {
  name?: string | null;
  path?: string | null;
  url?: string | null;
}

const documentExtensions = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "txt"]);
const videoExtensions = new Set(["mp4", "avi", "wmv", "flv"]);
const audioExtensions = new Set(["mp3", "wav", "m4a"]);

export function legacyPreviewKind(name: string): "document" | "video" | "audio" | "other" {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (documentExtensions.has(extension)) return "document";
  if (videoExtensions.has(extension)) return "video";
  if (audioExtensions.has(extension)) return "audio";
  return "other";
}

/** 对齐旧 kkFilePreview 的在线预览地址，Excel 使用 HTML 预览模式。 */
export function legacyFilePreviewUrl(file: PreviewFile, origin?: string): string | null {
  const name = file.name ?? "";
  const path = file.path || file.url || "";
  const base = origin ?? (typeof location === "undefined" ? "" : location.origin);
  if (!name || !path || !base || legacyPreviewKind(name) === "other") return null;
  let fileUrl: URL;
  try {
    fileUrl = new URL(path, base);
  } catch {
    return null;
  }
  const encoded = btoa(fileUrl.href);
  const preview = new URL("/tools/kkfileview/onlinePreview", base);
  preview.searchParams.set("url", encoded);
  preview.searchParams.set("fileName", name);
  if (["xls", "xlsx"].includes(name.split(".").pop()?.toLowerCase() ?? "")) {
    preview.searchParams.set("officePreviewType", "html");
  }
  return preview.href;
}

export function openLegacyFilePreview(file: PreviewFile): boolean {
  const url = legacyFilePreviewUrl(file);
  if (!url) return false;
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7)";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "关闭文件预览");
  close.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:1;width:32px;height:32px;border:0;border-radius:50%;background:#fff;font-size:20px;cursor:pointer";
  close.addEventListener("click", () => overlay.remove());
  const iframe = document.createElement("iframe");
  iframe.title = String(file.name);
  iframe.src = url;
  iframe.style.cssText = "width:100%;height:100%;border:0";
  overlay.append(close, iframe);
  document.body.append(overlay);
  return true;
}
