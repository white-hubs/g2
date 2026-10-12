/// <reference path="./leaflet-plugins.d.ts" />
/// <reference path="./leaflet-rotate.d.ts" />

import { transformGCJ02ToWGS84, transformWGS84ToGCJ02 } from "@isvend/coord-transform";
import type { Direction, Point } from "leaflet";

import { CubeMapCore } from "./cube-map-core";
import L from "./leaflet-runtime";
import type { GeoJSONParameters } from "./type";

import "leaflet/dist/leaflet.css";
// leaflet-runtime 已挂 L；markercluster 以 side-effect 扩展 L.markerClusterGroup
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

function patchPointRotate(leaflet: typeof L): void {
  const proto = leaflet.Point.prototype as Point & {
    rotateFrom?: (theta: number, pivot: Point) => Point;
    rotate?: (theta: number) => Point;
  };
  if (typeof proto.rotateFrom === "function") {
    return;
  }
  leaflet.extend(leaflet.Point.prototype, {
    rotate(this: Point, theta: number) {
      return this.rotateFrom!(theta, new leaflet.Point(0, 0));
    },
    rotateFrom(this: Point, theta: number, pivot: Point) {
      if (!theta) {
        return this;
      }
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      const x = this.x - pivot.x;
      const y = this.y - pivot.y;
      return new leaflet.Point(x * cos - y * sin + pivot.x, x * sin + y * cos + pivot.y);
    },
  });
}

async function ensureLeafletRotate(leaflet: typeof L): Promise<void> {
  (globalThis as unknown as { L: typeof L }).L = leaflet;
  if (typeof window !== "undefined") {
    (window as unknown as { L: typeof L }).L = leaflet;
  }
  patchPointRotate(leaflet);
  if (typeof leaflet.Map.prototype.setBearing !== "function") {
    await import("leaflet-rotate");
  }
  if (typeof leaflet.Map.prototype.setBearing !== "function") {
    throw new Error("leaflet-rotate did not install setBearing on the active Leaflet runtime");
  }
}

export interface HeatLayerPoint {
  lng: number;
  lat: number;
  intensity?: number;
}

export interface HeatLayerOptions {
  minOpacity?: number;
  maxZoom?: number;
  max?: number;
  radius?: number;
  blur?: number;
  gradient?: Record<number, string>;
}

async function getRemoteImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // 创建一个新的 Image 对象
    const img = new Image();

    // 设置图片的源为远程图片的 URL
    img.src = imageUrl;

    // 监听图片的加载事件
    img.onload = function onload(): void {
      // 当图片加载完成后，解析 Promise 并传递宽高
      resolve({ width: img.width, height: img.height });
    };

    // 处理图片加载失败的情况
    img.onerror = function onerror(): void {
      // 拒绝 Promise 并传递错误信息
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
  });
}

const DEFAULT_CENTER: [number, number] = [114.057939, 22.543527]; // 高德坐标系
const DEFAULT_ZOOM = 16;
const TILE_GD = "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}";
const TILE_TD = "https://t0.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}&tk={key}";
const TILE_TD_LABEL = "https://t0.tianditu.gov.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}&tk={key}";
const themeMap = new Map([
  ["amap://styles/darkblue", "url('#x-rays') hue-rotate(357deg) brightness(70%) saturate(90%) contrast(140%)"],
  ["darkblue", "url('#x-rays') hue-rotate(357deg) brightness(70%) saturate(90%) contrast(140%)"],
]);

/** 地图实例类 封装除业务的地图操作 */
export class CubeMapLeaflet extends CubeMapCore {
  private mapLayer: any;
  private mapLabelLayer: L.TileLayer | null = null;
  private circles: L.Circle[] = []; // 存储所有添加的圆形
  private markers: L.Marker[] = []; // 存储所有添加的标记
  private heatLayers: L.HeatLayer[] = []; // 存储当前实例创建的热力图图层
  private mapStatus: {
    center: L.LatLng;
    zoom: number;
    layers: unknown[];
  } | null = null;

  public async renderMap(
    mapDomId: string,
    options?: {
      zoomControl?: boolean;
      rotateControl?: boolean;
      center?: { lng: number; lat: number };
      mapStyle?: string;
    },
  ): Promise<void> {
    // 旋转扩展必须挂到本模块使用的 L 上（qiankun 下 window.L 可能是其它子应用实例）
    await ensureLeafletRotate(L);

    options = options ?? {};
    options.zoomControl = options?.zoomControl ?? false;
    options.rotateControl = options?.rotateControl ?? false;
    options.center = options?.center ?? { lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] };

    await this.mapLoader();
    const location =
      this.mapType === "TD_MAP" ? transformGCJ02ToWGS84(options.center.lng, options.center.lat) : [options.center.lng, options.center.lat];
    this.mapInstance = L.map(mapDomId, {
      zoomControl: options.zoomControl,
      attributionControl: false,
      zoomSnap: 0.5,
      rotateControl: options.rotateControl,
      rotate: true,
      renderer: L.canvas(),
    }).setView([location[1], location[0]], DEFAULT_ZOOM);
    const tileURL = this.mapType === "TD_MAP" ? TILE_TD.replace("{key}", this.mapConfig?.webKey ?? "") : TILE_GD;
    this.mapLayer = L.tileLayer(tileURL, {
      maxZoom: 18,
      minZoom: 3,
      className: "cube-map-base-tile",
    });
    this.mapLayer.addTo(this.mapInstance);
    if (this.mapType === "TD_MAP") {
      this.mapLabelLayer = L.tileLayer(TILE_TD_LABEL.replace("{key}", this.mapConfig?.webKey ?? ""), {
        maxZoom: 18,
        minZoom: 3,
        className: "cube-map-label-tile",
      }).addTo(this.mapInstance);
    }
    const themeFilter = themeMap.get(options.mapStyle ?? "");
    if (themeFilter) {
      this.mapLayer.getContainer?.()?.style.setProperty("filter", themeFilter);
    }
    try {
      (document.querySelector("#" + mapDomId) as unknown as HTMLElement).style.cursor = "auto";
    } catch {}
    this.mapInstance.on("click", (event: { latlng: { lng: number; lat: number } }) => {
      const location =
        this.mapType === "TD_MAP" ? transformWGS84ToGCJ02(event.latlng.lng, event.latlng.lat) : [event.latlng.lng, event.latlng.lat];
      this.onMapClick &&
        this.onMapClick({
          mapType: this.mapType,
          lng: location[0],
          lat: location[1],
        });
    });
  }

  public async setCenter(lng: number, lat: number): Promise<void> {
    this.ensureMapInstance();
    lng = Number(lng);
    lat = Number(lat);
    const location = this.mapType === "TD_MAP" ? transformGCJ02ToWGS84(lng, lat) : [lng, lat];
    lng = location[0];
    lat = location[1];
    this.mapInstance.setView([lat, lng], this.mapInstance.getZoom(), { animate: false });
  }
  public async setRealCenter(lng: number, lat: number): Promise<void> {
    this.ensureMapInstance();
    lng = Number(lng);
    lat = Number(lat);
    const location = [lng, lat];
    lng = location[0];
    lat = location[1];
    return new Promise((resolve) => {
      (this.mapInstance as L.Map).flyTo([lat, lng]).once("moveend", () => {
        resolve();
      });
    });
  }
  public async setZoom(zoom: number): Promise<void> {
    this.ensureMapInstance();
    return new Promise((resolve) => {
      this.mapInstance?.setZoom(zoom).once("zoomend", () => {
        resolve();
      });
    });
  }

  public setRotation(rotation: number): void {
    this.ensureMapInstance();
    this.mapInstance?.setBearing(rotation);
  }

  public clearMap(): void {
    this.ensureMapInstance();
    const map = this.mapInstance;
    map.eachLayer(function (layer: L.Layer) {
      // 保留底图（假设底图是 L.TileLayer）
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });
    this.circles = []; // 清空圆形数组
    this.initClusterLayer();
  }

  public destroy(): void {
    this.mapLayer?.getContainer?.()?.style.removeProperty("filter");
    this.mapInstance?.remove();
    this.mapLabelLayer = null;
  }

  // 创建点标记 但不添加到地图上
  public createMarker(options: {
    icon?: string;
    iconSize: [number, number];
    position: { lng: number; lat: number };
    label?: {
      direction: Direction;
      content: string;
      offset: { x: number; y: number };
    };
    content?: string;
  }): L.Marker {
    options.position.lat = Number(options.position.lat);
    options.position.lng = Number(options.position.lng);
    const location =
      this.mapType === "TD_MAP"
        ? transformGCJ02ToWGS84(options.position.lng, options.position.lat)
        : [options.position.lng, options.position.lat];
    options.position.lng = location[0];
    options.position.lat = location[1];
    options.icon = options.icon ?? "https://webapi.amap.com/theme/v1.3/markers/b/mark_bs.png";
    // 默认偏移量为 [0, 0]
    const markIcon = L.icon({
      iconUrl: options.icon,
      iconSize: [options.iconSize[0], options.iconSize[1]], // Size of the icon
      iconAnchor: [options.iconSize[0] / 2, options.iconSize[1] / 2], // 根据 offset 调整 iconAnchor
    });

    const marker = L.marker([options.position.lat, options.position.lng], { icon: markIcon });
    // 如果提供了 label 参数，则创建并绑定 label
    if (options.label) {
      // 将 label 绑定到标记上
      marker.bindTooltip(options.label.content, {
        direction: options.label.direction, // 标签方向
        permanent: true, // 永久显示
        offset: L.point(options.label.offset.x, options.label.offset.y), // 偏移量
      });
    }

    if (options.content) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = options.content;
      tempDiv.style.position = "absolute";
      tempDiv.style.visibility = "hidden";
      document.body.appendChild(tempDiv);
      setTimeout(() => {
        const rect = tempDiv.getBoundingClientRect();
        const { width } = rect;
        const { height } = rect;
        // 移除临时 DOM 元素
        document.body.removeChild(tempDiv);
        // 设置 divIcon 并保留点击区域
        marker.setIcon(
          L.divIcon({
            html: options.content, // 设置 HTML 内容
            iconSize: [width, height], // 动态设置图标大小
            iconAnchor: [width / 2, height / 2], // 动态设置图标锚点
          }),
        );
      }, 0);
    }
    return marker;
  }

  public async addMarker(options: {
    position: { lng: number; lat: number };
    offset?: [number, number];
    icon?: string;
    iconSize?: [number, number];
    title?: string;
    onClick?: (marker: L.Marker) => void;
  }): Promise<L.Marker> {
    this.ensureMapInstance();
    options.position.lat = Number(options.position.lat);
    options.position.lng = Number(options.position.lng);
    options.icon = options.icon ?? "https://webapi.amap.com/theme/v1.3/markers/b/mark_bs.png";
    const { width, height } = await getRemoteImageDimensions(options.icon);
    options.iconSize = options.iconSize ?? [width, height];

    const location =
      this.mapType === "TD_MAP"
        ? transformGCJ02ToWGS84(options.position.lng, options.position.lat)
        : [options.position.lng, options.position.lat];
    options.position.lng = location[0];
    options.position.lat = location[1];
    const markIcon = L.icon({
      iconUrl: options.icon,
      iconSize: [options.iconSize[0], options.iconSize[1]], // Size of the icon
      iconAnchor: [options.iconSize[0] / 2, options.iconSize[1]], // Point of the icon which will correspond to marker's location
      popupAnchor: [0, -options.iconSize[1] * 1.2], // Popup 出现在图标正上方
    });
    const marker = L.marker([options.position.lat, options.position.lng], { icon: markIcon }).addTo(this.mapInstance);
    // 添加点击事件
    marker.on("click", function () {
      options.onClick?.(marker);
    });
    // 保存到标点数组中
    this.markers.push(marker);
    return marker;
  }

  public removeMarker(marker: L.Marker): void {
    this.ensureMapInstance();
    this.mapInstance.removeLayer(marker);
    // 从标点数组中移除
    const index = this.markers.indexOf(marker);
    if (index !== -1) {
      this.markers.splice(index, 1);
    }
  }
  public removeAllMarker(): void {
    const markers = this.markers.slice();
    markers.forEach((marker: L.Marker) => {
      this.removeMarker(marker);
    });
  }
  public registerMapClickEvent(): void {
    // TODO 可以去掉
  }

  public getMapInstance(): L.Map {
    this.ensureMapInstance();
    return this.mapInstance;
  }

  /**
   * 判断业务坐标是否位于当前地图可视范围内。
   * 业务侧统一传入 GCJ02 坐标；当底图为天地图时，本方法会自动转换成 WGS84 后再判断。
   */
  public containsPositionInCurrentView(position: { lng: number; lat: number }): boolean {
    this.ensureMapInstance();
    const lng = Number(position.lng);
    const lat = Number(position.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return false;
    }
    const location = this.mapType === "TD_MAP" ? transformGCJ02ToWGS84(lng, lat) : [lng, lat];
    return this.mapInstance.getBounds().contains(L.latLng(location[1], location[0]));
  }

  /**
   * 在地图上添加圆形
   * @param options 圆形配置选项
   * @returns 返回创建的圆形对象
   */
  public addCircle(options: { center: { lng: number; lat: number }; radius: number }): L.Circle {
    this.ensureMapInstance();
    // 处理坐标转换
    const center = { ...options.center };
    center.lat = Number(center.lat);
    center.lng = Number(center.lng);

    const location = this.mapType === "TD_MAP" ? transformGCJ02ToWGS84(center.lng, center.lat) : [center.lng, center.lat];

    const circle = L.circle([location[1], location[0]], {
      radius: options.radius,
    }).addTo(this.mapInstance);

    // 保存到圆形数组中
    this.circles.push(circle);
    return circle;
  }

  /**
   * 清除地图上所有的圆形
   */
  public clearCircles(): void {
    this.ensureMapInstance();
    // 移除所有圆形
    this.circles.forEach((circle) => {
      if (this.mapInstance) {
        this.mapInstance.removeLayer(circle);
      }
    });
    // 清空数组
    this.circles = [];
  }

  // /**
  //  * 清除地图上所有的标点
  //  */
  // Public clearMarkers (): void {
  //   This.ensureMapInstance()
  //   // 移除所有的标点
  //   This.markers.forEach(marker => {
  //     If (this.mapInstance) {
  //       This.mapInstance.removeLayer(marker)
  //     }
  //   })
  //   // 清空数组
  //   This.markers = []
  // }

  public createdImageLayer(options: {
    bounds: [{ lng: number; lat: number }, { lng: number; lat: number }];
    imageUrl: string;
  }): L.ImageOverlay {
    options.bounds[0].lat = Number(options.bounds[0].lat);
    options.bounds[0].lng = Number(options.bounds[0].lng);
    options.bounds[1].lat = Number(options.bounds[1].lat);
    options.bounds[1].lng = Number(options.bounds[1].lng);
    if (this.mapType === "TD_MAP") {
      const bounds1 = transformGCJ02ToWGS84(options.bounds[0].lng, options.bounds[0].lat);
      const bounds2 = transformGCJ02ToWGS84(options.bounds[1].lng, options.bounds[1].lat);
      options.bounds[0].lat = bounds1[1];
      options.bounds[0].lng = bounds1[0];
      options.bounds[1].lat = bounds2[1];
      options.bounds[1].lng = bounds2[0];
    }
    const bounds: [[number, number], [number, number]] = [
      [options.bounds[0].lat, options.bounds[0].lng],
      [options.bounds[1].lat, options.bounds[1].lng],
    ];
    return L.imageOverlay(options.imageUrl, bounds);
  }
  public addImageLayer(imageLayer: L.ImageOverlay): void {
    this.ensureMapInstance();
    imageLayer.addTo(this.mapInstance);
  }
  public removeImageLayer(imageLayer: L.ImageOverlay): void {
    this.ensureMapInstance();
    this.mapInstance.removeLayer(imageLayer);
  }

  /**
   * 设置地图的最小和最大缩放级别
   * @param minZoom 最小缩放级别
   * @param maxZoom 最大缩放级别
   * @param zooms [minZoom, maxZoom]
   */
  public setZooms(zooms: [number, number]): void {
    this.ensureMapInstance();
    this.mapInstance.setMinZoom(zooms[0]);
    this.mapInstance.setMaxZoom(zooms[1]);
  }

  public setLimitBounds(bounds: [{ lng: number; lat: number }, { lng: number; lat: number }]): void {
    this.ensureMapInstance();
    bounds[0].lat = Number(bounds[0].lat);
    bounds[0].lng = Number(bounds[0].lng);
    bounds[1].lat = Number(bounds[1].lat);
    bounds[1].lng = Number(bounds[1].lng);
    if (this.mapType === "TD_MAP") {
      const bounds1 = transformGCJ02ToWGS84(bounds[0].lng, bounds[0].lat);
      const bounds2 = transformGCJ02ToWGS84(bounds[1].lng, bounds[1].lat);
      bounds[0].lat = bounds1[1];
      bounds[0].lng = bounds1[0];
      bounds[1].lat = bounds2[1];
      bounds[1].lng = bounds2[0];
    }
    const transformBounds: [[number, number], [number, number]] = [
      [bounds[0].lat, bounds[0].lng],
      [bounds[1].lat, bounds[1].lng],
    ];
    this.mapInstance.setMaxBounds(transformBounds);
  }

  public createInfoWindow(options: { content: HTMLElement; autoPan?: boolean }): L.Popup {
    // 创建一个隐藏的容器
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.visibility = "hidden";
    document.body.appendChild(hiddenContainer);

    // 将内容添加到隐藏容器中
    hiddenContainer.appendChild(options.content);

    // 获取内容的宽度
    const contentWidth = options.content.getBoundingClientRect().width;

    // 从文档中移除隐藏容器
    document.body.removeChild(hiddenContainer);

    // 创建 Popup 并设置 minWidth
    return L.popup({
      closeButton: false,
      minWidth: contentWidth, // 动态设置 minWidth
      autoPan: options.autoPan ?? true,
    }).setContent(options.content);
  }

  public openInfoWindow(infoWindow: L.Popup, position: { lng: number; lat: number }): void {
    this.ensureMapInstance();
    position.lat = Number(position.lat);
    position.lng = Number(position.lng);
    if (this.mapType === "TD_MAP") {
      const location = transformGCJ02ToWGS84(position.lng, position.lat);
      position.lat = location[1];
      position.lng = location[0];
    }
    infoWindow.setLatLng([position.lat, position.lng]);
    infoWindow.openOn(this.mapInstance);
    setTimeout(() => {
      infoWindow.update();
    }, 0);
  }

  public createPolyline(positions: { lng: number; lat: number }[], color?: string, weight?: number): L.Polyline {
    this.ensureMapInstance();
    positions.forEach((position) => {
      position.lat = Number(position.lat);
      position.lng = Number(position.lng);
      if (this.mapType === "TD_MAP") {
        const location = transformGCJ02ToWGS84(position.lng, position.lat);
        position.lat = location[1];
        position.lng = location[0];
      }
    });
    const polyline = L.polyline(positions, { color: color ?? "#1890ff", weight: weight ?? 1 });
    polyline.addTo(this.mapInstance);
    return polyline as L.Polyline;
  }

  public createPolygon(positions: { lng: number; lat: number }[], color?: string, weight?: number, fillColor?: string): L.Polygon {
    this.ensureMapInstance();
    positions.forEach((position) => {
      position.lat = Number(position.lat);
      position.lng = Number(position.lng);
      if (this.mapType === "TD_MAP") {
        const location = transformGCJ02ToWGS84(position.lng, position.lat);
        position.lat = location[1];
        position.lng = location[0];
      }
    });
    const polygon = L.polygon(positions, { color: color ?? "#1890ff", weight: weight ?? 1, fillColor });
    polygon.addTo(this.mapInstance);
    return polygon as L.Polygon;
  }

  /**
   * 创建并添加 Leaflet 热力图图层。
   * @param points 热力点数组，lng/lat 为业务坐标；intensity 为热力强度，未传时默认按 1 处理。
   * @param options 热力图配置，支持半径、模糊、最大缩放、最小透明度和颜色渐变等 L.heatLayer 参数。
   * @returns 返回创建出的热力图图层，业务侧可保存后调用 removeHeatLayer 移除。
   *
   * 坐标说明：业务侧统一传入 GCJ02 坐标；当底图为天地图时，本方法会自动转换成 WGS84 后再渲染。
   * 清理说明：本方法会记录创建的热力图图层，可通过 clearHeatLayers 一次性清空当前地图实例上的热力图。
   */
  public createHeatLayer(points: HeatLayerPoint[], options?: HeatLayerOptions): L.HeatLayer {
    this.ensureMapInstance();
    const heatPoints = points
      .map((point) => {
        const lng = Number(point.lng);
        const lat = Number(point.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return null;
        }
        const location = this.mapType === "TD_MAP" ? transformGCJ02ToWGS84(lng, lat) : [lng, lat];
        const intensity = Number(point.intensity ?? 1);
        return [location[1], location[0], Number.isFinite(intensity) ? intensity : 1] as [number, number, number];
      })
      .filter((point): point is [number, number, number] => point !== null);
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 60, //覆盖半径，每个点的“热度”影响范围（单位：像素），数值越大，热点区域越大、越平滑
      blur: 12, //边缘模糊度，控制热力点边缘的柔和程度，数值越大，边缘过渡越自然
      maxZoom: 18, //最大渲染级别，当地图缩放级别超过此值时，热力图不再缩放调整
      minOpacity: 0.1, //最低不透明度，热力图边缘区域的最低透明程度
      gradient: {
        0.0: "#e0f2fe",
        0.05: "#facc15", // 极低密度就变黄
        0.2: "#fb923c",
        0.5: "#f87171",
        1.0: "#fb7185",
      }, //颜色渐变，用不同颜色表示数据强度的高低，是最核心的视觉元素
      ...options,
    });
    heatLayer.addTo(this.mapInstance);
    this.heatLayers.push(heatLayer);
    return heatLayer;
  }

  /**
   * 移除指定热力图图层。
   * @param layer createHeatLayer 返回的热力图图层实例。
   *
   * 说明：移除时会同步从内部记录中删除，避免后续 clearHeatLayers 重复处理同一图层。
   */
  public removeHeatLayer(layer: L.HeatLayer): void {
    this.ensureMapInstance();
    try {
      this.mapInstance.removeLayer(layer);
    } catch {}
    const index = this.heatLayers.indexOf(layer);
    if (index !== -1) {
      this.heatLayers.splice(index, 1);
    }
  }

  /**
   * 清空当前地图实例创建的全部热力图图层。
   *
   * 使用场景：业务切换热力数据、关闭热力图开关或销毁页面前调用，确保地图上不残留热力 canvas。
   */
  public clearHeatLayers(): void {
    this.ensureMapInstance();
    const layers = this.heatLayers.slice();
    layers.forEach((layer) => {
      try {
        this.mapInstance.removeLayer(layer);
      } catch {}
    });
    this.heatLayers = [];
  }

  public drawLayerByGeoJson(geoJson: NonNullable<GeoJSONParameters[0]>, options?: NonNullable<GeoJSONParameters[1]>): L.GeoJSON {
    this.ensureMapInstance();
    const layer = L.geoJSON(geoJson, options);
    layer.addTo(this.mapInstance);
    return layer;
  }

  public recordMapStatus(): typeof this.mapStatus {
    this.ensureMapInstance();
    const layers: unknown[] = [];
    this.mapInstance.eachLayer(function (layer: unknown) {
      // 保留底图（假设底图是 L.TileLayer）
      if (!(layer instanceof L.TileLayer)) {
        layers.push(layer);
      }
    });
    this.mapStatus = {
      center: this.mapInstance.getCenter(),
      zoom: this.mapInstance.getZoom(),
      layers,
    };
    return this.mapStatus;
  }

  public recoverMapStatus(): void {
    this.ensureMapInstance();
    if (this.mapStatus) {
      const { lat, lng } = this.mapStatus.center;
      (this.mapInstance as L.Map).flyTo([lat, lng], this.mapStatus.zoom);
      this.mapStatus.layers.forEach((layer) => {
        try {
          // @ts-expect-error
          layer.addTo(this.mapInstance);
        } catch {}
      });
    }
    this.mapStatus = null;
  }

  private markerClusterGroup: L.MarkerClusterGroup | null = null; // 存储点聚合图层

  /**
   * 初始化点聚合图层
   * @param options 聚合配置选项
   */
  public initClusterLayer(options?: {
    maxClusterRadius?: number; // 聚合半径，默认80
    disableClusteringAtZoom?: number; // 禁用聚合的缩放级别，小于该级别时聚合，大于该级别时不聚合
    spiderfyOnMaxZoom?: boolean; // 当点击聚合点时是否展开显示所有点
  }): void {
    this.ensureMapInstance();
    // 创建点聚合图层
    this.markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: options?.maxClusterRadius ?? 50,
      disableClusteringAtZoom: options?.disableClusteringAtZoom ?? 18,
      spiderfyOnMaxZoom: options?.spiderfyOnMaxZoom ?? true,
      // 自定义聚合点样式
      iconCreateFunction: (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        let size = 40;
        let className = "marker-cluster-small";

        if (count > 50) {
          size = 60;
          className = "marker-cluster-large";
        } else if (count > 10) {
          size = 50;
          className = "marker-cluster-medium";
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: L.point(size, size),
        });
      },
    });

    // 将聚合图层添加到地图
    this.mapInstance.addLayer(this.markerClusterGroup);
  }

  /**
   * 添加标记到聚合图层
   * @param marker 要添加的标记
   */
  public addMarkerToCluster(marker: L.Marker): void {
    if (!this.markerClusterGroup) {
      this.initClusterLayer();
    }
    this.markerClusterGroup?.addLayer(marker);
    // 同时添加到标记数组中，以便统一管理
    this.markers.push(marker);
  }

  /**
   * 创建并添加聚合标记点
   * @param options 标记点选项
   * @returns 创建的标记点
   */
  public async addClusteredMarker(options: {
    position: { lng: number; lat: number };
    offset?: [number, number];
    icon?: string;
    iconSize?: [number, number];
    title?: string;
    onClick?: (marker: L.Marker) => void;
  }): Promise<L.Marker> {
    this.ensureMapInstance();
    options.position.lat = Number(options.position.lat);
    options.position.lng = Number(options.position.lng);
    options.icon = options.icon ?? "https://webapi.amap.com/theme/v1.3/markers/b/mark_bs.png";
    const { width, height } = await getRemoteImageDimensions(options.icon);
    options.iconSize = options.iconSize ?? [width, height];

    const location =
      this.mapType === "TD_MAP"
        ? transformGCJ02ToWGS84(options.position.lng, options.position.lat)
        : [options.position.lng, options.position.lat];
    options.position.lng = location[0];
    options.position.lat = location[1];
    const markIcon = L.icon({
      iconUrl: options.icon,
      iconSize: [options.iconSize[0], options.iconSize[1]], // Size of the icon
      iconAnchor: [options.iconSize[0] / 2, options.iconSize[1]], // Point of the icon which will correspond to marker's location
      popupAnchor: [0, -options.iconSize[1] * 1.2], // Popup 出现在图标正上方
    });

    // Const marker = L.marker([options.position.lat, options.position.lng], { icon: markIcon });
    const marker = L.marker([options.position.lat, options.position.lng], { icon: markIcon });

    // 添加点击事件
    marker.on("click", function () {
      options.onClick?.(marker);
    });

    // 添加到聚合图层
    this.addMarkerToCluster(marker);

    return marker;
  }

  /**
   * 清除所有聚合标记点
   */
  public clearClusteredMarkers(): void {
    if (this.markerClusterGroup) {
      this.markerClusterGroup.clearLayers();
    }
    // 同时清空标记数组
    this.markers = [];
  }

  /**
   * 删除聚合图层中的所有点位，但保留聚合图层本身
   */
  public removeAllClusteredMarkers(): void {
    if (this.markerClusterGroup) {
      // 获取聚合图层中的所有标记
      const clusteredMarkers = this.markerClusterGroup.getLayers() as L.Marker[];

      // 逐个从聚合图层中移除标记
      clusteredMarkers.forEach((marker) => {
        this.markerClusterGroup?.removeLayer(marker);

        // 同时从标记数组中移除
        const index = this.markers.indexOf(marker);
        if (index !== -1) {
          this.markers.splice(index, 1);
        }
      });
    }
  }

  /**
   * 修改原有的clearMarkers方法，同时清除聚合图层
   */
  public clearMarkers(): void {
    this.ensureMapInstance();
    // 移除所有的标点
    this.markers.forEach((marker) => {
      if (this.mapInstance) {
        this.mapInstance.removeLayer(marker);
      }
    });
    // 清空聚合图层
    if (this.markerClusterGroup) {
      this.markerClusterGroup.clearLayers();
    }
    // 清空数组
    this.markers = [];
  }
}
