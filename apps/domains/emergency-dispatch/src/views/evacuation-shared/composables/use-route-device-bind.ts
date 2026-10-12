import { ref } from "vue";

import { getApplicationCode } from "@/domain-context";

export interface RouteDevicePickerItem {
  id: string;
  name: string;
}

export function useRouteDeviceBind() {
  // 设备标签：builtin.app::{applicationCode}，与旧仓 DeviceModalTable 一致
  const tagCode = `builtin.app::${getApplicationCode()}`;
  const deviceModalTableRef = ref<{ openModal: (selected?: RouteDevicePickerItem[]) => void }>();
  const deviceList = ref<RouteDevicePickerItem[]>([]);
  const bindRouteIndex = ref(-1);

  function openRouteDevicePicker(routeIndex: number, boundDevices: RouteDevicePickerItem[]): void {
    bindRouteIndex.value = routeIndex;
    deviceList.value = boundDevices.map((d) => ({ id: d.id, name: d.name }));
    deviceModalTableRef.value?.openModal(deviceList.value);
  }

  function resetBindRouteIndex(): void {
    bindRouteIndex.value = -1;
  }

  return {
    tagCode,
    deviceModalTableRef,
    deviceList,
    bindRouteIndex,
    openRouteDevicePicker,
    resetBindRouteIndex,
  };
}
