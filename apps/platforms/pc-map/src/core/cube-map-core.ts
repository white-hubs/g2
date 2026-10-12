/// <reference path="../map.d.ts" />

import AMapLoader from "@amap/amap-jsapi-loader";
import { transformGCJ02ToWGS84, transformWGS84ToGCJ02 } from "@isvend/coord-transform";
import type L from "leaflet";

import type { MapConfig, MapType } from "./type";

/** 地图核心类 主要实现一些强业务的操作 如：字典服务查询 经纬度查询 逆地址解析等 */
export class CubeMapCore {
  public onMapClick: ((event: { mapType: MapType; lng: number; lat: number }) => void) | null = null;

  protected mapType: MapType = "gdMap";
  protected mapInstance: L.Map | null = null;
  protected mapLoaded = false;
  protected mapConfig: MapConfig | null = null;
  private readonly configuredMap?: MapConfig;

  public constructor(configuredMap?: MapConfig) {
    this.configuredMap = configuredMap;
  }

  public async getAddressByLntLat(
    lng: number,
    lat: number,
  ): Promise<{
    address: string;
  }> {
    await this.mapLoader();
    if (this.mapType === "gdMap") {
      if (!window.AMap) {
        throw new Error("高德地图未配置，无法解析地址");
      }
      return new Promise((resolve, reject) => {
        window.AMap.plugin(["AMap.Geocoder"], () => {
          const geocoder = new window.AMap.Geocoder({ city: "全国" });
          geocoder.getAddress([lng, lat], function (status: string, result: { regeocode: { formattedAddress: any } }) {
            if (status === "complete" && result.regeocode) {
              const address = result.regeocode.formattedAddress;
              resolve({ address });
            } else {
              reject(new Error("高德获取地址失败"));
            }
          });
        });
      });
    } else {
      if (!this.mapConfig?.webKey?.trim()) {
        throw new Error("天地图未配置，无法解析地址");
      }
      // 天地图逆地理使用 WGS84；Leaflet/业务侧为 GCJ02，与 getLntLatByAddress 输出一致，须先转为 WGS84
      const [wgsLng, wgsLat] = transformGCJ02ToWGS84(lng, lat);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://api.tianditu.gov.cn/apiserver/ajaxproxy?proxyReqUrl=" +
          encodeURIComponent(
            `http://api.tianditu.gov.cn/geocoder?postStr={"lon":"${wgsLng}","lat":"${wgsLat}"}&type=geocode&tk=${this.mapConfig?.webKey}`,
          );
        script.onload = (): void => {
          document.body.removeChild(script);
          try {
            resolve({ address: window.tdt_loadResult?.result.formatted_address });
          } catch {
            reject(new Error("获取地址失败"));
          }
        };
        document.body.appendChild(script);
      });
    }
  }

  public async getLntLatByAddress(address: string): Promise<{ lng: number; lat: number }> {
    await this.mapLoader();
    if (this.mapType === "gdMap") {
      if (!window.AMap) {
        throw new Error("高德地图未配置，无法解析地址");
      }
      return new Promise((resolve, reject) => {
        window.AMap.plugin(["AMap.Geocoder"], () => {
          const geocoder = new window.AMap.Geocoder({ city: "全国" });
          geocoder.getLocation(
            address,
            function (status: string, result: { info: string; geocodes: { location: { lat: number; lng: number } }[] }) {
              if (status === "complete" && result.info === "OK") {
                const lngLat = {
                  lng: result.geocodes[0].location.lng,
                  lat: result.geocodes[0].location.lat,
                };
                resolve(lngLat);
              } else {
                reject(new Error("获取地址失败"));
              }
            },
          );
        });
      });
    } else {
      if (!this.mapConfig?.webKey?.trim()) {
        throw new Error("天地图未配置，无法解析地址");
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://api.tianditu.gov.cn/apiserver/ajaxproxy?proxyReqUrl=" +
          encodeURIComponent(`http://api.tianditu.gov.cn/geocoder?ds={"keyWord":"${address}"}&type=geocode&tk=${this.mapConfig?.webKey}`);
        script.onload = (): void => {
          document.body.removeChild(script);
          try {
            const location = window.tdt_loadResult?.location;
            const locationGCJ = transformWGS84ToGCJ02(Number(location.lon), Number(location.lat));
            resolve({
              lng: locationGCJ[0],
              lat: locationGCJ[1],
            });
          } catch {
            reject(new Error("获取地址失败"));
          }
        };
        document.body.appendChild(script);
      });
    }
  }

  /** 通过浏览器获取经纬度 */
  public async getLntLatFromBrowser(): Promise<{ lng: number; lat: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("当前浏览器不支持地理定位"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            lng: longitude,
            lat: latitude,
            accuracy,
          });
        },
        (error) => {
          switch (error.code) {
            case 0:
              reject(new Error("位置信息获取失败"));
              break;
            case 1:
              reject(new Error("用户拒绝请求地理定位"));
              break;
            case 2:
              reject(new Error("浏览器哦无法获取当前位置"));
              break;
            case 3:
              reject(new Error("请求超时，请重试"));
              break;
            default:
              reject(new Error("位置信息获取失败"));
              break;
          }
        },
        {
          timeout: 30000,
          enableHighAccuracy: true,
          maximumAge: 0,
        },
      );
    });
  }

  /** 获取地图配置（由宿主传入字典解析结果；未传时走 Leaflet 高德瓦片，不强制 JSAPI key） */
  public async getMapConfig(): Promise<MapConfig> {
    if (this.mapConfig) {
      return this.mapConfig;
    }
    this.mapConfig = this.configuredMap ?? {};
    const configuredType = this.mapConfig.mapType;
    if (configuredType === "TD_MAP" || configuredType === "gdMap") {
      this.mapType = configuredType;
    } else if (configuredType === "t-map") {
      this.mapType = "TD_MAP";
    } else {
      this.mapType = "gdMap";
    }
    return this.mapConfig;
  }

  public async mapLoader(): Promise<void> {
    if (this.mapLoaded) {
      return;
    }
    const config = await this.getMapConfig();
    if (this.mapType === "gdMap") {
      // Leaflet 底图不依赖高德 JSAPI；无 webKey 时跳过，避免空 key 导致整图初始化失败。
      // 逆地理等能力需宿主传入 THIRD_SERVICE/gdMap 配置。
      if (!config.webKey?.trim()) {
        this.mapLoaded = true;
        return;
      }
      if (config.securityJsCode) {
        window._AMapSecurityConfig = {
          securityJsCode: config.securityJsCode,
        };
      }
      if (!window.AMap) {
        window.AMap = await AMapLoader.load({
          key: config.webKey,
          version: "2.0",
          plugins: [
            "AMap.Geocoder",
            "AMap.MouseTool",
            "AMap.ControlBar",
            "AMap.Walking",
            "AMap.Geolocation",
            "AMap.IndexCluster",
            "AMap.MarkerCluster",
          ],
        });
      } else {
        await new Promise<void>((resolve) => {
          window.AMap.plugin(["AMap.Geocoder"], () => resolve());
        });
      }
    } else if (!window.T) {
      if (!config.webKey?.trim()) {
        this.mapLoaded = true;
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${config.webKey}`;
        script.onload = (): void => {
          resolve();
        };
        script.onerror = (): void => {
          reject(new Error("天地图脚本加载失败"));
        };
        document.body.appendChild(script);
      });
    }
    this.mapLoaded = true;
  }

  public getMapType(): MapType {
    return this.mapType;
  }

  public getMapInfo(): {
    center: { lng: number; lat: number };
    zoom: number;
    rotation: number;
  } {
    this.ensureMapInstance();
    const center = this.mapInstance.getCenter();
    if (this.mapType === "TD_MAP") {
      const location = transformWGS84ToGCJ02(center.lng, center.lat);
      center.lng = location[0];
      center.lat = location[1];
    }
    return {
      center: {
        lng: center.lng,
        lat: center.lat,
      },
      zoom: this.mapInstance.getZoom(),
      rotation: this.mapInstance.getBearing(),
    };
  }

  /** 检查地图实例是否存在，否则抛出异常 */
  protected ensureMapInstance(): asserts this is this & { mapInstance: L.Map } {
    if (!this.mapInstance) {
      throw new Error("地图实例不存在");
    }
  }
}
