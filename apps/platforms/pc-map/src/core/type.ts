import type L from "leaflet";

export type MapType = "gdMap" | "t-map" | "TD_MAP";

export interface MapConfig {
  andriodKey?: string;
  iosKey?: string;
  webKey?: string;
  securityJsCode?: string;
  /** 由宿主从字典解析后传入；缺省按 gdMap（Leaflet 高德瓦片）处理 */
  mapType?: MapType;
}

export type GeoJSONParameters = ConstructorParameters<typeof L.GeoJSON>;
