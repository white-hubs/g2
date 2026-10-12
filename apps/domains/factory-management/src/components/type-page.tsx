import type { TypeRecord } from "@g2-contract/factory-management";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getFactoryManagementClient } from "../domain-context";
import { errorMessage, text } from "../shared";

interface TypePageConfig {
  title: string;
  columnTitle: string;
  tag: "INDUSTRY" | "ROOM" | "APPEAL" | "INTERVIEW";
  tableCode: string;
}

export function createTypePage(config: TypePageConfig) {
  return defineComponent({
    name: `FactoryManagement${config.tag}TypePage`,
    setup() {
      const query = reactive({ keyword: "" });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const modalOpen = ref(false);
      const saving = ref(false);
      const editing = ref<TypeRecord>();
      const model = reactive({ name: "" });
      const formRef = ref<{ validate(): Promise<void>; resetFields(): void }>();

      const openModal = (record?: TypeRecord): void => {
        editing.value = record;
        model.name = record?.name ?? "";
        modalOpen.value = true;
      };

      const save = async (): Promise<void> => {
        await formRef.value?.validate();
        saving.value = true;
        try {
          if (editing.value) {
            await getFactoryManagementClient().updateType(editing.value.id, { name: model.name.trim() });
          } else {
            await getFactoryManagementClient().createType(config.tag, { name: model.name.trim() });
          }
          message.success("保存成功");
          modalOpen.value = false;
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "保存失败"));
        } finally {
          saving.value = false;
        }
      };

      const remove = async (record: TypeRecord): Promise<void> => {
        try {
          await getFactoryManagementClient().deleteType(record.id);
          message.success("删除成功");
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };

      const [PcTable, tableApi] = usePcTable({
        tableCode: config.tableCode,
        rowKey: "id",
        columns: [
          { title: config.columnTitle, dataIndex: "name", ellipsis: true, customRender: ({ text: value }) => text(value) },
          {
            title: "操作",
            dataIndex: "action",
            width: 150,
            fixed: "right",
            customRender: ({ record }: { record: TypeRecord }) => (
              <Space size={4}>
                <Button type="link" size="small" onClick={() => openModal(record)}>
                  编辑
                </Button>
                <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove(record)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            ),
          },
        ],
        fetchApi: async () => {
          try {
            const result = await getFactoryManagementClient().pageTypes(config.tag, {
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword.trim() || undefined,
            });
            page.total = result.total;
            return result;
          } catch (error) {
            message.error(errorMessage(error, `${config.title}加载失败`));
            return { records: [], total: 0, pages: 0 };
          }
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: [
          {
            component: "Input",
            fieldName: "keyword",
            label: "",
            defaultValue: "",
            componentProps: { allowClear: true, placeholder: `请输入${config.columnTitle}搜索` },
          },
        ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          query.keyword = "";
          page.pageNumber = 1;
          tableApi.query();
        },
      });

      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => openModal()}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <>
                <PcForm />
                <PcTable />
                <Modal
                  open={modalOpen.value}
                  title={editing.value ? `编辑${config.title}` : `新增${config.title}`}
                  confirmLoading={saving.value}
                  okText="保存"
                  cancelText="取消"
                  onOk={() => void save()}
                  onCancel={() => {
                    modalOpen.value = false;
                    formRef.value?.resetFields();
                  }}
                >
                  <Form ref={formRef} model={model} labelCol={{ style: { width: "110px" } }}>
                    <FormItem
                      label={config.columnTitle}
                      name="name"
                      rules={[{ required: true, whitespace: true, message: `请输入${config.columnTitle}` }]}
                    >
                      <Input v-model:value={model.name} maxlength={50} placeholder={`请输入${config.columnTitle}`} />
                    </FormItem>
                  </Form>
                </Modal>
              </>
            ),
            "footer-page": () => (
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(pageNumber, pageSize) => {
                  page.pageNumber = pageNumber;
                  page.pageSize = pageSize;
                  tableApi.query();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}
