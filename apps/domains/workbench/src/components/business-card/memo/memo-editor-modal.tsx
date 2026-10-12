import { defineComponent, type PropType, reactive, watch } from "vue";

import type { MemoDraft, MemoNote } from "./types";
import { Form, FormItem, Input, message, Modal, Textarea } from "@/pc-ui-runtime";

export default defineComponent({
  name: "MemoEditorModal",
  props: {
    visible: { type: Boolean, default: false },
    note: { type: Object as PropType<MemoNote | null>, default: null },
    submitting: { type: Boolean, default: false },
  },
  emits: ["cancel", "submit"],
  setup(props, { emit }) {
    const draft = reactive<MemoDraft>({ title: "", content: "" });

    watch(
      () => [props.visible, props.note] as const,
      ([visible, note]) => {
        if (visible) {
          draft.title = note?.title ?? "";
          draft.content = note?.content ?? "";
        }
      },
      { immediate: true },
    );

    const submit = (): void => {
      const title = draft.title.trim();
      const content = draft.content.trim();
      if (!title || !content) {
        message.warning("请填写标题和内容");
        return;
      }

      emit("submit", { title, content } satisfies MemoDraft);
    };

    return () => (
      <Modal
        open={props.visible}
        title={props.note ? "编辑备忘录" : "新增备忘录"}
        width="560px"
        destroyOnClose
        confirmLoading={props.submitting}
        onCancel={() => emit("cancel")}
        onOk={submit}
      >
        <Form class="memo-editor-form" layout="vertical" model={draft}>
          <FormItem label="标题" required>
            <Input
              value={draft.title}
              maxlength={10}
              placeholder="请输入备忘录标题"
              onUpdate:value={(value: string) => (draft.title = value)}
            />
          </FormItem>
          <FormItem label="内容" required>
            <Textarea
              value={draft.content}
              rows={6}
              maxlength={100}
              placeholder="请输入备忘录内容"
              onUpdate:value={(value: string) => (draft.content = value)}
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
