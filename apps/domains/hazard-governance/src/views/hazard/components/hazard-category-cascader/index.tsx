import type { HazardCategoryTreeVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, ref } from "vue";

import { normalizeHazardCategoryTree, resolveHazardCategoryPath } from "./category-path";
import { useAuthRequest } from "@/api/request";
import { getHazardCategoryTree } from "@/api/server";
import { Cascader, message } from "@/pc-ui-runtime";

interface HazardCategorySelectedOption {
  label?: string;
  value?: string | number | null;
}

let cachedCategoryOptions: HazardCategoryTreeVO[] | undefined;
let loadingCategoryPromise: Promise<HazardCategoryTreeVO[]> | undefined;

const unwrapCategoryTree = (response: unknown): HazardCategoryTreeVO[] => {
  if (Array.isArray(response)) {
    return response as HazardCategoryTreeVO[];
  }
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as HazardCategoryTreeVO[];
    }
    if (Array.isArray(record.result)) {
      return record.result as HazardCategoryTreeVO[];
    }
    if (Array.isArray(record.records)) {
      return record.records as HazardCategoryTreeVO[];
    }
  }
  return [];
};

const loadHazardCategoryOptions = async (): Promise<HazardCategoryTreeVO[]> => {
  if (cachedCategoryOptions) {
    return cachedCategoryOptions;
  }
  loadingCategoryPromise ??= useAuthRequest(() => getHazardCategoryTree())
    .then((response) => {
      cachedCategoryOptions = normalizeHazardCategoryTree(unwrapCategoryTree(response));
      return cachedCategoryOptions;
    })
    .finally(() => {
      loadingCategoryPromise = undefined;
    });
  return loadingCategoryPromise;
};

export const refreshHazardCategoryOptions = (): void => {
  cachedCategoryOptions = undefined;
};

export const HazardCategoryCascader = defineComponent({
  name: "HazardCategoryCascader",
  props: {
    value: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: "请选择隐患类型",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    allowClear: {
      type: Boolean,
      default: true,
    },
    requiredLevel: {
      type: Number,
      default: 3,
    },
  },
  emits: ["update:value", "change"],
  setup: (props, { emit }) => {
    const options = ref<HazardCategoryTreeVO[]>(cachedCategoryOptions ?? []);
    const loading = ref(false);
    const displayValue = computed(() => resolveHazardCategoryPath(props.value, options.value));

    const loadOptions = async (): Promise<void> => {
      loading.value = true;
      try {
        options.value = await loadHazardCategoryOptions();
      } catch {
        message.error("隐患类型加载失败");
      } finally {
        loading.value = false;
      }
    };

    const handleChange = (value: unknown, selectedOptions?: HazardCategorySelectedOption[]): void => {
      const categoryPath = Array.isArray(value) ? value.map(String) : [];
      const categoryOptions = selectedOptions ?? [];
      if (categoryPath.length === 0) {
        emit("update:value", []);
        emit("change", [], categoryOptions);
        return;
      }
      if (categoryOptions.length > 0 && categoryOptions.length !== props.requiredLevel) {
        message.warning(`请选择到第${props.requiredLevel}级隐患类型`);
        return;
      }
      emit("update:value", categoryPath);
      emit("change", categoryPath, categoryOptions);
    };

    onMounted(() => {
      if (options.value.length === 0) {
        void loadOptions();
      }
    });

    return (): JSX.Element => (
      <Cascader
        value={displayValue.value}
        fieldNames={{ label: "name", value: "id", children: "children" }}
        options={options.value}
        placeholder={loading.value ? "隐患类型加载中" : props.placeholder}
        allowClear={props.allowClear}
        showSearch
        disabled={props.disabled || loading.value}
        onChange={(value, selectedOptions) =>
          handleChange(value, Array.isArray(selectedOptions) ? (selectedOptions.flat() as HazardCategorySelectedOption[]) : [])
        }
      />
    );
  },
});
