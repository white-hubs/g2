import { DeviceKind, type FacilityDetail, type FacilityDevice } from "@g2-contract/electrical-safety";
import { AntModal, Button, Drawer, Form, FormItem, Space, TabPane, Tabs, Tag, message, usePcTable } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent, shallowRef, watch } from "vue";

import { DeviceAssociationModal } from "./device-association-modal";
import { DeviceConfigModal } from "./device-config-modal";
import { getFireResistanceColor } from "./fire-resistance";
import { associateFacilityDevices, listFacilityDevices, removeFacilityDevice } from "@/api/electrical-safety";

const deviceKindLabels: Record<DeviceKind, string> = {
  [DeviceKind.ELECTRICAL]: "电气设备",
  [DeviceKind.ENVIRONMENT]: "环境监测",
  [DeviceKind.VIDEO]: "视频监控",
};

const deviceKinds = [DeviceKind.ELECTRICAL, DeviceKind.ENVIRONMENT, DeviceKind.VIDEO];

const emptyDeviceCounts = (): Record<DeviceKind, number> => ({
  [DeviceKind.ELECTRICAL]: 0,
  [DeviceKind.ENVIRONMENT]: 0,
  [DeviceKind.VIDEO]: 0,
});

const emptyDeviceLists = (): Record<DeviceKind, FacilityDevice[]> => ({
  [DeviceKind.ELECTRICAL]: [],
  [DeviceKind.ENVIRONMENT]: [],
  [DeviceKind.VIDEO]: [],
});

export const FacilityDetailDrawer = defineComponent({
  name: "FacilityDetailDrawer",
  props: {
    open: { type: Boolean, required: true },
    facility: { type: Object as PropType<FacilityDetail | null>, default: null },
  },
  emits: {
    close: (): boolean => true,
    changed: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const activeDeviceKind = shallowRef(DeviceKind.ELECTRICAL);
    const deviceLists = shallowRef<Record<DeviceKind, FacilityDevice[]>>(emptyDeviceLists());
    const devices = computed(() => deviceLists.value[activeDeviceKind.value]);
    const deviceCounts = shallowRef<Record<DeviceKind, number>>(emptyDeviceCounts());
    const associationOpen = shallowRef(false);
    const associationSubmitting = shallowRef(false);
    const configDevice = shallowRef<FacilityDevice | null>(null);
    let deviceListsRequestId = 0;

    const columns = [
      { title: "设备编码", dataIndex: "deviceCode", width: 150, customRender: ({ text }: { text: string | null }) => text || "--" },
      { title: "设备名称", dataIndex: "deviceName", width: 180, customRender: ({ text }: { text: string | null }) => text || "--" },
      {
        title: "产品品类",
        dataIndex: "productCategoryName",
        width: 150,
        customRender: ({ text }: { text: string | null }) => text || "--",
      },
      { title: "产品名称", dataIndex: "productName", width: 160, customRender: ({ text }: { text: string | null }) => text || "--" },
      { title: "品牌", dataIndex: "brandName", width: 120, customRender: ({ text }: { text: string | null }) => text || "--" },
      { title: "所属区域", dataIndex: "areaName", width: 180, customRender: ({ text }: { text: string | null }) => text || "--" },
      {
        title: "操作",
        dataIndex: "action",
        width: 140,
        fixed: "right" as const,
        customRender: ({ record }: { record: FacilityDevice }): JSX.Element => (
          <Space>
            {activeDeviceKind.value !== DeviceKind.VIDEO && (
              <Button type="link" size="small" onClick={() => (configDevice.value = record)}>
                配置
              </Button>
            )}
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                AntModal.confirm({
                  okText: "确定",
                  cancelText: "取消",
                  title: `确认移除设备“${record.deviceName || record.deviceCode || "未命名设备"}”？`,
                  content: "移除后只解除设备与当前设施的关联，不会删除设备。",
                  onOk: async () => {
                    if (!props.facility) {
                      return;
                    }

                    await removeFacilityDevice(props.facility!.id, record.deviceId);
                    message.success("设备关联已移除");
                    await loadFacilityDeviceLists();
                    emit("changed");
                  },
                });
              }}
            >
              移除
            </Button>
          </Space>
        ),
      },
    ];

    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-facility-detail-drawer",
      rowKey: "deviceId",
      columns,
      dataSource: [],
      pagination: false,
    });

    const loadFacilityDeviceLists = async (): Promise<void> => {
      const requestId = ++deviceListsRequestId;
      if (!props.open || !props.facility) {
        deviceLists.value = emptyDeviceLists();
        deviceCounts.value = emptyDeviceCounts();
        return;
      }
      const facilityId = props.facility.id;
      tableApi.loading.value = true;
      try {
        const [electricalDevices, environmentDevices, videoDevices] = await Promise.all([
          listFacilityDevices(facilityId, DeviceKind.ELECTRICAL),
          listFacilityDevices(facilityId, DeviceKind.ENVIRONMENT),
          listFacilityDevices(facilityId, DeviceKind.VIDEO),
        ]);
        if (requestId !== deviceListsRequestId || !props.open || props.facility?.id !== facilityId) {
          return;
        }
        deviceLists.value = {
          [DeviceKind.ELECTRICAL]: electricalDevices,
          [DeviceKind.ENVIRONMENT]: environmentDevices,
          [DeviceKind.VIDEO]: videoDevices,
        };
        deviceCounts.value = {
          [DeviceKind.ELECTRICAL]: electricalDevices.length,
          [DeviceKind.ENVIRONMENT]: environmentDevices.length,
          [DeviceKind.VIDEO]: videoDevices.length,
        };
        tableApi.setDataSource(devices.value);
      } catch {
        if (requestId === deviceListsRequestId && props.open && props.facility?.id === facilityId) {
          deviceLists.value = emptyDeviceLists();
          deviceCounts.value = emptyDeviceCounts();
          tableApi.setDataSource([]);
        }
      } finally {
        if (requestId === deviceListsRequestId) {
          tableApi.loading.value = false;
        }
      }
    };

    watch(
      () => [props.open, props.facility?.id] as const,
      ([open]) => {
        if (open) {
          void loadFacilityDeviceLists();
        } else {
          deviceLists.value = emptyDeviceLists();
          deviceCounts.value = emptyDeviceCounts();
          tableApi.setDataSource([]);
        }
      },
      { immediate: true },
    );

    watch(activeDeviceKind, () => {
      tableApi.setDataSource(devices.value);
    });

    watch(
      () => props.open,
      (open) => {
        if (!open) {
          activeDeviceKind.value = DeviceKind.ELECTRICAL;
        }
      },
    );

    const associateDevices = async (deviceIds: string[]): Promise<void> => {
      if (!props.facility) {
        return;
      }
      associationSubmitting.value = true;
      try {
        await associateFacilityDevices(props.facility!.id, {
          deviceKind: activeDeviceKind.value,
          deviceIds,
        });
        message.success("设备关联成功");
        associationOpen.value = false;
        await loadFacilityDeviceLists();
        emit("changed");
      } catch {
        // 网关已展示失败提示，保留关联弹窗供用户重试。
      } finally {
        associationSubmitting.value = false;
      }
    };

    return (): JSX.Element => (
      <>
        <Drawer
          open={props.open}
          title={props.facility ? `${props.facility.facilityName} · 设施详情` : "设施详情"}
          width={1040}
          class="facility-detail-drawer electrical-viewport-drawer"
          onClose={() => emit("close")}
        >
          {props.facility && (
            <div class="facility-detail-drawer-content">
              <div class="facility-info-title">基本信息</div>
              <Form class="facility-detail-form" layout="inline">
                <FormItem label="所属区域">{props.facility.areaName || "--"}</FormItem>
                <FormItem label="面积">{props.facility.floorArea == null ? "--" : `${props.facility.floorArea}㎡`}</FormItem>
                <FormItem label="责任人">{props.facility.responsibleName || "--"}</FormItem>
                <FormItem label="火灾危险性">
                  <Tag color="orange">{props.facility.fireRatingName || props.facility.fireRatingCode}</Tag>
                </FormItem>
                <FormItem label="耐火等级">
                  {props.facility.fireResistanceLevelName || props.facility.fireResistanceLevelCode ? (
                    <Tag
                      color={getFireResistanceColor(props.facility.fireResistanceLevelName || props.facility.fireResistanceLevelCode || "")}
                    >
                      {props.facility.fireResistanceLevelName || props.facility.fireResistanceLevelCode}
                    </Tag>
                  ) : (
                    "--"
                  )}
                </FormItem>
                <div class="facility-detail-remark">
                  <div class="facility-detail-remark-label">备注</div>
                  <div class="facility-detail-remark-content">{props.facility.remark || "--"}</div>
                </div>
              </Form>
              <div class="device-tabs-header">
                <Tabs activeKey={activeDeviceKind.value} onUpdate:activeKey={(value) => (activeDeviceKind.value = value as DeviceKind)}>
                  {deviceKinds.map((deviceKind) => (
                    <TabPane key={deviceKind} tab={`${deviceKindLabels[deviceKind]} ${deviceCounts.value[deviceKind]}`} />
                  ))}
                </Tabs>
                <Button type="primary" onClick={() => (associationOpen.value = true)}>
                  关联设备
                </Button>
              </div>
              <div class="facility-device-table">
                <CubeTable class="table-content" />
              </div>
            </div>
          )}
        </Drawer>
        {props.facility && (
          <>
            <DeviceAssociationModal
              open={associationOpen.value}
              deviceKind={activeDeviceKind.value as DeviceKind.ELECTRICAL | DeviceKind.ENVIRONMENT}
              associatedDeviceIds={devices.value.map((item) => String(item.deviceId))}
              submitting={associationSubmitting.value}
              onClose={() => (associationOpen.value = false)}
              onAssociate={(deviceIds: string[]) => void associateDevices(deviceIds)}
            />
            <DeviceConfigModal
              open={Boolean(configDevice.value)}
              facilityId={props.facility.id}
              deviceKind={activeDeviceKind.value as DeviceKind.ELECTRICAL | DeviceKind.ENVIRONMENT}
              device={configDevice.value}
              onClose={() => (configDevice.value = null)}
            />
          </>
        )}
      </>
    );
  },
});
