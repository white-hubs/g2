import type { InteractiveMap, MapConfig } from "@g2-platform/pc-map";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import type { Circle, Icon, Marker, Path, Polygon, Polyline } from "leaflet";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import { getDispatchMapCenter } from "@/api/dispatch-map-config";
import { resolveInteractiveMapConfig } from "@/api/map-service-config";
import { RISK_LEVEL_LABEL } from "@/constants";
import { Button, Space, Spin, message } from "@/pc-ui-runtime";
import type { GeoPoint, PolygonGeo, RiskLevel, ZoneVO } from "@/types/risk";

import styles from "./risk-gis-map-editor.module.less";

const ZONE_LEVEL_STYLES: Record<RiskLevel, { stroke: string; fill: string }> = {
  MAJOR: { stroke: "#ff4d4f", fill: "#fff1f0" },
  SIGNIFICANT: { stroke: "#fa8c16", fill: "#fff7e6" },
  GENERAL: { stroke: "#faad14", fill: "#fffbe6" },
  LOW: { stroke: "#1890ff", fill: "#e6f7ff" },
};

const DEFAULT_CIRCLE_RADIUS = 100;

const UNIT_MARKER_ICON = {
  normal: {
    url: "https://webapi.amap.com/theme/v1.3/markers/b/mark_bs.png",
    size: [19, 31] as [number, number],
  },
  active: {
    url: "https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png",
    size: [24, 34] as [number, number],
  },
};

function getLeafletIcon(active: boolean): Icon {
  const L = (window as unknown as { L: typeof import("leaflet") }).L;
  const cfg = active ? UNIT_MARKER_ICON.active : UNIT_MARKER_ICON.normal;
  return L.icon({
    iconUrl: cfg.url,
    iconSize: cfg.size,
    iconAnchor: [cfg.size[0] / 2, cfg.size[1]],
    popupAnchor: [0, -cfg.size[1] * 1.2],
  });
}

export type GisEditorMode = "point" | "polygon" | "readonly";

export interface GisOverlayUnit {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  location?: GeoPoint;
  riskLevel?: RiskLevel;
  inherentRiskLevel?: RiskLevel;
  controlRiskLevel?: RiskLevel;
  unitCount: number;
  coordinateText: string;
}

let mapSeq = 0;

function clonePoints(points: GeoPoint[]): GeoPoint[] {
  return points.map((p) => ({ lng: p.lng, lat: p.lat, address: p.address }));
}

function isCircleGeo(geo?: PolygonGeo): boolean {
  if (!geo?.points?.length) return false;
  return geo.shape === "circle" || (geo.points.length === 1 && geo.radius != null);
}

function isNearPoint(a: GeoPoint, b: GeoPoint, threshold = 0.00015): boolean {
  return Math.abs(a.lng - b.lng) <= threshold && Math.abs(a.lat - b.lat) <= threshold;
}

function buildPolygonFromPoints(points: GeoPoint[]): PolygonGeo {
  const normalized = clonePoints(points);
  return {
    shape: "polygon",
    points: normalized,
    description: normalized.map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join("；"),
  };
}

function polygonsEqual(a?: PolygonGeo, b?: PolygonGeo): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.shape !== b.shape || a.radius !== b.radius) return false;
  const left = a.points ?? [];
  const right = b.points ?? [];
  if (left.length !== right.length) return false;
  return left.every((point, index) => {
    const other = right[index];
    return Math.abs(point.lng - other.lng) < 1e-8 && Math.abs(point.lat - other.lat) < 1e-8;
  });
}

function riskLevelText(level?: RiskLevel): string {
  return level ? RISK_LEVEL_LABEL[level] : "未评估";
}

export type GisDrawingSubmitValidation = { complete: true; polygon?: PolygonGeo } | { complete: false; message: string };

export const RiskGisMapEditor = defineComponent({
  props: {
    mode: { type: String as PropType<GisEditorMode>, default: "point" },
    height: { type: Number, default: 320 },
    value: { type: Object as PropType<{ point?: GeoPoint; polygon?: PolygonGeo }>, default: () => ({}) },
    modelValue: { type: Object as PropType<{ point?: GeoPoint; polygon?: PolygonGeo }>, default: undefined },
    overlayZones: { type: Array as PropType<ZoneVO[]>, default: () => [] },
    overlayUnits: { type: Array as PropType<GisOverlayUnit[]>, default: () => [] },
    highlightedUnitId: { type: String, default: "" },
    /** 父级 loading/submitting 导致布局变化时触发地图重绘，不会清空已绘制区域 */
    busy: { type: Boolean, default: false },
  },
  emits: ["change", "update:modelValue", "unitClick", "unitInventoryClick", "zoneClick"],
  setup(props, { emit, expose }) {
    const loading = ref(true);
    const mapReady = ref(false);
    const pendingPoints = ref<GeoPoint[]>([]);
    const committedPolygon = ref<PolygonGeo | undefined>(props.modelValue?.polygon ?? props.value.polygon);
    const mapEl = ref<HTMLDivElement | null>(null);
    const mapId = `risk-gis-map-${++mapSeq}`;
    let interactiveMap: InteractiveMap | null = null;
    let disposed = false;
    const unitMarkerMap = new Map<string, Marker>();
    let draftPolyline: Polyline | null = null;
    let draftPolygon: Polygon | null = null;
    const draftMarkers: Marker[] = [];
    let committedShape: Path | Circle | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const applyMarkerHighlight = (unitId: string): void => {
      unitMarkerMap.forEach((marker, id) => {
        marker.setIcon(getLeafletIcon(id === unitId));
      });
    };

    const buildUnitPopupContent = (unit: GisOverlayUnit): HTMLElement => {
      const content = document.createElement("div");
      content.className = styles.unitPopup;

      const title = document.createElement("div");
      title.className = styles.unitPopupTitle;
      title.textContent = unit.name;
      content.appendChild(title);

      const rows: Array<[string, string]> = [
        ["所属区域", unit.zoneName],
        ["风险等级", riskLevelText(unit.riskLevel)],
        ["固有风险", riskLevelText(unit.inherentRiskLevel)],
        ["现状风险", riskLevelText(unit.controlRiskLevel)],
        ["对象数", String(unit.unitCount)],
        ["坐标", unit.coordinateText],
      ];
      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = styles.unitPopupRow;
        const labelEl = document.createElement("span");
        labelEl.className = styles.unitPopupLabel;
        labelEl.textContent = label;
        const valueEl = document.createElement("span");
        valueEl.className = styles.unitPopupValue;
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        content.appendChild(row);
      });

      const actions = document.createElement("div");
      actions.className = styles.unitPopupActions;

      const inventoryBtn = document.createElement("button");
      inventoryBtn.type = "button";
      inventoryBtn.className = styles.unitPopupBtn;
      inventoryBtn.textContent = "单元清单";
      inventoryBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        emit("unitInventoryClick", unit.id);
      };

      const zoneBtn = document.createElement("button");
      zoneBtn.type = "button";
      zoneBtn.className = styles.unitPopupLink;
      zoneBtn.textContent = "查看区域";
      zoneBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        emit("zoneClick", unit.zoneId);
      };

      actions.appendChild(inventoryBtn);
      actions.appendChild(zoneBtn);
      content.appendChild(actions);
      return content;
    };

    const openUnitPopup = (unitId: string): void => {
      const marker = unitMarkerMap.get(unitId);
      if (marker) {
        requestAnimationFrame(() => {
          marker.openPopup();
        });
        return;
      }
      const unit = props.overlayUnits.find((item) => item.id === unitId);
      if (!unit?.location || !interactiveMap) return;
      const popup = interactiveMap.createInfoWindow({ content: buildUnitPopupContent(unit), autoPan: false });
      interactiveMap.openInfoWindow(popup, unit.location);
    };

    const boundValue = (): { point?: GeoPoint; polygon?: PolygonGeo } => props.modelValue ?? props.value;

    const emitValue = (next: { point?: GeoPoint; polygon?: PolygonGeo }): void => {
      emit("change", next);
      emit("update:modelValue", next);
    };

    const waitForNextFrame = async (): Promise<void> => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    };

    const waitForMapContainer = async (): Promise<boolean> => {
      for (let i = 0; i < 8; i += 1) {
        await waitForNextFrame();
        if (disposed) return false;
        if (mapEl.value || document.getElementById(mapId)) {
          return true;
        }
      }
      return false;
    };

    const renderInteractiveMap = async (center?: { lng: number; lat: number }): Promise<boolean> => {
      let mapConfig: MapConfig = { mapType: "gdMap" };
      try {
        mapConfig = await resolveInteractiveMapConfig();
      } catch {
        mapConfig = { mapType: "gdMap" };
      }
      for (let i = 0; i < 5; i += 1) {
        if (disposed) return false;
        if (!document.getElementById(mapId)) {
          await waitForNextFrame();
          continue;
        }
        try {
          const { InteractiveMap: RemoteInteractiveMap } = await loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
          interactiveMap = new RemoteInteractiveMap(mapConfig);
          await interactiveMap.renderMap(mapId, { center, zoomControl: props.mode !== "readonly" });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "";
          interactiveMap?.destroy();
          interactiveMap = null;
          if (!errorMessage.includes("Map container not found")) {
            throw err;
          }
          await waitForNextFrame();
        }
      }
      return false;
    };

    const drawCircleOverlay = (center: GeoPoint, radius: number): void => {
      const circle = interactiveMap?.addCircle({ center, radius });
      if (circle) {
        circle.options.interactive = false;
      }
    };

    const scheduleMapRefresh = (): void => {
      requestAnimationFrame(() => {
        try {
          const map = interactiveMap?.getMapInstance();
          if (!map) {
            return;
          }
          map.invalidateSize({ animate: false, pan: false });
          map.eachLayer((layer) => {
            if ("redraw" in layer && typeof (layer as Path).redraw === "function") {
              (layer as Path).redraw();
            }
          });
        } catch {
          // ignore
        }
      });
    };

    const clearDraftVisuals = (): void => {
      draftPolyline?.remove();
      draftPolygon?.remove();
      draftMarkers.splice(0).forEach((marker) => marker.remove());
      draftPolyline = null;
      draftPolygon = null;
    };

    const clearCommittedVisuals = (): void => {
      committedShape?.remove();
      committedShape = null;
    };

    const paintDraft = async (points: GeoPoint[]): Promise<void> => {
      if (!interactiveMap || props.mode !== "polygon" || points.length === 0) {
        return;
      }
      clearDraftVisuals();
      if (points.length >= 2) {
        draftPolyline = interactiveMap.createPolyline(clonePoints(points), "#1890ff", 2);
      }
      if (points.length >= 3) {
        draftPolygon = interactiveMap.createPolygon(clonePoints(points), "#1890ff", 2, "#bae7ff");
      }
      scheduleMapRefresh();
      for (const p of points) {
        if (disposed || !interactiveMap) {
          return;
        }
        draftMarkers.push(await interactiveMap.addMarker({ position: { lng: p.lng, lat: p.lat } }));
      }
      scheduleMapRefresh();
    };

    const paintCommitted = (polygon: PolygonGeo): void => {
      if (!interactiveMap) {
        return;
      }
      clearCommittedVisuals();
      if (isCircleGeo(polygon)) {
        const circle = interactiveMap.addCircle({ center: polygon.points[0], radius: polygon.radius ?? DEFAULT_CIRCLE_RADIUS });
        if (circle) {
          circle.options.interactive = false;
          committedShape = circle;
        }
        return;
      }
      if (polygon.points.length >= 3) {
        const shape = interactiveMap.createPolygon(clonePoints(polygon.points), "#1890ff", 2, "#bae7ff");
        shape.options.interactive = false;
        shape.setStyle({ fillOpacity: 0.35 });
        committedShape = shape;
      } else if (polygon.points.length === 2) {
        committedShape = interactiveMap.createPolyline(clonePoints(polygon.points), "#1890ff", 2);
      }
      scheduleMapRefresh();
    };

    const paintUserDrawing = async (): Promise<void> => {
      if (pendingPoints.value.length > 0) {
        await paintDraft(pendingPoints.value);
        return;
      }
      const committed = committedPolygon.value ?? boundValue().polygon;
      if (committed?.points?.length) {
        paintCommitted(committed);
        return;
      }
      clearDraftVisuals();
      clearCommittedVisuals();
    };

    const syncUserDrawingToMap = (): void => {
      if (!interactiveMap || !mapReady.value) {
        return;
      }
      void paintUserDrawing();
    };

    const observeMapResize = (): void => {
      const target = mapEl.value ?? document.getElementById(mapId);
      if (!target || resizeObserver) {
        return;
      }
      resizeObserver = new ResizeObserver(() => {
        if (mapReady.value) {
          scheduleMapRefresh();
        }
      });
      resizeObserver.observe(target);
    };

    let overlayRenderToken = 0;
    let suppressValueWatch = false;

    const renderOverlays = async (options?: { deferRefresh?: boolean }): Promise<number> => {
      if (!interactiveMap || !mapReady.value) {
        return overlayRenderToken;
      }
      const map = interactiveMap;
      const token = ++overlayRenderToken;
      unitMarkerMap.clear();
      clearDraftVisuals();
      clearCommittedVisuals();
      map.clearMap();
      props.overlayZones.forEach((zone) => {
        if (!zone.polygon?.points?.length) return;
        const style = zone.riskLevel ? ZONE_LEVEL_STYLES[zone.riskLevel] : { stroke: "#91d5ff", fill: "#e6f7ff" };
        if (isCircleGeo(zone.polygon)) {
          drawCircleOverlay(zone.polygon.points[0], zone.polygon.radius ?? DEFAULT_CIRCLE_RADIUS);
          return;
        }
        if (zone.polygon.points.length > 1) {
          const polygon = map.createPolygon(clonePoints(zone.polygon.points), style.stroke, 2, style.fill);
          polygon.options.interactive = false;
        }
      });
      for (const unit of props.overlayUnits) {
        if (token !== overlayRenderToken || !unit.location) continue;
        const highlighted = props.highlightedUnitId === unit.id;
        const iconCfg = highlighted ? UNIT_MARKER_ICON.active : UNIT_MARKER_ICON.normal;
        const marker = await map.addMarker({
          position: { lng: unit.location.lng, lat: unit.location.lat },
          icon: iconCfg.url,
          iconSize: iconCfg.size,
          title: unit.name,
          onClick: () => {
            marker.openPopup();
            emit("unitClick", unit.id);
          },
        });
        marker.setZIndexOffset(1000);
        marker.bindPopup(() => buildUnitPopupContent(unit), {
          autoPan: false,
          maxWidth: 320,
          minWidth: 220,
          closeButton: true,
          className: "risk-gis-unit-popup",
        });
        unitMarkerMap.set(unit.id, marker);
      }
      if (token !== overlayRenderToken) {
        return token;
      }
      const current = boundValue();
      if (current.point?.lng != null && current.point?.lat != null) {
        await map.addMarker({ position: { lng: current.point.lng, lat: current.point.lat } });
      }
      if (!options?.deferRefresh) {
        scheduleMapRefresh();
      }
      return token;
    };

    const renderMapScene = (): void => {
      void renderOverlays({ deferRefresh: true }).then(async (token) => {
        if (token !== overlayRenderToken || disposed || !interactiveMap || !mapReady.value) {
          return;
        }
        await paintUserDrawing();
      });
    };

    const resetDraft = (): void => {
      pendingPoints.value = [];
    };

    const initMap = async (): Promise<void> => {
      const hasContainer = await waitForMapContainer();
      if (!hasContainer || disposed) {
        loading.value = false;
        return;
      }
      try {
        if (disposed) return;
        let center: { lng: number; lat: number } | undefined;
        try {
          center = (await getDispatchMapCenter()) ?? undefined;
        } catch {
          center = undefined;
        }
        if (disposed || !document.getElementById(mapId)) {
          return;
        }
        const rendered = await renderInteractiveMap(center);
        if (disposed || !rendered) return;
        mapReady.value = true;
        observeMapResize();
        renderMapScene();
        setTimeout(() => scheduleMapRefresh(), 200);
        const map = interactiveMap;
        if (props.mode !== "readonly" && map) {
          map.onMapClick = async (event) => {
            if (props.mode === "point") {
              void interactiveMap?.clearMap();
              void renderOverlays();
              void interactiveMap?.addMarker({ position: { lng: event.lng, lat: event.lat } });
              let address = "";
              try {
                const res = await interactiveMap?.getAddressByLntLat(event.lng, event.lat);
                address = res?.address ?? "";
              } catch {
                address = `${event.lng.toFixed(4)}, ${event.lat.toFixed(4)}`;
              }
              emitValue({ ...boundValue(), point: { lng: event.lng, lat: event.lat, address } });
              return;
            }
            if (props.mode === "polygon") {
              const clickPoint = { lng: event.lng, lat: event.lat };
              if (pendingPoints.value.length >= 3 && isNearPoint(clickPoint, pendingPoints.value[0])) {
                finishPolygon();
                return;
              }
              pendingPoints.value = [...pendingPoints.value, clickPoint];
              void paintDraft(pendingPoints.value);
            }
          };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "地图加载失败";
        if (!disposed && !errorMessage.includes("Map container not found")) {
          message.error(errorMessage);
        }
      } finally {
        loading.value = false;
      }
    };

    const finishPolygon = (): PolygonGeo | undefined => {
      if (pendingPoints.value.length < 3) {
        message.warning("至少选择3个点");
        return undefined;
      }
      const polygon = buildPolygonFromPoints(pendingPoints.value);
      committedPolygon.value = polygon;
      clearDraftVisuals();
      resetDraft();
      suppressValueWatch = true;
      emitValue({ ...boundValue(), polygon });
      paintCommitted(polygon);
      void nextTick(() => {
        suppressValueWatch = false;
      });
      return polygon;
    };

    const clearDrawing = (): void => {
      resetDraft();
      clearDraftVisuals();
      clearCommittedVisuals();
      committedPolygon.value = undefined;
      suppressValueWatch = true;
      emitValue({ polygon: undefined });
      void nextTick(() => {
        suppressValueWatch = false;
      });
      scheduleMapRefresh();
    };

    const commitPendingDrawing = (): PolygonGeo | undefined => {
      if (pendingPoints.value.length >= 3) {
        return finishPolygon();
      }
      return committedPolygon.value ?? boundValue().polygon;
    };

    const validateDrawingForSubmit = (): GisDrawingSubmitValidation => {
      const pendingCount = pendingPoints.value.length;
      if (pendingCount > 0) {
        if (pendingCount < 3) {
          return {
            complete: false,
            message: `区域范围绘制未完成，已选 ${pendingCount} 个点，请至少选择 3 个点并点击「完成绘制」`,
          };
        }
        return {
          complete: false,
          message: "区域范围绘制未完成，请点击「完成绘制」或点击起点闭合区域后再提交",
        };
      }
      const polygon = committedPolygon.value ?? boundValue().polygon;
      if (polygon?.points?.length) {
        return { complete: true, polygon };
      }
      return { complete: true };
    };

    const focusUnit = async (unitId: string): Promise<void> => {
      const unit = props.overlayUnits.find((item) => item.id === unitId);
      if (!unit?.location || !interactiveMap) return;

      applyMarkerHighlight(unitId);

      if (!interactiveMap.containsPositionInCurrentView(unit.location)) {
        await interactiveMap.setCenter(unit.location.lng, unit.location.lat);
      }

      openUnitPopup(unitId);
    };

    expose({ commitPendingDrawing, validateDrawingForSubmit, focusUnit });

    onMounted(() => {
      void initMap();
    });
    onBeforeUnmount(() => {
      disposed = true;
      mapReady.value = false;
      resizeObserver?.disconnect();
      resizeObserver = null;
      interactiveMap?.destroy();
      interactiveMap = null;
    });
    watch(
      () => boundValue().polygon,
      (externalPolygon, previousPolygon) => {
        if (suppressValueWatch) {
          return;
        }
        if (polygonsEqual(externalPolygon, previousPolygon)) {
          return;
        }
        if (externalPolygon?.points?.length) {
          committedPolygon.value = externalPolygon;
        } else if (externalPolygon === undefined) {
          committedPolygon.value = undefined;
        }
        syncUserDrawingToMap();
      },
      { deep: true },
    );

    watch(
      () => [props.overlayZones, props.overlayUnits],
      () => {
        if (!mapReady.value) {
          return;
        }
        renderMapScene();
      },
      { deep: true },
    );

    watch(
      () => props.busy,
      () => {
        if (!mapReady.value) {
          return;
        }
        void nextTick(() => {
          scheduleMapRefresh();
          syncUserDrawingToMap();
        });
      },
    );

    watch(
      () => props.highlightedUnitId,
      (unitId) => {
        if (!mapReady.value || !interactiveMap) return;
        applyMarkerHighlight(unitId);
      },
    );

    return (): JSX.Element => (
      <div class={styles.wrap}>
        {props.mode === "polygon" && (
          <Space style={{ marginBottom: "8px" }}>
            <Button size="small" onClick={finishPolygon}>
              完成绘制
            </Button>
            <Button size="small" onClick={clearDrawing}>
              清除
            </Button>
          </Space>
        )}
        <Spin spinning={loading.value} tip="地图加载中">
          <div id={mapId} ref={mapEl} class={styles.map} style={{ height: `${props.height}px` }} />
        </Spin>
        {props.mode === "polygon" && pendingPoints.value.length > 0 && (
          <div class={styles.hint}>已选 {pendingPoints.value.length} 个点，至少 3 个点后点击「完成绘制」，或点击起点闭合区域</div>
        )}
      </div>
    );
  },
});
