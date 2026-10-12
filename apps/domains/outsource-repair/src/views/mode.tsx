import type { OutsourceMode } from "@g2-client/outsource-repair/client";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getOutsourceRepairClient } from "@/domain-context";

export const OutsourceModeList = defineComponent({
  name: "OutsourceModeList",
  setup() {
    const client = getOutsourceRepairClient();
    const draft = reactive<{ id?: string | number; name: string }>({ name: "" });
    const open = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    let version = 0;

    const edit = (item?: OutsourceMode): void => {
      draft.id = item?.id;
      draft.name = item?.name ?? "";
      open.value = true;
    };

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const rows = await client.listModes();
        if (current === version) {
          tableApi.setDataSource(rows);
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "委外模式加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const remove = async (item: OutsourceMode): Promise<void> => {
      if (deleting.value || item.id === undefined) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteMode(item.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      const name = draft.name.trim();
      if (!name) {
        message.warning("请输入委外模式");
        return;
      }
      saving.value = true;
      try {
        if (draft.id === undefined) {
          await client.createMode({ name });
        } else {
          await client.updateMode({ id: draft.id, name });
        }
        open.value = false;
        message.success("操作成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "委外模式",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ text }) => (
          <PopOver placement="topLeft" content={text ? String(text) : ""}>
            {text ? String(text) : "--"}
          </PopOver>
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 150,
        customRender: ({ record }) => (
          <>
            <Button type="link" onClick={() => edit(record as OutsourceMode)}>
              编辑
            </Button>
            <PopConfirm title="确认删除该委外模式？" okText="确定" cancelText="取消" onConfirm={() => void remove(record as OutsourceMode)}>
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "REPAIR_MODE", rowKey: "id", autoFetch: false });

    void load();

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => edit()}>
          新增
        </Button>
      ),
      "layout-content": () => <PcTable />,
    };

    return () => (
      <>
        <PageLayout title="委外模式" showFooter={false} v-slots={slots} />
        <Modal
          open={open.value}
          title="委外模式"
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            open.value = false;
          }}
        >
          <Form layout="vertical">
            <FormItem label="委外模式" required>
              <Input
                value={draft.name}
                maxlength={20}
                placeholder="请输入委外模式"
                onUpdate:value={(value: string) => {
                  draft.name = value;
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
