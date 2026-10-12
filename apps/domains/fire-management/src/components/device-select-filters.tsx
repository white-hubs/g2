import TreeSelect from "ant-design-vue/es/tree-select";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import { getDeviceCenterClient, getMdataClient, getOuaaClient } from "@/domain-context";
import { Cascader, Select } from "@/pc-ui-runtime";

function unwrapList(raw: unknown): unknown[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data ?? data;
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(data.records)) return data.records as unknown[];
  return [];
}

function mapDeptTree(nodes: unknown[]): Array<{ label: string; value: string; children?: unknown[] }> {
  return (nodes as Record<string, unknown>[]).map((node) => {
    const label = String(node.name ?? node.label ?? "");
    const value = String(node.id ?? node.value ?? "");
    const children = Array.isArray(node.children) ? mapDeptTree(node.children) : undefined;
    return { label, value, children: children?.length ? children : undefined };
  });
}

export const ProductSelect = defineComponent({
  name: "FireProductSelect",
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    placeholder: { type: String, default: "所属产品" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const options = ref<Array<{ label: string; value: string }>>([]);
    onMounted(async () => {
      try {
        const client = await getDeviceCenterClient();
        const list = unwrapList(await client.getProductListAll());
        options.value = list.map((raw) => {
          const row = raw as Record<string, unknown>;
          return {
            value: String(row.id ?? ""),
            label: String(row.prodName ?? row.name ?? "未知"),
          };
        });
      } catch {
        options.value = [];
      }
    });
    return () => (
      <Select
        {...attrs}
        value={props.value || undefined}
        options={options.value}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        showSearch
        optionFilterProp="label"
        onUpdate:value={(value: unknown) => {
          emit("update:value", String(value ?? ""));
          emit("change", String(value ?? ""));
        }}
      />
    );
  },
});

export const DeviceTagSelect = defineComponent({
  name: "FireDeviceTagSelect",
  inheritAttrs: false,
  props: {
    value: { type: [String, Array] as PropType<string | string[]>, default: () => [] },
    placeholder: { type: String, default: "设备标签" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    multiple: { type: Boolean, default: true },
    maxTagCount: { type: Number, default: 3 },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const options = ref<Array<{ label: string; value: string }>>([]);
    onMounted(async () => {
      try {
        const client = await getDeviceCenterClient();
        const list = unwrapList(await client.getCustomerTagListAll({ status: 1 }));
        options.value = list.map((raw) => {
          const row = raw as Record<string, unknown>;
          return {
            label: String(row.tagName ?? row.name ?? ""),
            value: String(row.tagCode ?? row.code ?? ""),
          };
        });
      } catch {
        options.value = [];
      }
    });
    return () => (
      <Select
        {...attrs}
        value={props.value}
        mode={props.multiple ? "multiple" : undefined}
        options={options.value}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        maxTagCount={props.maxTagCount}
        showSearch
        optionFilterProp="label"
        onUpdate:value={(value: unknown) => {
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});

export const DeptCascaderSelect = defineComponent({
  name: "FireDeptCascaderSelect",
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    placeholder: { type: String, default: "维护部门" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const options = ref<Array<{ label: string; value: string; children?: unknown[] }>>([]);
    onMounted(async () => {
      try {
        const client = await getOuaaClient();
        options.value = mapDeptTree(unwrapList(await client.getOrganizationTree({ enabled: true })));
      } catch {
        options.value = [];
      }
    });
    return () => (
      <TreeSelect
        {...attrs}
        value={props.value || undefined}
        treeData={options.value}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        showSearch
        treeDefaultExpandAll
        treeNodeFilterProp="label"
        onUpdate:value={(value: unknown) => {
          emit("update:value", String(value ?? ""));
          emit("change", String(value ?? ""));
        }}
      />
    );
  },
});

export const AreaTreeSelect = defineComponent({
  name: "FireAreaTreeSelect",
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    placeholder: { type: String, default: "所在区域" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const options = ref<Array<{ label: string; value: string; children?: unknown[] }>>([]);
    const loading = ref(false);
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getMdataClient();
        const mapArea = (nodes: unknown[]): Array<{ label: string; value: string; children?: unknown[] }> =>
          (nodes as Record<string, unknown>[]).map((node) => {
            const label = String(node.aliasName ?? node.name ?? node.label ?? "");
            const value = String(node.id ?? node.value ?? "");
            const children = Array.isArray(node.children) ? mapArea(node.children) : undefined;
            return { label, value, children: children?.length ? children : undefined };
          });
        options.value = mapArea(unwrapList(await client.getAreaTree()));
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <TreeSelect
        {...attrs}
        value={props.value || undefined}
        treeData={options.value}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        loading={loading.value}
        showSearch
        treeDefaultExpandAll
        treeNodeFilterProp="label"
        onUpdate:value={(value: unknown) => {
          emit("update:value", String(value ?? ""));
          emit("change", String(value ?? ""));
        }}
      />
    );
  },
});

export const IotProductCategoryTreeSelect = defineComponent({
  name: "FireIotProductCategoryTreeSelect",
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    placeholder: { type: String, default: "产品品类" },
    allowClear: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const options = ref<unknown[]>([]);
    onMounted(async () => {
      try {
        const client = await getDeviceCenterClient();
        options.value = unwrapList(await client.getIotProductCategoryTree());
      } catch {
        options.value = [];
      }
    });
    const cascaderValue = (): string[] => (props.value ? props.value.split("-").filter(Boolean) : []);
    return () => (
      <Cascader
        {...attrs}
        options={options.value}
        value={cascaderValue()}
        fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        disabled={props.disabled}
        changeOnSelect
        showSearch
        onUpdate:value={(value: unknown) => {
          const next = Array.isArray(value) ? value.map(String).join("-") : "";
          emit("update:value", next);
          emit("change", next);
        }}
      />
    );
  },
});
