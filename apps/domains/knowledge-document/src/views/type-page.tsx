import type { KnowledgeTypeNode } from "@g2-contract/knowledge-document";
import { defineComponent, reactive, ref } from "vue";

import { TypeFormModal } from "../components/type-form-modal";
import { getKnowledgeDocumentClient } from "../domain-context";
import { Button, PageLayout, PopConfirm, Space, message, usePcForm, usePcTable } from "../pc-ui-runtime";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.less";

export const KnowledgeDocumentTypePage = defineComponent({
  name: "KnowledgeDocumentTypePage",
  setup() {
    const query = reactive({ keyword: "" });
    const modalRef = ref<{ openModal(record?: KnowledgeTypeNode, addChild?: boolean): void }>();

    const remove = async (record: KnowledgeTypeNode): Promise<void> => {
      if (Array.isArray(record.children) && record.children.length > 0) {
        message.warning("当前类型有下级类型，无法删除");
        return;
      }
      try {
        await getKnowledgeDocumentClient().deleteType(record.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "KNOWLEDGE_DOCUMENT_TYPE",
      rowKey: "id",
      pagination: false,
      childrenColumnName: "children",
      columns: [
        {
          title: "图标",
          dataIndex: "icon",
          width: 80,
          align: "center",
          customRender: ({ record }: { record: KnowledgeTypeNode }) =>
            record.icon?.path ? <img class={styles.typeIcon} src={record.icon.path} alt="" /> : "--",
        },
        { title: "文件类型", dataIndex: "name", width: 200, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "备注", dataIndex: "description", width: 330, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "近30天新增",
          dataIndex: "entryCount30d",
          width: 120,
          align: "center",
          customRender: ({ text: value }) => Number(value ?? 0),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 210,
          fixed: "right",
          customRender: ({ record }: { record: KnowledgeTypeNode }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => modalRef.value?.openModal(record, true)}>
                新增下级
              </Button>
              <Button type="link" size="small" onClick={() => modalRef.value?.openModal(record)}>
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
          const records = await getKnowledgeDocumentClient().listTypeTree({ name: query.keyword.trim() || undefined });
          return { records, total: records.length, pages: 1 };
        } catch (error) {
          message.error(errorMessage(error, "文档类型加载失败"));
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
          componentProps: { allowClear: true, placeholder: "请输入类型名称" },
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

    return () => (
      <PageLayout
        title="文档类型"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => modalRef.value?.openModal()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              <div class={styles.typePageContent}>
                <PcForm />
                <PcTable />
              </div>
              <TypeFormModal ref={modalRef} onSaved={() => tableApi.query()} />
            </>
          ),
        }}
      />
    );
  },
});
