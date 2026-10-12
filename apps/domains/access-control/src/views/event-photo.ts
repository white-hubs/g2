/** 通行照片：接口 pictureFile 可能是 URL 字符串或带 endpointPath/path 的文件对象。 */
export function resolveEventPhoto(record: Record<string, unknown>): string {
  const file = record.pictureFile;
  if (typeof file === "string" && file.trim()) {
    return file.trim();
  }
  if (file && typeof file === "object") {
    const obj = file as { endpointPath?: unknown; path?: unknown; url?: unknown };
    for (const key of ["endpointPath", "path", "url"] as const) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  const direct = [record.picUrl, record.photoUrl, record.eventPic, record.imageUrl, record.snapUrl, record.pictureUrl];
  for (const item of direct) {
    if (typeof item === "string" && item.trim()) return item.trim();
  }

  const fileId = record.pictureFileId;
  if (fileId != null && String(fileId).trim()) {
    return `/resource/v1/file/download?id=${encodeURIComponent(String(fileId))}`;
  }
  return "";
}
