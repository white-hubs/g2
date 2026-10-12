import { defineComponent, onMounted, ref } from "vue";

import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getOuaaClient } from "@/domain-context";

const { Select, message } = getEmergencySuppliesPcUi();

interface UserRow {
  id?: string | number;
  userId?: string | number;
  name?: string;
  userName?: string;
  username?: string;
}

function unwrapUsers(value: unknown): UserRow[] {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const rows = data.records ?? data.list ?? data.rows ?? data.data;
  return Array.isArray(rows) ? (rows as UserRow[]) : [];
}

export const UserSelect = defineComponent({
  name: "EmergencySuppliesUserSelect",
  inheritAttrs: false,
  props: ["value", "disabled", "placeholder", "allowClear"],
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const loading = ref(false);
    const options = ref<{ label: string; value: string }[]>([]);
    let requestVersion = 0;

    const load = async (keyword = ""): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const users = unwrapUsers(await (await getOuaaClient()).listUsers({ pageNumber: 1, pageSize: 200, keyword }));
        if (version === requestVersion) {
          options.value = users
            .map((user) => ({
              label: String(user.name ?? user.userName ?? user.username ?? user.id ?? user.userId ?? ""),
              value: String(user.id ?? user.userId ?? ""),
            }))
            .filter((option) => option.value);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "人员加载失败");
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    onMounted(() => void load());
    return () => (
      <Select
        {...attrs}
        value={props.value}
        options={options.value}
        loading={loading.value}
        disabled={props.disabled}
        allowClear={props.allowClear}
        placeholder={props.placeholder ?? "请选择管理员"}
        showSearch
        filterOption={false}
        onSearch={(keyword: string) => void load(keyword)}
        onUpdate:value={(value: unknown) => {
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});
