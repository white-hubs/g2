import { Modal, Page, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref, watch } from "vue";

export interface SelectedRule {
  id: string;
  name: string;
  [key: string]: unknown;
}
interface RulePage {
  data: { records: unknown[]; total: number };
}
/** 考勤组规则选择共用分页、名称查询与跨页选择，保留每种规则的单选或多选约束。 */
export const RulesPicker = defineComponent({
  props: {
    show: Boolean,
    title: { type: String, required: true },
    columns: { type: Array as PropType<PcTableColumn[]>, required: true },
    search: { type: Array as PropType<{ key: string; componentProps?: { placeholder?: string } }[]>, required: true },
    apiFunction: { type: Function as PropType<(params: unknown) => Promise<RulePage>>, required: true },
    multiple: Boolean,
    selectRowKeysValue: { type: Array as PropType<string[]>, default: () => [] },
    selectRowValue: { type: Array as PropType<SelectedRule[]>, default: () => [] },
    searchParams: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: ["update:show", "ok"],
  setup(props, { emit }) {
    const page = ref(1),
      pageSize = ref(10),
      total = ref(0);
    let version = 0;
    const selected = ref<SelectedRule[]>([]);
    const [RulesTable, tableApi] = usePcTable({
      columns: props.columns,
      rowKey: "id",
      tableCode: `attendance-rules-picker-${props.title}`,
      autoFetch: false,
      autoScrollY: false,
      scrollY: 360,
      rowSelection: props.multiple ? "checkbox" : "radio",
      rowSelectionChange: (_keys, rows) => {
        selected.value = rows as SelectedRule[];
      },
    });
    const [QueryForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: props.search.map((item) => ({
        fieldName: item.key,
        label: "",
        component: "Input",
        defaultValue: "",
        componentProps: item.componentProps,
      })),
      handleSubmit: () => {
        page.value = 1;
        void load();
      },
      handleReset: () => {
        page.value = 1;
        void load();
      },
    });
    async function load(): Promise<void> {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await props.apiFunction({
          ...props.searchParams,
          ...formApi.formValues,
          pageNumber: page.value,
          pageSize: pageSize.value,
        });
        if (current !== version || !props.show) {
          return;
        }
        tableApi.setDataSource(result.data.records);
        total.value = result.data.total;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "加载规则失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    }
    watch(
      () => props.show,
      (open) => {
        ++version;
        if (!open) {
          return;
        }
        page.value = 1;
        selected.value = [...props.selectRowValue];
        tableApi.setSelectedRowKeys(props.selectRowKeysValue);
        tableApi.setSelectedRows(selected.value);
        tableApi.setColumns(props.columns);
        void load();
      },
    );
    const close = (): void => {
      ++version;
      emit("update:show", false);
    };
    return () => (
      <Modal
        open={props.show}
        title={props.title}
        width={900}
        okText="确定"
        cancelText="取消"
        onCancel={close}
        onOk={() => {
          emit("ok", selected.value);
          close();
        }}
      >
        <QueryForm />
        <RulesTable />
        <Page
          cachePageQuery={false}
          current={page.value}
          pageSize={pageSize.value}
          total={total.value}
          onPageChange={(next: number, size: number) => {
            page.value = next;
            pageSize.value = size;
            void load();
          }}
        />
      </Modal>
    );
  },
});
