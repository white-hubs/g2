import type { KnowledgeDocumentPayload, KnowledgeFile } from "@g2-contract/knowledge-document";
import { type PropType, defineComponent, ref } from "vue";

import { getKnowledgeDocumentClient } from "../domain-context";
import { Form, FormItem, Input, Modal, Select, Step, Steps, TreeSelect, message, usePcTable } from "../pc-ui-runtime";
import { type SelectOption, type TreeOption, errorMessage } from "../shared";
import { DocumentFileUpload } from "./document-file-upload";

import styles from "../styles.module.less";

interface BatchDraft {
  key: string;
  name: string;
  typeId?: string;
  deptId?: string;
  productId?: string;
  fileId: string;
}

export const BatchUploadModal = defineComponent({
  name: "KnowledgeDocumentBatchUploadModal",
  props: {
    typeOptions: { type: Array as PropType<TreeOption[]>, default: () => [] },
    productOptions: { type: Array as PropType<SelectOption[]>, default: () => [] },
    departmentOptions: { type: Array as PropType<TreeOption[]>, default: () => [] },
  },
  emits: ["saved"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const current = ref(0);
    const submitting = ref(false);
    const files = ref<KnowledgeFile[]>([]);
    const drafts = ref<BatchDraft[]>([]);
    const result = ref({ successCount: 0, errorCount: 0 });

    const [FailureTable, failureTableApi] = usePcTable({
      tableCode: "KNOWLEDGE_DOCUMENT_BATCH_FAILURE",
      rowKey: "id",
      autoFetch: false,
      autoScrollY: false,
      pagination: false,
      columns: [
        { title: "上传文档", dataIndex: "details", ellipsis: true },
        { title: "状态", dataIndex: "status", width: 100, align: "center" },
      ],
    });

    const openModal = (): void => {
      current.value = 0;
      files.value = [];
      drafts.value = [];
      result.value = { successCount: 0, errorCount: 0 };
      failureTableApi.setDataSource([]);
      open.value = true;
    };
    expose({ openModal });

    const syncDrafts = (nextFiles: KnowledgeFile[]): void => {
      files.value = nextFiles;
      drafts.value = nextFiles.map((file) => {
        const existing = drafts.value.find((item) => item.fileId === file.id);
        return (
          existing ?? {
            key: file.id,
            name: file.name.replace(/\.[^.]+$/u, ""),
            fileId: file.id,
          }
        );
      });
    };

    const next = async (): Promise<void> => {
      if (current.value === 0) {
        if (files.value.length === 0) {
          message.warning("请先上传文件");
          return;
        }
        current.value = 1;
        return;
      }
      if (current.value === 2) {
        open.value = false;
        return;
      }
      const invalid = drafts.value.find((item) => !item.name.trim() || !item.typeId);
      if (invalid) {
        message.warning(!invalid.name.trim() ? "请完善文档名称" : "请为每个文档选择文档类型");
        return;
      }
      if (submitting.value) {
        return;
      }
      submitting.value = true;
      try {
        const payload: KnowledgeDocumentPayload[] = drafts.value.map((item) => ({
          name: item.name.trim(),
          typeId: String(item.typeId),
          deptId: item.deptId ?? null,
          productId: item.productId ?? null,
          fileIds: [item.fileId],
        }));
        const response = await getKnowledgeDocumentClient().createDocuments(payload);
        result.value = { successCount: response.successCount, errorCount: response.errorCount };
        failureTableApi.setDataSource(response.errorList.map((details, index) => ({ id: `${index}-${details}`, details, status: "失败" })));
        current.value = 2;
        emit("saved");
      } catch (error) {
        message.error(errorMessage(error, "批量上传失败"));
      } finally {
        submitting.value = false;
      }
    };

    const backOrCancel = (): void => {
      if (current.value === 1) {
        current.value = 0;
        return;
      }
      open.value = false;
    };

    return () => (
      <Modal
        open={open.value}
        title="批量上传知识文档"
        width="80%"
        okText={current.value === 2 ? "完成" : "下一步"}
        cancelText={current.value === 1 ? "上一步" : "取消"}
        confirmLoading={submitting.value}
        onOk={() => void next()}
        onCancel={backOrCancel}
      >
        <Steps current={current.value} size="small" class={styles.batchSteps}>
          <Step title="添加文档" />
          <Step title="编辑文档" />
          <Step title="上传结果" />
        </Steps>
        <div class={styles.batchBody}>
          {current.value === 0 ? (
            <DocumentFileUpload
              value={files.value}
              multiple
              dragger
              maxCount={20}
              accept=".jpg,.jpeg,.png,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"
              onUpdate:value={syncDrafts}
            />
          ) : null}
          {current.value === 1 ? (
            <div class={styles.batchDraftList}>
              {drafts.value.map((draft, index) => (
                <div class={styles.batchDraftCard} key={draft.key}>
                  <div class={styles.batchDraftTitle}>
                    <span>{index + 1}</span>
                    <strong>{files.value.find((file) => file.id === draft.fileId)?.name ?? draft.name}</strong>
                  </div>
                  <Form layout="vertical" model={draft} class={styles.batchDraftForm}>
                    <FormItem label="文档名称" required>
                      <Input value={draft.name} placeholder="请输入文档名称" onUpdate:value={(value) => (draft.name = value)} />
                    </FormItem>
                    <FormItem label="文档类型" required>
                      <TreeSelect
                        value={draft.typeId}
                        treeData={props.typeOptions}
                        showSearch
                        treeDefaultExpandAll
                        treeNodeFilterProp="label"
                        placeholder="请选择文档类型"
                        onUpdate:value={(value) => (draft.typeId = value === undefined ? undefined : String(value))}
                      />
                    </FormItem>
                    <FormItem label="关联产品">
                      <Select
                        value={draft.productId}
                        options={props.productOptions}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="请选择关联产品"
                        onUpdate:value={(value) => (draft.productId = value === undefined ? undefined : String(value))}
                      />
                    </FormItem>
                    <FormItem label="所属部门">
                      <TreeSelect
                        value={draft.deptId}
                        treeData={props.departmentOptions}
                        allowClear
                        showSearch
                        treeDefaultExpandAll
                        treeNodeFilterProp="label"
                        placeholder="请选择所属部门"
                        onUpdate:value={(value) => (draft.deptId = value === undefined ? undefined : String(value))}
                      />
                    </FormItem>
                  </Form>
                </div>
              ))}
            </div>
          ) : null}
          {current.value === 2 ? (
            <div class={styles.batchResult}>
              <div class={styles.batchResultSummary}>
                <span>上传完成</span>
                <strong class={styles.successCount}>成功 {result.value.successCount} 条</strong>
                <strong class={styles.failureCount}>失败 {result.value.errorCount} 条</strong>
              </div>
              {result.value.errorCount > 0 ? <FailureTable /> : <div class={styles.batchAllSuccess}>全部文档上传成功</div>}
            </div>
          ) : null}
        </div>
      </Modal>
    );
  },
});
