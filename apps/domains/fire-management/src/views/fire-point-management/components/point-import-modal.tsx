import { defineComponent, shallowRef } from "vue";
import type { DefineComponent } from "vue";

import { batchFillFirePointEmptyFields, downloadFirePointImportTemplate } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Button, CloudUploadOutlined, DownloadOutlined, LoadingOutlined, UploadDragger, message } from "@/pc-ui-runtime";

import styles from "./point-import-modal.module.css";

const PointUploadDragger = UploadDragger as unknown as DefineComponent<Record<string, unknown>>;

export const PointImportModal = defineComponent({
  name: "PointImportModal",
  emits: ["imported"],
  setup: (_props, { emit, expose }) => {
    const uploading = shallowRef(false);
    const pendingFile = shallowRef<File | null>(null);

    const downloadTemplate = async (): Promise<void> => {
      try {
        message.loading({ content: "正在下载...", key: "point-template-download" });
        const blob = await downloadFirePointImportTemplate();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "点位导入模板.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success({ content: "模板下载成功", key: "point-template-download" });
      } catch (error) {
        message.error({ content: (error as Error).message || "模板下载失败", key: "point-template-download" });
      }
    };

    const selectFile = (file: File): false => {
      pendingFile.value = file;
      return false;
    };

    const submitImport = async (): Promise<void> => {
      const file = pendingFile.value;
      if (!file) {
        message.warning("请选择需要导入的 Excel 文件");
        return;
      }
      uploading.value = true;
      modalApi.setConfirmLoading(true);
      try {
        await batchFillFirePointEmptyFields(file);
        modalApi.close();
        emit("imported");
        message.success("批量补全数据成功");
      } catch (error) {
        const normalizedError = error as Error;
        message.error(normalizedError.message || "导入补全失败");
      } finally {
        uploading.value = false;
        modalApi.setConfirmLoading(false);
      }
    };

    const [ImportModal, modalApi] = usePcModal({
      title: "导入补全点位数据",
      width: "560px",
      centered: true,
      closeOnClickModal: false,
      confirmText: "确认导入",
      onConfirm: () => void submitImport(),
      onClosed: () => {
        uploading.value = false;
        pendingFile.value = null;
      },
    });

    expose({ openModal: () => modalApi.open() });

    return () => (
      <ImportModal
        v-slots={{
          default: () => (
            <div>
              <div class={styles.intro}>此操作仅补全已有点位的物理坐标、回路等缺失数据，不会新增或删除硬件关联关系。</div>
              <div class={styles.templateRow}>
                <Button
                  type="primary"
                  ghost
                  class={styles.templateButton}
                  icon={<DownloadOutlined />}
                  onClick={() => void downloadTemplate()}
                >
                  下载导入模板（.xlsx）
                </Button>
              </div>
              <div class={styles.upload}>
                <PointUploadDragger
                  name="file"
                  beforeUpload={selectFile}
                  showUploadList={false}
                  disabled={uploading.value}
                  accept=".xlsx,.xls"
                >
                  <p class={["ant-upload-drag-icon", styles.uploadIconWrap]}>
                    {uploading.value ? (
                      <LoadingOutlined class={styles.uploadIcon} spin />
                    ) : (
                      <CloudUploadOutlined class={styles.uploadIcon} />
                    )}
                  </p>
                  <p class={["ant-upload-text", styles.uploadText]}>
                    {uploading.value
                      ? "正在导入中..."
                      : pendingFile.value
                        ? `已选择：${pendingFile.value.name}`
                        : "点击或将 Excel 文件拖拽到此处上传"}
                  </p>
                  {uploading.value || pendingFile.value ? null : (
                    <p class={["ant-upload-hint", styles.uploadHint]}>支持 .xlsx / .xls 文件，单次仅可选择一个文件</p>
                  )}
                </PointUploadDragger>
              </div>
            </div>
          ),
        }}
      />
    );
  },
});
