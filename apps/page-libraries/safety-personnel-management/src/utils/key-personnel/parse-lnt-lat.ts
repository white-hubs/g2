/** 解析经纬度字符串，格式为「经度,纬度」（与指挥调度 COMMAND_DISPATCH_MAP_CONFIG.lnglat 一致） */
export const parseLntAndLat = (val?: string | null): { lng: number; lat: number } | null => {
  if (!val?.trim()) {
    return null;
  }
  const [lngRaw = "", latRaw = ""] = val.split(",");
  const lng = Number(lngRaw.trim());
  const lat = Number(latRaw.trim());
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    return null;
  }
  return { lng, lat };
};
