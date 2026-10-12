import type { KnowledgeFile } from "@g2-contract/knowledge-document";
import { type PropType, defineComponent, ref, watch } from "vue";

import { getFileClient } from "../domain-context";
import { Button, CloudUploadOutlined, DeleteOutlined, message, Upload, UploadDragger, type UploadRequestOption } from "../pc-ui-runtime";
import { errorMessage } from "../shared";

import styles from "../styles.module.less";

const DOCUMENT_SCENE = "KNOWLEDGE_BASE_FILE";
const TYPE_ICON_SCENE = "KNOWLEDGE_TYPE_ICON";

export const DocumentFileUpload = defineComponent({
  name: "KnowledgeDocumentFileUpload",
  props: {
    value: { type: Array as PropType<KnowledgeFile[]>, default: () => [] },
    scene: { type: String as PropType<"document" | "type-icon">, default: "document" },
    multiple: Boolean,
    dragger: Boolean,
    maxCount: { type: Number, default: 1 },
    maxSizeMb: { type: Number, default: 100 },
    accept: { type: String, default: ".jpg,.jpeg,.png,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.md" },
    readonly: Boolean,
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const files = ref<KnowledgeFile[]>([...props.value]);
    const uploading = ref(false);

    watch(
      () => props.value,
      (value) => {
        files.value = [...value];
      },
      { deep: true },
    );

    const update = (next: KnowledgeFile[]): void => {
      files.value = next;
      emit("update:value", next);
    };

    const beforeUpload = (file: File): boolean => {
      if (files.value.length >= props.maxCount) {
        message.warning(`最多上传 ${props.maxCount} 个文件`);
        return false;
      }
      if (file.size > props.maxSizeMb * 1024 * 1024) {
        message.warning(`单个文件不能超过 ${props.maxSizeMb}MB`);
        return false;
      }
      const suffix = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!props.accept.toLowerCase().split(",").includes(suffix)) {
        message.warning("文件格式不支持");
        return false;
      }
      return true;
    };

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      uploading.value = true;
      try {
        const source = option.file as File;
        const uploaded = await (
          await getFileClient()
        ).uploadSceneFile({
          file: source,
          businessKey: "mdata",
          sceneCode: props.scene === "type-icon" ? TYPE_ICON_SCENE : DOCUMENT_SCENE,
          useTemporary: true,
        });
        const next: KnowledgeFile = {
          id: String(uploaded.id),
          name: uploaded.name ?? source.name,
          path: uploaded.path ?? "",
          size: source.size,
          suffix: source.name.split(".").pop(),
          type: source.name.split(".").pop(),
        };
        update(props.maxCount === 1 ? [next] : [...files.value, next]);
        option.onSuccess?.(uploaded, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(errorMessage(error, "文件上传失败"));
        option.onError?.(error instanceof Error ? error : new Error("文件上传失败"));
      } finally {
        uploading.value = false;
      }
    };

    const uploadProps = {
      accept: props.accept,
      beforeUpload,
      customRequest,
      disabled: props.readonly || uploading.value,
      multiple: props.multiple,
      showUploadList: false,
    };

    return () => (
      <div class={styles.uploadRoot}>
        {!props.readonly && files.value.length < props.maxCount ? (
          props.dragger ? (
            <UploadDragger {...uploadProps} class={styles.uploadDragger}>
              <CloudUploadOutlined class={styles.uploadIcon} />
              <p class={styles.uploadTitle}>点击或拖拽文件到此区域上传</p>
              <p class={styles.uploadHint}>
                最多 {props.maxCount} 个文件，单个文件不超过 {props.maxSizeMb}MB
              </p>
            </UploadDragger>
          ) : (
            <Upload {...uploadProps}>
              <Button loading={uploading.value}>{props.scene === "type-icon" ? "上传图标" : "上传文件"}</Button>
            </Upload>
          )
        ) : null}
        <div class={styles.uploadFileList}>
          {files.value.map((file) => (
            <div class={styles.uploadFileRow} key={file.id}>
              <span title={file.name}>{file.name}</span>
              {!props.readonly ? (
                <Button
                  type="text"
                  danger
                  aria-label={`删除文件 ${file.name}`}
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
