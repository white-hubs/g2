import { LoadingOutlined, Select, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import { getOuaaClient } from "@/domain-context";
import { toTextArray } from "@/utils/form-value";
import { asArray, asPageResult } from "@/utils/response";

interface SelectOption {
  label: string;
  value: string;
}

interface TenantUser {
  id: string | number;
  name: string;
}

interface Organization {
  id: string | number;
  name: string;
}

const USER_PAGE_SIZE = 100;

/** 企业员工一次分页查不完，旧页按总页数并发补齐后再合并。 */
async function loadAllTenantUsers(): Promise<SelectOption[]> {
  const client = await getOuaaClient();
  const first = asPageResult<TenantUser>(await client.listTenantUsers({ pageNumber: 1, pageSize: USER_PAGE_SIZE, enabled: true }));
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.pages - 1, 0) }, (_unused, index) =>
      client.listTenantUsers({ pageNumber: index + 2, pageSize: USER_PAGE_SIZE, enabled: true }),
    ),
  );
  const records = [...first.records, ...rest.flatMap((response) => asPageResult<TenantUser>(response).records)];
  return records.map((user) => ({ label: user.name, value: String(user.id) }));
}

const filterOption = (input: string, option?: { label?: unknown }): boolean => String(option?.label ?? "").includes(input);

/** 维保责任人-人员多选，对齐旧 `userSelect`（全量企业员工 + 本地搜索）。 */
export const UserMultiSelect = defineComponent({
  name: "MaintenanceUserMultiSelect",
  props: {
    value: { type: Array as PropType<string[]>, default: () => [] },
    placeholder: { type: String, default: "接收人" },
    disabled: Boolean,
  },
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const options = ref<SelectOption[]>([]);
    const loading = ref(false);

    onMounted(() => {
      loading.value = true;
      loadAllTenantUsers()
        .then((list) => {
          options.value = list;
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "人员列表加载失败");
        })
        .finally(() => {
          loading.value = false;
        });
    });

    return () => (
      <Select
        mode="multiple"
        value={props.value}
        options={options.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        showSearch
        allowClear
        filterOption={filterOption}
        style={{ width: "100%" }}
        v-slots={loading.value ? { suffixIcon: () => <LoadingOutlined /> } : undefined}
        onUpdate:value={(raw: unknown) => {
          const value = toTextArray(raw);
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});

/** 维保责任人-部门多选，对齐旧 `deptList`（`/api/ouaa/authenticated/organizations/list`）。 */
export const DeptMultiSelect = defineComponent({
  name: "MaintenanceDeptMultiSelect",
  props: {
    value: { type: Array as PropType<string[]>, default: () => [] },
    placeholder: { type: String, default: "部门" },
    disabled: Boolean,
  },
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const options = ref<SelectOption[]>([]);
    const loading = ref(false);

    onMounted(() => {
      loading.value = true;
      getOuaaClient()
        .then(async (client) => client.listFlowDepartmentOptions({ pageNumber: 1, pageSize: 1000, enabled: true }))
        .then((response) => {
          options.value = asArray<Organization>(response).map((item) => ({ label: item.name, value: String(item.id) }));
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "部门列表加载失败");
        })
        .finally(() => {
          loading.value = false;
        });
    });

    return () => (
      <Select
        mode="multiple"
        value={props.value}
        options={options.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        showSearch
        allowClear
        filterOption={filterOption}
        style={{ width: "100%" }}
        v-slots={loading.value ? { suffixIcon: () => <LoadingOutlined /> } : undefined}
        onUpdate:value={(raw: unknown) => {
          const value = toTextArray(raw);
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});
