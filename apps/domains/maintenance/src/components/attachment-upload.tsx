import { PlusOutlined, Upload, type UploadRequestOption, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, type PropType } from "vue";

import { getFileClient } from "@/domain-context";

interface AttachmentItem {
  uid: string;
  name: string;
  status: "done";
  url?: string;
  fileId: string;
}

/**
 * 维保执行现场附件上传：对齐旧 `g-upload`（businessKey=mdata、sceneCode 由调用方给定、
 * 走 `/api/file/file`），只把文件 ID 回传给业务表单。
 */
export const AttachmentUpload = defineComponent({
  name: "MaintenanceAttachmentUpload",
  props: {
    value: { type: Array as PropType<string[]>, default: () => [] },
    max: { type: Number, default: 10 },
    /** 单文件大小上限（MB），与旧页 size 语义一致。 */
    maxSize: { type: Number, default: 200 },
    accept: { type: String, default: ".jpg,.jpeg,.png" },
    businessKey: { type: String, default: "mdata" },
    sceneCode: { type: String, default: "" },
    disabled: Boolean,
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const fileList = ref<AttachmentItem[]>([]);
    const uploading = ref(false);

    const syncIds = (): void => {
      emit(
        "update:value",
        fileList.value.map((item) => item.fileId),
      );
    };

    const beforeUpload = (file: File): boolean => {
      if (fileList.value.length >= props.max) {
        message.warning(`最多上传 ${props.max} 个附件`);
        return false;
      }
      if (file.size > props.maxSize * 1024 * 1024) {
        message.warning(`单个附件不能超过 ${props.maxSize}MB`);
        return false;
      }
      return true;
    };

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      const file = option.file as File;
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded = await client.uploadSceneFile({ file, businessKey: props.businessKey, sceneCode: props.sceneCode });
        const fileId = String(uploaded.id);
        fileList.value = [
          ...fileList.value,
          { uid: fileId, name: uploaded.name ?? file.name, status: "done", url: uploaded.path ?? undefined, fileId },
        ];
        syncIds();
        option.onSuccess?.(uploaded, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
        option.onError?.(error instanceof Error ? error : new Error("附件上传失败"));
      } finally {
        uploading.value = false;
      }
    };

    const remove = (file: { uid: string }): boolean => {
      fileList.value = fileList.value.filter((item) => item.uid !== file.uid);
      syncIds();
      return true;
    };

    return () => (
      <Upload
        listType="picture-card"
        accept={props.accept}
        disabled={props.disabled || uploading.value}
        fileList={fileList.value}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        onRemove={remove}
      >
        {fileList.value.length < props.max && !props.disabled ? (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: "8px" }}>上传</div>
          </div>
        ) : null}
      </Upload>
    );
  },
});
