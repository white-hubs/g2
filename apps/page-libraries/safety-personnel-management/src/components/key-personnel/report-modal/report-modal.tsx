import { showApiError } from "../../../utils/api-error";
/** @jsxImportSource vue */
import { Modal, Textarea, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { createKeyPersonReport } from "../../../api/safety-personnel";
import { KEY_PERSON_ATTACHMENT_TYPE_LIST, KEY_PERSON_SCENE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { FileUpload, type OSSFile } from "../../file-upload";

export const ReportModal = defineComponent({
  emits: ["success"],
  setup(_, { emit, expose }) {
    const visible = ref(false);
    const submitting = ref(false);
    const personId = ref<number | null>(null);
    const form = reactive({
      content: "",
      files: [] as OSSFile[],
    });

    const open = (id: number): void => {
      personId.value = id;
      form.content = "";
      form.files = [];
      visible.value = true;
    };

    const submit = async (): Promise<void> => {
      if (!form.content.trim()) {
        message.warning("请填写上报内容");
        return;
      }
      if (!personId.value) {
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          createKeyPersonReport(personId.value!, {
            content: form.content.trim(),
            reportAttachmentFileIds: form.files.map((f) => f.id),
          }),
        );
        message.success("上报成功");
        visible.value = false;
        emit("success", personId.value);
      } catch (error) {
        showApiError(error);
      } finally {
        submitting.value = false;
      }
    };

    expose({ open });

    return () => (
      <Modal
        open={visible.value}
        title="监管上报"
        confirmLoading={submitting.value}
        onOk={() => {
          void submit();
        }}
        onCancel={() => {
          visible.value = false;
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <label>
            上报内容 <span style={{ color: "red" }}>*</span>
          </label>
          <Textarea v-model:value={form.content} rows={4} maxlength={500} showCount />
        </div>
        <div>
          <label>附件</label>
          <FileUpload
            sceneCode={KEY_PERSON_SCENE.REPORT}
            v-model:value={form.files}
            multiple
            type="text"
            showText={true}
            typeList={KEY_PERSON_ATTACHMENT_TYPE_LIST}
            size={300}
            customText="支持上传图片（.png/.jpeg/.jpg）、视频（MP4、AVI、MKV）、文档（.doc/.docx/.xls/.xlsx/.ppt/.pptx/.pdf），单个最大 300MB"
          />
        </div>
      </Modal>
    );
  },
});
