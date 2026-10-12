import { Checkbox, Input, Modal, Page, type PcTableColumn, Tag, TreeSelect, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref, watch } from "vue";

import { deptList, getAppointmentList, getPositionList, getRoleList, getUserPage } from "@/api/selection";

export interface AttendanceUser {
  id: string;
  name: string;
  mobile?: string;
  organizations?: { id: string; name: string }[];
  positions?: { name: string }[];
  roles?: { name: string }[];
  appointmentList?: { name: string }[];
  enabled?: boolean;
}

export const UserPickerModal = defineComponent({
  props: { title: String, multiple: Boolean, value: { type: Array as PropType<AttendanceUser[]>, default: () => [] }, loading: Boolean },
  emits: ["update:value"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const allLoading = ref(false);
    const allChecked = ref(false);
    const page = ref({ pageNumber: 1, pageSize: 10, total: 0 });
    const selected = ref(new Map<string, AttendanceUser>());
    const query = ref<Record<string, unknown>>({});
    let version = 0;
    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const res = await getUserPage({ ...query.value, enabled: true, pageNumber: page.value.pageNumber, pageSize: page.value.pageSize });
        if (current !== version || !open.value) {
          return;
        }
        tableApi.setDataSource(res.data.records);
        page.value.total = res.data.total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "人员加载失败");
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const [PcForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "organizationId",
          label: "部门",
          component: TreeSelect,
          componentProps: {
            placeholder: "请选择部门",
            treeData: [],
            fieldNames: { label: "name", value: "id", children: "children" },
            style: { width: "180px" },
          },
        },
        {
          fieldName: "positionId",
          label: "职位",
          component: "Select",
          componentProps: { placeholder: "请选择职位", options: [], fieldNames: { label: "name", value: "id" }, style: { width: "180px" } },
        },
        {
          fieldName: "appointmentId",
          label: "岗位",
          component: "Select",
          componentProps: { placeholder: "请选择岗位", options: [], fieldNames: { label: "name", value: "id" }, style: { width: "180px" } },
        },
        {
          fieldName: "roleId",
          label: "角色",
          component: "Select",
          componentProps: { placeholder: "请选择角色", options: [], fieldNames: { label: "name", value: "id" }, style: { width: "180px" } },
        },
        { fieldName: "keyword", label: "", component: "Input", componentProps: { placeholder: "请输入姓名" } },
      ],
      handleSubmit(values) {
        query.value = values;
        page.value.pageNumber = 1;
        allChecked.value = false;
        void load();
      },
      handleReset() {
        query.value = {};
        page.value.pageNumber = 1;
        allChecked.value = false;
        void load();
      },
    });
    const names = (value?: { name: string }[]): string => value?.map((row) => row.name).join("/") || "--";
    const columns: PcTableColumn[] = [
      {
        title: "序号",
        width: 70,
        align: "center",
        customRender: ({ index }) => (page.value.pageNumber - 1) * page.value.pageSize + index + 1,
      },
      { title: "名称", dataIndex: "name", align: "center", ellipsis: true, width: 130 },
      { title: "联系电话", dataIndex: "mobile", align: "center", width: 150 },
      {
        title: "部门",
        dataIndex: "organizations",
        align: "center",
        width: 180,
        customRender: ({ record }: { record: AttendanceUser }) => names(record.organizations),
      },
      {
        title: "职位",
        dataIndex: "positions",
        align: "center",
        width: 150,
        customRender: ({ record }: { record: AttendanceUser }) => names(record.positions),
      },
      {
        title: "岗位",
        dataIndex: "appointmentList",
        align: "center",
        width: 150,
        customRender: ({ record }: { record: AttendanceUser }) => names(record.appointmentList),
      },
      {
        title: "角色",
        dataIndex: "roles",
        align: "center",
        width: 150,
        customRender: ({ record }: { record: AttendanceUser }) => names(record.roles),
      },
      {
        title: "状态",
        dataIndex: "enabled",
        align: "center",
        width: 100,
        customRender: ({ record }: { record: AttendanceUser }) => (record.enabled ? "启用" : "禁用"),
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "attendance-user-selector",
      autoFetch: false,
      autoScrollY: false,
      scrollY: 400,
      rowSelection: props.multiple ? "checkbox" : "radio",
      rowSelectionChange(keys) {
        const kept = new Set(keys.map(String));
        if (!props.multiple) {
          selected.value.clear();
        }
        for (const row of (tableApi.getDataSource() ?? []) as AttendanceUser[]) {
          if (kept.has(row.id)) {
            selected.value.set(row.id, row);
          } else {
            selected.value.delete(row.id);
          }
        }
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
      },
    });
    const selectAll = async (checked: boolean): Promise<void> => {
      if (allLoading.value) {
        return;
      }
      allChecked.value = checked;
      if (!checked) {
        selected.value.clear();
        tableApi.setSelectedRowKeys([]);
        return;
      }
      const current = version;
      allLoading.value = true;
      try {
        for (let index = 0; index < Math.ceil(page.value.total / 999); index++) {
          const res = await getUserPage({ ...query.value, enabled: true, pageNumber: index + 1, pageSize: 999 });
          if (current !== version || !open.value) {
            return;
          }
          for (const row of res.data.records) {
            selected.value.set(row.id, row);
          }
        }
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "全选失败");
      } finally {
        allLoading.value = false;
      }
    };
    const loadOptions = async (): Promise<void> => {
      const results = await Promise.allSettled([deptList(), getPositionList(), getAppointmentList(), getRoleList()]);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          message.error("人员筛选条件加载失败");
          return;
        }
        const data = result.value.data;
        const items = Array.isArray(data) ? data : data.records;
        Object.assign(formApi.state.schema[index].componentProps ?? {}, index === 0 ? { treeData: items } : { options: items });
      });
    };
    watch(
      () => props.value,
      (value) => {
        if (open.value) {
          selected.value = new Map(value.map((row) => [row.id, row]));
          tableApi.setSelectedRowKeys([...selected.value.keys()]);
        }
      },
      { deep: true },
    );
    const close = (): void => {
      open.value = false;
      version++;
    };
    expose({
      openModal() {
        open.value = true;
        allChecked.value = false;
        selected.value = new Map(props.value.map((row) => [row.id, row]));
        tableApi.setSelectedRowKeys([...selected.value.keys()]);
        void load();
        void loadOptions();
      },
    });
    return () => (
      <Modal
        open={open.value}
        title={props.title ?? "选择人员"}
        width={1200}
        okText="确定"
        cancelText="取消"
        confirmLoading={allLoading.value || props.loading}
        onCancel={close}
        onOk={() => {
          if (allLoading.value || props.loading) {
            return;
          }
          emit("update:value", [...selected.value.values()]);
          close();
        }}
      >
        <PcForm />
        {props.multiple && (
          <Checkbox
            checked={allChecked.value}
            disabled={allLoading.value}
            onUpdate:checked={(checked) => {
              void selectAll(checked);
            }}
          >
            勾选所有
          </Checkbox>
        )}
        <div style="margin:12px 0">
          已选择 {selected.value.size} 人{" "}
          {Array.from(selected.value.values()).map((row) => (
            <Tag
              key={row.id}
              closable
              onClose={() => {
                selected.value.delete(row.id);
                tableApi.setSelectedRowKeys([...selected.value.keys()]);
              }}
            >
              {row.name}
            </Tag>
          ))}
        </div>
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

export const UserPickerInput = defineComponent({
  props: { value: { type: Array as PropType<AttendanceUser[]>, default: () => [] }, readonly: Boolean, multiple: Boolean },
  emits: ["update:value"],
  setup(props, { emit }) {
    const picker = ref<{ openModal: () => void }>();
    return () => (
      <>
        <div
          onClick={() => {
            if (!props.readonly) {
              picker.value?.openModal();
            }
          }}
        >
          <Input readonly disabled={props.readonly} value={props.value.map((row) => row.name).join("、")} placeholder="请选择人员" />
        </div>
        <UserPickerModal
          ref={picker}
          multiple={props.multiple}
          value={props.value}
          onUpdate:value={(value) => emit("update:value", value)}
        />
      </>
    );
  },
});
