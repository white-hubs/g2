import type { KnowledgeDocumentPayload, KnowledgeDocumentRow, KnowledgeFile } from "@g2-contract/knowledge-document";
import { type PropType, defineComponent, reactive, ref } from "vue";

import { getKnowledgeDocumentClient } from "../domain-context";
import { Form, type FormInstance, FormItem, Input, InputNumber, Modal, Select, TreeSelect, message } from "../pc-ui-runtime";
import { type SelectOption, type TreeOption, errorMessage } from "../shared";
import { DocumentFileUpload } from "./document-file-upload";

interface DocumentDraft {
  id?: string;
  name: string;
  typeId?: string;
  deptId?: string;
  productId?: string;
  entryCount: number | null;
  files: KnowledgeFile[];
}

function emptyDraft(): DocumentDraft {
  return { name: "", entryCount: 0, files: [] };
}

export const DocumentFormModal = defineComponent({
  name: "KnowledgeDocumentFormModal",
  props: {
    typeOptions: { type: Array as PropType<TreeOption[]>, default: () => [] },
    productOptions: { type: Array as PropType<SelectOption[]>, default: () => [] },
    departmentOptions: { type: Array as PropType<TreeOption[]>, default: () => [] },
  },
  emits: ["saved"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const formRef = ref<FormInstance>();
    const draft = reactive<DocumentDraft>(emptyDraft());

    const reset = (): void => {
      Object.assign(draft, emptyDraft());
      formRef.value?.clearValidate?.();
    };

    const openModal = (record?: KnowledgeDocumentRow): void => {
      reset();
      if (record) {
        Object.assign(draft, {
          id: record.id,
          name: record.name,
          typeId: record.typeId || undefined,
          deptId: record.deptId || undefined,
          productId: record.productId || undefined,
          entryCount: record.entryCount ?? 0,
          files: [...(record.fileList ?? [])],
        });
      }
      open.value = true;
    };

    expose({ openModal });

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      try {
        await formRef.value?.validateFields();
        saving.value = true;
        const payload: KnowledgeDocumentPayload = {
          name: draft.name.trim(),
          typeId: String(draft.typeId),
          deptId: draft.deptId ?? null,
          productId: draft.productId ?? null,
          entryCount: draft.entryCount,
          fileIds: draft.files.map((file) => file.id),
        };
        if (draft.id) {
          await getKnowledgeDocumentClient().updateDocument({ ...payload, id: draft.id });
        } else {
          await getKnowledgeDocumentClient().createDocument(payload);
        }
        message.success("操作成功");
        open.value = false;
        emit("saved");
      } catch (error) {
        if (error instanceof Error) {
          message.error(errorMessage(error, "操作失败"));
        }
      } finally {
        saving.value = false;
      }
    };

    return () => (
      <Modal
        open={open.value}
        title={draft.id ? "编辑知识文档" : "新增知识文档"}
        width={680}
        okText="确定"
        cancelText="取消"
        confirmLoading={saving.value}
        onOk={() => void save()}
        onCancel={() => (open.value = false)}
      >
        <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px" } }}>
          <FormItem label="文档名称" name="name" rules={[{ required: true, message: "请输入文档名称" }]}>
            <Input
              value={draft.name}
              maxlength={128}
              showCount
              placeholder="请输入文档名称"
              onUpdate:value={(value) => (draft.name = value)}
            />
          </FormItem>
          <FormItem label="文档类型" name="typeId" rules={[{ required: true, message: "请选择文档类型" }]}>
            <TreeSelect
              value={draft.typeId}
              treeData={props.typeOptions}
              allowClear
              showSearch
              treeDefaultExpandAll
              treeNodeFilterProp="label"
              placeholder="请选择文档类型"
              onUpdate:value={(value) => (draft.typeId = value === undefined ? undefined : String(value))}
            />
          </FormItem>
          <FormItem label="关联产品" name="productId">
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
          <FormItem label="所属部门" name="deptId">
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
          <FormItem label="条目数" name="entryCount">
            <InputNumber
              value={draft.entryCount ?? undefined}
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="请输入条目数"
              onUpdate:value={(value) => (draft.entryCount = value === null ? null : Number(value))}
            />
          </FormItem>
          <FormItem label="上传文件" name="files" rules={[{ required: true, type: "array", min: 1, message: "请上传文档文件" }]}>
            <DocumentFileUpload value={draft.files} onUpdate:value={(value) => (draft.files = value)} />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
