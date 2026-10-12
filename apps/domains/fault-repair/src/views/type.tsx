import type { FaultType } from "@g2-client/fault-repair/client";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getFaultMaintainRuntime, getFaultRepairClient } from "../domain-context";

export const FaultTypeList = defineComponent({
  name: "FaultTypeList",
  setup() {
    const { applicationCode, labels } = getFaultMaintainRuntime();
    const client = getFaultRepairClient();
    const query = reactive({ keyword: "" });
    const draft = reactive<{ id?: string | number; name: string }>({ name: "" });
    const open = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    let version = 0;
    const edit = (item?: FaultType) => {
      draft.id = item?.id;
      draft.name = item?.name ?? "";
      open.value = true;
    };
    const columns: PcTableColumn[] = [
      { title: "类型", dataIndex: "name", ellipsis: true },
      {
        title: "操作",
        dataIndex: "action",
        width: 150,
        customRender: ({ record }) => (
          <>
            <Button type="link" onClick={() => edit(record as FaultType)}>
              编辑
            </Button>
            <PopConfirm
              title={`确认删除${labels.typeTitle}？`}
              okText="确定"
              cancelText="取消"
              onConfirm={() => void remove(record as FaultType)}
            >
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({ columns, tableCode: `${applicationCode}_TYPE`, rowKey: "id", autoFetch: false });
    async function load() {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const rows = await client.listTypes({ keyword: query.keyword, applicationCode });
        if (current === version) {
          tableApi.setDataSource(rows);
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : `${labels.typeTitle}加载失败`);
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    }
    async function remove(item: FaultType) {
      if (deleting.value || !item.id) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteType(item.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    }
    async function save() {
      if (saving.value) {
        return;
      }
      const name = draft.name.trim();
      if (!name) {
        message.warning("类型不能为空");
        return;
      }
      if (name.length > 20) {
        message.warning("类型名称最多20字");
        return;
      }
      saving.value = true;
      try {
        if (draft.id) {
          await client.updateType({ id: draft.id, name, applicationCode });
        } else {
          await client.createType({ name, applicationCode });
        }
        open.value = false;
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    }
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          componentProps: { placeholder: "名称", maxlength: 20, allowClear: true },
          defaultValue: "",
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        void load();
      },
      handleReset() {
        query.keyword = "";
        void load();
      },
    });
    void load();
    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => edit()}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
    };
    return () => (
      <>
        <PageLayout title={labels.typeTitle} showFooter={false} v-slots={slots} />
        <Modal
          open={open.value}
          title={draft.id ? "编辑类型" : "新增类型"}
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            open.value = false;
          }}
        >
          <Form layout="vertical">
            <FormItem label="类型名称" required>
              <Input
                value={draft.name}
                maxlength={20}
                placeholder="请输入类型名称"
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
