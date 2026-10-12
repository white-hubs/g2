import type { PersonScopeType } from "@g2-contract/meet-room";
import { Select, TreeSelect } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onMounted, ref, watch } from "vue";

import { getOuaaClient } from "../domain-context";
import { type TreeSelectOption, optionTree, treeSelectData } from "../shared";

import styles from "../styles.module.css";

export interface PersonScopeValue {
  ids: string[];
  type: PersonScopeType;
}

export const PersonScopePicker = defineComponent({
  name: "MeetRoomPersonScopePicker",
  props: {
    value: {
      type: Object as PropType<PersonScopeValue>,
      default: () => ({ ids: [], type: "DEPARTMENT" }),
    },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const departments = ref<TreeSelectOption[]>([]);
    const roles = ref<{ label: string; value: string }[]>([]);
    const users = ref<{ label: string; value: string }[]>([]);
    const state = ref<PersonScopeValue>({ ids: [], type: "DEPARTMENT" });

    const update = (patch: Partial<PersonScopeValue>): void => {
      state.value = { ...state.value, ...patch };
      emit("update:value", { ...state.value, ids: [...state.value.ids] });
    };

    const loadOptions = async (): Promise<void> => {
      const client = await getOuaaClient();
      const [departmentRows, roleRows, userPage] = await Promise.all([
        client.getOrganizationTree({ enabled: true }),
        client.getRoles(),
        client.listUsers({ enabled: true, pageNumber: 1, pageSize: 1000 }),
      ]);
      departments.value = treeSelectData(optionTree(departmentRows));
      roles.value = roleRows.map((item) => ({ label: item.name, value: String(item.id) }));
      users.value = userPage.records.map((item) => ({ label: item.name || item.username, value: String(item.id) }));
    };

    watch(
      () => props.value,
      (value) => {
        state.value = { ids: Array.isArray(value?.ids) ? value.ids.map(String) : [], type: value?.type ?? "DEPARTMENT" };
      },
      { deep: true, immediate: true },
    );
    onMounted(() => void loadOptions());

    return () => (
      <div class={styles.inlinePicker}>
        <Select
          value={state.value.type}
          style={{ width: "110px", flex: "none" }}
          options={[
            { label: "部门", value: "DEPARTMENT" },
            { label: "角色", value: "ROLE" },
            { label: "人员", value: "USER" },
          ]}
          onUpdate:value={(value) => update({ ids: [], type: value as PersonScopeType })}
        />
        {state.value.type === "DEPARTMENT" ? (
          <TreeSelect
            value={state.value.ids}
            treeData={departments.value}
            treeCheckable
            allowClear
            maxTagCount={2}
            placeholder="请选择部门"
            onUpdate:value={(value) => update({ ids: (value as string[]).map(String) })}
          />
        ) : (
          <Select
            value={state.value.ids}
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            maxTagCount={2}
            options={state.value.type === "ROLE" ? roles.value : users.value}
            placeholder={state.value.type === "ROLE" ? "请选择角色" : "请选择人员"}
            onUpdate:value={(value) => update({ ids: (value as string[]).map(String) })}
          />
        )}
      </div>
    );
  },
});
