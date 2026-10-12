import AMapLoader from "@amap/amap-jsapi-loader";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const TILE_GD = "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}";

type MapKeys = { webKey: string; securityJsCode?: string };
type LeafletMap = ReturnType<typeof L.map>;
type LeafletCircleMarker = ReturnType<typeof L.circleMarker>;
type LeafletCircle = ReturnType<typeof L.circle>;

export class InspectMapRuntime {
  public onMapClick: ((event: { lng: number; lat: number }) => void) | null = null;

  private map: LeafletMap | null = null;
  private marker: LeafletCircleMarker | null = null;
  private circle: LeafletCircle | null = null;
  private amapLoaded = false;
  private keys: MapKeys | null = null;

  public configureKeys(keys: MapKeys | null): void {
    this.keys = keys;
  }

  public async renderMap(domId: string, center: { lng: number; lat: number }, zoom: number): Promise<void> {
    const el = document.getElementById(domId);
    if (!el) throw new Error("地图容器不存在");
    const map = L.map(domId, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.5,
    }).setView([center.lat, center.lng], zoom);
    this.map = map;
    L.tileLayer(TILE_GD, { maxZoom: 18, minZoom: 3 }).addTo(map);
    map.on("click", (event: { latlng: { lng: number; lat: number } }) => {
      this.onMapClick?.({ lng: event.latlng.lng, lat: event.latlng.lat });
    });
  }

  public destroy(): void {
    this.clearMarkers();
    this.clearCircles();
    this.map?.remove();
    this.map = null;
    this.onMapClick = null;
  }

  public invalidateSize(): void {
    this.map?.invalidateSize(true);
  }

  public async setCenter(lng: number, lat: number): Promise<void> {
    if (!this.map) return;
    await new Promise<void>((resolve) => {
      this.map!.flyTo([lat, lng]).once("moveend", () => resolve());
    });
  }

  public async setZoom(zoom: number): Promise<void> {
    if (!this.map) return;
    this.map.setZoom(zoom, { animate: false });
  }

  public setRotation(degrees: number): void {
    if (!this.map) return;
    const mapWithBearing = this.map as LeafletMap & { setBearing?: (value: number) => void };
    if (typeof mapWithBearing.setBearing === "function") {
      mapWithBearing.setBearing(degrees);
      return;
    }
    const pane = this.map.getPane("mapPane") as HTMLElement | undefined;
    if (pane) {
      pane.style.transformOrigin = "center center";
      pane.style.rotate = `${degrees}deg`;
    }
  }

  public clearMarkers(): void {
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  public clearCircles(): void {
    if (this.circle && this.map) {
      this.map.removeLayer(this.circle);
      this.circle = null;
    }
  }

  public addMarker(position: { lng: number; lat: number }): void {
    if (!this.map) return;
    this.clearMarkers();
    this.marker = L.circleMarker([position.lat, position.lng], {
      radius: 8,
      color: "#1d66ff",
      weight: 2,
      fillColor: "#1d66ff",
      fillOpacity: 0.85,
    }).addTo(this.map);
  }

  public addCircle(options: { center: { lng: number; lat: number }; radius: number }): void {
    if (!this.map || options.radius <= 0) return;
    this.clearCircles();
    this.circle = L.circle([options.center.lat, options.center.lng], {
      radius: options.radius,
      color: "#1d66ff",
      weight: 1,
      fillColor: "#1d66ff",
      fillOpacity: 0.12,
    }).addTo(this.map);
  }

  private async ensureAmap(): Promise<void> {
    if (this.amapLoaded) return;
    if (!this.keys?.webKey) throw new Error("未获取到地图配置");
    if (this.keys.securityJsCode) {
      const globalScope = window as unknown as Record<string, unknown>;
      globalScope["_AMapSecurityConfig"] = {
        securityJsCode: this.keys.securityJsCode,
      };
    }
    const AMap = await AMapLoader.load({
      key: this.keys.webKey,
      version: "2.0",
      plugins: ["AMap.Geocoder"],
    });
    (window as unknown as { AMap: unknown }).AMap = AMap;
    this.amapLoaded = true;
  }

  public async getAddressByLngLat(lng: number, lat: number): Promise<{ address: string }> {
    await this.ensureAmap();
    const AMap = (
      window as unknown as {
        AMap: {
          Geocoder: new () => {
            getAddress: (
              location: [number, number],
              callback: (status: string, result: { regeocode?: { formattedAddress?: string } }) => void,
            ) => void;
          };
        };
      }
    ).AMap;
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder();
      geocoder.getAddress([lng, lat], (status, result) => {
        if (status === "complete" && result.regeocode?.formattedAddress) {
          resolve({ address: result.regeocode.formattedAddress });
          return;
        }
        reject(new Error("高德获取地址失败"));
      });
    });
  }

  public async getLngLatByAddress(address: string): Promise<{ lng: number; lat: number }> {
    await this.ensureAmap();
    const AMap = (
      window as unknown as {
        AMap: {
          Geocoder: new () => {
            getLocation: (
              keyword: string,
              callback: (status: string, result: { info?: string; geocodes?: Array<{ location: { lng: number; lat: number } }> }) => void,
            ) => void;
          };
        };
      }
    ).AMap;
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder();
      geocoder.getLocation(address, (status, result) => {
        if (status === "complete" && result.info === "OK" && result.geocodes?.[0]) {
          resolve({ lng: result.geocodes[0].location.lng, lat: result.geocodes[0].location.lat });
          return;
        }
        reject(new Error("获取地址失败"));
      });
    });
  }
}
