import type { SmallEngineeringRecord } from "@g2-client/small-engineering/client";
import type { FileClient, SceneFile } from "@g2-contract/file";
import { Button, Form, FormItem, InputNumber, Modal, RadioGroup, Spin, Textarea, Upload, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getSmallEngineeringClient, getSmallEngineeringContext } from "@/domain-context";
export function useScheduleAction(onSuccess: () => Promise<void>) {
  const client = getSmallEngineeringClient();
  const context = getSmallEngineeringContext();
  const display = (value: unknown) => String(value ?? "--");
  const modalOpen = ref(false);
  const modalMode = ref<"feedback" | "accept">("feedback");
  const modalSaving = ref(false);
  const modalLoading = ref(false);
  const uploading = ref(false);
  const selected = ref<SmallEngineeringRecord>({});
  const files = ref<SceneFile[]>([]);
  const draft = reactive({ schedule: 0, description: "", hasProblem: true, problemDes: "", acceptanceResult: "QUALIFIED" });
  let modalVersion = 0;

  const openModal = async (mode: "feedback" | "accept", row: SmallEngineeringRecord): Promise<void> => {
    const current = ++modalVersion;
    modalMode.value = mode;
    selected.value = row;
    files.value = [];
    Object.assign(draft, {
      schedule: Number(row.schedule ?? 0),
      description: "",
      hasProblem: true,
      problemDes: "",
      acceptanceResult: "QUALIFIED",
    });
    modalOpen.value = true;
    if (mode !== "accept") {
      return;
    }
    modalLoading.value = true;
    try {
      const abnormal = await client.isProjectAbnormal(String(row.id ?? ""));
      if (current === modalVersion && abnormal === "true") {
        message.warning("该工程在巡查中存在过异常，请注意异常是否已处理完成");
      }
    } catch (error) {
      if (current === modalVersion) {
        message.error(error instanceof Error ? error.message : "异常状态检查失败");
      }
    } finally {
      if (current === modalVersion) {
        modalLoading.value = false;
      }
    }
  };
  const closeModal = (): void => {
    ++modalVersion;
    modalOpen.value = false;
    modalLoading.value = false;
  };
  const uploadFile = async (options: {
    file: string | Blob;
    onSuccess?: (response: unknown) => void;
    onError?: (error: Error) => void;
  }): Promise<void> => {
    uploading.value = true;
    try {
      const fileClient = await context.ensureClient<FileClient>("fileClient");
      if (!(options.file instanceof Blob)) {
        throw new Error("请选择有效文件");
      }
      if (options.file.size > 300 * 1024 * 1024) {
        throw new Error("文件大小不能超过300MB");
      }
      if (files.value.length >= 5) {
        throw new Error("最多上传5个附件");
      }
      const file = options.file instanceof File ? options.file : new File([options.file], "附件");
      const result = await fileClient.uploadSceneFile({ file, businessKey: "small-engineering", sceneCode: "SMALLENFINEERING" });
      files.value = [...files.value, result];
      options.onSuccess?.(result);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("上传失败");
      message.error(failure.message);
      options.onError?.(failure);
    } finally {
      uploading.value = false;
    }
  };
  const saveModal = async (confirmed = false): Promise<void> => {
    if (modalSaving.value || modalLoading.value || uploading.value) {
      return;
    }
    if (modalMode.value === "feedback" && draft.schedule < Number(selected.value.schedule ?? 0)) {
      message.warning("工程进度不能小于当前进度");
      return;
    }
    if (modalMode.value === "feedback" && files.value.length === 0) {
      message.warning("请上传文件");
      return;
    }
    if (modalMode.value === "feedback" && draft.schedule === 100 && !confirmed) {
      Modal.confirm({ title: "提示", content: "是否确认完成？", okText: "确定", cancelText: "取消", onOk: () => saveModal(true) });
      return;
    }
    modalSaving.value = true;
    try {
      const scheduleId = String(selected.value.id ?? "");
      const fileIds = files.value.map((item) => item.id);
      if (modalMode.value === "feedback") {
        await client.submitScheduleFeedback({
          scheduleId,
          schedule: draft.schedule,
          description: draft.description,
          hasProblem: draft.hasProblem,
          problemDes: draft.problemDes,
          problemFileIds: [],
          fileIds,
        });
      } else {
        await client.submitScheduleAcceptance({
          scheduleId,
          acceptanceResult: draft.acceptanceResult,
          description: draft.description,
          fileIds,
        });
      }
      message.success("操作成功");
      closeModal();
      await onSuccess();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      modalSaving.value = false;
    }
  };
  const ActionModal = defineComponent({
    setup: () => () => (
      <Modal
        open={modalOpen.value}
        title={modalMode.value === "feedback" ? "反馈" : "验收"}
        width="50%"
        confirmLoading={modalSaving.value}
        okText="确定"
        cancelText="取消"
        onCancel={closeModal}
        onOk={() => {
          void saveModal();
        }}
      >
        <Spin spinning={modalLoading.value}>
          <div style={{ minHeight: "250px" }}>
            <Form model={draft} labelCol={{ style: { width: "120px" } }}>
              {modalMode.value === "feedback" ? (
                <>
                  <FormItem label="当前工程进度" required>
                    <InputNumber min={Number(selected.value.schedule ?? 0)} max={100} v-model:value={draft.schedule} />%
                  </FormItem>
                  <FormItem label="反馈描述">
                    <Textarea maxlength={500} v-model:value={draft.description} />
                  </FormItem>
                </>
              ) : (
                <>
                  <FormItem label="验收结果" required>
                    <RadioGroup
                      v-model:value={draft.acceptanceResult}
                      options={[
                        { label: "验收合格", value: "QUALIFIED" },
                        { label: "验收不合格", value: "DISQUALIFICATION" },
                      ]}
                    />
                  </FormItem>
                  <FormItem label="验收说明">
                    <Textarea maxlength={500} v-model:value={draft.description} />
                  </FormItem>
                </>
              )}
              <FormItem label="文件上传" required={modalMode.value === "feedback"}>
                <Upload multiple showUploadList={false} customRequest={uploadFile} accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx">
                  <Button loading={uploading.value}>上传附件</Button>
                </Upload>
                <div>
                  {files.value.map((file) => (
                    <span style={{ display: "inline-block", marginRight: "12px" }}>
                      <a href={String(file.path)} target="_blank" rel="noreferrer">
                        {display(file.name ?? file.id)}
                      </a>
                      <Button
                        type="link"
                        danger
                        onClick={() => {
                          files.value = files.value.filter((item) => item.id !== file.id);
                        }}
                      >
                        删除
                      </Button>
                    </span>
                  ))}
                </div>
              </FormItem>
            </Form>
          </div>
        </Spin>
      </Modal>
    ),
  });
  return { ActionModal, openModal };
}
