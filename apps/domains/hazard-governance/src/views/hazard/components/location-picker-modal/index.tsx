import { computed, defineComponent, reactive, shallowRef } from "vue";

import { MapPickerModal, type MapPickerResult } from "@/pc-map-runtime";

import { Button, Input, InputNumber, Modal, Space, message } from "@/pc-ui-runtime";

export interface HazardLocationValue {
  locationName: string;
  longitude?: number | null;
  latitude?: number | null;
}

export interface LocationPickerModalExpose {
  openModal: (value?: HazardLocationValue) => void;
}

const DEFAULT_CENTER = { lng: 116.397428, lat: 39.90923 };

function finiteCoordinate(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** 保持旧页面的命令式调用方式，地图渲染与逆地理编码统一交给 G2 pc-map。 */
export const LocationPickerModal = defineComponent({
  name: "LocationPickerModal",
  emits: ["selected"],
  setup: (_, { emit, expose }) => {
    const visible = shallowRef(false);
    const selected = reactive<HazardLocationValue>({ locationName: "", longitude: undefined, latitude: undefined });
    const center = computed(() => {
      const lng = finiteCoordinate(selected.longitude);
      const lat = finiteCoordinate(selected.latitude);
      return lng !== undefined && lat !== undefined ? { lng, lat } : DEFAULT_CENTER;
    });

    const openModal = (value?: HazardLocationValue): void => {
      selected.locationName = value?.locationName ?? "";
      selected.longitude = finiteCoordinate(value?.longitude);
      selected.latitude = finiteCoordinate(value?.latitude);
      visible.value = true;
    };

    const handleConfirm = (value: MapPickerResult): void => {
      selected.locationName = value.address;
      selected.longitude = value.lng;
      selected.latitude = value.lat;
      emit("selected", { ...selected });
      visible.value = false;
    };

    expose({ openModal });

    return () => (
      <MapPickerModal
        open={visible.value}
        title="选择位置"
        width={1000}
        address={selected.locationName}
        center={center.value}
        onUpdate:open={(open: boolean) => (visible.value = open)}
        onConfirm={handleConfirm}
      />
    );
  },
});
