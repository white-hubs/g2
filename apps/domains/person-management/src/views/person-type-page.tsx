import {
  Button,
  Form,
  type FormInstance,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

// 类型声明与运行时依赖分组，保持迁移页的导入顺序稳定。
import type { PersonnelCategory } from "@g2-contract/person-management";

import { getPersonManagementClient } from "../domain-context";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

export const PersonTypePage = defineComponent({
  name: "PersonnelCategoryPage",
  setup() {
    const query = reactive({ name: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const modalOpen = ref(false);
    const saving = ref(false);
    const deleting = ref<string>();
    const formRef = ref<FormInstance>();
    const draft = reactive<{ id?: string; name: string; remark: string }>({ name: "", remark: "" });

    const open = (row?: PersonnelCategory): void => {
      Object.assign(draft, { id: row?.id, name: row?.name ?? "", remark: row?.remark ?? "" });
      formRef.value?.clearValidate?.();
      modalOpen.value = true;
    };

    const remove = async (row: PersonnelCategory): Promise<void> => {
      if (deleting.value) {
        return;
      }
      deleting.value = row.id;
      try {
        await getPersonManagementClient().deletePersonnelCategory(row.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      } finally {
        deleting.value = undefined;
      }
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "PERSON_TYPE",
      rowKey: "id",
      pagination: false,
      columns: [
        { title: "类别名称", dataIndex: "name", width: 240, ellipsis: true },
        { title: "类别描述", dataIndex: "remark", ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 180,
          fixed: "right",
          customRender: ({ record }: { record: PersonnelCategory }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => open(record)}>
                编辑
              </Button>
              <PopConfirm title="确定要删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove(record)}>
                <Button type="link" size="small" danger loading={deleting.value === record.id}>
                  删除
                </Button>
              </PopConfirm>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await getPersonManagementClient().pagePersonnelCategories({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            name: query.name.trim() || undefined,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "人员类别加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      cache: false,
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入分类名称", allowClear: true, style: { width: "220px" } },
        },
      ],
      handleSubmit(values) {
        query.name = String(values.name ?? "").trim();
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.name = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        await getPersonManagementClient().savePersonnelCategory({
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name.trim(),
          remark: draft.remark.trim(),
        });
        message.success("操作成功");
        modalOpen.value = false;
        tableApi.query();
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "保存失败"));
        }
      } finally {
        saving.value = false;
      }
    };

    return () => (
      <PageLayout
        title="人员类别"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => open()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
              <Modal
                open={modalOpen.value}
                title={draft.id ? "编辑分类" : "新增分类"}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => (modalOpen.value = false)}
              >
                <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px" } }}>
                  <FormItem
                    label="分类名称"
                    name="name"
                    rules={[
                      { required: true, message: "请输入分类名称" },
                      { pattern: /^[a-zA-Z0-9\u4E00-\u9FE5]+$/u, message: "只能输入中文、英文及数字" },
                    ]}
                  >
                    <Input
                      value={draft.name}
                      maxlength={20}
                      placeholder="请输入分类名称"
                      onUpdate:value={(value: string) => (draft.name = value.replace(/\s+/gu, ""))}
                    />
                  </FormItem>
                  <FormItem label="类别描述" name="remark">
                    <Textarea
                      value={draft.remark}
                      maxlength={200}
                      autoSize={{ minRows: 5, maxRows: 10 }}
                      placeholder="请输入类别描述"
                      onUpdate:value={(value: string) => (draft.remark = value)}
                    />
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
              onPageChange={(number, size) => {
                page.pageNumber = number;
                page.pageSize = size;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
