// @ts-nocheck
import { FileTextOutlined, UploadOutlined } from "@ant-design/icons-vue";
import { computed, defineComponent, shallowRef, watch } from "vue";

import { getEmergencyManagementClient } from "@/domain-context";
import { Button, message } from "@/pc-ui-runtime";

import styles from "./generated-attachment-upload.module.css";

/** Matches ghcloud GLOBAL_SCENE_CODE.emergencyFile */
const EMERGENCY_FILE_SCENE_CODE = "EMERGENCY::FILE";

type ContentFile = {
  id: number | string;
  name: string;
  path?: string;
  url?: string;
  size?: number;
  suffix?: string;
  type?: string;
};

function normalizeUploaded(raw: unknown, fallbackName: string): ContentFile | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const id = data.id ?? data.ossId;
  if (id == null || id === "") return null;
  return {
    ...(data as ContentFile),
    id: id as string | number,
    name: String(data.name ?? fallbackName),
    url: String(data.path ?? data.url ?? ""),
    path: data.path != null ? String(data.path) : undefined,
  };
}

const normalizeFiles = (files: ContentFile[]) =>
  (files || []).filter(Boolean).map((file) => ({
    ...file,
    name: file.name || "未命名文件",
    url: file.url || file.path,
  }));

export const GeneratedAttachmentUpload = defineComponent({
  name: "GeneratedAttachmentUpload",
  props: {
    modelValue: { type: String, default: "" },
    files: { type: Array as () => ContentFile[], default: () => [] },
    readonly: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const maxCount = 5;
    const maxSize = 20 * 1024 * 1024;
    const accepting = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";
    const fileList = shallowRef<ContentFile[]>([]);
    const pendingCount = shallowRef(0);
    const inputRef = shallowRef<HTMLInputElement | null>(null);

    const updateValue = () => {
      emit("update:modelValue", fileList.value.map((file) => file.id).join(","));
    };

    watch(
      () => props.files,
      (files) => {
        fileList.value = normalizeFiles((files || []) as ContentFile[]);
      },
      { immediate: true },
    );

    const hasDuplicate = (file: File) => fileList.value.some((item) => item.name === file.name);

    const uploadOne = async (file: File) => {
      if (hasDuplicate(file)) {
        message.warning("文件已存在");
        return;
      }
      if (file.size > maxSize) {
        message.warning(`文件“${file.name}”超过20MB，无法上传`);
        return;
      }
      if (fileList.value.length + pendingCount.value >= maxCount) {
        message.warning("最多上传5个附件");
        return;
      }
      pendingCount.value += 1;
      try {
        const form = new FormData();
        form.append("sceneCode", EMERGENCY_FILE_SCENE_CODE);
        form.append("businessKey", "emergency");
        form.append("file", file);
        const uploaded = normalizeUploaded(await getEmergencyManagementClient().uploadFile(form), file.name);
        if (!uploaded) {
          message.error("文件上传失败，请稍后重试");
          return;
        }
        fileList.value = [...fileList.value, uploaded];
        updateValue();
      } catch {
        message.error("文件上传失败，请稍后重试");
      } finally {
        pendingCount.value = Math.max(0, pendingCount.value - 1);
      }
    };

    const onPick = async (event: Event) => {
      const element = event.target as HTMLInputElement;
      const selected = Array.from(element.files ?? []);
      element.value = "";
      for (const file of selected) {
        await uploadOne(file);
      }
    };

    const removeFile = (id: ContentFile["id"]) => {
      fileList.value = fileList.value.filter((file) => String(file.id) !== String(id));
      updateValue();
    };

    const isImage = (file: ContentFile) => {
      const extension = (file.suffix || file.name.split(".").pop() || "").toLowerCase();
      return Boolean(file.url) && (file.type?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(extension));
    };

    const attachmentText = computed(() => (fileList.value.length ? `已上传 ${fileList.value.length} 个附件` : "暂无附件"));

    const uploadButton = () =>
      props.readonly ? null : (
        <>
          <Button class={styles.uploadButton} size="small" onClick={() => inputRef.value?.click()}>
            <UploadOutlined />
            点击上传
          </Button>
          <input ref={inputRef} type="file" accept={accepting} multiple style={{ display: "none" }} onChange={(e) => void onPick(e)} />
        </>
      );

    return () => (
      <div class={styles.generatedAttachmentUpload}>
        {props.showHeader ? (
          <div class={styles.attachmentHeader}>
            <div>
              <h3>附件</h3>
              <p>支持 PDF、Word、Excel、图片等，单个不超过 20MB，最多5个</p>
            </div>
            {uploadButton()}
          </div>
        ) : (
          <div class={styles.attachmentActions}>
            <span>{attachmentText.value}</span>
            {uploadButton()}
          </div>
        )}
        {fileList.value.length ? (
          <div class={styles.attachmentList}>
            {fileList.value.map((file) => (
              <div key={String(file.id)} class={styles.attachmentItem}>
                {isImage(file) ? (
                  <img src={file.url} alt={file.name} class={styles.attachmentThumbnail} />
                ) : (
                  <FileTextOutlined class={styles.fileIcon} />
                )}
                <span class={styles.fileName} title={file.name}>
                  {file.name}
                </span>
                {!props.readonly ? (
                  <button class={styles.removeButton} type="button" aria-label="删除附件" onClick={() => removeFile(file.id)}>
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  },
});

export default GeneratedAttachmentUpload;
