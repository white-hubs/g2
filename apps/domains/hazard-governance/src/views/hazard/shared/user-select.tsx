import { defineComponent, onMounted, ref } from "vue";

import { getOuaaClient } from "@/domain-context";
import { Select } from "@/pc-ui-runtime";

const unpack = (value: unknown): Record<string, unknown>[] => {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const rows = body.records ?? body.list ?? body.rows ?? body.data;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
};

/** Domain-backed person selector; supports immediate visible loading and ignores stale searches. */
export const HazardUserSelect = defineComponent({
  name: "HazardUserSelect",
  props: ["value", "multiple", "disabled", "placeholder", "allowClear", "showSearch", "roleId", "userId"],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const options = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    let requestVersion = 0;
    const load = async (keyword = ""): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const rows = unpack(await (await getOuaaClient()).listUsers({ pageNumber: 1, pageSize: 200, keyword }));
        if (version === requestVersion)
          options.value = rows.map((user) => ({
            label: String(user.name ?? user.userName ?? user.username ?? user.id),
            value: String(user.id ?? user.userId),
          }));
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <Select
        value={props.value}
        mode={props.multiple ? "multiple" : undefined}
        options={options.value}
        loading={loading.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        showSearch
        filterOption={false}
        onSearch={(text: string) => void load(text)}
        onUpdate:value={(value: unknown) => {
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});
