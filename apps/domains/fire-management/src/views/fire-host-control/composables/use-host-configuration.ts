import type { FireHostButtonConfigRecord, FireHostMonitorDeviceRecord } from "@g2-contract/fire-management";
import { onUnmounted, ref, shallowRef, type Ref, type ShallowRef } from "vue";

import type { ControlAction, FireHostId, MonitorFeed } from "../models";
import { listFireHostButtons, listFireHostMonitorDevices } from "@/api/server";
import { message } from "@/pc-ui-runtime";

const MONITOR_DEVICE_PAGE_SIZE = 100;
const FIRST_PAGE_NUMBER = 1;
const NEXT_PAGE_OFFSET = 2;

interface HostConfigurationState {
  controlButtons: Ref<ControlAction[]>;
  currentVideoFeeds: Ref<MonitorFeed[]>;
  isButtonConfigLoading: ShallowRef<boolean>;
  isVideoConfigLoading: ShallowRef<boolean>;
  loadHostConfiguration: (hostId: FireHostId) => Promise<void>;
}

const getButtonStyle = (record: FireHostButtonConfigRecord): Pick<ControlAction, "style" | "danger"> => {
  const descriptor = `${record.icon || ""}${record.methodName || ""}${record.methodCode}`.toLowerCase();
  if (/停止|stop|报警|alarm|复位|reset/u.test(descriptor)) {
    return { style: "red", danger: true };
  }
  if (/取消|cancel|解除|release/u.test(descriptor)) {
    return { style: "blue" };
  }
  return { style: "gray" };
};

const mapHostButton = (record: FireHostButtonConfigRecord): ControlAction => ({
  buttonId: record.id,
  label: record.methodName || record.methodCode,
  methodCode: record.methodCode,
  methodType: record.methodType || "控制按钮",
  icon: record.icon || "控制",
  enabled: record.enabled !== false,
  ...(record.inputParams ? { inputParams: record.inputParams } : {}),
  ...getButtonStyle(record),
});

const mapMonitorDevice = (hostId: FireHostId, record: FireHostMonitorDeviceRecord): MonitorFeed => ({
  id: String(record.id),
  hostId,
  name: record.deviceName || "未命名视频设备",
  code: record.deviceCode || "--",
  description: [record.productName, record.areaName].filter(Boolean).join(" · ") || record.productCategoryName || "已关联视频设备",
});

export function useHostConfiguration(currentHostId: Readonly<Ref<FireHostId>>): HostConfigurationState {
  const controlButtons = ref<ControlAction[]>([]);
  const currentVideoFeeds = ref<MonitorFeed[]>([]);
  const isButtonConfigLoading = shallowRef(false);
  const isVideoConfigLoading = shallowRef(false);
  let requestVersion = 0;
  let isDisposed = false;

  const isCurrentRequest = (hostId: FireHostId, version: number): boolean =>
    !isDisposed && version === requestVersion && String(currentHostId.value) === String(hostId);

  const loadHostButtons = async (hostId: FireHostId, version: number): Promise<void> => {
    isButtonConfigLoading.value = true;
    controlButtons.value = [];
    try {
      const records = await listFireHostButtons(hostId);
      if (!isCurrentRequest(hostId, version)) {
        return;
      }
      controlButtons.value = [...records]
        .toSorted((left, right) => Number(left.sortNo || 0) - Number(right.sortNo || 0))
        .map((record) => mapHostButton(record));
    } catch (error) {
      if (isCurrentRequest(hostId, version)) {
        message.error((error as Error).message || "加载主机按钮配置失败");
      }
    } finally {
      if (isCurrentRequest(hostId, version)) {
        isButtonConfigLoading.value = false;
      }
    }
  };

  const loadHostMonitorDevices = async (hostId: FireHostId, version: number): Promise<void> => {
    isVideoConfigLoading.value = true;
    currentVideoFeeds.value = [];
    try {
      const firstPage = await listFireHostMonitorDevices(hostId, {
        pageNumber: FIRST_PAGE_NUMBER,
        pageSize: MONITOR_DEVICE_PAGE_SIZE,
      });
      const pages = Math.max(
        FIRST_PAGE_NUMBER,
        Number(firstPage.pages || Math.ceil(Number(firstPage.total || 0) / MONITOR_DEVICE_PAGE_SIZE)),
      );
      const remainingPages =
        pages > FIRST_PAGE_NUMBER
          ? await Promise.all(
              Array.from({ length: pages - FIRST_PAGE_NUMBER }, (_, index) =>
                listFireHostMonitorDevices(hostId, {
                  pageNumber: index + NEXT_PAGE_OFFSET,
                  pageSize: MONITOR_DEVICE_PAGE_SIZE,
                }),
              ),
            )
          : [];
      if (!isCurrentRequest(hostId, version)) {
        return;
      }
      const configuredDevices = [firstPage, ...remainingPages]
        .flatMap((page) => page.records || [])
        .filter((record) => record.associated !== false);
      currentVideoFeeds.value = configuredDevices.map((record) => mapMonitorDevice(hostId, record));
    } catch (error) {
      if (isCurrentRequest(hostId, version)) {
        message.error((error as Error).message || "加载关联视频设备失败");
      }
    } finally {
      if (isCurrentRequest(hostId, version)) {
        isVideoConfigLoading.value = false;
      }
    }
  };

  const loadHostConfiguration = async (hostId: FireHostId): Promise<void> => {
    requestVersion += FIRST_PAGE_NUMBER;
    const version = requestVersion;
    await Promise.all([loadHostButtons(hostId, version), loadHostMonitorDevices(hostId, version)]);
  };

  onUnmounted(() => {
    isDisposed = true;
    requestVersion += FIRST_PAGE_NUMBER;
  });

  return {
    controlButtons,
    currentVideoFeeds,
    isButtonConfigLoading,
    isVideoConfigLoading,
    loadHostConfiguration,
  };
}
