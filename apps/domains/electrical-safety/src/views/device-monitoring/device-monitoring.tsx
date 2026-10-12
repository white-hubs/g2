import type { ListMonitoringDevicesParams, MonitoringDevice, MonitoringFacility, MonitoringOverview } from "@g2-contract/electrical-safety";
import { CubePlayer } from "@g2-platform/pc-player";
import { Button, Card, Input, Modal, PageLayout, PcIcon, Select, Space, Spin, Tag, message, usePcTable } from "@g2-platform/pc-ui";
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { CardPanelConfig } from "./card-panel-config";
import { DeviceDetailModal } from "./device-detail-modal";
import { DeviceScadaModal } from "./device-scada-modal";
import { FacilityDeviceBindingModal } from "./facility-device-binding-modal";
import { FacilitySidebar } from "./facility-sidebar";
import { MonitorPanelConfigModal } from "./panel-config";
import {
  deleteFacilityScadaBinding,
  getDeviceRealtimeProperties,
  getFacilityScadaBinding,
  getMonitoringDevice,
  getMonitoringOverview,
  listMonitoringDevices,
  listMonitoringFacilities,
  saveFacilityScadaBinding,
} from "@/api/electrical-safety";
import { useDeviceRealtime } from "@/composables/use-device-realtime";
import { usePageFullscreen } from "@/composables/use-page-fullscreen";
import {
  type FacilityDeviceBindingSelection,
  type FacilityDeviceScadaData,
  type FacilityScadaBinding,
  buildFacilityScadaRuntimeBindings,
  loadFacilityScadaBindingFromServer,
  reconcileFacilityScadaBinding,
  shouldPromptFacilityScadaBind,
  toFacilityScadaBindingSaveRequest,
} from "@/utils/facility-scada-binding";
import { usePageName } from "@/utils/page-name";
import { type ScadaPageSummary, fetchFacilityRoomPages } from "@/utils/scada-pages";
import { ScadaPlaceholder } from "@/views/shared/scada-placeholder";
import { ScadaRuntimeView } from "@/views/shared/scada-runtime-view";

import "../shared/page.less";
import "./device-monitoring.less";

type MonitorView = "scada" | "card" | "list";

const FACILITY_PAGE_SIZE = 20;
const OVERVIEW_ITEM_MIN_WIDTH = 160;
const OVERVIEW_CAROUSEL_CONTROL_WIDTH = 76;
const statusColor = (status: string): string => {
  if (status === "ALARM" || status === "DANGER") {
    return "red";
  }
  if (status === "WARNING") {
    return "orange";
  }
  if (status === "UNKNOWN") {
    return "default";
  }
  return "green";
};

const getMonitorPointIcon = (propertyCode: string, propertyName: string): string => {
  const keyword = `${propertyCode}${propertyName}`.toLowerCase();
  if (keyword.includes("temp") || keyword.includes("温")) {
    return "icon-wendu";
  }
  if (keyword.includes("humidity") || keyword.includes("humid") || keyword.includes("湿")) {
    return "icon-shidu";
  }
  if (keyword.includes("smoke") || keyword.includes("烟")) {
    return "icon-yanwu";
  }
  if (keyword.includes("water") || keyword.includes("浸")) {
    return "icon-shuijin";
  }
  if (keyword.includes("voltage") || keyword.includes("电压")) {
    return "icon-jinxiandianya";
  }
  if (keyword.includes("power") || keyword.includes("负荷") || keyword.includes("功率")) {
    return "icon-gongshuaiyinshu";
  }
  return "icon-dianqishebei";
};

export const DeviceMonitoring = defineComponent({
  name: "DeviceMonitoring",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    const { isFullscreen, toggleFullscreen } = usePageFullscreen();
    const state = reactive({
      facilityId: typeof route.query.facilityId === "string" ? route.query.facilityId : "",
      facilityKeyword: "",
      deviceKeyword: "",
      productCode: "",
      onlineStatus: "",
      view: (route.query.view === "card" || route.query.view === "list" ? route.query.view : "scada") as MonitorView,
    });
    const facilities = shallowRef<MonitoringFacility[]>([]);
    const overview = shallowRef<MonitoringOverview | null>(null);
    const devices = shallowRef<MonitoringDevice[]>([]);
    const selectedDeviceId = shallowRef(typeof route.query.deviceId === "string" ? route.query.deviceId : "");
    const scadaModalDevice = shallowRef<MonitoringDevice | null>(null);
    const cardPanelConfigOpen = shallowRef(false);
    const monitorPanelConfigOpen = shallowRef(false);
    const cameraModalOpen = shallowRef(false);
    const facilitiesLoading = shallowRef(false);
    const facilityPage = shallowRef(1);
    const facilityHasMore = shallowRef(true);
    const overviewLoading = shallowRef(false);
    const overviewPage = shallowRef(0);
    const overviewPageSize = shallowRef(1);
    const overviewSummaryElement = shallowRef<HTMLElement | null>(null);
    const deviceLoading = shallowRef(false);
    const facilityRoomPages = shallowRef<ScadaPageSummary[]>([]);
    const facilityRoomPagesLoading = shallowRef(true);
    const facilityRoomPagesLoaded = shallowRef(false);
    const facilityScadaBindingLoading = shallowRef(false);
    const facilityScadaBindingLoadFailed = shallowRef(false);
    const facilityScadaBindingSaving = shallowRef(false);
    const boundScadaPageId = ref<string | null>(null);
    const facilityScadaBinding = shallowRef<FacilityScadaBinding | null>(null);
    const scadaBindModalOpen = shallowRef(false);
    const scadaDeviceBindingModalOpen = shallowRef(false);
    const pendingScadaPageId = ref<string | undefined>(undefined);
    const scadaDevices = shallowRef<MonitoringDevice[]>([]);
    const scadaDevicesLoading = shallowRef(false);
    const scadaDeviceData = shallowRef<Record<string, FacilityDeviceScadaData>>({});
    const scadaDeviceDataLoadingIds = shallowRef<string[]>([]);
    const promptedScadaFacilityIds = shallowRef<string[]>([]);
    let facilitiesRequestId = 0;
    let overviewRequestId = 0;
    let deviceRequestId = 0;
    let scadaDevicesRequestId = 0;
    let scadaDeviceDataVersion = 0;
    let facilityScadaBindingRequestId = 0;
    let facilityScadaBindingInitialized = false;
    let activeDeviceRequestKey = "";

    const facility = computed(() => facilities.value.find((item) => String(item.id) === state.facilityId) ?? null);
    const productOptions = computed(() =>
      [...new Map(devices.value.map((item) => [item.productCode, item.productName])).entries()].map(([value, label]) => ({
        value,
        label,
      })),
    );
    const overviewMonitorPoints = computed(() => overview.value?.monitorPoints ?? []);
    const overviewPageCount = computed(() => Math.max(1, Math.ceil(overviewMonitorPoints.value.length / overviewPageSize.value)));
    const visibleOverviewMonitorPoints = computed(() =>
      overviewMonitorPoints.value.slice(overviewPage.value * overviewPageSize.value, (overviewPage.value + 1) * overviewPageSize.value),
    );
    const boundScadaPage = computed(() => facilityRoomPages.value.find((page) => page.id === facilityScadaBinding.value?.pageId) ?? null);
    const scadaBindableElements = computed(() => boundScadaPage.value?.bindableElements ?? []);
    const scadaRuntimeBindings = computed(() => buildFacilityScadaRuntimeBindings(facilityScadaBinding.value, scadaDeviceData.value));
    const boundScadaDeviceCount = computed(
      () => scadaBindableElements.value.filter((element) => Boolean(facilityScadaBinding.value?.elementDeviceIds[element.id])).length,
    );
    const realtimeTargets = computed(() => [
      ...overviewMonitorPoints.value.map((property) => ({
        deviceId: String(property.deviceId),
        propertyCode: property.propertyCode,
      })),
      ...devices.value.flatMap((device) =>
        device.displayProperties.map((property) => ({
          deviceId: String(device.deviceId),
          propertyCode: property.propertyCode,
        })),
      ),
      ...Object.entries(scadaDeviceData.value).flatMap(([deviceId, data]) =>
        data.realtime.properties.map((property) => ({ deviceId, propertyCode: property.propertyCode })),
      ),
    ]);

    const { setTargets: setRealtimeTargets } = useDeviceRealtime((updates) => {
      const updateMap = new Map(updates.map((update) => [`${update.deviceId}.${update.propertyCode}`, update]));
      const mergeProperties = <
        T extends { deviceId: string | number; propertyCode: string; value: unknown; status: string; collectTime?: string | null },
      >(
        properties: T[],
      ): { properties: T[]; changed: boolean } => {
        let changed = false;
        const next = properties.map((property) => {
          const update = updateMap.get(`${String(property.deviceId)}.${property.propertyCode}`);
          if (!update) {
            return property;
          }
          changed = true;
          return {
            ...property,
            value: update.value,
            ...(update.status ? { status: update.status } : {}),
            ...(update.collectTime !== undefined ? { collectTime: update.collectTime } : {}),
          } as T;
        });
        return { properties: next, changed };
      };

      const nextOverview = overview.value ? mergeProperties(overview.value.monitorPoints) : null;
      if (overview.value && nextOverview?.changed) {
        overview.value = { ...overview.value, monitorPoints: nextOverview.properties };
      }

      let devicesChanged = false;
      const nextDevices = devices.value.map((device) => {
        const merged = mergeProperties(device.displayProperties);
        if (!merged.changed) {
          return device;
        }
        devicesChanged = true;
        return { ...device, displayProperties: merged.properties };
      });
      if (devicesChanged) {
        devices.value = nextDevices;
      }

      let scadaChanged = false;
      const nextScadaData = Object.fromEntries(
        Object.entries(scadaDeviceData.value).map(([deviceId, data]) => {
          const merged = mergeProperties(data.realtime.properties);
          if (!merged.changed) {
            return [deviceId, data];
          }
          scadaChanged = true;
          return [deviceId, { ...data, realtime: { ...data.realtime, properties: merged.properties } }];
        }),
      );
      if (scadaChanged) {
        scadaDeviceData.value = nextScadaData;
      }
    });

    watch(
      () =>
        realtimeTargets.value
          .map((target) => `${target.deviceId}.${target.propertyCode}`)
          .toSorted()
          .join("|"),
      () => setRealtimeTargets(realtimeTargets.value),
      { immediate: true },
    );
    const updateOverviewPageSize = (): void => {
      const width = overviewSummaryElement.value?.clientWidth ?? 0;
      if (!width) {
        return;
      }
      const nextPageSize = Math.max(1, Math.floor((width - OVERVIEW_CAROUSEL_CONTROL_WIDTH) / OVERVIEW_ITEM_MIN_WIDTH));
      if (nextPageSize === overviewPageSize.value) {
        return;
      }
      overviewPageSize.value = nextPageSize;
      overviewPage.value = Math.min(overviewPage.value, Math.max(0, Math.ceil(overviewMonitorPoints.value.length / nextPageSize) - 1));
    };
    let overviewResizeObserver: ResizeObserver | undefined;
    let overviewCarouselTimer: ReturnType<typeof setInterval> | undefined;
    const stopOverviewCarousel = (): void => {
      if (!overviewCarouselTimer) {
        return;
      }
      clearInterval(overviewCarouselTimer);
      overviewCarouselTimer = undefined;
    };
    const startOverviewCarousel = (): void => {
      if (overviewCarouselTimer) {
        return;
      }
      overviewCarouselTimer = setInterval(() => switchOverviewPage(1), 4000);
    };
    watch(overviewSummaryElement, (element) => {
      overviewResizeObserver?.disconnect();
      if (!element) {
        return;
      }
      overviewResizeObserver ??= new ResizeObserver(updateOverviewPageSize);
      overviewResizeObserver.observe(element);
      updateOverviewPageSize();
    });
    watch(overviewMonitorPoints, updateOverviewPageSize);
    onBeforeUnmount(() => {
      overviewResizeObserver?.disconnect();
      stopOverviewCarousel();
    });
    const openDevice = (deviceId: string): void => {
      selectedDeviceId.value = deviceId;
      syncQuery();
    };

    const openDeviceScada = (device: MonitoringDevice, event: MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      scadaModalDevice.value = device;
    };

    const syncQuery = (): void => {
      void router.replace({
        query: {
          facilityId: state.facilityId || undefined,
          view: state.view === "card" ? undefined : state.view,
          deviceId: selectedDeviceId.value || undefined,
        },
      });
    };

    const loadFacilities = async (reset = false): Promise<void> => {
      if (facilitiesLoading.value || (!reset && !facilityHasMore.value)) {
        return;
      }
      const requestId = ++facilitiesRequestId;
      if (reset) {
        facilityPage.value = 1;
        facilityHasMore.value = true;
        facilities.value = [];
      }
      facilitiesLoading.value = true;
      try {
        const keyword = state.facilityKeyword.trim();
        const result = await listMonitoringFacilities({
          pageNumber: facilityPage.value,
          pageSize: FACILITY_PAGE_SIZE,
          ...(keyword ? { keyword } : {}),
        });
        if (requestId !== facilitiesRequestId) {
          return;
        }
        const merged = reset ? result.records : [...facilities.value, ...result.records];
        facilities.value = [...new Map(merged.map((item) => [String(item.id), item])).values()];
        facilityHasMore.value = facilities.value.length < result.total && result.records.length > 0;
        facilityPage.value += 1;
        if (!state.facilityId && facilities.value[0]) {
          state.facilityId = String(facilities.value[0].id);
          syncQuery();
        }
      } catch {
        if (reset) {
          facilities.value = [];
          facilityHasMore.value = false;
        }
      } finally {
        if (requestId === facilitiesRequestId) {
          facilitiesLoading.value = false;
        }
      }
    };

    const searchFacilities = async (): Promise<void> => {
      state.facilityId = "";
      overviewRequestId += 1;
      deviceRequestId += 1;
      overview.value = null;
      overviewPage.value = 0;
      devices.value = [];
      overviewLoading.value = false;
      deviceLoading.value = false;
      activeDeviceRequestKey = "";
      selectedDeviceId.value = "";
      scadaModalDevice.value = null;
      await loadFacilities(true);
      await loadCurrentFacility();
    };

    const loadOverview = async (): Promise<void> => {
      if (!state.facilityId) {
        overview.value = null;
        overviewLoading.value = false;
        return;
      }
      const { facilityId } = state;
      const requestId = ++overviewRequestId;
      overviewLoading.value = true;
      try {
        const nextOverview = await getMonitoringOverview(facilityId);
        if (requestId !== overviewRequestId) {
          return;
        }
        const overviewRecord = nextOverview && typeof nextOverview === "object" && !Array.isArray(nextOverview) ? nextOverview : null;
        overview.value = overviewRecord
          ? {
              ...overviewRecord,
              monitorPoints: Array.isArray(overviewRecord.monitorPoints) ? overviewRecord.monitorPoints : [],
              cameras: Array.isArray(overviewRecord.cameras) ? overviewRecord.cameras : [],
            }
          : null;
        overviewPage.value = 0;
      } catch {
        if (requestId === overviewRequestId) {
          overview.value = null;
        }
      } finally {
        if (requestId === overviewRequestId) {
          overviewLoading.value = false;
        }
      }
    };

    const buildDeviceParams = (): ListMonitoringDevicesParams => {
      const params: ListMonitoringDevicesParams = {};
      const keyword = state.deviceKeyword.trim();
      if (keyword) {
        params.keyword = keyword;
      }
      if (state.productCode) {
        params.productCode = state.productCode;
      }
      if (state.onlineStatus === "ONLINE" || state.onlineStatus === "OFFLINE") {
        params.onlineStatus = state.onlineStatus;
      }
      return params;
    };

    const loadDevices = async (): Promise<void> => {
      if (!state.facilityId) {
        devices.value = [];
        deviceLoading.value = false;
        return;
      }
      const { facilityId } = state;
      const params = buildDeviceParams();
      const requestKey = JSON.stringify({ facilityId, ...params });
      if (deviceLoading.value && activeDeviceRequestKey === requestKey) {
        return;
      }
      const requestId = ++deviceRequestId;
      activeDeviceRequestKey = requestKey;
      deviceLoading.value = true;
      try {
        const nextDevices = await listMonitoringDevices(facilityId, params);
        if (requestId !== deviceRequestId) {
          return;
        }
        devices.value = Array.isArray(nextDevices) ? nextDevices : [];
      } catch {
        if (requestId === deviceRequestId) {
          devices.value = [];
        }
      } finally {
        if (requestId === deviceRequestId) {
          deviceLoading.value = false;
          activeDeviceRequestKey = "";
        }
      }
    };

    const queryDevices = (): void => {
      void loadDevices();
    };

    const loadCurrentFacility = async (): Promise<void> => {
      await Promise.all([loadOverview(), loadDevices()]);
    };

    const selectFacility = (facilityId: string): void => {
      if (state.facilityId === facilityId) {
        return;
      }
      state.facilityId = facilityId;
      state.deviceKeyword = "";
      state.productCode = "";
      state.onlineStatus = "";
      selectedDeviceId.value = "";
      scadaModalDevice.value = null;
      cameraModalOpen.value = false;
      overviewRequestId += 1;
      deviceRequestId += 1;
      overview.value = null;
      devices.value = [];
      overviewLoading.value = true;
      deviceLoading.value = true;
      activeDeviceRequestKey = "";
      syncQuery();
      void loadCurrentFacility();
    };

    const switchOverviewPage = (direction: -1 | 1): void => {
      const pageCount = overviewPageCount.value;
      if (pageCount < 2) {
        return;
      }
      overviewPage.value = (overviewPage.value + direction + pageCount) % pageCount;
    };

    const setView = (view: MonitorView): void => {
      state.view = view;
      syncQuery();
    };

    const applyFacilityScadaBinding = (binding: FacilityScadaBinding | null): void => {
      facilityScadaBinding.value = binding;
      boundScadaPageId.value = binding?.pageId ?? null;
    };

    const bindingEquals = (left: FacilityScadaBinding | null, right: FacilityScadaBinding | null): boolean =>
      JSON.stringify(left) === JSON.stringify(right);

    const persistFacilityScadaBinding = async (
      facilityId: string,
      binding: FacilityScadaBinding | null,
      success?: string,
    ): Promise<void> => {
      if (binding) {
        await saveFacilityScadaBinding(facilityId, toFacilityScadaBindingSaveRequest(binding));
      } else {
        await deleteFacilityScadaBinding(facilityId);
      }
      if (success) {
        message.success(success);
      }
    };

    const reconcileAndPersistFacilityScadaBinding = async (
      facilityId: string,
      binding: FacilityScadaBinding | null,
    ): Promise<FacilityScadaBinding | null> => {
      if (!facilityRoomPagesLoaded.value) {
        return binding;
      }
      const reconciled = reconcileFacilityScadaBinding(binding, facilityRoomPages.value);
      if (bindingEquals(binding, reconciled)) {
        return reconciled;
      }
      await persistFacilityScadaBinding(facilityId, reconciled);
      return reconciled;
    };

    const loadFacilityScadaBinding = async (): Promise<void> => {
      const { facilityId } = state;
      const requestId = ++facilityScadaBindingRequestId;
      applyFacilityScadaBinding(null);
      facilityScadaBindingLoadFailed.value = false;
      if (!facilityId) {
        facilityScadaBindingLoading.value = false;
        return;
      }
      facilityScadaBindingLoading.value = true;
      try {
        const stored = await loadFacilityScadaBindingFromServer({
          facilityId,
          getBinding: getFacilityScadaBinding,
          saveBinding: saveFacilityScadaBinding,
        });
        if (requestId !== facilityScadaBindingRequestId || facilityId !== state.facilityId) {
          return;
        }
        const next = await reconcileAndPersistFacilityScadaBinding(facilityId, stored);
        if (requestId !== facilityScadaBindingRequestId || facilityId !== state.facilityId) {
          return;
        }
        if (stored && !next) {
          promptedScadaFacilityIds.value = promptedScadaFacilityIds.value.filter((id) => id !== facilityId);
        }
        applyFacilityScadaBinding(next);
        if (state.view === "scada" && next) {
          void loadScadaDevices();
          void loadBoundScadaDeviceData();
        }
      } catch {
        if (requestId === facilityScadaBindingRequestId && facilityId === state.facilityId) {
          applyFacilityScadaBinding(null);
          facilityScadaBindingLoadFailed.value = true;
        }
      } finally {
        if (requestId === facilityScadaBindingRequestId) {
          facilityScadaBindingLoading.value = false;
        }
      }
    };

    const loadScadaDevices = async (): Promise<void> => {
      if (!state.facilityId || scadaDevicesLoading.value) {
        return;
      }
      const { facilityId } = state;
      const requestId = ++scadaDevicesRequestId;
      scadaDevicesLoading.value = true;
      try {
        const nextDevices = await listMonitoringDevices(facilityId, {});
        if (requestId !== scadaDevicesRequestId || facilityId !== state.facilityId) {
          return;
        }
        scadaDevices.value = Array.isArray(nextDevices) ? nextDevices : [];
      } catch {
        if (requestId === scadaDevicesRequestId) {
          scadaDevices.value = [];
        }
      } finally {
        if (requestId === scadaDevicesRequestId) {
          scadaDevicesLoading.value = false;
        }
      }
    };

    const loadScadaDeviceData = async (deviceId: string, force = false): Promise<void> => {
      const normalizedDeviceId = deviceId.trim();
      if (!normalizedDeviceId || (!force && scadaDeviceData.value[normalizedDeviceId])) {
        return;
      }
      if (scadaDeviceDataLoadingIds.value.includes(normalizedDeviceId)) {
        return;
      }
      const { facilityId } = state;
      const version = scadaDeviceDataVersion;
      scadaDeviceDataLoadingIds.value = [...scadaDeviceDataLoadingIds.value, normalizedDeviceId];
      try {
        const [basic, realtime] = await Promise.all([
          getMonitoringDevice(normalizedDeviceId),
          getDeviceRealtimeProperties(normalizedDeviceId),
        ]);
        if (version !== scadaDeviceDataVersion || facilityId !== state.facilityId) {
          return;
        }
        scadaDeviceData.value = {
          ...scadaDeviceData.value,
          [normalizedDeviceId]: { basic, realtime },
        };
      } catch {
        // 网关已反馈具体错误，保留其他设备的已加载数据。
      } finally {
        if (version === scadaDeviceDataVersion) {
          scadaDeviceDataLoadingIds.value = scadaDeviceDataLoadingIds.value.filter((id) => id !== normalizedDeviceId);
        }
      }
    };

    const loadBoundScadaDeviceData = async (force = false): Promise<void> => {
      const deviceIds = [...new Set(Object.values(facilityScadaBinding.value?.elementDeviceIds ?? {}))];
      await Promise.all(deviceIds.map((deviceId) => loadScadaDeviceData(deviceId, force)));
    };

    const loadFacilityRoomPages = async (): Promise<void> => {
      facilityRoomPagesLoading.value = true;
      try {
        facilityRoomPages.value = await fetchFacilityRoomPages();
        facilityRoomPagesLoaded.value = true;
      } catch {
        facilityRoomPages.value = [];
        facilityRoomPagesLoaded.value = false;
      } finally {
        facilityRoomPagesLoading.value = false;
      }
      if (!facilityRoomPagesLoaded.value) {
        return;
      }
      const { facilityId } = state;
      const current = facilityScadaBinding.value;
      try {
        const next = await reconcileAndPersistFacilityScadaBinding(facilityId, current);
        if (facilityId === state.facilityId) {
          applyFacilityScadaBinding(next);
        }
      } catch {
        // 保存清理结果失败时保留服务端当前绑定，不影响已查询的 SCADA 页面列表。
      }
      void loadBoundScadaDeviceData();
    };

    const bindFacilityScadaPage = async (pageId?: string): Promise<boolean> => {
      if (facilityScadaBindingSaving.value) {
        return false;
      }
      const nextPageId = pageId?.trim() ?? "";
      const current = facilityScadaBinding.value;
      const next = nextPageId
        ? {
            pageId: nextPageId,
            elementDeviceIds: current?.pageId === nextPageId ? current.elementDeviceIds : {},
            ...(current?.pageId === nextPageId && current.elementPropertyCodes
              ? { elementPropertyCodes: current.elementPropertyCodes }
              : {}),
          }
        : null;
      const { facilityId } = state;
      facilityScadaBindingSaving.value = true;
      try {
        await persistFacilityScadaBinding(facilityId, next);
        if (facilityId !== state.facilityId) {
          return false;
        }
        applyFacilityScadaBinding(next);
        return true;
      } catch {
        return false;
      } finally {
        if (facilityId === state.facilityId) {
          facilityScadaBindingSaving.value = false;
        }
      }
    };

    const openScadaBindModal = (): void => {
      pendingScadaPageId.value = boundScadaPageId.value ?? undefined;
      scadaBindModalOpen.value = true;
    };

    const closeScadaBindModal = (): void => {
      scadaBindModalOpen.value = false;
    };

    const openScadaDeviceBindingModal = (): void => {
      scadaDeviceBindingModalOpen.value = true;
      void loadScadaDevices();
      void loadBoundScadaDeviceData();
    };

    const saveScadaDeviceBindings = async (selection: FacilityDeviceBindingSelection): Promise<void> => {
      if (facilityScadaBindingSaving.value) {
        return;
      }
      const pageId = facilityScadaBinding.value?.pageId;
      if (!pageId) {
        return;
      }
      const { facilityId } = state;
      const next: FacilityScadaBinding = {
        pageId,
        elementDeviceIds: selection.elementDeviceIds,
        elementPropertyCodes: selection.elementPropertyCodes,
      };
      facilityScadaBindingSaving.value = true;
      try {
        await persistFacilityScadaBinding(facilityId, next, "设施房设备绑定已保存");
        if (facilityId !== state.facilityId) {
          return;
        }
        applyFacilityScadaBinding(next);
        scadaDeviceBindingModalOpen.value = false;
        void loadBoundScadaDeviceData();
      } catch {
        // 网关已展示失败信息，保留弹窗和服务器当前绑定。
      } finally {
        if (facilityId === state.facilityId) {
          facilityScadaBindingSaving.value = false;
        }
      }
    };

    const confirmScadaBinding = async (): Promise<void> => {
      const next = pendingScadaPageId.value?.trim();
      if (!next) {
        message.warning("请选择要绑定的二维组态");
        return;
      }
      if (!(await bindFacilityScadaPage(next))) {
        return;
      }
      if (!promptedScadaFacilityIds.value.includes(state.facilityId)) {
        promptedScadaFacilityIds.value = [...promptedScadaFacilityIds.value, state.facilityId];
      }
      scadaBindModalOpen.value = false;
      openScadaDeviceBindingModal();
    };

    const maybePromptFacilityScadaBind = (): void => {
      if (
        !shouldPromptFacilityScadaBind({
          facilityId: state.facilityId,
          boundPageId: boundScadaPageId.value,
          promptedFacilityIds: promptedScadaFacilityIds.value,
          hasPages: facilityRoomPages.value.length > 0,
          loading: facilityRoomPagesLoading.value || facilityScadaBindingLoading.value || facilityScadaBindingLoadFailed.value,
          viewIsScada: state.view === "scada",
        })
      ) {
        return;
      }
      promptedScadaFacilityIds.value = promptedScadaFacilityIds.value.includes(state.facilityId)
        ? promptedScadaFacilityIds.value
        : [...promptedScadaFacilityIds.value, state.facilityId];
      openScadaBindModal();
    };

    const boundScadaPageName = computed(() => boundScadaPage.value?.name ?? "已绑定画面");

    const renderFacilityScada = (): JSX.Element => {
      if (!state.facilityId) {
        return <ScadaPlaceholder description="请先选择电气设施房" copy="从左侧列表选择设施房后，可绑定对应的二维组态。" />;
      }
      if (facilityRoomPagesLoading.value || facilityScadaBindingLoading.value) {
        return (
          <div class="scada-runtime-host">
            <Spin spinning tip="正在加载电气设施房组态..." />
          </div>
        );
      }
      if (facilityRoomPages.value.length === 0) {
        return (
          <ScadaPlaceholder
            title="设施组态图"
            description="尚未配置可绑定设备的二维组态"
            copy="请先在二维组态画布中配置至少一个需要运行端绑定设备的图元。"
            showConfigure
          />
        );
      }
      if (facilityScadaBindingLoadFailed.value) {
        return (
          <ScadaPlaceholder
            title={`${facility.value?.facilityName ?? "设施"}组态图`}
            description="二维组态绑定加载失败"
            copy="未读取到服务器绑定数据，为避免覆盖已有配置，请重新加载后再操作。"
          >
            <Button type="primary" onClick={() => void loadFacilityScadaBinding()}>
              重新加载
            </Button>
          </ScadaPlaceholder>
        );
      }
      if (!boundScadaPageId.value) {
        return (
          <div class="monitor-scada-view">
            <ScadaPlaceholder
              title={`${facility.value?.facilityName ?? "设施"}组态图`}
              description="尚未绑定二维组态"
              copy="选择组态图后，可将画面图元绑定到当前设施房下的设备。"
            >
              <Button type="primary" onClick={openScadaBindModal}>
                绑定二维组态
              </Button>
            </ScadaPlaceholder>
          </div>
        );
      }
      return (
        <div class="monitor-scada-view">
          <div class="monitor-scada-toolbar">
            <span class="monitor-scada-bound">
              已绑定二维组态
              <strong>{boundScadaPageName.value}</strong>
              <small>
                设备 {boundScadaDeviceCount.value}/{scadaBindableElements.value.length}
              </small>
            </span>
            <Space>
              <Button loading={scadaDeviceDataLoadingIds.value.length > 0} onClick={() => void loadBoundScadaDeviceData(true)}>
                刷新设备数据
              </Button>
              <Button onClick={openScadaDeviceBindingModal}>设备绑定</Button>
              <Button onClick={openScadaBindModal}>切换二维组态</Button>
            </Space>
          </div>
          <div class="monitor-scada-canvas">
            <ScadaRuntimeView pageId={boundScadaPageId.value} elementBindings={scadaRuntimeBindings.value} />
          </div>
        </div>
      );
    };

    const columns = [
      {
        title: "设备名称",
        dataIndex: "deviceName",
        width: 220,
        customRender: ({ record }: { record: MonitoringDevice }): JSX.Element => (
          <Button type="link" {...{ onClick: () => openDevice(String(record.deviceId)) }}>
            {record.deviceName}
          </Button>
        ),
      },
      { title: "产品", dataIndex: "productName", width: 180 },
      {
        title: "在线状态",
        dataIndex: "onlineStatus",
        width: 110,
        customRender: ({ text }: { text: MonitoringDevice["onlineStatus"] }) => (
          <Tag color={text === "ONLINE" ? "green" : "default"}>{text === "ONLINE" ? "在线" : "离线"}</Tag>
        ),
      },
      {
        title: "告警状态",
        dataIndex: "alarmLevelName",
        width: 120,
        customRender: ({ record }: { record: MonitoringDevice }) =>
          record.hasActiveAlarm ? <Tag color="red">{record.alarmLevelName || "活动告警"}</Tag> : <Tag color="green">正常</Tag>,
      },
      {
        title: "维保状态",
        dataIndex: "maintenanceStatus",
        width: 120,
        customRender: ({ record }: { record: MonitoringDevice }) => (
          <Tag color={statusColor(record.maintenanceStatus)}>{record.maintenanceSummary || record.maintenanceStatus}</Tag>
        ),
      },
    ];
    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-device-monitoring",
      rowKey: "deviceId",
      columns,
      dataSource: [],
      pagination: false,
    });
    watch(devices, (records) => tableApi.setDataSource(records), { immediate: true });

    watch(
      () => state.facilityId,
      () => {
        scadaBindModalOpen.value = false;
        scadaDeviceBindingModalOpen.value = false;
        pendingScadaPageId.value = undefined;
        scadaDevicesRequestId += 1;
        scadaDeviceDataVersion += 1;
        scadaDevices.value = [];
        scadaDevicesLoading.value = false;
        scadaDeviceData.value = {};
        scadaDeviceDataLoadingIds.value = [];
        facilityScadaBindingLoadFailed.value = false;
        facilityScadaBindingSaving.value = false;
        applyFacilityScadaBinding(null);
        if (facilityScadaBindingInitialized) {
          void loadFacilityScadaBinding();
        }
      },
    );

    watch(
      () => state.view,
      (view) => {
        if (view !== "scada") {
          scadaBindModalOpen.value = false;
          scadaDeviceBindingModalOpen.value = false;
        } else if (boundScadaPageId.value) {
          void loadScadaDevices();
          void loadBoundScadaDeviceData();
        }
      },
    );

    watch(
      [
        () => state.facilityId,
        () => state.view,
        boundScadaPageId,
        facilityRoomPagesLoading,
        facilityScadaBindingLoading,
        facilityRoomPages,
      ],
      () => {
        maybePromptFacilityScadaBind();
      },
    );

    onMounted(async () => {
      await loadFacilities(true);
      facilityScadaBindingInitialized = true;
      await loadCurrentFacility();
      await Promise.all([loadFacilityRoomPages(), loadFacilityScadaBinding()]);
      overviewCarouselTimer = setInterval(() => switchOverviewPage(1), 4000);
    });

    const renderOverview = (): JSX.Element => {
      const monitorPoints = visibleOverviewMonitorPoints.value;
      const cameras = overview.value?.cameras ?? [];
      return (
        <div
          class={["monitor-overview-content", (cameras.length === 1 || cameras.length === 0) && "has-single-camera"]}
          onMouseenter={stopOverviewCarousel}
          onMouseleave={startOverviewCarousel}
        >
          <div class="monitor-left">
            <div class="monitor-overview-heading">
              <strong>当前设施概览</strong>
              <span>· {overview.value?.facilityName ?? facility.value?.facilityName ?? "--"}</span>
              <Button
                class="monitor-panel-config-button"
                disabled={!state.facilityId}
                onClick={() => (monitorPanelConfigOpen.value = true)}
              >
                配置
              </Button>
            </div>
            <div ref={overviewSummaryElement} class="monitor-overview-summary">
              {monitorPoints.length > 0 ? (
                <div class="environment-carousel">
                  {overviewPageCount.value > 1 ? (
                    <button
                      class="overview-carousel-button"
                      type="button"
                      aria-label="上一组概览指标"
                      onClick={() => switchOverviewPage(-1)}
                    >
                      ‹
                    </button>
                  ) : null}
                  <div
                    class="environment-grid"
                    style={{ gridTemplateColumns: `repeat(${Math.max(1, monitorPoints.length)}, minmax(0, 1fr))` }}
                  >
                    {monitorPoints.map((item) => (
                      <div class={["environment-item", `is-${item.status.toLowerCase()}`]} key={`${item.deviceId}-${item.propertyCode}`}>
                        <span class="environment-item-label" title={item.propertyName}>
                          <span class="environment-item-icon" aria-hidden="true">
                            <PcIcon iconClass={getMonitorPointIcon(item.propertyCode, item.propertyName)} size={18} />
                          </span>
                          {item.propertyName}
                        </span>
                        <strong title={`${String(item.value ?? "--")}${item.unit ?? ""}`}>
                          {String(item.value ?? "--")}
                          {item.unit ?? ""}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {overviewPageCount.value > 1 ? (
                    <>
                      <button
                        class="overview-carousel-button"
                        type="button"
                        aria-label="下一组概览指标"
                        onClick={() => switchOverviewPage(1)}
                      >
                        ›
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {cameras.length > 0 ? (
            <div class="monitor-camera-area">
              <div class={["camera-preview-grid", cameras.length === 1 && "is-single"]}>
                {cameras.slice(0, 2).map((camera) => (
                  <div class="camera-preview-item" key={String(camera.deviceId)}>
                    <div class="camera-placeholder">
                      <div class="camera-player">
                        <CubePlayer deviceId={String(camera.deviceId)} control={true} isShowDeviceDetails={false} />
                      </div>
                    </div>
                    <div class="camera-caption" title={camera.deviceName}>
                      {camera.deviceName}
                    </div>
                  </div>
                ))}
              </div>
              {cameras.length > 2 && (
                <Button
                  class="camera-all-button"
                  type="default"
                  size="small"
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    cameraModalOpen.value = true;
                  }}
                >
                  查看全部{cameras.length}个
                </Button>
              )}
            </div>
          ) : (
            <div class="overview-empty">
              <span class="overview-empty-image" aria-hidden="true" />
              <small>暂无可展示的监测数据</small>
            </div>
          )}
        </div>
      );
    };

    const renderDeviceContent = (): JSX.Element => {
      if (deviceLoading.value) {
        return (
          <div class="monitor-device-loading">
            <Spin spinning />
          </div>
        );
      }
      if (devices.value.length === 0) {
        return <ScadaPlaceholder description="暂无设备数据" copy="当前筛选条件下没有可展示的设备" />;
      }
      if (state.view === "list") {
        return <CubeTable />;
      }
      return (
        <div class="monitor-device-grid">
          {devices.value.map((item) => (
            <Card
              class="monitor-device-card"
              key={String(item.deviceId)}
              hoverable
              {...{ onClick: () => openDevice(String(item.deviceId)) }}
            >
              <div class="device-card-head">
                <div class="device-card-title">
                  <span class="device-card-icon" aria-hidden="true">
                    <PcIcon iconClass="icon-dianqishebei" size={20} />
                  </span>
                  <div>
                    <strong>{item.deviceName}</strong>
                    <span>{item.productName}</span>
                  </div>
                </div>
                <div class="device-card-actions">
                  <Tag color={item.hasActiveAlarm ? "red" : "green"}>{item.hasActiveAlarm ? "告警" : "正常"}</Tag>
                  <button
                    class="device-card-more-button"
                    type="button"
                    title="查看二维组态"
                    aria-label={`查看${item.deviceName}的二维组态`}
                    onClick={(event: MouseEvent) => openDeviceScada(item, event)}
                  >
                    <PcIcon iconClass="icon-gengduo" size={18} />
                  </button>
                </div>
              </div>
              <div class="device-card-body">
                <div class="device-metric-grid">
                  {item.displayProperties.slice(0, 6).map((property) => (
                    <div class={["device-metric", `is-${property.status.toLowerCase()}`]} key={property.propertyCode}>
                      <span>{property.propertyName}</span>
                      <strong>
                        {String(property.value ?? "--")}
                        {property.unit ?? ""}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
              <div class="device-card-foot">
                <span class={item.hasActiveAlarm ? "is-alarm" : ""}>
                  {item.hasActiveAlarm ? item.alarmLevelName || "活动告警" : "健康状态正常"}
                </span>
                <span class={item.onlineStatus === "ONLINE" ? "is-online" : "is-offline"}>
                  <i /> {item.onlineStatus === "ONLINE" ? "在线" : "离线"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      );
    };

    const slots = {
      "layout-header": (): JSX.Element => (
        <Space class="monitor-header-actions" size={8}>
          {(
            [
              ["scada", "组态视图"],
              ["card", "卡片视图"],
              ["list", "列表视图"],
            ] as [MonitorView, string][]
          ).map(([key, label]) => (
            <Button
              type={state.view === key ? "primary" : "default"}
              aria-selected={state.view === key}
              class="monitor-view-tab"
              key={key}
              onClick={() => setView(key)}
            >
              {label}
            </Button>
          ))}
          <Button
            class="monitor-fullscreen-button"
            type={isFullscreen.value ? "primary" : "default"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen.value ? "退出全屏" : "全屏"}
          </Button>
        </Space>
      ),
      "layout-content": (): JSX.Element => (
        <div class="electrical-page device-monitoring-page">
          <div class="monitor-layout">
            <FacilitySidebar
              facilities={facilities.value}
              activeFacilityId={state.facilityId}
              keyword={state.facilityKeyword}
              loading={facilitiesLoading.value}
              hasMore={facilityHasMore.value}
              onUpdate:keyword={(value: string) => (state.facilityKeyword = value)}
              onSearch={searchFacilities}
              onSelect={selectFacility}
              onLoadMore={() => void loadFacilities()}
            />
            <div class="monitor-main">
              <div class="monitor-view-body">
                {state.view === "scada" ? (
                  renderFacilityScada()
                ) : (
                  <>
                    <Card class="monitor-overview-card">
                      {overviewLoading.value ? (
                        <div class="monitor-overview-loading">
                          <Spin spinning tip="正在加载设施概览..." />
                        </div>
                      ) : (
                        renderOverview()
                      )}
                    </Card>
                    <div class="page-toolbar device-filter-bar">
                      <div class="filter-content">
                        <Input
                          value={state.deviceKeyword}
                          placeholder="搜索设备名称或编码"
                          showCount
                          maxlength={20}
                          style={{ width: "244px" }}
                          onPressEnter={queryDevices}
                          onUpdate:value={(inputValue) => {
                            const value = inputValue as string;
                            return (state.deviceKeyword = value);
                          }}
                        />
                        <Select
                          showSearch
                          allowClear
                          value={state.productCode || undefined}
                          options={productOptions.value}
                          placeholder="全部产品"
                          style={{ width: "150px" }}
                          onUpdate:value={(inputValue) => {
                            const value = inputValue as string | undefined;
                            state.productCode = value ?? "";
                            queryDevices();
                          }}
                        />
                        <Select
                          allowClear
                          value={state.onlineStatus || undefined}
                          options={[
                            { label: "在线", value: "ONLINE" },
                            { label: "离线", value: "OFFLINE" },
                          ]}
                          placeholder="全部在线状态"
                          style={{ width: "150px" }}
                          onUpdate:value={(inputValue) => {
                            const value = inputValue as string | undefined;
                            state.onlineStatus = value ?? "";
                            queryDevices();
                          }}
                        />
                        <Space>
                          <Button type="primary" onClick={queryDevices}>
                            查询
                          </Button>
                          <Button
                            onClick={() => {
                              state.deviceKeyword = "";
                              state.productCode = "";
                              state.onlineStatus = "";
                              queryDevices();
                            }}
                          >
                            重置
                          </Button>
                        </Space>
                      </div>
                      {state.view === "card" ? (
                        <Button type="default" onClick={() => (cardPanelConfigOpen.value = true)}>
                          面板配置
                        </Button>
                      ) : null}
                    </div>
                    <div class="monitor-device-content">{renderDeviceContent()}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
    };

    return (): JSX.Element => (
      <>
        <div class="device-monitoring-shell">
          <PageLayout title={pageTitle.value} showFooter={false} v-slots={slots} />
        </div>
        <CardPanelConfig
          open={cardPanelConfigOpen.value}
          facilityId={state.facilityId}
          onClose={() => (cardPanelConfigOpen.value = false)}
          onSaved={() => void loadDevices()}
        />
        <MonitorPanelConfigModal
          open={monitorPanelConfigOpen.value}
          facilityId={state.facilityId}
          facilityName={facility.value?.facilityName ?? overview.value?.facilityName ?? ""}
          onClose={() => (monitorPanelConfigOpen.value = false)}
          onSaved={() => void loadOverview()}
        />
        <FacilityDeviceBindingModal
          open={scadaDeviceBindingModalOpen.value}
          submitting={facilityScadaBindingSaving.value}
          elements={scadaBindableElements.value}
          devices={scadaDevices.value}
          devicesLoading={scadaDevicesLoading.value}
          deviceData={scadaDeviceData.value}
          loadingDeviceIds={scadaDeviceDataLoadingIds.value}
          currentBindings={facilityScadaBinding.value?.elementDeviceIds ?? {}}
          currentPropertyCodes={facilityScadaBinding.value?.elementPropertyCodes ?? {}}
          onCancel={() => (scadaDeviceBindingModalOpen.value = false)}
          onRequestDeviceData={(deviceId: string) => void loadScadaDeviceData(deviceId)}
          onSubmit={saveScadaDeviceBindings}
        />
        <Modal
          okText="确定"
          cancelText="取消"
          open={scadaBindModalOpen.value}
          title={boundScadaPageId.value ? "切换绑定二维组态" : "绑定二维组态"}
          width="480px"
          wrapClassName="electrical-viewport-modal"
          confirmLoading={facilityScadaBindingSaving.value}
          destroyOnClose
          onCancel={closeScadaBindModal}
          onOk={confirmScadaBinding}
        >
          <div class="monitor-scada-bind-form">
            <span>设施房二维组态</span>
            <Select
              showSearch
              optionFilterProp="label"
              value={pendingScadaPageId.value}
              options={facilityRoomPages.value.map((page) => ({ label: page.name, value: page.id }))}
              placeholder="请选择要绑定的二维组态"
              style={{ width: "100%" }}
              onUpdate:value={(inputValue) => {
                const value = inputValue as string | undefined;
                return (pendingScadaPageId.value = value);
              }}
            />
          </div>
        </Modal>
        <Modal
          okText="确定"
          cancelText="取消"
          open={cameraModalOpen.value}
          title={`${overview.value?.facilityName ?? facility.value?.facilityName ?? "当前设施"} · 实时视频`}
          width="900px"
          wrapClassName="electrical-viewport-modal"
          footer={null}
          destroyOnClose
          onCancel={() => (cameraModalOpen.value = false)}
        >
          <div class="camera-modal-grid">
            {(overview.value?.cameras ?? []).map((camera) => (
              <div class="camera-preview-item" key={String(camera.deviceId)}>
                <div class="camera-placeholder">
                  <div class="camera-player">
                    <CubePlayer deviceId={String(camera.deviceId)} control={true} isShowDeviceDetails={false} />
                  </div>
                </div>
                <div class="camera-caption" title={camera.deviceName}>
                  {camera.deviceName}
                </div>
              </div>
            ))}
          </div>
        </Modal>
        <DeviceDetailModal
          open={Boolean(selectedDeviceId.value)}
          deviceId={selectedDeviceId.value}
          onClose={() => {
            selectedDeviceId.value = "";
            syncQuery();
          }}
        />
        <DeviceScadaModal
          open={Boolean(scadaModalDevice.value)}
          device={scadaModalDevice.value}
          onClose={() => (scadaModalDevice.value = null)}
        />
      </>
    );
  },
});
