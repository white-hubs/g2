import { computed, ref, type Ref } from "vue";

export function useLocalPagedList<T>(source: Ref<T[]>, filterFn: (item: T, keyword: string) => boolean, pageSize = 10) {
  const keyword = ref("");
  const pageNumber = ref(1);
  const currentPageSize = ref(pageSize);

  const filtered = computed(() => {
    const k = keyword.value.trim();
    if (!k) {
      return source.value;
    }
    return source.value.filter((item) => filterFn(item, k));
  });

  const total = computed(() => filtered.value.length);

  const pageRecords = computed(() => {
    const start = (pageNumber.value - 1) * currentPageSize.value;
    return filtered.value.slice(start, start + currentPageSize.value);
  });

  const onPageChange = (page: number, size: number): void => {
    pageNumber.value = page;
    currentPageSize.value = size;
  };

  const resetPage = (): void => {
    pageNumber.value = 1;
  };

  return { keyword, pageNumber, currentPageSize, total, pageRecords, onPageChange, resetPage };
}
