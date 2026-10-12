// @ts-nocheck
import { defineComponent, reactive, ref } from "vue";

import {
  Button,
  Form,
  FormItem,
  Input,
  Page,
  PopConfirm,
  PopOver,
  Textarea,
  message,
  PageLayout,
  usePcModal,
  usePcTable,
} from "@/pc-ui-runtime";
import { usePageName } from "@/utils";

export type CategoryApi = {
  list: (params: Record<string, unknown>) => Promise<{ records: Record<string, unknown>[]; total: number }>;
  create: (data: { name: string; remark?: string }) => Promise<unknown>;
  update: (data: { id: string; name: string; remark?: string }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

export function createCategoryPage(options: { tableCode: string; api: CategoryApi }) {
  return defineComponent({
    name: "EmergencyCategoryPage",
    setup() {
      const { pageTitle } = usePageName();
      const filters = reactive({ keyword: "" });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const formState = reactive<{ id?: string; name?: string; remark?: string }>({});
      const formRef = ref();

      const [PcModal, modalApi] = usePcModal({
        title: pageTitle,
        onConfirm: async () => {
          await formRef.value?.validate?.();
          const name = String(formState.name ?? "").replace(/\s+/g, "");
          if (!name) {
            message.warning("请输入分类名称");
            return;
          }
          try {
            modalApi.setState({ confirmLoading: true });
            const payload = { name, remark: formState.remark || "" };
            if (formState.id) {
              await options.api.update({ id: formState.id, ...payload });
            } else {
              await options.api.create(payload);
            }
            message.success("操作成功");
            modalApi.close();
            tableApi.query();
          } catch (error) {
            message.error(error instanceof Error ? error.message : "操作失败");
          } finally {
            modalApi.setState({ confirmLoading: false });
          }
        },
        onCancel: () => modalApi.close(),
      });

      const openModal = (record?: Record<string, unknown>) => {
        formState.id = record?.id ? String(record.id) : undefined;
        formState.name = record?.name ? String(record.name) : undefined;
        formState.remark = record?.remark ? String(record.remark) : undefined;
        modalApi.setState({ title: `${formState.id ? "编辑" : "新增"}${pageTitle}` });
        modalApi.open();
      };

      const columns = [
        {
          title: "序号",
          dataIndex: "tableIndex",
          width: 80,
          customRender: ({ index }: { index: number }) => index + 1 + (page.pageNumber - 1) * page.pageSize,
        },
        {
          dataIndex: "name",
          title: "分类名称",
          ellipsis: true,
          customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        {
          dataIndex: "remark",
          title: "备注说明",
          ellipsis: true,
          customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
        },
        {
          dataIndex: "action",
          title: "操作",
          fixed: "right",
          width: 160,
          customRender: ({ record }: { record: Record<string, unknown> }) => (
            <>
              <Button type="link" size="small" onClick={() => openModal(record)}>
                编辑
              </Button>
              <PopConfirm
                title="确认删除该项？"
                onConfirm={async () => {
                  try {
                    await options.api.remove(String(record.id));
                    message.success("操作成功");
                    tableApi.query();
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : "删除失败");
                  }
                }}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </>
          ),
        },
      ];

      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: options.tableCode,
        rowKey: "id",
        fetchApi: async () => {
          const result = await options.api.list({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: filters.keyword || undefined,
          });
          return { total: result.total, pages: 0, records: result.records };
        },
        fetchLoaded: (data) => {
          page.total = data.total;
        },
      });

      const slots = {
        "layout-header": () => (
          <Button type="primary" onClick={() => openModal()}>
            新增
          </Button>
        ),
        "layout-content": () => (
          <div>
            <div class="em-search-row">
              <Input
                value={filters.keyword}
                placeholder="请输入分类名称"
                allowClear
                style={{ width: "220px" }}
                onUpdate:value={(v) => (filters.keyword = v)}
                onPressEnter={() => {
                  page.pageNumber = 1;
                  tableApi.query();
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  page.pageNumber = 1;
                  tableApi.query();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  filters.keyword = "";
                  page.pageNumber = 1;
                  tableApi.query();
                }}
              >
                重置
              </Button>
            </div>
            <PcTable />
            <PcModal>
              <Form model={formState} ref={formRef} label-col={{ style: { width: "100px" } }}>
                <FormItem label="分类名称" name="name" rules={[{ required: true, message: "请输入分类名称" }]}>
                  <Input
                    value={formState.name}
                    placeholder="请输入分类名称"
                    onUpdate:value={(v) => (formState.name = String(v ?? "").replace(/\s+/g, ""))}
                  />
                </FormItem>
                <FormItem label="说明" name="remark">
                  <Textarea
                    value={formState.remark}
                    placeholder="请输入备注信息,最多200字"
                    maxlength={200}
                    showCount
                    onUpdate:value={(v) => (formState.remark = v)}
                  />
                </FormItem>
              </Form>
            </PcModal>
          </div>
        ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            onPageChange={(pageNumber, pageSize) => {
              page.pageNumber = pageNumber;
              page.pageSize = pageSize;
              tableApi.query();
            }}
          />
        ),
      };

      return () => <PageLayout title={pageTitle} v-slots={slots} />;
    },
  });
}
