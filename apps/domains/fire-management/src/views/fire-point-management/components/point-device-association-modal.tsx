import { defineComponent, shallowRef } from "vue";

import { createFirePoint } from "@/api/server";
import { DeviceSelectModal, type DeviceSelectModalExpose, type DeviceSelectRecord } from "@/components/device-select-modal";
import { message } from "@/pc-ui-runtime";

export const PointDeviceAssociationModal = defineComponent({
  name: "PointDeviceAssociationModal",
  props: {
    hostId: { type: String, required: true },
  },
  emits: ["saved"],
  setup: (props, { emit, expose }) => {
    const selectedDevices = shallowRef<DeviceSelectRecord[]>([]);
    const deviceSelectModalRef = shallowRef<DeviceSelectModalExpose | null>(null);

    const saveAssociation = async (devices: DeviceSelectRecord[]): Promise<boolean> => {
      selectedDevices.value = devices;
      try {
        await Promise.all(
          selectedDevices.value.map((record) =>
            createFirePoint({
              fireManageDeviceId: props.hostId,
              deviceId: record.id ?? record.deviceId ?? record.code ?? "",
              pointName: record.name,
              ...(record.productInfo?.brandName || record.brand ? { brandName: record.productInfo?.brandName ?? record.brand } : {}),
              code: record.code,
            }),
          ),
        );
        emit("saved");
        message.success(`已关联 ${selectedDevices.value.length} 个设备`);
        return true;
      } catch (error) {
        message.error((error as Error).message || "关联设备失败");
        return false;
      }
    };

    const openModal = (): void => {
      selectedDevices.value = [];
      deviceSelectModalRef.value?.openModal();
    };

    expose({ openModal });

    return () => (
      <DeviceSelectModal
        ref={deviceSelectModalRef}
        title="关联设备"
        selectedDevices={selectedDevices.value}
        pageSize={20}
        requireSelection
        footerTip="关联后回路、地址、编号及坐标默认留空，可在点位列表中编辑或导入补全"
        queryParams={{ filterTagCodes: ["builtin.app::fire-management"] }}
        submit={saveAssociation}
        onSelectionChange={(devices: DeviceSelectRecord[]) => (selectedDevices.value = devices)}
        onClosed={() => (selectedDevices.value = [])}
      />
    );
  },
});
