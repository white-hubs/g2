import { defineComponent, ref, watch, type PropType } from "vue";

import { classifyimport, templateExport } from "@/api";
import type { UploadFile } from "@/pc-ui-runtime";
import { Button, Modal, Upload, message } from "@/pc-ui-runtime";

import "./import-modal.less";

export const ImportModal = defineComponent({
  name: "ImportModal",
  props: {
    visible: { type: Boolean as PropType<boolean>, default: false },
    activeKey: { type: String, default: "classify" },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const importVisible = ref(false);
    const fileList = ref<UploadFile[]>([]);

    const downTemp = async () => {
      const res = await templateExport();
      const { data } = res;
      const link = document.createElement("a");
      const blob = new Blob([data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      link.style.display = "none";
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "分类报表模板.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleRemove = (file: UploadFile) => {
      const index = fileList.value.indexOf(file);
      const next = fileList.value.slice();
      next.splice(index, 1);
      fileList.value = next;
    };

    const beforeUpload = (file: UploadFile) => {
      fileList.value = [...fileList.value, file];
      return false;
    };

    const handleImport = async () => {
      if (fileList.value.length > 0) {
        const formData = new FormData();
        formData.append("file", fileList.value[0] as unknown as Blob);
        await classifyimport(formData);
        message.success("导入成功");
      }
      emit("close", false);
      importVisible.value = false;
      fileList.value = [];
    };

    const cancelImport = () => {
      fileList.value = [];
      importVisible.value = false;
      emit("close", false);
    };

    watch(
      () => props.visible,
      () => {
        importVisible.value = props.visible;
      },
      { immediate: true },
    );

    return () => (
      <Modal
        open={importVisible.value}
        title="批量导入"
        width="30vw"
        okText="导入"
        onCancel={cancelImport}
        afterClose={cancelImport}
        v-slots={{
          footer: () => (
            <>
              <Button
                key="back"
                onClick={() => {
                  importVisible.value = false;
                  emit("close", false);
                }}
              >
                取消
              </Button>
              <Button key="submit" type="primary" disabled={fileList.value.length === 0} onClick={() => void handleImport()}>
                导入
              </Button>
            </>
          ),
        }}
      >
        <div class="import">
          <p class="describe">注意：导入仅支持数据采集方式是人工录入的能源分类。</p>
          <div class="item">
            <div>1、导入前请先下载模板</div>
            <a class="operate" onClick={() => void downTemp()}>
              分类报表模板.xlsx
            </a>
          </div>
          <div class="item">
            <div>2、按模板填写再上传</div>
            <div class="operate">
              <Upload fileList={fileList.value} remove={handleRemove} beforeUpload={beforeUpload} accept=".xlsx,.xls">
                <Button type="primary">点击上传</Button>
              </Upload>
            </div>
          </div>
        </div>
      </Modal>
    );
  },
});

export default ImportModal;
