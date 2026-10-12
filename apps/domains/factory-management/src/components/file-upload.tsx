import type { ParkFile } from "@g2-contract/factory-management";
import { Button, DeleteOutlined, Image, Upload, type UploadRequestOption, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref, watch } from "vue";

import { getFileClient } from "../domain-context";
import { errorMessage } from "../shared";

import styles from "../styles.module.less";

export const ParkFileUpload = defineComponent({
  name: "ParkFileUpload",
  props: {
    value: { type: Array as PropType<ParkFile[]>, default: () => [] },
    readonly: Boolean,
    maxCount: { type: Number, default: 6 },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const files = ref<ParkFile[]>([...props.value]);
    const uploading = ref(false);
    watch(
      () => props.value,
      (value) => (files.value = [...value]),
      { deep: true },
    );

    const update = (value: ParkFile[]): void => {
      files.value = value;
      emit("update:value", value);
    };

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      uploading.value = true;
      try {
        const source = option.file as File;
        const uploaded = await (
          await getFileClient()
        ).uploadSceneFile({ file: source, businessKey: "park", sceneCode: "FACTORY_MANAGEMENT_FILE", useTemporary: true });
        const value: ParkFile = {
          id: String(uploaded.id),
          name: uploaded.name ?? source.name,
          path: uploaded.path ?? "",
          size: source.size,
          suffix: source.name.split(".").pop(),
        };
        update([...files.value, value]);
        option.onSuccess?.(uploaded, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(errorMessage(error, "附件上传失败"));
        option.onError?.(error instanceof Error ? error : new Error("附件上传失败"));
      } finally {
        uploading.value = false;
      }
    };

    return () => (
      <div class={styles.fileUpload}>
        {!props.readonly && files.value.length < props.maxCount ? (
          <Upload
            accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.xls,.xlsx"
            customRequest={customRequest}
            multiple
            showUploadList={false}
          >
            <Button loading={uploading.value}>上传附件</Button>
          </Upload>
        ) : null}
        <div class={styles.fileList}>
          {files.value.length === 0 ? <span class={styles.muted}>暂无附件</span> : null}
          {files.value.map((file) => (
            <div class={styles.fileItem} key={file.id}>
              {file.path ? <Image src={file.path} width={72} height={54} fallback="" /> : null}
              <span title={file.name ?? "附件"}>{file.name ?? "附件"}</span>
              {!props.readonly ? (
                <Button
                  type="text"
                  danger
                  aria-label={`删除附件 ${file.name ?? ""}`}
                  onClick={() => update(files.value.filter((item) => item.id !== file.id))}
                >
                  <DeleteOutlined />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  },
});
