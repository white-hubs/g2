import type { InteractiveMap as CubeMapLeaflet } from "@g2-platform/pc-map";
import { Spin } from "@g2-platform/pc-ui";
import { transformGCJ02ToWGS84 } from "@isvend/coord-transform";
import { computed, defineComponent, nextTick, onBeforeUnmount, ref, watch, type PropType } from "vue";

import { EmptyBlock } from "./components";
import { type DispatchMapConfig, type MonitorPersonnelLocation } from "./monitor-dispatch";
import { getFumigationContext } from "@/domain-context";

let mapDomSeq = 0;

type MarkerLayer = {
  addTo: (map: unknown) => void;
  remove?: () => void;
  bindPopup?: (content: string) => void;
};

type LeafletMapLike = {
  invalidateSize: (animate?: boolean) => void;
  setView: (center: [number, number], zoom: number, options?: { animate?: boolean }) => void;
  setZoom: (zoom: number, options?: { animate?: boolean }) => void;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
  fire: (type: string) => void;
  removeLayer?: (layer: unknown) => void;
};

const isValidCoord = (lng: unknown, lat: unknown): boolean => {
  const lngNum = Number(lng);
  const latNum = Number(lat);
  return Number.isFinite(lngNum) && Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
};

export const UwbMapPanel = defineComponent({
  name: "UwbMapPanel",
  props: {
    mapConfig: {
      type: Object as PropType<DispatchMapConfig | null>,
      default: null,
    },
    personnel: {
      type: Array as PropType<MonitorPersonnelLocation[]>,
      default: () => [],
    },
    areaLabel: {
      type: String,
      default: "作业区域",
    },
  },
  setup: (props) => {
    const mapDomId = `fumigation-monitor-map-${++mapDomSeq}`;
    const wrapperRef = ref<HTMLElement>();
    const mapReady = ref(false);
    const mapLoading = ref(false);
    const mapError = ref("");
    const mapRef = ref<CubeMapLeaflet | null>(null);
    const layers = ref<MarkerLayer[]>([]);
    const resizeTimers: number[] = [];
    let resizeObserver: ResizeObserver | undefined;
    let initStarted = false;

    const mapCenter = computed(() => {
      const center = props.mapConfig?.center;
      if (center == null || !isValidCoord(center.lng, center.lat)) {
        return null;
      }
      return { lng: Number(center.lng), lat: Number(center.lat) };
    });

    const canInitMap = computed(() => mapCenter.value != null);

    const positionedPersonnel = computed(() => props.personnel.filter((item) => isValidCoord(item.lng, item.lat)));

    const getMap = (): LeafletMapLike | null => {
      try {
        return mapRef.value?.getMapInstance() as unknown as LeafletMapLike;
      } catch {
        return null;
      }
    };

    const toMapLatLng = (lng: number, lat: number): [number, number] => {
      const plugin = mapRef.value;
      if (plugin?.getMapType() === "TD_MAP") {
        const location = transformGCJ02ToWGS84(lng, lat);
        return [location[1], location[0]];
      }
      return [lat, lng];
    };

    const setMapViewInstant = (lng: number, lat: number, zoom: number): void => {
      const map = getMap();
      if (map == null) {
        return;
      }
      map.setView(toMapLatLng(lng, lat), zoom, { animate: false });
    };

    const clearLayers = (): void => {
      const map = getMap();
      layers.value.forEach((layer) => {
        try {
          map?.removeLayer?.(layer as never);
        } catch {
          layer.remove?.();
        }
      });
      layers.value = [];
      mapRef.value?.removeAllMarker();
      mapRef.value?.clearCircles();
    };

    const addMarker = (lng: number, lat: number, content: string, popupContent?: string): void => {
      const plugin = mapRef.value;
      if (plugin == null || !isValidCoord(lng, lat)) {
        return;
      }
      const marker = plugin.createMarker({
        position: { lng, lat },
        iconSize: [86, 28],
        content,
      }) as MarkerLayer;
      marker.addTo(plugin.getMapInstance());
      if (popupContent != null && popupContent !== "") {
        marker.bindPopup?.(popupContent);
      }
      layers.value.push(marker);
    };

    const applyMapView = (): void => {
      const center = mapCenter.value;
      const map = getMap();
      if (center == null || map == null) {
        return;
      }
      map.invalidateSize(false);
      const points = positionedPersonnel.value.map((person) => toMapLatLng(Number(person.lng), Number(person.lat)));
      if (points.length === 0) {
        setMapViewInstant(center.lng, center.lat, 16);
        return;
      }
      if (points.length === 1) {
        const person = positionedPersonnel.value[0];
        if (person != null) {
          setMapViewInstant(Number(person.lng), Number(person.lat), 17);
        }
        return;
      }
      const L = (window as unknown as { L?: { latLngBounds: (points: [number, number][]) => unknown } }).L;
      if (L == null) {
        setMapViewInstant(center.lng, center.lat, 16);
        return;
      }
      try {
        map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17, animate: false });
      } catch {
        setMapViewInstant(center.lng, center.lat, 16);
      }
    };

    const refreshMapSize = (): void => {
      try {
        getMap()?.invalidateSize(false);
        getMap()?.fire("resize");
      } catch {
        // ignore resize errors during teardown
      }
    };

    const scheduleMapResize = (): void => {
      while (resizeTimers.length > 0) {
        const timer = resizeTimers.pop();
        if (timer != null) {
          window.clearTimeout(timer);
        }
      }
      [0, 80, 240].forEach((delay) => {
        const timer = window.setTimeout(() => {
          window.requestAnimationFrame(refreshMapSize);
        }, delay);
        resizeTimers.push(timer);
      });
    };

    const renderLayers = (): void => {
      const plugin = mapRef.value;
      const center = mapCenter.value;
      if (plugin == null || !mapReady.value || center == null) {
        return;
      }
      try {
        clearLayers();
        const radius = props.mapConfig?.radius;
        if (radius != null && radius > 0) {
          plugin.addCircle({ center, radius });
        }
        for (const person of positionedPersonnel.value) {
          addMarker(
            Number(person.lng),
            Number(person.lat),
            `<div class="fumigation-person-marker">${person.name}</div>`,
            `<strong>${person.name}</strong>`,
          );
        }
        applyMapView();
      } catch (error) {
        mapError.value = (error as Error).message || "GIS 图层渲染失败";
      }
    };

    const initMap = async (): Promise<void> => {
      const center = mapCenter.value;
      if (center == null || initStarted || mapReady.value) {
        return;
      }
      initStarted = true;
      mapLoading.value = true;
      mapError.value = "";
      try {
        await nextTick();
        const { InteractiveMap } = await getFumigationContext().loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
        const plugin = new InteractiveMap();
        mapRef.value = plugin;
        await plugin.renderMap(mapDomId, {
          center,
          zoomControl: true,
        });
        mapReady.value = true;
        applyMapView();
        renderLayers();
        if (wrapperRef.value != null) {
          resizeObserver = new ResizeObserver(() => {
            scheduleMapResize();
          });
          resizeObserver.observe(wrapperRef.value);
        }
        scheduleMapResize();
      } catch (error) {
        initStarted = false;
        mapError.value = (error as Error).message || "GIS 地图加载失败";
      } finally {
        mapLoading.value = false;
      }
    };

    watch(
      canInitMap,
      (ready) => {
        if (ready) {
          void initMap();
        }
      },
      { immediate: true },
    );

    watch(
      () => [props.personnel, props.mapConfig],
      () => {
        if (!mapReady.value) {
          return;
        }
        renderLayers();
      },
      { deep: true },
    );

    onBeforeUnmount(() => {
      while (resizeTimers.length > 0) {
        const timer = resizeTimers.pop();
        if (timer != null) {
          window.clearTimeout(timer);
        }
      }
      resizeObserver?.disconnect();
      clearLayers();
      mapRef.value?.destroy();
      mapRef.value = null;
      mapReady.value = false;
      initStarted = false;
    });

    return (): JSX.Element => (
      <div ref={wrapperRef} class="fumigation-map">
        <div id={mapDomId} class="fumigation-map-canvas" />
        <div class="fumigation-map-label">{props.areaLabel}</div>
        {!canInitMap.value && mapError.value === "" ? (
          <div class="fumigation-map-status">
            <Spin tip="地图配置加载中" />
          </div>
        ) : null}
        {canInitMap.value && mapLoading.value ? (
          <div class="fumigation-map-status">
            <Spin tip="GIS 地图加载中" />
          </div>
        ) : null}
        {mapError.value !== "" ? (
          <div class="fumigation-map-empty">
            <EmptyBlock text={mapError.value} />
          </div>
        ) : null}
        {mapReady.value && positionedPersonnel.value.length === 0 && mapError.value === "" ? (
          <div class="fumigation-map-hint">暂无人员 GPS 定位，已展示作业区域地图</div>
        ) : null}
      </div>
    );
  },
});
