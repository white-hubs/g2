import { type PropType, defineComponent, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { CubeMapLeaflet } from "./core/cube-map-leaflet";
import type { MapConfig } from "./core/type";
import { Button, Input, Modal, Spin, message } from "./pc-ui-runtime";

import styles from "./map-picker-modal.module.css";

export interface MapPickerPoint {
  lng: number;
  lat: number;
}

export interface MapPickerResult extends MapPickerPoint {
  address: string;
}

export interface MapPickerModalProps {
  open: boolean;
  title?: string;
  width?: number | string;
  address?: string;
  center?: MapPickerPoint;
  mapConfig?: MapConfig;
  getMapConfig?: () => Promise<MapConfig>;
}

const DEFAULT_CENTER: MapPickerPoint = { lng: 114.057939, lat: 22.543527 };
let mapPickerSequence = 0;

function finitePoint(point?: Partial<MapPickerPoint>): MapPickerPoint {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : { ...DEFAULT_CENTER };
}

function roundedPoint(point: MapPickerPoint): MapPickerPoint {
  return {
    lng: Number(point.lng.toFixed(6)),
    lat: Number(point.lat.toFixed(6)),
  };
}

export const MapPickerModal = defineComponent({
  name: "G2MapPickerModal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "获取经纬度" },
    width: { type: [Number, String] as PropType<number | string>, default: 980 },
    address: { type: String, default: "" },
    center: { type: Object as PropType<MapPickerPoint>, default: () => ({ ...DEFAULT_CENTER }) },
    mapConfig: { type: Object as PropType<MapConfig>, default: undefined },
    getMapConfig: { type: Function as PropType<(() => Promise<MapConfig>) | undefined>, default: undefined },
  },
  emits: {
    "update:open": (_open: boolean) => true,
    confirm: (_value: MapPickerResult) => true,
  },
  setup(props, { emit }) {
    const mapId = `g2-map-picker-${++mapPickerSequence}`;
    const mapElement = ref<HTMLDivElement | null>(null);
    const mapLoading = ref(false);
    const searching = ref(false);
    const state = reactive({
      address: props.address,
      ...finitePoint(props.center),
    });
    let map: CubeMapLeaflet | null = null;
    let renderGeneration = 0;
    let addressRequest = 0;

    const destroyMap = (): void => {
      renderGeneration += 1;
      addressRequest += 1;
      if (map) {
        map.onMapClick = null;
        map.destroy();
        map = null;
      }
      mapLoading.value = false;
      searching.value = false;
    };

    const refreshMarker = (): void => {
      if (!map) return;
      map.clearMap();
      const marker = map.createMarker({
        position: { lng: state.lng, lat: state.lat },
        iconSize: [28, 40],
      });
      marker.addTo(map.getMapInstance());
    };

    const reverseGeocode = async (point: MapPickerPoint, request: number): Promise<void> => {
      if (!map) return;
      try {
        const result = await map.getAddressByLntLat(point.lng, point.lat);
        if (request === addressRequest && result.address) state.address = result.address;
      } catch {
        if (request === addressRequest && !state.address.trim()) {
          state.address = `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
        }
      }
    };

    const updatePoint = (point: MapPickerPoint, clearAddress = false): void => {
      const next = roundedPoint(point);
      state.lng = next.lng;
      state.lat = next.lat;
      if (clearAddress) state.address = "";
      refreshMarker();
      const request = ++addressRequest;
      void reverseGeocode(next, request);
    };

    const renderMap = async (): Promise<void> => {
      if (!props.open) return;
      destroyMap();
      const generation = renderGeneration;
      mapLoading.value = true;
      try {
        await nextTick();
        if (!props.open || generation !== renderGeneration || !mapElement.value) return;
        const config = (await props.getMapConfig?.()) ?? props.mapConfig ?? { mapType: "gdMap" as const };
        const nextMap = new CubeMapLeaflet(config);
        await nextMap.renderMap(mapId, {
          center: { lng: state.lng, lat: state.lat },
          zoomControl: true,
        });
        if (!props.open || generation !== renderGeneration) {
          nextMap.destroy();
          return;
        }
        map = nextMap;
        map.onMapClick = (event) => updatePoint(event, true);
        map.getMapInstance().invalidateSize();
        refreshMarker();
      } catch (error) {
        if (generation === renderGeneration) {
          message.error(error instanceof Error ? error.message : "地图加载失败，请手动填写经纬度");
        }
        destroyMap();
      } finally {
        if (generation === renderGeneration) mapLoading.value = false;
      }
    };

    const resetState = (): void => {
      const point = finitePoint(props.center);
      state.lng = point.lng;
      state.lat = point.lat;
      state.address = props.address;
    };

    const locate = async (): Promise<void> => {
      if (!map) {
        message.warning("地图尚未加载完成，请稍后再试");
        return;
      }
      searching.value = true;
      try {
        const address = state.address.trim();
        const point = address ? await map.getLntLatByAddress(address) : await map.getLntLatFromBrowser();
        updatePoint(point);
        await map.setCenter(point.lng, point.lat);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "定位失败，请检查地址或浏览器定位权限");
      } finally {
        searching.value = false;
      }
    };

    const confirm = (): void => {
      if (
        !Number.isFinite(state.lng) ||
        !Number.isFinite(state.lat) ||
        state.lng < -180 ||
        state.lng > 180 ||
        state.lat < -90 ||
        state.lat > 90
      ) {
        message.error("请输入有效的经纬度");
        return;
      }
      emit("confirm", { address: state.address.trim(), lng: state.lng, lat: state.lat });
      emit("update:open", false);
    };

    watch(
      () => props.open,
      (open) => {
        if (open) {
          resetState();
          void renderMap();
        } else {
          destroyMap();
        }
      },
      { immediate: true },
    );
    onBeforeUnmount(destroyMap);

    return (): JSX.Element => (
      <Modal
        open={props.open}
        title={props.title}
        width={props.width}
        class={styles.mapPickerModal}
        onOk={confirm}
        onCancel={() => emit("update:open", false)}
      >
        <div class={styles.mapPickerTools}>
          <Input
            value={state.address}
            maxlength={999}
            placeholder="请输入位置信息"
            onUpdate:value={(value: string) => (state.address = value)}
            onPressEnter={() => void locate()}
          />
          <Button type="primary" loading={searching.value} onClick={() => void locate()}>
            定位
          </Button>
        </div>
        <Spin spinning={mapLoading.value} tip="地图渲染中">
          <div ref={mapElement} id={mapId} class={styles.mapPickerMap} />
        </Spin>
        <div class={styles.mapPickerHint}>
          当前坐标：{state.lng.toFixed(6)}，{state.lat.toFixed(6)}；点击地图可重新选点
        </div>
      </Modal>
    );
  },
});
