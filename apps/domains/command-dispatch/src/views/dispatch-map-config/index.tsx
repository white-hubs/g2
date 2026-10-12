import type { DataDictionary } from "@g2-contract/dictionary";
import type { InteractiveMap } from "@g2-platform/pc-map";
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref, useId } from "vue";

import { PageFrame } from "../../components/page-frame";
import { getCommandDispatchContext, getDictionaryClient } from "../../domain-context";
import { Alert, Button, Input, InputNumber, message, Slider, Spin } from "../../pc-ui-runtime";
import {
  configurationError,
  loadConfiguration,
  MAP_CONFIG_CODE,
  mapRecords,
  readMapValues,
  readProviderConfig,
  saveConfiguration,
} from "./config";

import styles from "./index.module.css";

const MARKER_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34"><path d="M13 1a12 12 0 0 0-12 12c0 8 12 20 12 20s12-12 12-20A12 12 0 0 0 13 1" fill="#1677ff" stroke="white" stroke-width="2"/><circle cx="13" cy="13" r="4" fill="white"/></svg>')}`;

export const MapConfig = defineComponent({
  name: "CommandDispatchMapConfig",
  setup() {
    const state = reactive({
      records: [] as DataDictionary[],
      values: readMapValues([]),
      address: "",
      error: "",
      addressNotice: "",
      loading: true,
      loaded: false,
      searching: false,
      saving: false,
    });
    const container = ref<HTMLElement>();
    const mapId = `command-dispatch-map-${useId().replace(/[^a-zA-Z0-9-]/g, "-")}`;
    let map: InteractiveMap | undefined;
    let marker: ReturnType<InteractiveMap["createMarker"]> | undefined;
    let observer: ResizeObserver | undefined;
    let disposed = false;
    let addressRequest = 0;
    let loadRequest = 0;

    const destroyMap = (): void => {
      observer?.disconnect();
      observer = undefined;
      marker = undefined;
      if (map) {
        map.onMapClick = null;
        map.destroy();
        map = undefined;
      }
    };
    onBeforeUnmount(() => {
      disposed = true;
      addressRequest += 1;
      loadRequest += 1;
      destroyMap();
    });

    const drawCircle = (): void => {
      if (!map) return;
      map.clearCircles();
      if (state.values.radius > 0) map.addCircle({ center: { ...state.values.center }, radius: state.values.radius });
    };

    const drawPoint = (): void => {
      if (!map) return;
      marker?.remove();
      marker = map.createMarker({ position: { ...state.values.center }, icon: MARKER_ICON, iconSize: [26, 34] });
      const instance = map.getMapInstance();
      marker.addTo(instance);
      // The platform marker has already converted business coordinates for the selected provider.
      instance.setView(marker.getLatLng(), state.values.zoom, { animate: false });
      drawCircle();
    };

    const reverseAddress = async (): Promise<void> => {
      const current = map;
      if (!current) return;
      const request = ++addressRequest;
      state.address = "";
      state.addressNotice = "";
      try {
        const result = await current.getAddressByLntLat(state.values.center.lng, state.values.center.lat);
        if (!disposed && request === addressRequest) state.address = result.address;
      } catch (error) {
        if (!disposed && request === addressRequest) state.addressNotice = configurationError(error, "坐标已选中，地址解析失败");
      }
    };

    const load = async (): Promise<void> => {
      const request = ++loadRequest;
      addressRequest += 1;
      state.loading = true;
      state.loaded = false;
      state.error = "";
      state.addressNotice = "";
      destroyMap();
      let nextMap: InteractiveMap | undefined;
      try {
        const client = await getDictionaryClient();
        const [records, providers, platform] = await Promise.all([
          loadConfiguration(client, MAP_CONFIG_CODE),
          client.getDataDictionaryByItem({ itemCode: "THIRD_SERVICE" }),
          getCommandDispatchContext().loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index"),
        ]);
        if (disposed || request !== loadRequest || !container.value) return;
        state.records = records;
        state.values = readMapValues(records);
        const provider = readProviderConfig(providers);
        nextMap = new platform.InteractiveMap(provider);
        await nextMap.renderMap(mapId, { center: { ...state.values.center }, zoomControl: true });
        if (disposed || request !== loadRequest) {
          nextMap.destroy();
          return;
        }
        map = nextMap;
        drawPoint();
        map.setRotation(state.values.rotation);
        map.getMapInstance().on("zoomend", () => {
          if (map && !disposed) state.values.zoom = map.getMapInstance().getZoom();
        });
        map.onMapClick = (point): void => {
          if (state.saving || state.searching) return;
          state.values.center = { lng: point.lng, lat: point.lat };
          drawPoint();
          void reverseAddress();
        };
        observer = new ResizeObserver((entries) => {
          if (entries.some((entry) => entry.contentRect.width > 0 && entry.contentRect.height > 0)) {
            map?.getMapInstance().invalidateSize({ animate: false, pan: false });
          }
        });
        observer.observe(container.value);
        state.loaded = true;
        if (provider.webKey?.trim()) void reverseAddress();
        else state.addressNotice = "未配置地图服务密钥，可点选坐标、调整地图并保存；搜索定位和地址解析需要配置 THIRD_SERVICE 地图服务。";
      } catch (error) {
        if (nextMap && map !== nextMap) nextMap.destroy();
        if (!disposed && request === loadRequest) {
          destroyMap();
          state.error = configurationError(error, "地图配置加载失败，请重试");
        }
      } finally {
        if (!disposed && request === loadRequest) state.loading = false;
      }
    };

    const search = async (): Promise<void> => {
      if (!state.address.trim()) {
        message.warning("请输入地址");
        return;
      }
      const current = map;
      if (!current || state.searching || !state.loaded) return;
      const request = ++addressRequest;
      state.searching = true;
      state.error = "";
      state.addressNotice = "";
      try {
        const point = await current.getLntLatByAddress(state.address.trim());
        if (disposed || request !== addressRequest) return;
        if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) throw new Error("地图服务返回无效坐标");
        state.values.center = { lng: point.lng, lat: point.lat };
        drawPoint();
      } catch (error) {
        if (!disposed && request === addressRequest) state.error = configurationError(error, "获取地址失败，请重试");
      } finally {
        if (!disposed) state.searching = false;
      }
    };

    const save = async (): Promise<void> => {
      if (!state.loaded || state.saving || state.searching) return;
      state.saving = true;
      state.error = "";
      try {
        const client = await getDictionaryClient();
        state.records = mapRecords(state.records, state.values);
        await saveConfiguration(client, state.records, "调度中心地图配置");
        state.records = await client.getDataDictionaryByItem({ itemCode: MAP_CONFIG_CODE });
        if (!disposed) message.success("保存成功");
      } catch (error) {
        if (!disposed) state.error = configurationError(error, "保存失败，请重试");
      } finally {
        if (!disposed) state.saving = false;
      }
    };

    const setRotation = (value: number | number[]): void => {
      const rotation = Array.isArray(value) ? value[0] : value;
      if (rotation === undefined || !Number.isFinite(rotation)) return;
      state.values.rotation = rotation;
      map?.setRotation(rotation);
    };
    const setZoom = (value: number | number[]): void => {
      const zoom = Array.isArray(value) ? value[0] : value;
      if (zoom === undefined || !Number.isFinite(zoom)) return;
      state.values.zoom = zoom;
      map?.getMapInstance().setZoom(zoom, { animate: false });
    };

    onMounted(() => {
      void load();
    });
    return () => (
      <PageFrame
        title="地图配置"
        v-slots={{
          search: () => (
            <div class={styles.toolbar}>
              <div class={styles.addressField}>
                <label for={`${mapId}-address`}>地址：</label>
                <Input
                  id={`${mapId}-address`}
                  value={state.address}
                  maxlength={999}
                  placeholder="请输入位置信息"
                  disabled={!state.loaded || state.saving || state.searching}
                  onUpdate:value={(value: string) => {
                    addressRequest += 1;
                    state.address = value;
                  }}
                  onPressEnter={() => void search()}
                />
                <Button type="primary" disabled={!state.loaded || state.saving} loading={state.searching} onClick={() => void search()}>
                  搜索定位
                </Button>
              </div>
              <div class={styles.field}>
                <label for={`${mapId}-radius`}>有效范围半径(米)：</label>
                <InputNumber
                  id={`${mapId}-radius`}
                  value={state.values.radius}
                  min={0}
                  disabled={!state.loaded || state.saving}
                  onChange={(value) => {
                    state.values.radius = Math.max(0, Number(value) || 0);
                    drawCircle();
                  }}
                />
              </div>
              <div class={styles.sliderField}>
                <label id={`${mapId}-rotation-label`}>旋转角度：{state.values.rotation}°</label>
                <Slider
                  aria-labelledby={`${mapId}-rotation-label`}
                  value={state.values.rotation}
                  min={0}
                  max={360}
                  step={0.5}
                  onChange={setRotation}
                  disabled={!state.loaded || state.saving}
                />
              </div>
              <div class={styles.sliderField}>
                <label id={`${mapId}-zoom-label`}>缩放层级：{state.values.zoom}</label>
                <Slider
                  aria-labelledby={`${mapId}-zoom-label`}
                  value={state.values.zoom}
                  min={3}
                  max={18}
                  step={0.5}
                  onChange={setZoom}
                  disabled={!state.loaded || state.saving}
                />
              </div>
            </div>
          ),
          default: () => (
            <div class={styles.body}>
              {state.error && (
                <Alert
                  type="error"
                  showIcon
                  message={state.error}
                  v-slots={{
                    action: () =>
                      !state.loaded ? (
                        <Button size="small" disabled={state.loading} onClick={() => void load()}>
                          重新加载
                        </Button>
                      ) : undefined,
                  }}
                />
              )}
              {state.addressNotice && <Alert type="warning" showIcon message={state.addressNotice} />}
              <div class={styles.mapFrame}>
                <div id={mapId} ref={container} class={styles.map} aria-label="派遣地图，点击选择中心坐标" />
                {state.loading && (
                  <div class={styles.loading}>
                    <Spin tip="地图加载中" />
                  </div>
                )}
              </div>
              <div class={styles.coordinates}>
                中心坐标：{state.values.center.lng.toFixed(6)}, {state.values.center.lat.toFixed(6)}
                <span>点击地图选择中心位置</span>
              </div>
            </div>
          ),
          footer: () => (
            <Button type="primary" disabled={!state.loaded || state.searching} loading={state.saving} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
