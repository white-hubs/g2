import type { EventRecord } from "@g2-contract/fire-management";
import { onUnmounted, ref, shallowRef, type Ref } from "vue";

import type { FireEventViewModel, FireHostId } from "../models";
import { listEvents } from "@/api/server";
import { message } from "@/pc-ui-runtime";
import { normalizeFireEventType } from "@/utils/fire-event";

const DEFAULT_PAGE_SIZE = 10;
const FIRST_PAGE = 1;

const formatEventTime = (value?: string): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replaceAll("/", "-");
};

const mapEventRecord = (record: EventRecord): FireEventViewModel => ({
  id: String(record.id ?? `${record.eventTime}-${record.deviceInfo}`),
  eventName: record.eventName || "--",
  eventType: normalizeFireEventType(record.eventType),
  deviceInfo: record.deviceInfo || "--",
  pointName: record.pointName || "--",
  time: formatEventTime(record.eventTime),
  location: record.location || "--",
  posX: record.coordinateX,
  posY: record.coordinateY,
});

export function useEventRecords(currentHostId: Readonly<Ref<FireHostId>>) {
  const isVisible = shallowRef(false);
  const records = ref<FireEventViewModel[]>([]);
  const pageNumber = shallowRef(FIRST_PAGE);
  const pageSize = shallowRef(DEFAULT_PAGE_SIZE);
  const total = shallowRef(0);
  const isLoading = shallowRef(false);
  let requestVersion = 0;
  let isDisposed = false;

  const load = async (nextPageNumber = pageNumber.value, nextPageSize = pageSize.value): Promise<void> => {
    const hostId = currentHostId.value;
    if (!hostId) return;
    requestVersion += 1;
    const version = requestVersion;
    isLoading.value = true;
    try {
      const page = await listEvents({ fireManageDeviceId: hostId, pageNumber: nextPageNumber, pageSize: nextPageSize });
      if (isDisposed || version !== requestVersion || String(currentHostId.value) !== String(hostId)) return;
      records.value = (page.records || []).map(mapEventRecord);
      pageNumber.value = nextPageNumber;
      pageSize.value = nextPageSize;
      total.value = Number(page.total || 0);
    } catch (error) {
      if (!isDisposed && version === requestVersion) {
        records.value = [];
        total.value = 0;
        message.error((error as Error).message || "加载事件记录失败");
      }
    } finally {
      if (!isDisposed && version === requestVersion) isLoading.value = false;
    }
  };

  const open = (): void => {
    isVisible.value = true;
    pageNumber.value = FIRST_PAGE;
    void load(FIRST_PAGE, pageSize.value);
  };

  const close = (): void => {
    isVisible.value = false;
  };

  const changePage = (nextPageNumber: number, nextPageSize: number): void => {
    void load(nextPageNumber, nextPageSize);
  };

  onUnmounted(() => {
    isDisposed = true;
    requestVersion += 1;
  });

  return { isVisible, records, pageNumber, pageSize, total, isLoading, open, close, changePage };
}
