import type { AssetRow } from "@g2-contract/asset-management";
import { type PropType, defineComponent, reactive, ref } from "vue";

import { getClient } from "./domain-context";
import { cellText, errorText } from "./model";
import { loadPcUi } from "./runtime-modules";
const { Button, Input, Modal, Page, Space, Tag, message, usePcForm, usePcTable } = await loadPcUi();
export interface Person {
  id: string;
  name: string;
}
export const PersonPicker = defineComponent({
  name: "AssetPersonPicker",
  props: { value: { type: Array as PropType<Person[]>, default: () => [] }, multiple: Boolean, disabled: Boolean },
  emits: { change: (_people: Person[]) => true },
  setup(props, { emit }) {
    const open = ref(false);
    const chosen = ref<Person[]>([]);
    const filter = reactive({ keyword: "" });
    const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let version = 0;
    const [PcTable, table] = usePcTable({
      rowKey: "id",
      tableCode: "ASSET_PERSON_PICKER",
      autoFetch: false,
      pagination: false,
      columns: [
        { title: "姓名", dataIndex: "name" },
        { title: "部门", dataIndex: "organizationName", customRender: ({ record }) => cellText((record as AssetRow).organizationName) },
        { title: "账号", dataIndex: "username" },
      ],
      rowSelection: props.multiple ? "checkbox" : "radio",
      rowSelectionChange: (keys, rows) => {
        const selected = rows.map((entry) => {
          const row = entry as AssetRow;
          return { id: row.id, name: String(row.name ?? row.username) };
        });
        chosen.value = props.multiple
          ? [...chosen.value.filter((person) => keys.includes(person.id) && !selected.some((entry) => entry.id === person.id)), ...selected]
          : selected;
      },
    });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const page = await getClient().users({ ...filter, pageNumber: pager.pageNumber, pageSize: pager.pageSize });
        if (version === current) {
          table.setDataSource(page.records);
          pager.total = page.total;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (version === current) {
          table.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: filter,
      cache: false,
      actionsInline: true,
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "姓名、账号", allowClear: true },
        },
      ],
      handleSubmit: () => {
        pager.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        pager.pageNumber = 1;
        void load();
      },
    });
    const show = () => {
      chosen.value = [...props.value];
      table.setSelectedRowKeys(chosen.value.map((person) => person.id));
      table.setSelectedRows(chosen.value);
      pager.pageNumber = 1;
      open.value = true;
      void load();
    };
    return () => (
      <>
        <div
          onClick={() => {
            if (!props.disabled) {
              show();
            }
          }}
        >
          <Input
            readonly
            disabled={props.disabled}
            value={props.value.map((person) => person.name).join("、")}
            placeholder="请选择人员"
            style={{ cursor: "pointer" }}
            v-slots={{
              suffix: () =>
                props.value.length > 0 && !props.disabled ? (
                  <Button
                    size="small"
                    type="text"
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      emit("change", []);
                    }}
                  >
                    清除
                  </Button>
                ) : undefined,
            }}
          />
        </div>
        <Modal
          okText="确定"
          cancelText="取消"
          open={open.value}
          title="选择人员"
          width={760}
          onCancel={() => {
            open.value = false;
          }}
          onOk={() => {
            emit("change", [...chosen.value]);
            open.value = false;
          }}
        >
          <div style={{ height: "410px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <PcForm />
            <Space wrap style={{ marginBottom: "12px" }}>
              {chosen.value.map((person) => (
                <Tag
                  key={person.id}
                  closable
                  onClose={() => {
                    chosen.value = chosen.value.filter((item) => item.id !== person.id);
                    table.setSelectedRowKeys(chosen.value.map((item) => item.id));
                  }}
                >
                  {person.name}
                </Tag>
              ))}
            </Space>
            <PcTable />
          </div>
          <Page
            cachePageQuery={false}
            current={pager.pageNumber}
            pageSize={pager.pageSize}
            total={pager.total}
            syncToUrl={false}
            onPageChange={(number: number, size: number) => {
              pager.pageNumber = number;
              pager.pageSize = size;
              void load();
            }}
          />
        </Modal>
      </>
    );
  },
});
