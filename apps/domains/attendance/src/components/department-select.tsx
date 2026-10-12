import type { DepartmentNode, OuaaClient } from "@g2-contract/ouaa";
import { TreeSelect, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onMounted, ref } from "vue";

import { getDomainContext } from "../domain-context";

/** 考勤查询与选人共用真实部门树，保留父子组织选择与清空行为。 */
export const DeptTreeSelect = defineComponent({
  inheritAttrs: false,
  props: {
    value: { type: [String, Array] as PropType<string | string[]>, default: undefined },
    showSearch: { type: Boolean, default: true },
    treeNodeFilterProp: { type: String, default: "name" },
    treeNodeLabelProp: { type: String, default: "name" },
    multiple: { type: Boolean, default: false },
    cheakable: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    placeholder: { type: String, default: "请选择部门" },
  },
  emits: ["update:value", "change"],
  setup(props, { emit, attrs }) {
    const data = ref<DepartmentNode[]>([]);
    const loading = ref(false);
    onMounted(async () => {
      loading.value = true;
      try {
        const client = await getDomainContext().ensureClient<OuaaClient>("ouaaClient");
        data.value = await client.getDepartments();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "部门加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <TreeSelect
        {...attrs}
        value={props.value || undefined}
        treeData={data.value}
        fieldNames={{ value: "id", label: "name", children: "children" }}
        multiple={props.multiple}
        treeCheckable={props.cheakable}
        disabled={props.readonly}
        loading={loading.value}
        placeholder={props.placeholder}
        showSearch
        allowClear
        treeNodeFilterProp="name"
        onUpdate:value={(value: string | string[] | undefined) => emit("update:value", value)}
        onChange={(value: string | string[] | undefined) => emit("change", value)}
      />
    );
  },
});
