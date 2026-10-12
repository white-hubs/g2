import type { MapPointVO, MapTypeVO, MapWarningVO } from "@g2-contract/emergency-supplies";
import type { InteractiveMap } from "@g2-platform/pc-map";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getEmergencySuppliesClient, statusLabel } from "@/shared";

import styles from "./supplies-map.module.less";

const { Button, Input, PageLayout, SearchOutlined, Spin, message } = getEmergencySuppliesPcUi();

const DEFAULT_TYPE_COLOR = "#2f7cf6";
const PIN_ICON_SIZE: [number, number] = [25, 41];
type MapMarker = Awaited<ReturnType<InteractiveMap["addMarker"]>>;

let mapSeq = 0;

const toNumber = (value?: number | string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeColor = (color?: string): string | undefined => {
  if (!color?.trim()) return undefined;
  const value = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^[0-9a-fA-F]{3,8}$/.test(value)) return `#${value}`;
  return value;
};

const buildPinIconUrl = (color: string): string => {
  const safeColor = normalizeColor(color) ?? DEFAULT_TYPE_COLOR;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="${safeColor}" stroke="#fff" stroke-width="1.2" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z"/><circle cx="12.5" cy="12.5" r="4.5" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const SuppliesMap = defineComponent({
  name: "SuppliesMap",
  setup: () => {
    const query = reactive({ keyword: "" });
    const loading = ref(false);
    const mapLoading = ref(true);
    const selectedType = ref("ALL");
    const typeGroupsData = ref<MapTypeVO[]>([]);
    const warnings = ref<MapWarningVO[]>([]);
    const mapId = `emergency-supplies-map-${++mapSeq}`;
    let cubeMap: InteractiveMap | null = null;
    let disposed = false;
    let markers: MapMarker[] = [];

    const typeGroups = computed(() =>
      typeGroupsData.value.map((item) => ({
        id: item.typeId,
        name: item.typeName || "未分类",
        count: item.pointCount,
        quantity: item.quantity,
        color: item.typeColor || DEFAULT_TYPE_COLOR,
        points: item.points ?? [],
      })),
    );

    const validPoints = computed(() => {
      const list: MapPointVO[] = [];
      for (const group of typeGroups.value) {
        for (const point of group.points) {
          if (toNumber(point.longitude) === undefined || toNumber(point.latitude) === undefined) {
            continue;
          }
          list.push({
            ...point,
            typeId: point.typeId || group.id,
            typeName: point.typeName || group.name,
            typeColor: normalizeColor(point.typeColor) ?? group.color,
          });
        }
      }
      return list;
    });

    const filteredPoints = computed(() => {
      if (selectedType.value === "ALL") {
        return validPoints.value;
      }
      const group = typeGroups.value.find((item) => item.id === selectedType.value);
      return (
        group?.points
          .filter((point) => toNumber(point.longitude) !== undefined && toNumber(point.latitude) !== undefined)
          .map((point) => ({
            ...point,
            typeId: point.typeId || group.id,
            typeName: point.typeName || group.name,
            typeColor: normalizeColor(point.typeColor) ?? group.color,
          })) ?? []
      );
    });

    const overview = computed(() => {
      const totalQuantity = validPoints.value.reduce((sum, point) => sum + Number(point.quantity ?? 0), 0);
      return {
        pointCount: validPoints.value.length,
        totalQuantity,
        warningCount: warnings.value.length,
        typeCount: typeGroups.value.length,
      };
    });

    const getPointColor = (point: MapPointVO): string => normalizeColor(point.typeColor) ?? DEFAULT_TYPE_COLOR;

    const buildPopup = (point: MapPointVO): HTMLElement => {
      const el = document.createElement("div");
      el.className = styles.popup;
      el.innerHTML = `
        <div class="${styles.popupTitle}">${point.suppliesName ?? "--"}</div>
        <div class="${styles.popupRow}">类别：${point.typeName ?? "未分类"}</div>
        <div class="${styles.popupRow}">仓库：${point.warehouseName ?? "--"}</div>
        <div class="${styles.popupRow}">库存：${point.quantity ?? 0}</div>
        <div class="${styles.popupRow}">有效期：${point.earliestExpiryDate ?? "--"}</div>
      `;
      return el;
    };

    const clearMarkers = (): void => {
      cubeMap?.removeAllMarker();
      markers = [];
    };

    const fitMapToMarkers = (): void => {
      const mapInst = cubeMap?.getMapInstance();
      if (!mapInst || markers.length === 0) {
        return;
      }
      const latLngs = markers.map((marker) => {
        const point = marker.getLatLng();
        return [point.lat, point.lng] as [number, number];
      });
      if (latLngs.length === 1) {
        mapInst.setView(latLngs[0], 14);
        return;
      }
      mapInst.fitBounds(latLngs, { padding: [48, 48], maxZoom: 15 });
    };

    const renderMarkers = async (): Promise<void> => {
      if (!cubeMap) return;
      clearMarkers();
      for (const point of filteredPoints.value) {
        const lng = toNumber(point.longitude);
        const lat = toNumber(point.latitude);
        if (lng === undefined || lat === undefined) continue;
        const marker = await cubeMap.addMarker({
          position: { lng, lat },
          icon: buildPinIconUrl(getPointColor(point)),
          iconSize: PIN_ICON_SIZE,
          title: point.suppliesName,
        });
        marker.bindPopup(() => buildPopup(point), {
          autoPan: true,
          maxWidth: 280,
          minWidth: 180,
        });
        markers.push(marker);
      }
      await nextTick();
      cubeMap.getMapInstance()?.invalidateSize();
      fitMapToMarkers();
    };

    const initMap = async (): Promise<void> => {
      try {
        if (disposed) {
          return;
        }
        const { InteractiveMap: RemoteInteractiveMap } = await loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
        cubeMap = new RemoteInteractiveMap();
        await cubeMap.renderMap(mapId, {
          center: { lng: 114.0579, lat: 22.5431 },
          zoomControl: true,
        });
      } catch (error) {
        message.error((error as Error)?.message ?? "地图加载失败");
      } finally {
        mapLoading.value = false;
      }
    };

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const payload = { keyword: query.keyword };
        const [mapTypeGroups, warningList] = await Promise.all([
          getEmergencySuppliesClient().getSuppliesMapData(payload),
          getEmergencySuppliesClient().getSuppliesMapWarnings(payload),
        ]);
        typeGroupsData.value = mapTypeGroups ?? [];
        warnings.value = warningList ?? [];
        if (!typeGroupsData.value.some((item) => item.typeId === selectedType.value)) {
          selectedType.value = "ALL";
        }
        await renderMarkers();
      } finally {
        loading.value = false;
      }
    };

    watch(selectedType, () => {
      void renderMarkers();
    });

    onMounted(async () => {
      await initMap();
      await load();
    });

    onBeforeUnmount(() => {
      disposed = true;
      clearMarkers();
      cubeMap?.destroy();
      cubeMap = null;
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.page}>
          <Spin spinning={mapLoading.value || loading.value} wrapperClassName={styles.mapWrap}>
            <div class={styles.mapWrap}>
              <div id={mapId} class={styles.mapCanvas} />
            </div>
          </Spin>
          <aside class={styles.sidePanel}>
            <Input
              v-model:value={query.keyword}
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索物资名称或点位..."
              onPressEnter={load}
            />
            <Button class={styles.searchBtn} type="primary" onClick={load}>
              查询
            </Button>
            <div class={styles.panelSection}>
              <div class={styles.sectionTitle}>图层筛选</div>
              <div class={styles.typeChips}>
                <button
                  class={[styles.typeChip, selectedType.value === "ALL" ? styles.activeChip : ""]}
                  type="button"
                  onClick={() => {
                    selectedType.value = "ALL";
                  }}
                >
                  全部
                </button>
                {typeGroups.value.map((item) => (
                  <button
                    key={item.id}
                    class={styles.typeChip}
                    style={{
                      borderColor: item.color,
                      ...(selectedType.value === item.id
                        ? {
                            color: "#fff",
                            background: item.color,
                          }
                        : {}),
                    }}
                    type="button"
                    onClick={() => {
                      selectedType.value = item.id;
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div class={styles.panelSection}>
              <div class={styles.sectionTitle}>库存概览</div>
              <div class={styles.statsGrid}>
                <div class={styles.statCard}>
                  <strong>{overview.value.totalQuantity}</strong>
                  <span>库存总数</span>
                </div>
                <div class={styles.statCard}>
                  <strong>{overview.value.pointCount}</strong>
                  <span>点位数量</span>
                </div>
                <div class={styles.statCard}>
                  <strong>{overview.value.warningCount}</strong>
                  <span>预警数量</span>
                </div>
                <div class={styles.statCard}>
                  <strong>{overview.value.typeCount}</strong>
                  <span>物资类别</span>
                </div>
              </div>
              <div class={styles.typeBars}>
                {typeGroups.value.map((item) => (
                  <div class={styles.typeBar} key={item.id}>
                    <span>{item.name}</span>
                    <div class={styles.barTrack}>
                      <i
                        style={{
                          width: `${Math.min(100, (item.quantity / Math.max(overview.value.totalQuantity, 1)) * 100)}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                    <em>{item.quantity}</em>
                  </div>
                ))}
              </div>
            </div>
            <div class={styles.panelSection}>
              <div class={styles.sectionTitle}>物资预警清单</div>
              {warnings.value.slice(0, 8).map((item) => (
                <div class={styles.warningItem} key={`${item.suppliesId}-${item.warehouseId}`}>
                  <span>{item.suppliesName}</span>
                  <b>{item.warehouseName ?? "--"}</b>
                  <em>{statusLabel(item.warningLevel)}</em>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ),
    };
    return () => <PageLayout title="物资一张图" v-slots={slots} />;
  },
});
