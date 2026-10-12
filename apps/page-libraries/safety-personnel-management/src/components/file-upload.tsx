/** @jsxImportSource vue */
import { Button, Upload, type UploadFile, type UploadRequestOption, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref } from "vue";

import { services } from "../api/safety-personnel";

import styles from "./file-upload.module.css";

export interface OSSFile {
  id: string;
  name: string;
  path: string;
  endpointPath?: string;
  businessKey: string | null;
  refCount: number;
  size: number;
  suffix: string;
  type: string;
}

export const FileUpload = defineComponent({
  props: {
    value: { type: Array as PropType<OSSFile[]>, default: () => [] },
    sceneCode: { type: String, required: true },
    businessKey: { type: String, default: "safety-personnel" },
    useTemporaryUpload: Boolean,
    multiple: Boolean,
    maxCount: { type: Number, default: 20 },
    type: { type: String, default: "text" },
    showText: Boolean,
    accept: String,
    typeList: { type: Array as PropType<string[]>, default: () => [] },
    size: { type: Number, default: 300 },
    customText: String,
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const pending = ref(0);
    const beforeUpload = (file: File) => {
      if (file.size > props.size * 1024 * 1024) {
        message.warning(`文件不能超过 ${props.size}MB`);
        return false;
      }
      const suffix = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (props.typeList.length > 0 && !props.typeList.some((type) => type.toLowerCase() === suffix)) {
        message.warning("不支持的文件格式");
        return false;
      }
      if (props.value.length + pending.value >= props.maxCount) {
        message.warning(`最多上传 ${props.maxCount} 个文件`);
        return false;
      }
      pending.value++;
      return true;
    };
    const upload = async (options: UploadRequestOption) => {
      try {
        if (!(options.file instanceof File)) {
          throw new Error("请选择文件");
        }
        const result = await (
          await services().file()
        ).uploadSceneFile({
          file: options.file,
          businessKey: props.businessKey,
          sceneCode: props.sceneCode,
          useTemporary: props.useTemporaryUpload,
        });
        const file: OSSFile = {
          id: String(result.id),
          name: result.name || options.file.name,
          path: result.path || "",
          businessKey: props.businessKey,
          refCount: 0,
          size: options.file.size,
          suffix: options.file.name.split(".").pop() || "",
          type: options.file.type,
        };
        emit("update:value", [...props.value, file]);
        options.onSuccess?.(result);
      } catch (error) {
        const reason = error instanceof Error ? error : new Error("上传失败");
        message.error(reason.message);
        options.onError?.(reason);
      } finally {
        pending.value--;
      }
    };
    return () => (
      <div>
        <Upload
          accept={props.accept || props.typeList.join(",")}
          multiple={props.multiple}
          listType={props.type === "picture-card" ? "picture-card" : "text"}
          fileList={props.value.map(
            (file): UploadFile => ({ uid: file.id, name: file.name, status: "done", url: file.path, size: file.size }),
          )}
          beforeUpload={beforeUpload}
          customRequest={(options) => void upload(options)}
          onRemove={(file) => {
            emit(
              "update:value",
              props.value.filter((item) => item.id !== file.uid),
            );
            return true;
          }}
        >
          {props.value.length < props.maxCount ? (
            props.type === "picture-card" ? (
              <div class={styles.pictureCard}>
                <span class={styles.plus}>+</span>
                <span>{pending.value > 0 ? "上传中" : "上传"}</span>
              </div>
            ) : (
              <Button loading={pending.value > 0}>上传附件</Button>
            )
          ) : null}
        </Upload>
        {props.showText ? <div style={{ color: "#86909c", fontSize: "12px", marginTop: "8px" }}>{props.customText}</div> : null}
      </div>
    );
  },
});
