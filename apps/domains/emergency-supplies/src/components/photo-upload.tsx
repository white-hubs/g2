import { computed, defineComponent, ref, type PropType } from "vue";

import { getEmergencySuppliesPcUi } from "@/domain-context";
import { getFileClient } from "@/domain-context";

const { Button, Image, message } = getEmergencySuppliesPcUi();

export interface UploadedFile {
  id: string;
  name?: string | null;
  path?: string | null;
  url?: string | null;
}

export const PhotoUpload = defineComponent({
  name: "EmergencySuppliesPhotoUpload",
  props: {
    value: { type: Array as PropType<UploadedFile[]>, default: () => [] },
    readonly: Boolean,
    sceneCode: { type: String, required: true },
    maxCount: { type: Number, default: 1 },
  },
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const input = ref<HTMLInputElement>();
    const uploading = ref(false);
    const files = computed(() => props.value ?? []);

    const update = (next: UploadedFile[]): void => {
      emit("update:value", next);
      emit("change", next);
    };

    const pick = async (event: Event): Promise<void> => {
      const target = event.target as HTMLInputElement;
      const selected = Array.from(target.files ?? []);
      target.value = "";
      if (selected.length === 0) {
        return;
      }
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded: UploadedFile[] = [];
        for (const file of selected.slice(0, Math.max(props.maxCount - files.value.length, 0))) {
          const result = await client.uploadSceneFile({
            file,
            businessKey: "emergency-supplies",
            sceneCode: props.sceneCode,
            useTemporary: true,
          });
          uploaded.push({ id: result.id, name: result.name ?? file.name, path: result.path });
        }
        update([...files.value, ...uploaded]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "图片上传失败");
      } finally {
        uploading.value = false;
      }
    };

    return () => (
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        {files.value.map((file) => (
          <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {file.path || file.url ? (
              <Image width={88} height={88} src={String(file.path ?? file.url)} />
            ) : (
              <span>{file.name ?? file.id}</span>
            )}
            {!props.readonly ? (
              <Button type="link" danger size="small" onClick={() => update(files.value.filter((item) => item.id !== file.id))}>
                删除
              </Button>
            ) : null}
          </div>
        ))}
        {!props.readonly && files.value.length < props.maxCount ? (
          <Button loading={uploading.value} onClick={() => input.value?.click()}>
            上传图片
          </Button>
        ) : null}
        <input ref={input} type="file" accept=".jpg,.jpeg,.png" style={{ display: "none" }} onChange={(event) => void pick(event)} />
      </div>
    );
  },
});
