import type { ModelTypeRow } from "@g2-contract/technical-bulletin";
import { type Component, defineComponent, reactive, ref } from "vue";

import { getTechnicalBulletinClient } from "../domain-context";
import {
  Button,
  Form,
  type FormInstance,
  FormItem,
  Input,
  Modal,
  PageLayout,
  Popconfirm,
  Select,
  message,
  usePcForm,
  usePcTable,
} from "../pc-ui-runtime";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.less";

interface PageSpec {
  title: string;
  tableCode: string;
  modelType: "ANNOUNCEMENT" | "ANNOUNCEMENT_TAG" | "PUBLISH_AGENCY";
  keywordPlaceholder: string;
  columnTitle: string;
  withParentType?: boolean;
}

const parentTypeOptions = [
  { label: "通知公告", value: "ANNOUNCEMENT" },
  { label: "新闻资讯", value: "NEW_INFORMATION" },
];

function createModelTypePage(spec: PageSpec): Component {
  return defineComponent({
    name: `TechnicalBulletin${spec.tableCode}`,
    setup() {
      const query = reactive({ keyword: "" });
      const visible = ref(false);
      const saving = ref(false);
      const editingId = ref("");
      const formRef = ref<FormInstance>();
      const model = reactive({ typeName: "", oneLevelType: undefined as string | undefined });

      const load = async (): Promise<{ records: ModelTypeRow[]; total: number; pages: number }> => {
        try {
          const client = getTechnicalBulletinClient();
          const params = { keyword: query.keyword || undefined };
          const records =
            spec.modelType === "ANNOUNCEMENT"
              ? await client.listNoticeTypes(params)
              : spec.modelType === "ANNOUNCEMENT_TAG"
                ? await client.listNoticeLabels(params)
                : await client.listInstitutions(params);
          return { records, total: records.length, pages: records.length > 0 ? 1 : 0 };
        } catch (error) {
          message.error(errorMessage(error, `${spec.title}加载失败`));
          return { records: [], total: 0, pages: 0 };
        }
      };

      const openCreate = (): void => {
        editingId.value = "";
        model.typeName = "";
        model.oneLevelType = spec.withParentType ? "ANNOUNCEMENT" : undefined;
        formRef.value?.clearValidate();
        visible.value = true;
      };

      const openEdit = (row: ModelTypeRow): void => {
        editingId.value = row.id;
        model.typeName = row.typeName;
        model.oneLevelType = row.oneLevelType;
        formRef.value?.clearValidate();
        visible.value = true;
      };

      const [PcTable, tableApi] = usePcTable({
        tableCode: spec.tableCode,
        rowKey: "id",
        columns: [
          {
            title: "序号",
            dataIndex: "sequence",
            width: 76,
            fixed: "left",
            align: "center",
            customRender: ({ index }: { index: number }) => index + 1,
          },
          ...(spec.withParentType
            ? [
                {
                  title: "一级类型",
                  dataIndex: "oneLevelType",
                  width: 180,
                  customRender: ({ text: value }: { text?: string }) =>
                    value === "ANNOUNCEMENT" ? "通知公告" : value === "NEW_INFORMATION" ? "新闻资讯" : text(value),
                },
              ]
            : []),
          { title: spec.columnTitle, dataIndex: "typeName", width: 260, fixed: spec.withParentType ? undefined : "left", ellipsis: true },
          {
            title: "操作",
            dataIndex: "action",
            width: 140,
            fixed: "right",
            customRender: ({ record }: { record: ModelTypeRow }) => (
              <div class={styles.actionSpace}>
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
                <Popconfirm
                  title={`确定删除该${spec.columnTitle}？`}
                  onConfirm={async () => {
                    try {
                      await getTechnicalBulletinClient().deleteModelType(record.id);
                      message.success("删除成功");
                      tableApi.query();
                    } catch (error) {
                      message.error(errorMessage(error, "删除失败"));
                    }
                  }}
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            ),
          },
        ],
        fetchApi: load,
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
            componentProps: { allowClear: true, placeholder: spec.keywordPlaceholder, style: { width: "280px" } },
          },
        ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          tableApi.query();
        },
        handleReset() {
          query.keyword = "";
          tableApi.query();
        },
      });

      const save = async (): Promise<void> => {
        try {
          await formRef.value?.validateFields();
          saving.value = true;
          const body = {
            modelType: spec.modelType,
            typeName: model.typeName.trim(),
            ...(spec.withParentType ? { oneLevelType: model.oneLevelType } : {}),
          };
          if (editingId.value) {
            await getTechnicalBulletinClient().updateModelType(editingId.value, body);
          } else {
            await getTechnicalBulletinClient().createModelType(body);
          }
          message.success(editingId.value ? "修改成功" : "新增成功");
          visible.value = false;
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
          title={spec.title}
          showFooter={false}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={openCreate}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.tablePage}>
                <PcForm />
                <PcTable />
                <Modal
                  open={visible.value}
                  title={`${editingId.value ? "编辑" : "新增"}${spec.columnTitle}`}
                  okText="保存"
                  cancelText="取消"
                  confirmLoading={saving.value}
                  onOk={() => void save()}
                  onCancel={() => (visible.value = false)}
                >
                  <Form ref={formRef} model={model} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
                    {spec.withParentType ? (
                      <FormItem label="一级类型" name="oneLevelType" rules={[{ required: true, message: "请选择一级类型" }]}>
                        <Select
                          value={model.oneLevelType}
                          options={parentTypeOptions}
                          placeholder="请选择一级类型"
                          onUpdate:value={(value) => (model.oneLevelType = value === undefined ? undefined : String(value))}
                        />
                      </FormItem>
                    ) : null}
                    <FormItem label={spec.columnTitle} name="typeName" rules={[{ required: true, message: `请输入${spec.columnTitle}` }]}>
                      <Input
                        value={model.typeName}
                        maxlength={64}
                        showCount
                        placeholder={`请输入${spec.columnTitle}`}
                        onUpdate:value={(value: string) => (model.typeName = value)}
                      />
                    </FormItem>
                  </Form>
                </Modal>
              </div>
            ),
          }}
        />
      );
    },
  });
}

export const NoticeTypePage = createModelTypePage({
  title: "公告类型",
  tableCode: "TECHNICAL_BULLETIN_TYPE",
  modelType: "ANNOUNCEMENT",
  keywordPlaceholder: "请输入公告类型名称搜索",
  columnTitle: "二级类型",
  withParentType: true,
});

export const NoticeTypeLabelPage = createModelTypePage({
  title: "公告标签",
  tableCode: "TECHNICAL_BULLETIN_LABEL",
  modelType: "ANNOUNCEMENT_TAG",
  keywordPlaceholder: "请输入公告标签名称搜索",
  columnTitle: "公告标签",
});

export const NoticeTypeInstitutionPage = createModelTypePage({
  title: "发布机构",
  tableCode: "TECHNICAL_BULLETIN_INSTITUTION",
  modelType: "PUBLISH_AGENCY",
  keywordPlaceholder: "请输入发布机构名称搜索",
  columnTitle: "发布机构",
});
