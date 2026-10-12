import { watch, type Ref } from "vue";

/** 列表搜索框点「x」清空后自动重新查询 */
export function useListSearchClearReload(keyword: Ref<string>, onSearch: () => void): void {
  watch(keyword, (next, prev) => {
    if ((prev ?? "").trim() && !(next ?? "").trim()) {
      onSearch();
    }
  });
}
