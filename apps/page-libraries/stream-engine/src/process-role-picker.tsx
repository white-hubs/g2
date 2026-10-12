import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { Button, Form, Input, Modal, PlusOutlined, Table, Tag, message } from "@g2-platform/pc-ui";
import { defineComponent, onBeforeUnmount, ref, type PropType } from "vue";

import type { StreamEnginePageProps } from "./contract";
import { asIdNameList } from "./form-schema";

export type ProcessRoleChoice = { id: string; name: string };

export default defineComponent({
  name: "ProcessRolePicker",
  props: {
    value: { type: Array as PropType<ProcessRoleChoice[]>, default: () => [] },
    client: { type: Object as PropType<StreamEngineClient> },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]> },
    multiple: { type: Boolean, default: true },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const open = ref(false);
    const loading = ref(false);
    const rows = ref<ProcessRoleChoice[]>([]);
    const selected = ref<ProcessRoleChoice[]>([]);
    const keyword = ref("");
    const pageNumber = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    let version = 0;

    const load = async (): Promise<void> => {
      const current = ++version;
      loading.value = true;
      try {
        const client = props.client ?? (await props.getClient?.());
        if (!client) throw new Error("角色服务未就绪");
        const result = await client.pageProcessRoles({ pageNumber: pageNumber.value, pageSize: pageSize.value, name: keyword.value });
        if (current !== version) return;
        rows.value = asIdNameList(result.records);
        total.value = result.total;
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "角色加载失败");
      } finally {
        if (current === version) loading.value = false;
      }
    };

    const show = (): void => {
      if (open.value) return;
      selected.value = asIdNameList(props.value);
      keyword.value = "";
      pageNumber.value = 1;
      open.value = true;
      void load();
    };
    const close = (): void => {
      open.value = false;
      version++;
      loading.value = false;
    };
    onBeforeUnmount(close);
    const apply = (): void => {
      emit("update:value", selected.value);
      close();
    };

    return () => (
      <div>
        <Button type="primary" onClick={show}>
          <PlusOutlined />
          选择角色
        </Button>
        {props.value.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            {props.value.map((role) => (
              <Tag
                key={role.id}
                closable
                onClose={() =>
                  emit(
                    "update:value",
                    props.value.filter((item) => item.id !== role.id),
                  )
                }
              >
                {role.name}
              </Tag>
            ))}
          </div>
        ) : null}
        <Form.ItemRest>
          <Modal open={open.value} width={920} title="角色列表" okText="确定" cancelText="取消" onOk={apply} onCancel={close}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              <Input
                value={keyword.value}
                placeholder="请输入角色名称"
                style={{ width: "218px", maxWidth: "100%" }}
                onUpdate:value={(value: string) => {
                  keyword.value = value;
                }}
                onPressEnter={() => {
                  pageNumber.value = 1;
                  void load();
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  pageNumber.value = 1;
                  void load();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  keyword.value = "";
                  pageNumber.value = 1;
                  void load();
                }}
              >
                重置
              </Button>
            </div>
            <Table
              rowKey="id"
              dataSource={rows.value}
              loading={loading.value}
              columns={[{ title: "角色名称", dataIndex: "name" }]}
              rowSelection={{
                type: props.multiple ? "checkbox" : "radio",
                preserveSelectedRowKeys: true,
                selectedRowKeys: selected.value.map((role) => role.id),
                onChange: (keys: Array<string | number>, picked: ProcessRoleChoice[]) => {
                  selected.value = keys.flatMap((key) => {
                    const role = picked.find((item) => item.id === String(key)) ?? selected.value.find((item) => item.id === String(key));
                    return role ? [role] : [];
                  });
                },
              }}
              pagination={{
                current: pageNumber.value,
                pageSize: pageSize.value,
                total: total.value,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 30, 40],
                onChange: (page: number, size: number) => {
                  pageNumber.value = page;
                  pageSize.value = size;
                  void load();
                },
              }}
              scroll={{ y: 420 }}
            />
          </Modal>
        </Form.ItemRest>
      </div>
    );
  },
});
