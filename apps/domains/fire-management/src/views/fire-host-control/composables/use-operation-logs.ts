import type { FireOperationLogRecord } from "@g2-contract/fire-management";
import { onUnmounted, ref, shallowRef, type Ref } from "vue";

import type { FireHostId, OperationLogViewModel } from "../models";
import { listOperationLogs } from "@/api/server";
import { dayjs } from "@/pc-ui-runtime";
import { message } from "@/pc-ui-runtime";

const DEFAULT_PAGE_SIZE = 10;
const FIRST_PAGE = 1;
const VERSION_INCREMENT = 1;

interface UseOperationLogsResult {
  isVisible: Ref<boolean>;
  records: Ref<OperationLogViewModel[]>;
  pageNumber: Ref<number>;
  pageSize: Ref<number>;
  total: Ref<number>;
  isLoading: Ref<boolean>;
  open: () => void;
  close: () => void;
  changePage: (pageNumber: number, pageSize: number) => void;
}

const CATEGORY_LABELS: Record<FireOperationLogRecord["operationCategory"], string> = {
  HOST_BUTTON: "控制按钮",
  BUS_POINT: "总线盘",
  MULTI_LINE_POINT: "多线盘",
};

const RESULT_MAP: Record<FireOperationLogRecord["result"], OperationLogViewModel["result"]> = {
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
};

const RESULT_LABELS: Record<FireOperationLogRecord["result"], string> = {
  PROCESSING: "执行中",
  SUCCESS: "成功",
  FAILED: "失败",
};

const formatOperationTime = (value: string): string => {
  const time = dayjs(value);
  return time.isValid() ? time.format("YYYY-MM-DD HH:mm:ss") : value || "--";
};

const mapOperationLog = (record: FireOperationLogRecord): OperationLogViewModel => {
  const resultMessage = record.failureReason?.trim() || record.responseMessage?.trim();
  return {
    id: String(record.id),
    time: formatOperationTime(record.operationTime),
    operator: record.operatorName?.trim() || "--",
    type: record.operationCategoryName?.trim() || CATEGORY_LABELS[record.operationCategory],
    content: record.operationContent?.trim() || record.operationName?.trim() || "--",
    result: RESULT_MAP[record.result],
    resultName: record.resultName?.trim() || RESULT_LABELS[record.result],
    ...(resultMessage ? { resultMessage } : {}),
  };
};

export function useOperationLogs(currentHostId: Readonly<Ref<FireHostId>>): UseOperationLogsResult {
  const isVisible = shallowRef(false);
  const records = ref<OperationLogViewModel[]>([]);
  const pageNumber = shallowRef(FIRST_PAGE);
  const pageSize = shallowRef(DEFAULT_PAGE_SIZE);
  const total = shallowRef(0);
  const isLoading = shallowRef(false);
  let requestVersion = 0;
  let isDisposed = false;

  const load = async (nextPageNumber = pageNumber.value, nextPageSize = pageSize.value): Promise<void> => {
    const hostId = currentHostId.value;
    if (!hostId) {
      records.value = [];
      total.value = 0;
      return;
    }

    requestVersion += VERSION_INCREMENT;
    const version = requestVersion;
    isLoading.value = true;
    try {
      const page = await listOperationLogs({
        pageNumber: nextPageNumber,
        pageSize: nextPageSize,
        fireManageDeviceId: hostId,
      });
      if (isDisposed || version !== requestVersion || String(currentHostId.value) !== String(hostId)) {
        return;
      }
      records.value = (page.records || []).map((record) => mapOperationLog(record));
      pageNumber.value = nextPageNumber;
      pageSize.value = nextPageSize;
      total.value = Number(page.total || 0);
    } catch (error) {
      if (!isDisposed && version === requestVersion) {
        records.value = [];
        total.value = 0;
        message.error((error as Error).message || "加载操作记录失败");
      }
    } finally {
      if (!isDisposed && version === requestVersion) {
        isLoading.value = false;
      }
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
    requestVersion += VERSION_INCREMENT;
  });

  return {
    isVisible,
    records,
    pageNumber,
    pageSize,
    total,
    isLoading,
    open,
    close,
    changePage,
  };
}
