import { Button, Modal, Space, Tag, Textarea, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { loadFumigationWorkToCache } from "./api";
import { FixedActionFooter, InfoItem, SectionTitle, StatusTag } from "./components";
import { FumigationPageShell } from "./fumigation-page-shell";
import { type DispatchMapConfig, type MonitorPersonnelLocation } from "./monitor-dispatch";
import { MonitorLinkedDevicesPanel } from "./monitor-linked-devices-panel";
import { MonitorVideoPanel } from "./monitor-video-panel";
import { readQueryValue } from "./navigation-utils";
import { Ph3TrendChart } from "./ph3-trend-chart";
import {
  DEVICE_PROPERTY_CODES,
  canCompleteFumigationWork,
  fumigationState,
  getProperty,
  getWorkerCertificate,
  isCertificateExpired,
  upsertFumigationWork,
  type DeviceOption,
  type FumigationWork,
  type LinkedDevice,
} from "./state";
import { UwbMapPanel } from "./uwb-map";
import { resolveWorkWorkers, translateWorkerRole, sameSnowflakeId } from "./worker-utils";
import {
  completeFumigationWork,
  getFumigationDeviceMonitor,
  getFumigationDispatchMapConfig,
  listFumigationLinkedDevices,
  listFumigationMonitorPersonnelLocations,
  sendFumigationNotification,
  terminateFumigationWork,
} from "@/api/fumigation-client";

import "./fumigation.less";

export const FumigationMonitorBoard = defineComponent({
  name: "FumigationMonitorBoard",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const selectedWorkId = ref(readQueryValue(route.query.workId));
    const selectedCameraId = ref("");
    const completeVisible = ref(false);
    const completionDescription = ref("");
    const notificationVisible = ref(false);
    const notificationContent = ref("");
    const notificationLoading = ref(false);
    const monitorDevice = shallowRef<DeviceOption | undefined>();
    const linkedDevices = shallowRef<LinkedDevice[]>([]);
    const mapConfig = shallowRef<DispatchMapConfig | null>(null);
    const personnelLocations = shallowRef<MonitorPersonnelLocation[]>([]);
    const monitorLoading = ref(false);

    void getFumigationDispatchMapConfig().then((config) => {
      if (mapConfig.value == null) {
        mapConfig.value = config;
      }
    });

    const currentWork = computed<FumigationWork | undefined>(() =>
      fumigationState.works.find((work) => sameSnowflakeId(work.id, selectedWorkId.value)),
    );
    const pageTitle = computed(() => currentWork.value?.code ?? "监护看板");
    const currentWorkers = computed(() => resolveWorkWorkers(currentWork.value));
    const loadMonitorSources = async (work: FumigationWork | undefined): Promise<void> => {
      if (work == null || work.deviceId.trim() === "") {
        monitorDevice.value = undefined;
        linkedDevices.value = [];
        personnelLocations.value = [];
        return;
      }
      monitorLoading.value = true;
      try {
        const [device, locations, dispatchMapConfig, linked] = await Promise.all([
          getFumigationDeviceMonitor(work.deviceId) as Promise<DeviceOption>,
          listFumigationMonitorPersonnelLocations(work.workers.map((person) => person.userId)),
          mapConfig.value ?? getFumigationDispatchMapConfig(),
          listFumigationLinkedDevices(work.deviceId),
        ]);
        monitorDevice.value = device;
        linkedDevices.value = linked as LinkedDevice[];
        personnelLocations.value = locations;
        mapConfig.value = dispatchMapConfig;
        selectedCameraId.value = device.cameras?.[0]?.id ?? "";
      } catch (error) {
        monitorDevice.value = undefined;
        linkedDevices.value = [];
        personnelLocations.value = [];
        message.error((error as Error).message || "获取监护数据失败");
      } finally {
        monitorLoading.value = false;
      }
    };

    const loadWorkDetail = (workId: string): void => {
      if (workId === "") {
        return;
      }
      void loadFumigationWorkToCache(workId)
        .then(loadMonitorSources)
        .catch((error: unknown) => {
          message.error((error as Error).message || "获取作业详情失败");
        });
    };

    const valueOf = (code: (typeof DEVICE_PROPERTY_CODES)[keyof typeof DEVICE_PROPERTY_CODES]): string => {
      const item = getProperty(monitorDevice.value, code);
      if (item == null || item.value == null || !Number.isFinite(Number(item.value))) {
        return "--";
      }
      const unit = item.unit?.trim() ?? "";
      return unit === "" ? `${item.value}` : `${item.value} ${unit}`;
    };

    const handleComplete = (): void => {
      const work = currentWork.value;
      if (work == null) {
        return;
      }
      void completeFumigationWork(work.id, { description: completionDescription.value })
        .then((updated) => {
          upsertFumigationWork(updated as FumigationWork);
          completeVisible.value = false;
          completionDescription.value = "";
          message.success("作业已正常完工并归档");
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "正常完工失败");
        });
    };

    const handleTerminate = (): void => {
      const work = currentWork.value;
      if (work == null) {
        return;
      }
      void terminateFumigationWork(work.id, { reason: "监护看板强制终止" })
        .then((updated) => {
          upsertFumigationWork(updated as FumigationWork);
          message.warning("作业已终止并自动归档");
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "终止作业失败");
        });
    };

    const openNotificationModal = (): void => {
      const work = currentWork.value;
      if (work == null) {
        return;
      }
      if (work.status === "ARCHIVED") {
        message.warning("作业已完工归档，无法发送通知");
        return;
      }
      const workers = resolveWorkWorkers(work);
      if (workers.length === 0) {
        message.warning("当前作业暂无人员，无法发送通知");
        return;
      }
      notificationVisible.value = true;
    };

    const handleSendNotification = (): void => {
      const work = currentWork.value;
      const content = notificationContent.value.trim();
      if (work == null) {
        return;
      }
      if (content === "") {
        message.warning("请填写通知内容");
        return;
      }
      const receiverUserIds = (work.workers ?? []).map((person) => String(person.userId ?? "").trim()).filter((userId) => userId !== "");
      if (receiverUserIds.length === 0) {
        message.warning("当前作业暂无有效接收人");
        return;
      }
      notificationLoading.value = true;
      void sendFumigationNotification(work.id, { receiverUserIds, content })
        .then(() => {
          notificationVisible.value = false;
          notificationContent.value = "";
          message.success("通知已发送");
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "发送通知失败");
        })
        .finally(() => {
          notificationLoading.value = false;
        });
    };

    watch(
      () => currentWork.value?.code,
      (code) => {
        if (code != null && code !== "") {
          route.meta.title = code;
        }
      },
      { immediate: true },
    );

    watch(
      () => route.query.workId,
      (workId) => {
        const nextWorkId = readQueryValue(workId);
        if (nextWorkId === "") {
          return;
        }
        selectedWorkId.value = nextWorkId;
        loadWorkDetail(nextWorkId);
      },
    );

    onMounted(() => {
      if (selectedWorkId.value !== "") {
        loadWorkDetail(selectedWorkId.value);
        return;
      }
      message.warning("缺少作业编号，请从列表进入监护看板");
    });

    const renderDetailContent = (work: FumigationWork | undefined): JSX.Element => {
      const device = monitorDevice.value;
      const workers = currentWorkers.value;
      if (work == null) {
        return <div class="fumigation-empty">暂无监护作业</div>;
      }
      return (
        <div class="fumigation-monitor-layout">
          <div class="fumigation-monitor-column">
            <div class="fumigation-panel">
              <SectionTitle title="仓内气体" extra={monitorLoading.value ? <Tag color="blue">加载中</Tag> : undefined} />
              <div class="fumigation-grid">
                <InfoItem label="仓内 PH3" value={valueOf(DEVICE_PROPERTY_CODES.ph3Indoor)} />
                <InfoItem label="仓外 PH3" value={valueOf(DEVICE_PROPERTY_CODES.ph3Outdoor)} />
                <InfoItem label="入口 PH3" value={valueOf(DEVICE_PROPERTY_CODES.ph3Entrance)} />
              </div>
            </div>
            <div class="fumigation-panel">
              <SectionTitle title="近 30 分钟仓内 PH3 趋势" />
              <Ph3TrendChart points={device?.indoorPh3Trend ?? []} />
            </div>
            <div class="fumigation-panel">
              <SectionTitle title="作业人员" />
              <div class="fumigation-worker-list">
                {workers.map((worker) => {
                  const cert = getWorkerCertificate(worker);
                  return (
                    <div class="fumigation-worker-card" key={worker.id}>
                      <div class="fumigation-worker-name">
                        <span>{worker.name}</span>
                        <Tag color={isCertificateExpired(cert) ? "orange" : "green"}>{translateWorkerRole(worker.role)}</Tag>
                      </div>
                      <InfoItem label="部门" value={worker.department || "--"} />
                      <InfoItem label="电话" value={worker.phone || "--"} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div class="fumigation-monitor-column">
            <div class="fumigation-panel">
              <SectionTitle title="UWB 定位" />
              <UwbMapPanel
                mapConfig={mapConfig.value}
                personnel={personnelLocations.value}
                areaLabel={device?.locationName ?? work.warehouseName ?? "作业区域"}
              />
            </div>
            <div class="fumigation-panel">
              <SectionTitle title="事件时间线" />
              <div class="fumigation-timeline">
                {(device?.alarmFlow ?? []).length === 0 ? (
                  <div class="fumigation-empty">暂无事件</div>
                ) : (
                  (device?.alarmFlow ?? []).map((item) => (
                    <div class="fumigation-timeline-item" key={item.id}>
                      <div class="fumigation-timeline-time">{item.time}</div>
                      <div>
                        <div class="fumigation-timeline-title">{item.title}</div>
                        <div class="fumigation-timeline-desc">
                          {item.handler}：{item.result}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div class="fumigation-panel fumigation-monitor-spacer" />
          </div>

          <div class="fumigation-monitor-column">
            <div class="fumigation-panel">
              <SectionTitle title="AI视频监护" extra={monitorLoading.value ? <Tag color="blue">加载中</Tag> : undefined} />
              <MonitorVideoPanel
                cameras={device?.cameras ?? []}
                selectedCameraId={selectedCameraId.value}
                onUpdate:selectedCameraId={(value: string) => {
                  selectedCameraId.value = value;
                }}
              />
            </div>
            <div class="fumigation-panel">
              <SectionTitle title="关联设备" extra={monitorLoading.value ? <Tag color="blue">加载中</Tag> : undefined} />
              <MonitorLinkedDevicesPanel devices={linkedDevices.value} />
            </div>
            <div class="fumigation-panel fumigation-monitor-spacer" />
          </div>
        </div>
      );
    };

    return (): JSX.Element => {
      const work = currentWork.value;
      return (
        <>
          <FumigationPageShell
            title={pageTitle.value}
            showFooter={true}
            v-slots={{
              "layout-header": () => (work != null ? <StatusTag status={work.status} /> : null),
              "layout-content": () => renderDetailContent(work),
              "footer-page": () => (
                <FixedActionFooter>
                  <Space>
                    <Button
                      onClick={() => {
                        void router.push({ name: "fumigation-work-list" });
                      }}
                    >
                      返回列表
                    </Button>
                    <Button
                      disabled={work == null || work.status === "ARCHIVED" || currentWorkers.value.length === 0}
                      onClick={openNotificationModal}
                    >
                      发送通知
                    </Button>
                    <Button
                      type="primary"
                      class="fumigation-btn-complete"
                      disabled={work == null || !canCompleteFumigationWork(work)}
                      onClick={() => {
                        completeVisible.value = true;
                      }}
                    >
                      正常完工
                    </Button>
                    <Button type="primary" danger disabled={work == null || work.status === "ARCHIVED"} onClick={handleTerminate}>
                      终止作业
                    </Button>
                  </Space>
                </FixedActionFooter>
              ),
            }}
          />
          <Modal
            title="正常完工"
            open={completeVisible.value}
            okText="确认完工"
            cancelText="取消"
            onCancel={() => {
              completeVisible.value = false;
            }}
            onOk={handleComplete}
          >
            <Textarea
              rows={4}
              value={completionDescription.value}
              placeholder="正常完工时填写描述信息（选填）"
              onUpdate:value={(value: string) => {
                completionDescription.value = value;
              }}
            />
          </Modal>
          <Modal
            title="发送通知"
            open={notificationVisible.value}
            okText="发送"
            cancelText="取消"
            confirmLoading={notificationLoading.value}
            onCancel={() => {
              notificationVisible.value = false;
            }}
            onOk={handleSendNotification}
          >
            <div class="fumigation-notification-modal">
              <div class="fumigation-notification-receivers">
                接收人：{currentWorkers.value.map((worker) => worker.name).join("、") || "--"}
              </div>
              <Textarea
                rows={4}
                value={notificationContent.value}
                placeholder="请输入通知内容"
                onUpdate:value={(value: string) => {
                  notificationContent.value = value;
                }}
              />
            </div>
          </Modal>
        </>
      );
    };
  },
});
