import { onMounted, ref, type Ref } from "vue";

import { TABLE_PAGE_SIZE } from "@/constants";
import { resolvePageNumberWhenCurrentEmpty } from "@/utils/pagination";

export interface ServerPagedListState {
  pageNumber: Ref<number>;
  pageSize: Ref<number>;
  total: Ref<number>;
  resetPage: () => void;
  onPageChange: (reload: () => void | Promise<void>) => (page: number, size: number) => void;
  scheduleInitialLoad: (reload: () => void | Promise<void>) => void;
  runInitialLoadUnlessHandled: (reload: () => void | Promise<void>) => void;
  rewindIfEmpty: (recordCount: number, reload: () => Promise<void>) => Promise<void>;
}

export function useServerPagedList(defaultPageSize = TABLE_PAGE_SIZE): ServerPagedListState {
  const pageNumber = ref(1);
  const pageSize = ref(defaultPageSize);
  const total = ref(0);
  let paginationHandledInitial = false;

  const resetPage = (): void => {
    pageNumber.value = 1;
  };

  const rewindIfEmpty = async (recordCount: number, reload: () => Promise<void>): Promise<void> => {
    const nextPage = resolvePageNumberWhenCurrentEmpty(pageNumber.value, recordCount, total.value, pageSize.value);
    if (nextPage !== pageNumber.value) {
      pageNumber.value = nextPage;
      await reload();
    }
  };

  const onPageChange =
    (reload: () => void | Promise<void>) =>
    (page: number, size: number): void => {
      const nextPage = Math.max(1, page || 1);
      if (nextPage === pageNumber.value && size === pageSize.value) return;
      paginationHandledInitial = true;
      pageNumber.value = nextPage;
      pageSize.value = size;
      void reload();
    };

  const runInitialLoadUnlessHandled = (reload: () => void | Promise<void>): void => {
    queueMicrotask(() => {
      if (!paginationHandledInitial) void reload();
    });
  };

  const scheduleInitialLoad = (reload: () => void | Promise<void>): void => {
    onMounted(() => {
      runInitialLoadUnlessHandled(reload);
    });
  };

  return {
    pageNumber,
    pageSize,
    total,
    resetPage,
    onPageChange,
    scheduleInitialLoad,
    runInitialLoadUnlessHandled,
    rewindIfEmpty,
  };
}
