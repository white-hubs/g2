import { computed, defineComponent, onMounted, ref, type PropType } from "vue";

import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getOuaaClient } from "@/domain-context";

const { Select } = getEmergencySuppliesPcUi();

export interface NoticeUserItem {
  type: string;
  ids?: string[];
}

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

export const NoticeUserSelect = defineComponent({
  name: "EmergencySuppliesNoticeUserSelect",
  props: {
    typeValue: { type: Object as PropType<NoticeUserItem>, required: true },
    disabled: Boolean,
  },
  emits: ["update:typeValue"],
  setup(props, { emit, expose }) {
    const options = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const ids = computed(() => (props.typeValue.ids ?? []).map(String));
    let requestVersion = 0;

    const load = async (keyword = ""): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const rows = unwrapUsers(await (await getOuaaClient()).listUsers({ pageNumber: 1, pageSize: 200, keyword }));
        if (version === requestVersion) {
          options.value = rows
            .map((row) => ({
              label: String(row.name ?? row.userName ?? row.username ?? row.id ?? row.userId ?? ""),
              value: String(row.id ?? row.userId ?? ""),
            }))
            .filter((option) => option.value);
        }
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    expose({
      isValid: computed(() => ids.value.length > 0),
      checkFormData: async () => {
        if (ids.value.length === 0) {
          throw new Error("请选择通知人员");
        }
      },
    });
    onMounted(() => void load());

    return () => (
      <Select
        value={ids.value}
        mode="multiple"
        options={options.value}
        loading={loading.value}
        disabled={props.disabled}
        showSearch
        filterOption={false}
        placeholder="请选择通知人员"
        onSearch={(keyword: string) => void load(keyword)}
        onUpdate:value={(value: unknown) =>
          emit("update:typeValue", {
            type: "USER",
            ids: (Array.isArray(value) ? value : []).map(String),
          } satisfies NoticeUserItem)
        }
      />
    );
  },
});
