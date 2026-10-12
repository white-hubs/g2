import { computed, defineComponent, ref } from "vue";

import { getFileClient } from "@/domain-context";
import { Button, Image, Space, message } from "@/pc-ui-runtime";

const fileRecord = (value: unknown): Record<string, unknown> | undefined => {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const id = body.id ?? body.fileId ?? body.ossId;
  return id === undefined || id === null ? undefined : { ...body, id };
};

/** Hazard domain upload component; transport comes from the injected file client, not a legacy UI bridge. */
export const HazardFileUpload = defineComponent({
  name: "HazardFileUpload",
  props: [
    "value",
    "multiple",
    "readonly",
    "sceneCode",
    "max",
    "maxCount",
    "accept",
    "showText",
    "type",
    "typeList",
    "size",
    "customText",
    "onStart",
    "onEnd",
  ],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const input = ref<HTMLInputElement>();
    const uploading = ref(false);
    const files = computed<Record<string, unknown>[]>(() => (Array.isArray(props.value) ? (props.value as Record<string, unknown>[]) : []));
    const update = (next: Record<string, unknown>[]): void => {
      emit("update:value", next);
      emit("change", next);
    };
    const selectFiles = async (event: Event): Promise<void> => {
      const element = event.target as HTMLInputElement;
      const selected = Array.from(element.files ?? []);
      element.value = "";
      if (!selected.length || uploading.value) return;
      uploading.value = true;
      if (typeof props.onStart === "function") props.onStart();
      try {
        const client = await getFileClient();
        const uploaded = await Promise.all(
          selected.map(async (file) => {
            const payload = new FormData();
            payload.append("sceneCode", String(props.sceneCode ?? "HIDDENDANGER::FLOW"));
            payload.append("businessKey", "hazard-governance");
            payload.append("file", file);
            return fileRecord(await client.uploadFile(payload));
          }),
        );
        update([...files.value, ...uploaded.filter((file): file is Record<string, unknown> => !!file)]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
      } finally {
        uploading.value = false;
        if (typeof props.onEnd === "function") props.onEnd();
      }
    };
    return () => (
      <Space wrap>
        {files.value.map((file, index) => (
          <div key={String(file.id ?? index)}>
            {file.path || file.url ? <Image width={80} src={String(file.path ?? file.url)} /> : <span>{String(file.name ?? file.id)}</span>}
            {!props.readonly ? (
              <Button type="link" danger onClick={() => update(files.value.filter((_, i) => i !== index))}>
                删除
              </Button>
            ) : null}
          </div>
        ))}
        {!props.readonly && files.value.length < Number(props.maxCount ?? props.max ?? 20) ? (
          <Button loading={uploading.value} onClick={() => input.value?.click()}>
            上传附件
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept={props.accept}
          multiple={props.multiple !== false}
          style={{ display: "none" }}
          onChange={(event) => void selectFiles(event)}
        />
      </Space>
    );
  },
});
