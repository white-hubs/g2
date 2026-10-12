import { Modal, Page, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref } from "vue";

import { classesPageWithDept } from "@/api/classes-manage";
import { DeptTreeSelect } from "@/components/department-select";

export interface SelectableClass {
  id: string;
  name: string;
  nickName?: string;
}

export const ClassesSelectModal = defineComponent({
  props: { value: { type: Array as PropType<SelectableClass[]>, default: () => [] }, groupId: String },
  emits: ["update:value"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const page = ref({ pageNumber: 1, pageSize: 10, total: 0 });
    const selected = ref(new Map<string, SelectableClass>());
    let requestVersion = 0;
    const query = ref<Record<string, unknown>>({});
    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      tableApi.loading.value = true;
      try {
        const res = await classesPageWithDept({
          ...query.value,
          pageNumber: page.value.pageNumber,
          pageSize: page.value.pageSize,
          deptWhere: true,
          groupId: props.groupId,
        });
        if (version !== requestVersion || !open.value) {
          return;
        }
        tableApi.setDataSource(res.data.records);
        page.value.total = res.data.total;
      } finally {
        if (version === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        { fieldName: "name", label: "", component: "Input", componentProps: { placeholder: "请输入班次名称" } },
        {
          fieldName: "deptId",
          label: "应用范围",
          component: DeptTreeSelect,
          componentProps: { placeholder: "请选择", style: { width: "180px" } },
        },
      ],
      handleSubmit(values) {
        query.value = values;
        page.value.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.value = {};
        page.value.pageNumber = 1;
        void load();
      },
    });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "attendance-class-selector",
      autoFetch: false,
      autoScrollY: false,
      scrollY: 400,
      rowSelection: "checkbox",
      columns: [
        { title: "名称", dataIndex: "name", align: "center", ellipsis: true },
        { title: "简称", dataIndex: "nickName", align: "center", ellipsis: true },
        { title: "建议应用范围", dataIndex: "deptNames", align: "center", width: 350, ellipsis: true },
      ],
      rowSelectionChange(keys) {
        const kept = new Set(keys.map(String));
        for (const row of (tableApi.getDataSource() ?? []) as SelectableClass[]) {
          if (kept.has(row.id)) {
            selected.value.set(row.id, row);
          } else {
            selected.value.delete(row.id);
          }
        }
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
      },
    });
    const close = (): void => {
      open.value = false;
      requestVersion++;
    };
    expose({
      openModal(data?: SelectableClass[]) {
        open.value = true;
        selected.value = new Map((data ?? props.value).map((row) => [row.id, row]));
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
        void load();
      },
    });
    return () => (
      <Modal
        open={open.value}
        title="班次选择"
        width={900}
        okText="确定"
        cancelText="取消"
        onCancel={close}
        onOk={() => {
          emit("update:value", [...selected.value.values()]);
          close();
        }}
      >
        <PcForm />
        <PcTable />
        <Page
          cachePageQuery={false}
          syncToUrl={false}
          current={page.value.pageNumber}
          pageSize={page.value.pageSize}
          total={page.value.total}
          onPageChange={(pageNumber, pageSize) => {
            page.value.pageNumber = pageNumber;
            page.value.pageSize = pageSize;
            void load();
          }}
        />
      </Modal>
    );
  },
});
