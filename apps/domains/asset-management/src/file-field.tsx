import type { SceneFile } from "@g2-contract/file";
import { type PropType, defineComponent, ref } from "vue";

import { getFileClient } from "./domain-context";
import { errorText } from "./model";
import { loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { Button, Image, Space, Upload, message } = await loadPcUi();
export const FileField = defineComponent({
  props: {
    value: { type: Array as PropType<SceneFile[]>, default: () => [] },
    scene: { type: String, required: true },
    images: Boolean,
    disabled: Boolean,
  },
  emits: { change: (_files: SceneFile[]) => true },
  setup(props, { emit }) {
    const loading = ref(false);
    const upload = async (file: File) => {
      if (props.value.length >= 5) {
        message.warning("最多上传5个文件");
        return false;
      }
      loading.value = true;
      try {
        const result = await (
          await getFileClient()
        ).uploadSceneFile({ file, businessKey: props.scene, sceneCode: props.scene, useTemporary: true });
        emit("change", [...props.value, result]);
      } catch (error) {
        message.error(errorText(error));
      } finally {
        loading.value = false;
      }
      return false;
    };
    return () => (
      <div>
        <Space wrap>
          {props.value.map((file) => (
            <span key={file.id} class={styles.fileItem}>
              {props.images && file.path ? (
                <Image src={file.path} width={72} height={72} style={{ objectFit: "contain" }} />
              ) : (
                <a href={file.path ?? undefined} target="_blank" rel="noopener noreferrer">
                  {file.name ?? "附件"}
                </a>
              )}
              {!props.disabled && (
                <Button
                  type="text"
                  size="small"
                  danger
                  onClick={() =>
                    emit(
                      "change",
                      props.value.filter((entry) => entry.id !== file.id),
                    )
                  }
                >
                  移除
                </Button>
              )}
            </span>
          ))}
        </Space>
        {!props.disabled && (
          <Upload accept={props.images ? "image/*" : undefined} showUploadList={false} beforeUpload={(file) => upload(file)}>
            <Button loading={loading.value} disabled={loading.value || props.value.length >= 5}>
              上传{props.images ? "图片" : "附件"}
            </Button>
          </Upload>
        )}
      </div>
    );
  },
});
