/// <reference path="./map.d.ts" />
/// <reference path="./core/leaflet-plugins.d.ts" />

/**
 * 地图 platform 入口：提供通用地图实例、地图选点弹窗和地址解析能力。
 */

export type MapLngLat = { lng: number; lat: number };

export { CubeMapLeaflet as InteractiveMap } from "./core/cube-map-leaflet";
export type { MapConfig } from "./core/type";
export { MapPickerModal } from "./map-picker-modal";
export type { MapPickerModalProps, MapPickerPoint, MapPickerResult } from "./map-picker-modal";

export async function reverseGeocode(point: MapLngLat): Promise<{ address: string }> {
  return { address: `${point.lng},${point.lat}` };
}

export async function resolveMapWatermarkAddress(point: MapLngLat): Promise<string> {
  const result = await reverseGeocode(point);
  return result.address;
}

export const CubeMapCore = {
  reverseGeocode,
  resolveMapWatermarkAddress,
};
