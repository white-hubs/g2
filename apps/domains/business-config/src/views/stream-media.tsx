import type { StreamMediaConfig, StreamMediaConfigInput } from "@g2-contract/business-config";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getBusinessConfigClient } from "../domain-context";
import {
  Button,
  Form,
  FormItem,
  Input,
  InputPassword,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  message,
  usePcForm,
  usePcTable,
  type FormInstance,
} from "../pc-ui-runtime";

interface StreamMediaDraft extends StreamMediaConfigInput {
  name: string;
  username: string;
  password: string;
  intranetAddress: string;
  ipAddress: string;
}

const emptyDraft = (): StreamMediaDraft => ({ name: "", username: "", password: "", intranetAddress: "", ipAddress: "" });
const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");

export const StreamMediaPage = defineComponent({
  name: "BusinessConfigStreamMediaPage",
  setup() {
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const modalOpen = ref(false);
    const modalMode = ref<"add" | "edit" | "detail">("add");
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const draft = reactive<StreamMediaDraft>(emptyDraft());
    let requestSequence = 0;

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      pagination: false,
      columns: [
        { title: "流媒体名称", dataIndex: "name", width: 180, ellipsis: true, customRender: ({ text: value }) => String(value || "--") },
        { title: "ip地址", dataIndex: "ipAddress", width: 180, ellipsis: true, customRender: ({ text: value }) => String(value || "--") },
        {
          title: "操作",
          dataIndex: "action",
          width: 220,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as StreamMediaConfig;
            return (
              <Space size={4}>
                <Button type="link" size="small" onClick={() => openModal("detail", row)}>
                  详情
                </Button>
                <Button type="link" size="small" onClick={() => openModal("edit", row)}>
                  编辑
                </Button>
                <PopConfirm title="是否删除当前选中？" okText="确定" cancelText="取消" onConfirm={() => void remove(row)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            );
          },
        },
      ],
      fetchApi: async (_pagination) => {
        const current = ++requestSequence;
        try {
          const result = await getBusinessConfigClient().pageStreamMedia({
            keyword: query.keyword.trim() || undefined,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          if (current === requestSequence) {
            page.total = result.total;
            return { records: result.records, total: result.total, pages: Math.ceil(result.total / page.pageSize) };
          }
          return { records: [], total: page.total, pages: Math.ceil(page.total / page.pageSize) };
        } catch (error) {
          if (current === requestSequence) message.error(errorText(error) || "流媒体配置加载失败");
          return { records: [], total: page.total, pages: Math.ceil(page.total / page.pageSize) };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "inline",
      cache: false,
      actionsInline: true,
      submitText: "查询",
      resetText: "重置",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入流媒体名称", style: { width: "266px" } },
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
    function openModal(mode: "add" | "edit" | "detail", record?: StreamMediaConfig): void {
      modalMode.value = mode;
      Object.assign(draft, emptyDraft(), record ?? {});
      formRef.value?.clearValidate?.();
      modalOpen.value = true;
    }

    async function save(): Promise<void> {
      if (saving.value) return;
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const payload: StreamMediaConfigInput = {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name.trim(),
          username: draft.username.trim(),
          ...(modalMode.value === "add" ? { password: draft.password } : {}),
          intranetAddress: draft.intranetAddress.trim(),
          ipAddress: draft.ipAddress.trim(),
        };
        if (modalMode.value === "edit") await getBusinessConfigClient().updateStreamMedia(payload);
        else await getBusinessConfigClient().createStreamMedia(payload);
        message.success("操作成功");
        modalOpen.value = false;
        tableApi.query();
      } catch (error) {
        if (error instanceof Error) message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: StreamMediaConfig): Promise<void> {
      try {
        await getBusinessConfigClient().deleteStreamMedia(record.id);
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error(errorText(error) || "删除失败");
      }
    }

    onMounted(() => tableApi.query());

    return () => (
      <PageLayout
        title="流媒体配置"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => openModal("add")}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
              <Modal
                open={modalOpen.value}
                title={modalMode.value === "detail" ? "流媒体配置详情" : modalMode.value === "edit" ? "编辑流媒体配置" : "新增流媒体配置"}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                footer={modalMode.value === "detail" ? <Button onClick={() => (modalOpen.value = false)}>关闭</Button> : undefined}
                onOk={() => void save()}
                onCancel={() => {
                  modalOpen.value = false;
                }}
              >
                <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px" } }}>
                  <FormItem label="名称" name="name" rules={[{ required: true, whitespace: true, message: "请输入名称" }]}>
                    <Input
                      value={draft.name}
                      disabled={modalMode.value === "detail"}
                      placeholder="请输入名称"
                      onUpdate:value={(value) => (draft.name = value)}
                    />
                  </FormItem>
                  <FormItem label="账户" name="username" rules={[{ required: true, whitespace: true, message: "请输入账户" }]}>
                    <Input
                      value={draft.username}
                      disabled={modalMode.value === "detail"}
                      placeholder="请输入账户"
                      onUpdate:value={(value) => (draft.username = value)}
                    />
                  </FormItem>
                  {modalMode.value === "add" ? (
                    <FormItem label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                      <InputPassword value={draft.password} placeholder="请输入密码" onUpdate:value={(value) => (draft.password = value)} />
                    </FormItem>
                  ) : null}
                  <FormItem
                    label="内网ip地址"
                    name="intranetAddress"
                    rules={[{ required: true, whitespace: true, message: "请输入内网ip地址" }]}
                  >
                    <Input
                      value={draft.intranetAddress}
                      disabled={modalMode.value === "detail"}
                      placeholder="请输入内网ip地址"
                      onUpdate:value={(value) => (draft.intranetAddress = value)}
                    />
                  </FormItem>
                  <FormItem label="外网ip地址" name="ipAddress">
                    <Input
                      value={draft.ipAddress}
                      disabled={modalMode.value === "detail"}
                      placeholder="请输入外网ip地址"
                      onUpdate:value={(value) => (draft.ipAddress = value)}
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
