import type { BusinessTag } from "@g2-contract/business-config";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getBusinessConfigClient, hasBusinessConfigFunction } from "../domain-context";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  PopConfirm,
  Space,
  message,
  usePcForm,
  usePcTable,
  type FormInstance,
} from "../pc-ui-runtime";

const BASE = "/d/business-config";
const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");

function formatPeriod(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) return undefined;
  const [start, end] = value as Array<{ format?: (pattern: string) => string }>;
  if (typeof start.format !== "function" || typeof end.format !== "function") return undefined;
  return `${start.format("YYYY-MM-DD")} 00:00:00,${end.format("YYYY-MM-DD")} 23:59:59`;
}

export const BusinessTagPage = defineComponent({
  name: "BusinessConfigBusinessTagPage",
  setup() {
    const router = useRouter();
    const query = reactive<{ keyword: string; period?: string }>({ keyword: "", period: undefined });
    const modalOpen = ref(false);
    const saving = ref(false);
    const editing = ref<BusinessTag>();
    const parent = ref<BusinessTag>();
    const formRef = ref<FormInstance>();
    const draft = reactive({ name: "", description: "" });
    let requestSequence = 0;

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      childrenColumnName: "childList",
      pagination: false,
      columns: [
        { title: "标签名称", dataIndex: "name", ellipsis: true },
        { title: "标签描述", dataIndex: "description", ellipsis: true },
        { title: "编辑时间", dataIndex: "updateTime", ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 310,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as BusinessTag;
            return (
              <Space size={4}>
                {row.level <= 2 && hasBusinessConfigFunction("businessConfig:businessTag:add") ? (
                  <Button type="link" size="small" onClick={() => openModal("add-child", row)}>
                    新增下级
                  </Button>
                ) : null}
                {hasBusinessConfigFunction("businessConfig:businessTag:edit") ? (
                  <Button type="link" size="small" onClick={() => openModal("edit", row)}>
                    编辑
                  </Button>
                ) : null}
                <Button type="link" size="small" onClick={() => void router.push({ path: `${BASE}/business-tag/${row.id}` })}>
                  详情
                </Button>
                {hasBusinessConfigFunction("businessConfig:businessTag:edit") ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => void router.push({ path: `${BASE}/business-tag/${row.id}`, query: { tab: "associate" } })}
                  >
                    标签关联
                  </Button>
                ) : null}
                {hasBusinessConfigFunction("businessConfig:businessTag:deleted") ? (
                  <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove(row)}>
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </PopConfirm>
                ) : null}
              </Space>
            );
          },
        },
      ],
      fetchApi: async () => {
        const current = ++requestSequence;
        try {
          const records = await getBusinessConfigClient().listBusinessTags({
            name: query.keyword.trim() || undefined,
            period: query.period,
          });
          if (current !== requestSequence) return { records: [], total: 0, pages: 1 };
          return { records, total: records.length, pages: 1 };
        } catch (error) {
          if (current === requestSequence) message.error(errorText(error));
          return { records: [], total: 0, pages: 1 };
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
        { component: "RangePicker", fieldName: "period", label: "时间范围", defaultValue: undefined },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "标签名称", allowClear: true },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "");
        query.period = formatPeriod(values.period);
        tableApi.query();
      },
      handleReset() {
        query.keyword = "";
        query.period = undefined;
        tableApi.query();
      },
    });

    function openModal(mode: "add" | "edit" | "add-child", record?: BusinessTag): void {
      editing.value = mode === "edit" ? record : undefined;
      parent.value = mode === "add-child" ? record : undefined;
      draft.name = record && mode === "edit" ? record.name : "";
      draft.description = record && mode === "edit" ? record.description : "";
      modalOpen.value = true;
      formRef.value?.clearValidate?.();
    }

    async function save(): Promise<void> {
      if (saving.value) return;
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const input = {
          name: draft.name.trim(),
          description: draft.description.trim(),
          ...(parent.value ? { parentId: parent.value.id } : {}),
        };
        if (editing.value) await getBusinessConfigClient().updateBusinessTag({ ...input, id: editing.value.id });
        else await getBusinessConfigClient().createBusinessTag(input);
        message.success("操作成功");
        modalOpen.value = false;
        tableApi.query();
      } catch (error) {
        if (error instanceof Error) message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: BusinessTag): Promise<void> {
      if (record.childList?.length) {
        message.warning("当前标签有下属标签，无法删除");
        return;
      }
      try {
        await getBusinessConfigClient().deleteBusinessTag(record.id);
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error(errorText(error));
      }
    }

    onMounted(() => void tableApi.query());

    return () => (
      <PageLayout
        title="业务标签管理"
        v-slots={{
          "layout-header": () =>
            hasBusinessConfigFunction("businessConfig:businessTag:add") ? (
              <Button type="primary" onClick={() => openModal("add")}>
                新增
              </Button>
            ) : null,
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
              <Modal
                open={modalOpen.value}
                title={parent.value ? `【${parent.value.name}】新增下级` : editing.value ? "编辑业务标签" : "新增业务标签"}
                width={600}
                okText="确定"
                cancelText="取消"
                confirmLoading={saving.value}
                onOk={() => void save()}
                onCancel={() => (modalOpen.value = false)}
              >
                <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px" } }}>
                  <FormItem label="标签名称" name="name" rules={[{ required: true, message: "请输入标签名称" }]}>
                    <Input value={draft.name} placeholder="请输入名称" onUpdate:value={(value) => (draft.name = value)} />
                  </FormItem>
                  <FormItem label="标签描述" name="description">
                    <Input
                      value={draft.description}
                      maxlength={30}
                      placeholder="请输入标签描述"
                      onUpdate:value={(value) => (draft.description = value)}
                    />
                  </FormItem>
                </Form>
              </Modal>
            </>
          ),
        }}
      />
    );
  },
});
