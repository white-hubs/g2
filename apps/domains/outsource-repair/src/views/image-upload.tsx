import { PlusOutlined, Upload, type UploadRequestOption, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import { getFileClient } from "@/domain-context";

interface ImageItem {
  uid: string;
  name: string;
  status: "done";
  url?: string;
  fileId: string;
}

/**
 * 旧 `g-upload`（`businessKey='maintain'`）的等价实现：图片走文件服务上传，
 * 只把文件 ID 数组回传给业务表单，回显时接受后端返回的 `{ id, path }`。
 */
export const ImageUpload = defineComponent({
  name: "OutsourceRepairImageUpload",
  props: {
    value: { type: Array as PropType<string[]>, default: () => [] },
    /** 已上传图片回显（评价详情、委外确认现场图片）。 */
    file: { type: Array as PropType<{ id?: string; path?: string; name?: string }[]>, default: () => [] },
    max: { type: Number, default: 3 },
    /** 单图大小上限（MB）。 */
    maxSize: { type: Number, default: 20 },
    accept: { type: String, default: ".jpg,.jpeg,.png" },
    businessKey: { type: String, default: "maintain" },
    disabled: Boolean,
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const fileList = ref<ImageItem[]>([]);
    const uploading = ref(false);

    watch(
      () => props.file,
      (files) => {
        // 回显仅在外部尚未产生本地上传结果时覆盖，避免覆盖用户刚上传的图片。
        if (fileList.value.length > 0 || !files || files.length === 0) {
          return;
        }
        fileList.value = files
          .filter((item) => item.id)
          .map((item) => ({
            uid: String(item.id),
            name: item.name ?? String(item.id),
            status: "done" as const,
            url: item.path ?? undefined,
            fileId: String(item.id),
          }));
      },
      { immediate: true, deep: true },
    );

    const syncIds = (): void => {
      emit(
        "update:value",
        fileList.value.map((item) => item.fileId),
      );
    };

    const beforeUpload = (file: File): boolean => {
      if (fileList.value.length >= props.max) {
        message.warning(`最多上传 ${props.max} 张图片`);
        return false;
      }
      if (file.size > props.maxSize * 1024 * 1024) {
        message.warning(`单张图片不能超过 ${props.maxSize}MB`);
        return false;
      }
      return true;
    };

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      const file = option.file as File;
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded = await client.uploadBusinessFile({ file, businessKey: props.businessKey });
        const fileId = String(uploaded.id ?? "");
        if (!fileId) {
          throw new Error("文件服务未返回文件 ID");
        }
        fileList.value = [...fileList.value, { uid: fileId, name: uploaded.name ?? file.name, status: "done", url: uploaded.path, fileId }];
        syncIds();
        option.onSuccess?.(uploaded, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "图片上传失败");
        option.onError?.(error instanceof Error ? error : new Error("图片上传失败"));
      } finally {
        uploading.value = false;
      }
    };

    const remove = (file: { uid: string }): boolean => {
      fileList.value = fileList.value.filter((item) => item.uid !== file.uid);
      syncIds();
      return true;
    };

    /** 外部重置（弹窗取消）后清空本地列表。 */
    watch(
      () => props.value,
      (ids) => {
        if (ids.length === 0 && fileList.value.length > 0 && props.file.length === 0) {
          fileList.value = [];
        }
      },
    );

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
