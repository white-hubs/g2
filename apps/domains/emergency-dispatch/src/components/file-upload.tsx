// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent, ref, type PropType } from "vue";

import { getFileClient } from "@/domain-context";
import { Button, Image, Space, message } from "@/pc-ui-runtime";
import { GLOBAL_SCENE_CODE, type OSSFile } from "@/types/oss-file";
import { toImageSrc } from "@/utils/file-url";

function fileRecord(value: unknown): OSSFile | undefined {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const body = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const id = body.id ?? body.fileId ?? body.ossId;
  if (id === undefined || id === null) return undefined;
  return {
    ...body,
    id: id as string | number,
    name: String(body.name ?? body.fileName ?? ""),
    path: String(body.path ?? body.url ?? body.endpointPath ?? ""),
    endpointPath: body.endpointPath ? String(body.endpointPath) : undefined,
  };
}

/**
 * 平面图上传：对齐旧仓 FileUpload，transport 走 fileClient。
 */
export const FileUpload = defineComponent({
  name: "EmergencyDispatchFileUpload",
  props: {
    value: { type: Array as PropType<OSSFile[]>, default: () => [] },
    multiple: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    sceneCode: { type: String, default: GLOBAL_SCENE_CODE.floorPlan },
    maxCount: { type: Number, default: 1 },
    accept: { type: String, default: "image/*" },
    listType: { type: String, default: "picture-card" },
  },
  emits: ["update:value", "change"],
  setup(props, { emit, expose }) {
    const input = ref<HTMLInputElement>();
    const uploading = ref(false);
    const files = computed(() => (Array.isArray(props.value) ? props.value : []));

    const update = (next: OSSFile[]): void => {
      emit("update:value", next);
      emit("change", next);
    };

    const clearAll = (): void => update([]);

    const triggerUpload = (): void => {
      input.value?.click();
    };

    const selectFiles = async (event: Event): Promise<void> => {
      const element = event.target as HTMLInputElement;
      const selected = Array.from(element.files ?? []);
      element.value = "";
      if (!selected.length || uploading.value) return;
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded = await Promise.all(
          selected.map(async (file) => {
            const payload = new FormData();
            payload.append("sceneCode", props.sceneCode);
            payload.append("businessKey", "emergency-dispatch");
            payload.append("file", file);
            return fileRecord(await client.uploadFile(payload));
          }),
        );
        const next = props.multiple
          ? [...files.value, ...uploaded.filter((f): f is OSSFile => Boolean(f))]
          : uploaded.filter((f): f is OSSFile => Boolean(f)).slice(0, 1);
        update(next.slice(0, props.maxCount));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "附件上传失败");
      } finally {
        uploading.value = false;
      }
    };

    expose({ triggerUpload, clearAll });

    return () => (
      <Space wrap>
        {files.value.map((file, index) => (
          <div key={String(file.id ?? index)}>
            {file.path || file.endpointPath ? (
              <Image width={80} src={toImageSrc(String(file.endpointPath ?? file.path ?? file.url ?? ""))} />
            ) : (
              <span>{String(file.name ?? file.id)}</span>
            )}
            {!props.readonly ? (
              <Button type="link" danger onClick={() => update(files.value.filter((_, i) => i !== index))}>
                删除
              </Button>
            ) : null}
          </div>
        ))}
        {!props.readonly && files.value.length < props.maxCount ? (
          <Button loading={uploading.value} onClick={triggerUpload}>
            上传图片
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept={props.accept}
          multiple={props.multiple}
          style={{ display: "none" }}
          onChange={(event) => void selectFiles(event)}
        />
      </Space>
    );
  },
});
