import type { BulletinFile } from "@g2-contract/technical-bulletin";
import { type PropType, defineComponent, ref } from "vue";

import { getFileClient } from "../domain-context";
import { Button, message, Upload, type UploadRequestOption } from "../pc-ui-runtime";
import { errorMessage } from "../shared";

import styles from "../styles.module.less";

const SCENE_CODE = "CONTENT::ANNOUNCEMENT";

export const AttachmentUpload = defineComponent({
  name: "TechnicalBulletinAttachmentUpload",
  props: {
    value: { type: Array as PropType<BulletinFile[]>, default: () => [] },
    readonly: Boolean,
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const uploading = ref(false);
    const update = (next: BulletinFile[]): void => emit("update:value", next);

    const beforeUpload = (file: File): boolean => {
      if (props.value.length >= 50) {
        message.warning("最多上传 50 个附件");
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.warning("单个附件不能超过 10MB");
        return false;
      }
      return true;
    };

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      uploading.value = true;
      try {
        const uploaded = await (
          await getFileClient()
        ).uploadSceneFile({
          file: option.file as File,
          businessKey: "mdata",
          sceneCode: SCENE_CODE,
          useTemporary: true,
        });
        const next: BulletinFile = {
          id: String(uploaded.id),
          name: uploaded.name ?? (option.file as File).name,
          path: uploaded.path ?? undefined,
        };
        update([...props.value, next]);
        option.onSuccess?.(uploaded, option.file as unknown as XMLHttpRequest);
      } catch (error) {
        message.error(errorMessage(error, "附件上传失败"));
        option.onError?.(error instanceof Error ? error : new Error("附件上传失败"));
      } finally {
        uploading.value = false;
      }
    };

    return () => (
      <div>
        {!props.readonly ? (
          <Upload showUploadList={false} disabled={uploading.value} beforeUpload={beforeUpload} customRequest={customRequest}>
            <Button loading={uploading.value}>上传附件</Button>
          </Upload>
        ) : null}
        <div class={styles.fileList}>
          {props.value.length === 0 ? <span>--</span> : null}
          {props.value.map((file) => (
            <div class={styles.fileRow} key={file.id}>
              {file.path ? (
                <a href={file.path} target="_blank" rel="noreferrer">
                  {file.name ?? file.id}
                </a>
              ) : (
                <span>{file.name ?? file.id}</span>
              )}
              {!props.readonly ? (
                <Button type="link" danger onClick={() => update(props.value.filter((item) => item.id !== file.id))}>
                  删除
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  },
});
