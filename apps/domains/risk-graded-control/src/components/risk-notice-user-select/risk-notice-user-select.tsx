import { computed, defineComponent, onMounted, ref, type PropType } from "vue";

import { listUsers } from "@/api/ouaa";
import { Select } from "@/pc-ui-runtime";

interface NoticeRecipients {
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

function unwrapRows(value: unknown): UserRow[] {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const rows = data.records ?? data.list ?? data.rows ?? data.data;
  return Array.isArray(rows) ? (rows as UserRow[]) : [];
}

/** Risk warning recipients backed by the G2 Ouaa client. */
export const RiskNoticeUserSelect = defineComponent({
  name: "RiskNoticeUserSelect",
  props: {
    typeValue: { type: Object as PropType<NoticeRecipients>, required: true },
    disabled: Boolean,
  },
  emits: ["update:typeValue"],
  setup(props, { emit, expose }) {
    const options = ref<Array<{ label: string; value: string }>>([]);
    const loading = ref(false);
    const ids = computed(() => (props.typeValue.ids ?? []).map(String));
    let version = 0;

    const load = async (keyword = ""): Promise<void> => {
      const requestVersion = ++version;
      loading.value = true;
      try {
        const rows = unwrapRows(await listUsers({ pageNumber: 1, pageSize: 200, keyword }));
        if (requestVersion === version) {
          options.value = rows
            .map((row) => ({
              label: String(row.name ?? row.userName ?? row.username ?? row.id ?? row.userId ?? ""),
              value: String(row.id ?? row.userId ?? ""),
            }))
            .filter((item) => item.value);
        }
      } finally {
        if (requestVersion === version) loading.value = false;
      }
    };

    onMounted(() => void load());
    expose({
      isValid: computed(() => ids.value.length > 0),
      checkFormData: async () => {
        if (!ids.value.length) throw new Error("请选择通知人员");
      },
    });

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
          emit("update:typeValue", { type: "USER", ids: (Array.isArray(value) ? value : []).map(String) } satisfies NoticeRecipients)
        }
      />
    );
  },
});
