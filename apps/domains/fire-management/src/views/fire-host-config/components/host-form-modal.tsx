import type { FireHostRecord } from "@g2-contract/fire-management";
import { defineComponent, shallowRef } from "vue";

import type { DeviceSelectionRecord } from "../fire-host-config.model";
import { buildDevicePayload } from "../fire-host-config.utils";
import { addFireManageDevice, deleteFireHost, listFireHosts } from "@/api/server";
import { DeviceSelectModal, type DeviceSelectModalExpose, type DeviceSelectRecord } from "@/components/device-select-modal";
import { message } from "@/pc-ui-runtime";

export const HostFormModal = defineComponent({
  name: "HostFormModal",
  emits: ["saved"],
  setup: (_props, { emit, expose }) => {
    const selectedDevices = shallowRef<DeviceSelectionRecord[]>([]);
    const managedHostMap = shallowRef(new Map<string, FireHostRecord>());
    const pickerInitializing = shallowRef(false);
    const deviceSelectModalRef = shallowRef<DeviceSelectModalExpose | null>(null);
    const HOST_PAGE_SIZE = 200;

    const toDeviceSelectionRecord = (record: FireHostRecord): DeviceSelectionRecord => ({
      id: record.deviceId ?? record.code ?? record.deviceCode ?? record.id,
      fireManageDeviceId: record.id,
      deviceId: record.deviceId ?? record.code ?? record.deviceCode ?? record.id,
      code: record.code ?? record.deviceCode ?? "",
      name: record.deviceName ?? record.name,
      category: record.deviceProdCategoryName ?? "",
      product: record.deviceProdName ?? "",
      brand: record.brandName ?? "",
      region: record.areaName ?? "",
      lntAndLat: record.lntAndLat ?? "",
      area: {
        id: record.areaId ?? "",
        name: record.areaName ?? "",
        pathName: record.areaName ?? "",
      },
      productInfo: {
        id: record.deviceProdId ?? "",
        name: record.deviceProdName ?? "",
        brandCode: record.brandCode ?? "",
        brandName: record.brandName ?? "",
        productCategory: {
          code: record.deviceProdCategoryCode ?? "",
          name: record.deviceProdCategoryName ?? "",
          pathCode: record.deviceProdCategoryCodeConcat ?? "",
        },
      },
    });

    const loadManagedHosts = async (): Promise<FireHostRecord[]> => {
      const firstPage = await listFireHosts({ pageNumber: 1, pageSize: HOST_PAGE_SIZE });
      const pages = Math.max(firstPage.pages ?? 1, 1);
      if (pages === 1) {
        return firstPage.records;
      }
      const remainingPages = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) => listFireHosts({ pageNumber: index + 2, pageSize: HOST_PAGE_SIZE })),
      );
      return [firstPage, ...remainingPages].flatMap((page) => page.records);
    };

    const initializeManagedHosts = async (): Promise<void> => {
      pickerInitializing.value = true;
      try {
        const records = await loadManagedHosts();
        const nextManagedHostMap = new Map<string, FireHostRecord>();
        records.forEach((record) => {
          const device = toDeviceSelectionRecord(record);
          nextManagedHostMap.set(String(device.id), record);
        });
        managedHostMap.value = nextManagedHostMap;
        selectedDevices.value = records.map(toDeviceSelectionRecord);
      } catch (error) {
        message.error((error as Error).message || "加载已关联主机失败");
      } finally {
        pickerInitializing.value = false;
      }
    };

    const saveHost = async (devices: DeviceSelectRecord[]): Promise<boolean> => {
      selectedDevices.value = devices as DeviceSelectionRecord[];
      if (selectedDevices.value.length === 0 && managedHostMap.value.size === 0) {
        message.warning("请选择需要纳管的物联设备");
        return false;
      }

      try {
        const selectedDeviceMap = new Map(
          selectedDevices.value.map((device) => [String(device.id ?? device.deviceId ?? device.code ?? ""), device]),
        );
        const devicesToAdd = [...selectedDeviceMap.entries()]
          .filter(([deviceKey]) => !managedHostMap.value.has(deviceKey))
          .map(([, device]) => device);
        const hostsToRemove = [...managedHostMap.value.entries()]
          .filter(([deviceKey]) => !selectedDeviceMap.has(deviceKey))
          .map(([, record]) => record);
        const payloads = devicesToAdd.map((device) => buildDevicePayload(device, device.name?.trim() || device.code?.trim() || ""));
        if (payloads.some((payload) => !payload)) {
          message.warning("部分设备信息不完整，请重新选择");
          return false;
        }
        await Promise.all([
          ...payloads.map((payload) => addFireManageDevice(payload!)),
          ...hostsToRemove.map((record) => deleteFireHost(record.id)),
        ]);
        if (devicesToAdd.length === 0 && hostsToRemove.length === 0) {
          message.info("主机纳管配置未发生变化");
        } else {
          message.success(`主机纳管配置已保存：新增 ${devicesToAdd.length} 台，移除 ${hostsToRemove.length} 台`);
        }
        emit("saved");
        return true;
      } catch (error) {
        message.error((error as Error).message || "保存主机失败");
        return false;
      }
    };

    const openModal = (): void => {
      selectedDevices.value = [];
      managedHostMap.value = new Map();
      pickerInitializing.value = false;
      deviceSelectModalRef.value?.openModal();
      void initializeManagedHosts();
    };

    expose({ openModal });

    return () => (
      <DeviceSelectModal
        ref={deviceSelectModalRef}
        title="新增消防主机"
        selectedDevices={selectedDevices.value}
        disabled={pickerInitializing.value}
        pageSize={10}
        queryParams={{ filterTagCodes: ["builtin.app::fire-management"] }}
        submit={saveHost}
        onSelectionChange={(devices: DeviceSelectionRecord[]) => (selectedDevices.value = devices)}
        onClosed={() => {
          selectedDevices.value = [];
          managedHostMap.value = new Map();
          pickerInitializing.value = false;
        }}
      />
    );
  },
});
