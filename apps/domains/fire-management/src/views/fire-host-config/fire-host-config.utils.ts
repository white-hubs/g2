import type { SaveFireManageDeviceParams } from "@g2-contract/fire-management";

import type { DeviceSelectionRecord } from "./fire-host-config.model";

export const getDeviceKey = (device: DeviceSelectionRecord): string | number => device.id ?? device.deviceId ?? device.code ?? "";

export const buildDevicePayload = (device: DeviceSelectionRecord, hostName: string): SaveFireManageDeviceParams | null => {
  const deviceId = getDeviceKey(device);
  if (!deviceId) {
    return null;
  }
  const productInfo = device.productInfo;
  const productCategory = productInfo?.productCategory;
  const onlineState = device.status?.onlineState;
  return {
    deviceId,
    deviceName: hostName,
    deviceProdCategoryName: productCategory?.name ?? device.category ?? "",
    deviceProdCategoryCode: productCategory?.code ?? "",
    areaId: device.area?.id ?? "",
    deviceProdId: productInfo?.id ?? "",
    deviceProdName: productInfo?.name ?? device.product ?? "",
    areaName: device.area?.pathName ?? device.area?.name ?? device.region ?? "",
    code: device.code ?? String(deviceId),
    deviceStatus: onlineState === false ? 0 : 1,
    communicationStatus: onlineState === false ? "OFFLINE" : "ONLINE",
    brandCode: productInfo?.brandCode ?? "",
    brandName: productInfo?.brandName ?? device.brand ?? "",
    lntAndLat: device.lntAndLat ?? "",
    deviceProdCategoryCodeConcat: productCategory?.pathCode ?? "",
  };
};
