import { defineComponent, onMounted, onUnmounted, reactive, shallowRef, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { Select } from "@/pc-ui-runtime";

interface ProductBrandRecord {
  id: string | number;
  itemLabel: string;
  itemCode?: string;
  itemValue?: string;
}

interface BrandOption {
  label: string;
  value: string;
  record: ProductBrandRecord;
}

const PAGE_SIZE = 20;
const SEARCH_DELAY = 250;

function unwrapPage(raw: unknown): { records: ProductBrandRecord[]; total: number; pages: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? []) as ProductBrandRecord[];
  return {
    records: Array.isArray(records) ? records : [],
    total: Number(nested.total ?? data.total ?? 0),
    pages: Number(nested.pages ?? data.pages ?? 0),
  };
}

/** 使用设备中心产品品牌分页接口、以品牌名称作为筛选值的滚动加载下拉框。 */
export const ProductBrandNameSelect = defineComponent({
  name: "ProductBrandNameSelect",
  props: {
    value: { type: String, default: "" },
    placeholder: { type: String, default: "全部产品品牌" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    pageSize: { type: Number, default: PAGE_SIZE },
    extraOptions: { type: Array as PropType<Array<{ label: string; value: string }>>, default: () => [] },
  },
  emits: ["update:value", "change"],
  setup(props, { emit, attrs }) {
    const options = shallowRef<BrandOption[]>([]);
    const state = reactive({ pageNumber: 0, pages: 0, total: 0, keyword: "", loading: false });
    let requestVersion = 0;
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    const hasMore = (): boolean => state.pageNumber === 0 || state.pageNumber < state.pages;

    const loadPage = async (reset = false): Promise<void> => {
      if (reset) {
        requestVersion += 1;
        state.pageNumber = 0;
        state.pages = 0;
        state.total = 0;
        options.value = [];
      } else if (state.loading || !hasMore()) {
        return;
      }
      const currentVersion = requestVersion;
      const pageNumber = state.pageNumber + 1;
      state.loading = true;
      try {
        const client = await getDeviceCenterClient();
        const page = unwrapPage(
          await client.listProductBrands({
            pageNumber,
            pageSize: props.pageSize,
            ...(state.keyword ? { itemLabel: state.keyword } : {}),
          }),
        );
        if (currentVersion !== requestVersion) return;
        const nextOptions = (page.records ?? [])
          .filter((record) => Boolean(record.itemLabel?.trim()))
          .map((record) => ({ label: record.itemLabel.trim(), value: record.itemLabel.trim(), record }));
        const merged = reset ? nextOptions : [...options.value, ...nextOptions];
        options.value = [...new Map(merged.map((option) => [option.value, option])).values()];
        state.pageNumber = pageNumber;
        state.pages = Number(page.pages ?? Math.ceil(Number(page.total ?? 0) / props.pageSize));
        state.total = Number(page.total ?? options.value.length);
      } catch (error) {
        console.error("加载产品品牌失败：", error);
      } finally {
        if (currentVersion === requestVersion) state.loading = false;
      }
    };

    const handleSearch = (keyword: string): void => {
      state.keyword = keyword.trim();
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => void loadPage(true), SEARCH_DELAY);
    };

    const handlePopupScroll = (event: Event): void => {
      const target = event.target as HTMLElement;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) void loadPage();
    };

    onMounted(() => void loadPage(true));
    onUnmounted(() => {
      requestVersion += 1;
      if (searchTimer) clearTimeout(searchTimer);
    });

    return () => (
      <Select
        {...attrs}
        value={props.value?.trim() || undefined}
        options={[...props.extraOptions, ...options.value]}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        showSearch
        filterOption={false}
        optionFilterProp="label"
        onSearch={handleSearch}
        onPopupScroll={handlePopupScroll}
        onChange={(value: unknown, option: unknown) => emit("change", String(value ?? ""), option)}
        onUpdate:value={(value: unknown) => emit("update:value", String(value ?? ""))}
      />
    );
  },
});
