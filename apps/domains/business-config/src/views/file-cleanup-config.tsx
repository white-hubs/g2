import type { FileCleanupPolicy, FileCleanupPolicyInput, FileCleanupScene } from "@g2-contract/business-config";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getBusinessConfigClient } from "../domain-context";
import {
  Button,
  Form,
  FormItem,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Select,
  Space,
  message,
  usePcForm,
  usePcTable,
  type FormInstance,
} from "../pc-ui-runtime";

interface CleanupPolicyDraft {
  id?: string;
  sceneCode?: string;
  expirationPolicy?: string;
  multipleDays?: number;
  delayDays?: number;
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");
const policyOptions = [{ label: "基于时间过期", value: "BASED_ON_TIME_EXPIRATION" }];

function configInfo(record: FileCleanupPolicy): { multipleDays?: number; delayDays?: number } {
  try {
    const parsed: unknown = JSON.parse(record.configInfo);
    return parsed && typeof parsed === "object" ? (parsed as { multipleDays?: number; delayDays?: number }) : {};
  } catch {
    return {};
  }
}

export const FileCleanupPolicyPage = defineComponent({
  name: "BusinessConfigFileCleanupPolicyPage",
  setup() {
    const query = reactive({ sceneCode: undefined as string | undefined });
    const page = reactive({ pageNumber: 1, pageSize: 20, total: 0 });
    const scenes = ref<FileCleanupScene[]>([]);
    const modalOpen = ref(false);
    const modalMode = ref<"add" | "edit">("add");
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const draft = reactive<CleanupPolicyDraft>({});
    let requestSequence = 0;

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      pagination: false,
      columns: [
        { title: "场景", dataIndex: "sceneName", ellipsis: true },
        {
          title: "文件过期策略",
          dataIndex: "expirationPolicy",
          customRender: ({ text: value }) => policyOptions.find((option) => option.value === value)?.label ?? "--",
        },
        {
          title: "保存天数",
          dataIndex: "multipleDays",
          customRender: ({ record }) => {
            const value = configInfo(record as FileCleanupPolicy).multipleDays;
            return value === undefined || value === null ? "--" : String(value);
          },
        },
        {
          title: "延迟天数",
          dataIndex: "delayDays",
          customRender: ({ record }) => {
            const value = configInfo(record as FileCleanupPolicy).delayDays;
            return value === undefined || value === null ? "--" : String(value);
          },
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 160,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as FileCleanupPolicy;
            return (
              <Space size={4}>
                <Button type="link" size="small" onClick={() => openModal("edit", row)}>
                  编辑
                </Button>
                <PopConfirm title="确认是否删除配置?" okText="确定" cancelText="取消" onConfirm={() => void remove(row)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            );
          },
        },
      ],
      fetchApi: async () => {
        const current = ++requestSequence;
        try {
          const result = await getBusinessConfigClient().pageFileCleanupPolicies({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            sceneCode: query.sceneCode,
          });
          if (current !== requestSequence) return { records: [], total: page.total, pages: Math.ceil(page.total / page.pageSize) };
          page.total = result.total;
          return { records: result.records, total: result.total, pages: Math.ceil(result.total / page.pageSize) };
        } catch (error) {
          if (current === requestSequence) message.error(errorText(error));
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
          fieldName: "sceneCode",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入场景" },
        },
      ],
      handleSubmit(values) {
        query.sceneCode = String(values.sceneCode ?? "").trim() || undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.sceneCode = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    function openModal(mode: "add" | "edit", record?: FileCleanupPolicy): void {
      modalMode.value = mode;
      const parsed = record ? configInfo(record) : {};
      Object.assign(draft, {
        id: record?.id,
        sceneCode: record?.sceneCode,
        expirationPolicy: record?.expirationPolicy,
        multipleDays: parsed.multipleDays,
        delayDays: parsed.delayDays,
      });
      formRef.value?.clearValidate?.();
      modalOpen.value = true;
    }

    async function save(): Promise<void> {
      if (saving.value) return;
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const payload: FileCleanupPolicyInput = {
          ...(draft.id ? { id: draft.id } : {}),
          sceneCode: draft.sceneCode ?? "",
          expirationPolicy: draft.expirationPolicy ?? "",
          configInfo: JSON.stringify({ delayDays: draft.delayDays, multipleDays: draft.multipleDays }),
        };
        if (modalMode.value === "edit") await getBusinessConfigClient().updateFileCleanupPolicy(payload);
        else await getBusinessConfigClient().createFileCleanupPolicy(payload);
        message.success("保存成功");
        modalOpen.value = false;
        tableApi.query();
      } catch (error) {
        if (error instanceof Error) message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: FileCleanupPolicy): Promise<void> {
      try {
        await getBusinessConfigClient().deleteFileCleanupPolicy(record.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorText(error));
      }
    }

    onMounted(() => {
      void tableApi.query();
      void getBusinessConfigClient()
        .getFileCleanupScenes()
        .then((result) => (scenes.value = result))
        .catch((error: unknown) => message.error(errorText(error)));
    });

    return () => (
      <PageLayout
        title="文件清理策略配置"
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
                title={modalMode.value === "edit" ? "编辑" : "新增"}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => (modalOpen.value = false)}
              >
                <Form ref={formRef} model={draft} labelCol={{ span: 5 }}>
                  <FormItem label="场景" name="sceneCode" rules={[{ required: true, message: "请选择场景" }]}>
                    <Select
                      value={draft.sceneCode}
                      options={scenes.value.map((scene) => ({ label: scene.sceneName, value: scene.sceneCode }))}
                      placeholder="请选择场景"
                      onUpdate:value={(value) => (draft.sceneCode = value as string | undefined)}
                    />
                  </FormItem>
                  <FormItem label="文件过期策略" name="expirationPolicy" rules={[{ required: true, message: "请选择文件过期策略" }]}>
                    <Select
                      value={draft.expirationPolicy}
                      options={policyOptions}
                      placeholder="请选择文件过期策略"
                      onUpdate:value={(value) => (draft.expirationPolicy = value as string | undefined)}
                    />
                  </FormItem>
                  <FormItem label="保存天数" name="multipleDays" rules={[{ required: true, message: "请输入天数" }]}>
                    <InputNumber
                      value={draft.multipleDays}
                      min={0}
                      max={99999}
                      precision={0}
                      onUpdate:value={(value) => (draft.multipleDays = typeof value === "number" ? value : undefined)}
                    />
                    <span> 天</span>
                  </FormItem>
                  <FormItem label="延迟天数" name="delayDays" rules={[{ required: true, message: "请输入天数" }]}>
                    <InputNumber
                      value={draft.delayDays}
                      min={0}
                      max={99999}
                      precision={0}
                      onUpdate:value={(value) => (draft.delayDays = typeof value === "number" ? value : undefined)}
                    />
                    <span> 天</span>
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
