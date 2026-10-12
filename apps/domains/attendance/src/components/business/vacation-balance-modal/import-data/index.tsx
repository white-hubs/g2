import { Button, UploadDragger, type UploadFile, message } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, ref } from "vue";

import { holidayBalanceDownLoad, holidayBalanceImport } from "@/api/staff-leave";

export const ImportData = defineComponent({
  props: {
    isAdd: Boolean,
    holidayList: { type: Array as PropType<{ label: string; value: string }[]>, default: () => [] },
  },
  emits: ["update:value", "success"],
  setup(props, { emit, expose }) {
    const excel = ref<File>();
    const files = ref<UploadFile[]>([]);
    const downloading = ref(false),
      importing = ref(false);
    const ids = computed(() => props.holidayList.map((item) => item.value));
    const names = computed(() => props.holidayList.map((item) => item.label));
    const exportTemplate = async (): Promise<void> => {
      if (downloading.value) {
        return;
      }
      downloading.value = true;
      try {
        const result = await holidayBalanceDownLoad({ holidayIdList: ids.value, initTemplate: !props.isAdd });
        const url = URL.createObjectURL(result.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `假期余额批量${props.isAdd ? "新增" : "修改"}模版.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "模板下载失败");
      } finally {
        downloading.value = false;
      }
    };
    const handleImport = async (): Promise<unknown> => {
      if (importing.value) {
        throw new Error("正在导入，请勿重复操作");
      }
      if (!excel.value) {
        message.warning("请先上传文件");
        throw new Error("请先上传文件");
      }
      importing.value = true;
      try {
        const result = await holidayBalanceImport({ file: excel.value, init: !props.isAdd, ruleNames: names.value.join(",") });
        emit("success", result.data);
        return result.data;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导入失败");
        throw error;
      } finally {
        importing.value = false;
      }
    };
    expose({ handleImport });
    return () => (
      <>
        <p style={{ margin: "5px 0" }}>
          点击下载
          <Button type="link" style={{ margin: "0", padding: "0" }} loading={downloading.value} onClick={exportTemplate}>
            假期余额批量{props.isAdd ? "新增" : "修改"}模版
          </Button>
          ，按格式完善表格信息后，点击下方选择进行上传。
        </p>
        <UploadDragger
          accept=".xls,.xlsx"
          multiple={false}
          maxCount={1}
          fileList={files.value}
          disabled={importing.value}
          beforeUpload={(file: File & { uid: string }) => {
            if (!/\.(xls|xlsx)$/i.test(file.name)) {
              message.warning("仅支持 .xls/.xlsx 文件");
              return false;
            }
            excel.value = file;
            files.value = [{ uid: file.uid, name: file.name, status: "done" }];
            emit("update:value", file);
            return false;
          }}
          onRemove={() => {
            excel.value = undefined;
            files.value = [];
            emit("update:value", undefined);
            return true;
          }}
        >
          <Button>选择文件</Button>
        </UploadDragger>
        <p>支持上传（.xls/.xlsx）文件</p>
      </>
    );
  },
});
