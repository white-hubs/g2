import type { KnowledgeFile, KnowledgeTypeNode } from "@g2-contract/knowledge-document";
import { defineComponent, reactive, ref } from "vue";

import { getKnowledgeDocumentClient } from "../domain-context";
import { Form, type FormInstance, FormItem, Input, Modal, Textarea, message } from "../pc-ui-runtime";
import { errorMessage } from "../shared";
import { DocumentFileUpload } from "./document-file-upload";

interface TypeDraft {
  id?: string;
  name: string;
  description: string;
  parentId: string | null;
  icon: KnowledgeFile[];
}

function emptyDraft(): TypeDraft {
  return { name: "", description: "", parentId: null, icon: [] };
}

export const TypeFormModal = defineComponent({
  name: "KnowledgeDocumentTypeFormModal",
  emits: ["saved"],
  setup(_props, { emit, expose }) {
    const open = ref(false);
    const saving = ref(false);
    const title = ref("新增文档类型");
    const formRef = ref<FormInstance>();
    const draft = reactive<TypeDraft>(emptyDraft());

    const openModal = (record?: KnowledgeTypeNode, addChild = false): void => {
      Object.assign(draft, emptyDraft());
      formRef.value?.clearValidate?.();
      if (addChild && record) {
        draft.parentId = record.id;
        title.value = `【${record.name}】新增下级`;
      } else if (record) {
        Object.assign(draft, {
          id: record.id,
          name: record.name,
          description: record.description ?? "",
          parentId: record.parentId ?? null,
          icon: record.icon ? [record.icon] : [],
        });
        title.value = "编辑文档类型";
      } else {
        title.value = "新增文档类型";
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
        const payload = {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          parentId: draft.parentId,
          icon: draft.icon[0]?.id ?? null,
        };
        if (draft.id) {
          await getKnowledgeDocumentClient().updateType({ ...payload, id: draft.id });
        } else {
          await getKnowledgeDocumentClient().createType(payload);
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
        title={title.value}
        width={620}
        okText="确定"
        cancelText="取消"
        confirmLoading={saving.value}
        onOk={() => void save()}
        onCancel={() => (open.value = false)}
      >
        <Form ref={formRef} model={draft} labelCol={{ style: { width: "100px" } }}>
          <FormItem label="类型名称" name="name" rules={[{ required: true, message: "请输入类型名称" }]}>
            <Input
              value={draft.name}
              maxlength={64}
              showCount
              placeholder="请输入类型名称"
              onUpdate:value={(value) => (draft.name = value)}
            />
          </FormItem>
          <FormItem label="类型备注" name="description">
            <Textarea
              value={draft.description}
              maxlength={200}
              showCount
              rows={4}
              placeholder="请输入类型备注"
              onUpdate:value={(value) => (draft.description = value)}
            />
          </FormItem>
          <FormItem label="类型图标" name="icon">
            <DocumentFileUpload
              value={draft.icon}
              scene="type-icon"
              accept=".jpg,.jpeg,.png,.svg"
              onUpdate:value={(value) => (draft.icon = value)}
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
