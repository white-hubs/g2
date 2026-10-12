import type { FileClient } from "@g2-client/file/client";
import { Button, Image, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, type PropType } from "vue";

import type { AlarmUploadFile } from "../alarm-handle.model";

function unwrapUploadResult(raw: unknown): AlarmUploadFile | null {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const id = String(data.id ?? data.ossId ?? "");
  if (!id) {
    return null;
  }
  return {
    id,
    name: data.name != null ? String(data.name) : undefined,
    path: data.path != null ? String(data.path) : undefined,
    type: data.type != null ? String(data.type) : undefined,
    suffix: data.suffix != null ? String(data.suffix) : undefined,
    size: data.size != null ? Number(data.size) : undefined,
    businessKey: data.businessKey != null ? String(data.businessKey) : null,
  };
}

export default defineComponent({
  name: "GemAlarmSceneUpload",
  props: {
    sceneCode: { type: String, required: true },
    businessKey: { type: String, default: "alarm" },
    max: { type: Number, default: 3 },
    watermark: { type: String, default: "" },
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
    modelValue: { type: Array as PropType<AlarmUploadFile[]>, default: () => [] },
  },
  emits: {
    "update:modelValue": (_files: AlarmUploadFile[]) => true,
  },
  setup(props, { emit }) {
    const uploading = ref(false);
    const inputRef = ref<HTMLInputElement | null>(null);

    async function onPickFile(event: Event): Promise<void> {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file || !props.getFileClient) {
        return;
      }
      if (props.modelValue.length >= props.max) {
        message.warning(`最多上传 ${props.max} 张图片`);
        return;
      }
      const accept = [".jpg", ".jpeg", ".png", ".svg"];
      const lower = file.name.toLowerCase();
      if (!accept.some((ext) => lower.endsWith(ext))) {
        message.error(`只能上传 ${accept.join(",")} 文件`);
        return;
      }
      if (file.size / 1024 / 1024 > 2) {
        message.error("文件必须小于 2MB");
        return;
      }
      uploading.value = true;
      try {
        const client = await props.getFileClient();
        const form = new FormData();
        form.append("businessKey", props.businessKey);
        form.append("sceneCode", props.sceneCode);
        form.append("file", file);
        if (props.watermark) {
          form.append("watermark", props.watermark);
        }
        const uploaded = unwrapUploadResult(await client.uploadFile(form));
        if (!uploaded) {
          throw new Error("文件服务未返回文件ID");
        }
        emit("update:modelValue", [...props.modelValue, uploaded]);
      } catch (e) {
        message.error(e instanceof Error ? e.message : "上传失败");
      } finally {
        uploading.value = false;
      }
    }

    function removeFile(id: string): void {
      emit(
        "update:modelValue",
        props.modelValue.filter((item) => item.id !== id),
      );
    }

    return () => (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {props.modelValue.map((item) => (
            <div key={item.id} style={{ position: "relative", width: 104, height: 104 }}>
              <Image
                src={String(item.path || "")}
                width={104}
                height={104}
                style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #d9d9d9" }}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='104' height='104'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3C/svg%3E"
              />
              <Button
                type="link"
                danger
                size="small"
                style={{ position: "absolute", top: 0, right: 0, padding: 0 }}
                onClick={() => removeFile(item.id)}
              >
                删除
              </Button>
            </div>
          ))}
          {props.modelValue.length < props.max ? (
            <Button loading={uploading.value} onClick={() => inputRef.value?.click()}>
              上传
            </Button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.svg" style={{ display: "none" }} onChange={(e) => void onPickFile(e)} />
        {!props.getFileClient ? <div style={{ marginTop: 8, color: "#999" }}>未注入 getFileClient，无法上传图片</div> : null}
      </div>
    );
  },
});
