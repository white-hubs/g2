import type { WarehouseSafetyForklift } from "@g2-contract/warehouse-safety";
import type { GHIotSocket } from "@g2-platform/pc-iot-socket";
import type { InteractiveMap as CubeMapLeaflet } from "@g2-platform/pc-map";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import { authStore } from "@/api/auth-store";
import { getDispatchMapCenter } from "@/api/dispatch-map-config";
import { CubeLayout } from "@/compat/legacy-components";
import { Button, Empty, Spin, Table, message } from "@/pc-ui-runtime";
import { pageWarehouseAlarmRecords, type WarehouseAlarmRecord } from "@/services/alarm-center-api";
import { warehouseSafetyApi } from "@/services/warehouse-safety-api";
import { emptyText, formatDateTime } from "@/utils/format";

import styles from "./forklift-monitor.module.less";

const defaultCenter = { lng: 114.362, lat: 30.522 };
const defaultZoom = 16;
const mapId = "warehouse-forklift-monitor-map";

type Layer = { remove?: () => void };
type MarkerLayer = Layer & {
  addTo: (map: unknown) => MarkerLayer;
};

interface RuntimeState {
  online?: boolean;
  normal?: boolean;
  lng?: number;
  lat?: number;
  onlineText?: string;
  props: Record<string, unknown>;
}

const readValue = (props: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = props[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const ForkliftMonitor = defineComponent({
  name: "ForkliftMonitor",
  setup() {
    const forklifts = ref<WarehouseSafetyForklift[]>([]);
    const runtimes = ref<Record<string, RuntimeState>>({});
    const alarms = ref<WarehouseAlarmRecord[]>([]);
    const alarmTotal = ref(0);
    const loading = ref(false);
    const alarmLoading = ref(false);
    const mapLoading = ref(true);
    const mapError = ref("");
    const forkliftPageNumber = ref(1);
    const forkliftPageSize = ref(4);
    const forkliftTotal = ref(0);
    const forkliftListRef = ref<HTMLDivElement | null>(null);
    const switchingForkliftPage = ref(false);
    const mapRef = ref<CubeMapLeaflet | null>(null);
    const layers = ref<Layer[]>([]);
    const mapCenter = ref(defaultCenter);
    let iotSocket: GHIotSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socketConnecting = false;
    let socketRetryCount = 0;
    let destroyed = false;

    const onlineCount = computed(() => forklifts.value.filter((item) => runtimes.value[item.deviceId ?? ""]?.online).length);
    const normalCount = computed(() => forklifts.value.filter((item) => runtimes.value[item.deviceId ?? ""]?.normal).length);
    const forkliftTotalPages = computed(() => Math.max(1, Math.ceil(forkliftTotal.value / forkliftPageSize.value)));

    const clearLayers = (): void => {
      const map = mapRef.value?.getMapInstance();
      layers.value.forEach((layer) => {
        try {
          map?.removeLayer(layer as never);
        } catch {
          layer.remove?.();
        }
      });
      layers.value = [];
    };

    const markerContent = (record: WarehouseSafetyForklift, runtime: RuntimeState | undefined, index: number): string => {
      const className = runtime?.online === true ? "" : "offline";
      const status = runtime?.online === true ? "在线" : "离线";
      return `
        <div class="warehouse-forklift-marker ${className}">
          <div class="warehouse-forklift-marker-label">
            <strong>${escapeHtml(record.code || record.name || `FC-${index + 1}`)}</strong>
            <span class="warehouse-forklift-marker-dot"></span>
            <span>${escapeHtml(status)}</span>
          </div>
          <div class="warehouse-forklift-marker-pin">${index + 1}</div>
        </div>
      `;
    };

    const fallbackPoint = (index: number): { lng: number; lat: number } => ({
      lng: mapCenter.value.lng + (index % 5) * 0.0018,
      lat: mapCenter.value.lat + Math.floor(index / 5) * 0.0014,
    });

    const resolveForkliftPoint = (
      record: WarehouseSafetyForklift,
      runtime: RuntimeState | undefined,
      index: number,
    ): { lng: number; lat: number; fromDevice: boolean } => {
      const deviceLng = toNumber(record.longitude);
      const deviceLat = toNumber(record.latitude);
      if (deviceLng !== undefined && deviceLat !== undefined) {
        return { lng: deviceLng, lat: deviceLat, fromDevice: true };
      }
      if (runtime?.lng !== undefined && runtime.lat !== undefined) {
        return { lng: runtime.lng, lat: runtime.lat, fromDevice: false };
      }
      return { ...fallbackPoint(index), fromDevice: false };
    };

    const invalidateMapSize = (): void => {
      try {
        mapRef.value?.getMapInstance().invalidateSize(true);
      } catch {
        // ignore map resize errors
      }
    };

    const renderMarkers = (): void => {
      const plugin = mapRef.value;
      if (!plugin) {
        return;
      }
      clearLayers();
      forklifts.value.forEach((record, index) => {
        const runtime = runtimes.value[record.deviceId ?? ""];
        const point = resolveForkliftPoint(record, runtime, index);
        const marker = plugin.createMarker({
          position: point,
          iconSize: [150, 68],
          content: markerContent(record, runtime, index),
        }) as MarkerLayer;
        marker.addTo(plugin.getMapInstance());
        layers.value.push(marker);
      });
    };

    const safeRenderMarkers = (): void => {
      try {
        renderMarkers();
        if (mapError.value === "GIS叉车点位渲染失败") {
          mapError.value = "";
        }
      } catch {
        mapError.value = "GIS叉车点位渲染失败";
      }
    };

    const initMap = async (): Promise<void> => {
      mapLoading.value = true;
      try {
        await nextTick();
        const { InteractiveMap } = await loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
        const plugin = new InteractiveMap();
        mapRef.value = plugin;
        const center = (await getDispatchMapCenter().catch(() => null)) ?? defaultCenter;
        mapCenter.value = center;
        await plugin.renderMap(mapId, { center, zoomControl: true });
        plugin.getMapInstance().setZoom(defaultZoom);
        invalidateMapSize();
        safeRenderMarkers();
        if (forklifts.value.length) {
          void initSocket(true);
        }
      } catch {
        mapError.value = "GIS地图加载失败，请检查地图服务配置";
      } finally {
        mapLoading.value = false;
      }
    };

    const normalizeRuntime = (props: Record<string, unknown>): RuntimeState => {
      const lng = toNumber(readValue(props, ["lng", "lon", "longitude", "Longitude", "LONGITUDE"]));
      const lat = toNumber(readValue(props, ["lat", "latitude", "Latitude", "LATITUDE"]));
      const onlineRaw = readValue(props, ["online", "onlineState", "deviceOnline"]);
      const workNormalRaw = readValue(props, ["zczy"]);
      const online = onlineRaw === undefined ? true : ["true", "1", "ONLINE", "online", "在线"].includes(String(onlineRaw));
      const normal = ["true", "1", "YES", "NORMAL", "normal", "正常", "正常作业"].includes(String(workNormalRaw));
      return {
        online,
        normal,
        lng,
        lat,
        onlineText: online ? "在线" : "离线",
        props,
      };
    };

    const loadDeviceSnapshots = async (): Promise<void> => {
      if (!authStore.token) {
        return;
      }
      const propKeys: string[] = [];
      for (const forklift of forklifts.value) {
        if (!forklift.deviceId) {
          continue;
        }
        try {
          const detail = await iotSocket?.deviceDetail({
            deviceId: forklift.deviceId,
            withSnapShot: true,
            withPropertySpec: true,
          });
          const props = Object.fromEntries(
            (detail?.dataArr ?? []).map((item: { attributeCode: string; value: unknown }) => [item.attributeCode, item.value]),
          );
          runtimes.value = {
            ...runtimes.value,
            [forklift.deviceId]: normalizeRuntime(props),
          };
          (detail?.dataArr ?? []).forEach((item: { attributeCode: string }) => {
            propKeys.push(`${forklift.deviceId}.${item.attributeCode}`);
          });
        } catch {
          runtimes.value = {
            ...runtimes.value,
            [forklift.deviceId]: { online: false, normal: false, onlineText: "离线", props: {} },
          };
        }
      }
      if (propKeys.length > 0) {
        iotSocket?.subscribeEvent("SUBSCRIBE", {
          subscribeTTSWithSecond: 500 * 60,
          subscribeMsgTypes: [
            {
              key: "DEVICE_PROP",
              val: {
                changeNotify: false,
                deviceIdAndPropCode: propKeys,
              },
            },
          ],
        });
      }
      safeRenderMarkers();
    };

    const handleSocketMessage = (messageContent: { msgType: string; content: string }): void => {
      if (messageContent.msgType !== "SUBSCRIBE_PUSH") {
        return;
      }
      try {
        const updates = JSON.parse(messageContent.content).msg.updates as Array<{ key: string; value: unknown }>;
        const next = { ...runtimes.value };
        updates.forEach((item) => {
          const [deviceId, propCode] = String(item.key).split(".");
          if (!deviceId || !propCode) {
            return;
          }
          const props = { ...next[deviceId]?.props, [propCode]: item.value };
          next[deviceId] = normalizeRuntime(props);
        });
        runtimes.value = next;
        safeRenderMarkers();
      } catch {
        // ignore malformed push payload
      }
    };

    const clearSocketReconnect = (): void => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const disposeSocket = (): void => {
      try {
        iotSocket?.unsubscribe();
      } catch {
        // ignore socket cleanup errors
      }
      try {
        iotSocket?.dispose();
      } catch {
        // ignore socket cleanup errors
      }
      iotSocket = undefined;
    };

    const scheduleSocketReconnect = (delay?: number): void => {
      if (destroyed) {
        return;
      }
      clearSocketReconnect();
      const nextDelay = delay ?? Math.min(30000, 3000 + socketRetryCount * 2000);
      reconnectTimer = setTimeout(() => {
        void initSocket(true);
      }, nextDelay);
    };

    const openAlarmDetail = (record: WarehouseAlarmRecord): void => {
      const target = `/d/warehouse-safety/alarmDetail?businessKey=${record.businessKey ?? ""}&alarmStatus=${record.alarmStatus ?? ""}&type=detail&id=${record.id}`;
      history.pushState({ current: location.pathname + location.search }, "", target);
    };

    const initSocket = async (force = false): Promise<void> => {
      if (destroyed || socketConnecting) {
        return;
      }
      if (!forklifts.value.length) {
        disposeSocket();
        clearSocketReconnect();
        return;
      }
      if (!authStore.token) {
        scheduleSocketReconnect();
        return;
      }
      if (!authStore.tenant) {
        scheduleSocketReconnect();
        return;
      }
      socketConnecting = true;
      try {
        if (force || !iotSocket) {
          disposeSocket();
          const { GHIotSocket: RuntimeGHIotSocket } = await loadRuntimeCommon<typeof import("@g2-platform/pc-iot-socket")>(
            "pcIotSocket",
            "index",
          );
          iotSocket = new RuntimeGHIotSocket({ ...authStore, terminal: "bimops-manage-web", accessToken: authStore.token });
          iotSocket.onmessage(handleSocketMessage);
        }
        await loadDeviceSnapshots();
        socketRetryCount = 0;
        clearSocketReconnect();
      } catch {
        socketRetryCount += 1;
        message.warning("物联实时通道连接失败，正在重试");
        scheduleSocketReconnect();
      } finally {
        socketConnecting = false;
      }
    };

    const handleSocketReconnect = (): void => {
      socketRetryCount = 0;
      void initSocket(true);
    };

    const handleVisibilityReconnect = (): void => {
      if (document.visibilityState === "visible") {
        handleSocketReconnect();
      }
    };

    const loadForklifts = async (pageNumber = 1): Promise<void> => {
      loading.value = true;
      switchingForkliftPage.value = true;
      let loaded = false;
      try {
        const forkliftPage = await warehouseSafetyApi.pageForklifts({ pageNumber, pageSize: forkliftPageSize.value });
        disposeSocket();
        runtimes.value = {};
        forklifts.value = (forkliftPage.records ?? []).filter((item) => Boolean(item.deviceId));
        forkliftTotal.value = forkliftPage.total ?? forklifts.value.length;
        forkliftPageNumber.value = pageNumber;
        loaded = true;
      } catch {
        message.error("叉车数据加载失败");
      } finally {
        loading.value = false;
        switchingForkliftPage.value = false;
      }
      if (!loaded) {
        return;
      }
      await nextTick();
      if (forkliftListRef.value) {
        forkliftListRef.value.scrollTop = 0;
      }
      safeRenderMarkers();
      if (mapRef.value) {
        void initSocket(true);
      }
    };

    const switchForkliftPage = async (page: number): Promise<void> => {
      if (page === forkliftPageNumber.value || page < 1 || page > forkliftTotalPages.value) {
        return;
      }
      await loadForklifts(page);
    };

    const handleForkliftScroll = (event: Event): void => {
      if (switchingForkliftPage.value) {
        return;
      }
      const target = event.currentTarget as HTMLDivElement;
      if (target.scrollTop + target.clientHeight < target.scrollHeight - 8) {
        return;
      }
      void switchForkliftPage(forkliftPageNumber.value + 1);
    };

    const handleForkliftWheel = (event: WheelEvent): void => {
      if (switchingForkliftPage.value || forkliftTotalPages.value <= 1) {
        return;
      }
      if (event.deltaY > 0 && forkliftPageNumber.value < forkliftTotalPages.value) {
        event.preventDefault();
        void switchForkliftPage(forkliftPageNumber.value + 1);
      }
      if (event.deltaY < 0 && forkliftPageNumber.value > 1) {
        event.preventDefault();
        void switchForkliftPage(forkliftPageNumber.value - 1);
      }
    };

    const loadAlarms = async (): Promise<void> => {
      alarmLoading.value = true;
      try {
        const alarmPage = await pageWarehouseAlarmRecords({ pageSize: 5 });
        alarms.value = alarmPage.records ?? [];
        alarmTotal.value = alarmPage.total ?? 0;
      } catch {
        alarms.value = [];
        alarmTotal.value = 0;
        message.error("告警列表加载失败");
      } finally {
        alarmLoading.value = false;
      }
    };

    const loadData = async (): Promise<void> => {
      void initMap();
      await Promise.all([loadForklifts(1), loadAlarms()]);
    };

    const alarmColumns = [
      {
        title: "报警事件",
        dataIndex: "alarmEventName",
        ellipsis: true,
        customRender: ({ record }: { record: WarehouseAlarmRecord }) => emptyText(record.alarmEventName),
      },
      {
        title: "级别",
        dataIndex: "alarmLevelName",
        width: 100,
        customRender: ({ record }: { record: WarehouseAlarmRecord }) => emptyText(record.alarmLevelName || record.alarmLevelCode),
      },
      {
        title: "报警对象",
        dataIndex: "alarmTargetName",
        width: 160,
        ellipsis: true,
      },
      {
        title: "报警时间",
        dataIndex: "alarmTime",
        width: 180,
        customRender: ({ record }: { record: WarehouseAlarmRecord }) => formatDateTime(record.alarmTime),
      },
      {
        title: "操作",
        dataIndex: "actions",
        width: 100,
        fixed: "right" as const,
        customRender: ({ record }: { record: WarehouseAlarmRecord }) => (
          <Button type="link" onClick={() => openAlarmDetail(record)}>
            详情
          </Button>
        ),
      },
    ];

    onMounted(async () => {
      await loadData();
      window.addEventListener("online", handleSocketReconnect);
      window.addEventListener("pageshow", handleSocketReconnect);
      document.addEventListener("visibilitychange", handleVisibilityReconnect);
    });

    onBeforeUnmount(() => {
      destroyed = true;
      clearSocketReconnect();
      window.removeEventListener("online", handleSocketReconnect);
      window.removeEventListener("pageshow", handleSocketReconnect);
      document.removeEventListener("visibilitychange", handleVisibilityReconnect);
      clearLayers();
      disposeSocket();
      mapRef.value?.destroy();
      mapRef.value = null;
    });

    return (): JSX.Element => (
      <div class={styles.page}>
        <CubeLayout
          title="叉车作业监测"
          subTitle="基于叉车管理关联设备订阅物联实时属性，在 GIS 地图展示叉车作业状态"
          v-slots={{
            "layout-content": () => (
              <div class={styles.content}>
                <div class={styles.stats}>
                  <div class={styles.statCard}>
                    <div class={styles.statLabel}>在线叉车</div>
                    <div class={styles.statValue}>{onlineCount.value}</div>
                  </div>
                  <div class={styles.statCard}>
                    <div class={styles.statLabel}>正常作业</div>
                    <div class={styles.statValue}>{normalCount.value}</div>
                  </div>
                  <div class={styles.statCard}>
                    <div class={styles.statLabel}>预警中</div>
                    <div class={styles.statValue}>{alarmTotal.value}</div>
                  </div>
                </div>
                <div class={styles.mainGrid}>
                  <div class={styles.mapCard}>
                    <div class={styles.cardHeader}>
                      <span class={styles.cardTitle}>GIS 实时监控</span>
                    </div>
                    <div class={styles.mapWrapper}>
                      <div id={mapId} class={styles.map} />
                      {(mapLoading.value || loading.value) && (
                        <div class={styles.mapOverlay}>
                          <Spin spinning />
                        </div>
                      )}
                      {mapError.value && <div class={styles.mapOverlay}>{mapError.value}</div>}
                    </div>
                  </div>
                  <div class={styles.sideCard}>
                    <div class={styles.cardHeader}>
                      <span class={styles.cardTitle}>叉车状态</span>
                    </div>
                    <div ref={forkliftListRef} class={styles.forkliftList} onScroll={handleForkliftScroll} onWheel={handleForkliftWheel}>
                      {forklifts.value.length === 0 ? (
                        <Empty description="暂无关联设备的叉车" />
                      ) : (
                        forklifts.value.map((item) => {
                          const runtime = runtimes.value[item.deviceId ?? ""];
                          const online = runtime?.online === true;
                          const point = resolveForkliftPoint(item, runtime, 0);
                          return (
                            <div class={styles.forkliftItem} key={item.id}>
                              <div class={styles.itemTop}>
                                <span class={styles.itemName}>{item.name || item.code}</span>
                                <span class={[styles.statusBadge, online ? styles.statusOnline : styles.statusOffline]}>
                                  {online ? "在线" : "离线"}
                                </span>
                              </div>
                              <div class={styles.itemMeta}>设备：{item.deviceName || item.deviceCode || "--"}</div>
                              <div class={styles.itemMeta}>状态：{online ? "在线" : "离线"}</div>
                              <div class={styles.itemMeta}>
                                定位：
                                {point.fromDevice ? `${point.lng}, ${point.lat}` : "未配置设备坐标"}
                              </div>
                              <div class={styles.itemMeta}>区域：{item.areaName || "--"}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
                <div class={styles.alarmCard}>
                  <div class={styles.cardHeader}>
                    <span class={styles.cardTitle}>告警列表</span>
                    <span>默认显示 5 条</span>
                  </div>
                  <Table
                    rowKey="id"
                    columns={alarmColumns}
                    dataSource={alarms.value}
                    loading={alarmLoading.value}
                    locale={{ emptyText: "暂无数据" }}
                    pagination={false}
                    scroll={{ x: 860 }}
                  />
                </div>
              </div>
            ),
          }}
        />
      </div>
    );
  },
});
