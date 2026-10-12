import type { MaintenanceProgetRecord, MaintenanceTaskRecord } from "@g2-client/maintenance/client";
import {
  Button,
  Card,
  Form,
  type FormExpose,
  FormItem,
  type FormRule,
  Input,
  PageLayout,
  Spin,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AttachmentUpload } from "@/components/attachment-upload";
import { getMaintenanceClient } from "@/domain-context";
import { taskStatusLabel } from "@/utils/enum";
import { orDash, timeFormat } from "@/utils/format";

import styles from "../detail-form.module.css";

const RECORD_RULES: Record<string, FormRule[]> = {
  record: [{ required: true, message: "请填写", trigger: "blur" }],
  maintenanceDescribe: [{ required: true, message: "请填写", trigger: "blur" }],
};

export const MaintenanceExecute = defineComponent({
  name: "MaintenanceExecute",
  setup() {
    const client = getMaintenanceClient();
    const route = useRoute();
    const router = useRouter();
    const taskInfo = ref<MaintenanceTaskRecord>({});
    const records = reactive<MaintenanceProgetRecord[]>([]);
    const taskRemark = ref("");
    const fileIds = ref<string[]>([]);
    const loading = ref(false);
    const submitting = ref(false);
    const formRefs = ref<FormExpose[]>([]);

    const setFormRef = (element: unknown, index: number): void => {
      if (element) {
        formRefs.value[index] = element as FormExpose;
      }
    };

    onMounted(() => {
      const id = typeof route.query.id === "string" ? route.query.id : "";
      if (!id) {
        return;
      }
      loading.value = true;
      client
        .getTask(id)
        .then((data) => {
          taskInfo.value = data ?? {};
          records.splice(0, records.length, ...(data?.maintenanceProgetRecordVos ?? []));
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "任务详情加载失败");
        })
        .finally(() => {
          loading.value = false;
        });
    });

    const goBack = (): void => {
      void router.back();
    };

    const submit = async (): Promise<void> => {
      if (submitting.value) {
        return;
      }
      for (const formRef of formRefs.value) {
        try {
          await formRef?.validate();
        } catch {
          return;
        }
      }
      if (fileIds.value.length === 0) {
        message.error("请上传附件");
        return;
      }
      submitting.value = true;
      try {
        await client.saveProgetRecord({
          id: String(route.query.id ?? ""),
          planId: taskInfo.value.planId,
          taskRemark: taskRemark.value,
          fileIds: fileIds.value,
          maintenanceProgetRecordCommands: records,
        });
        message.success("提交成功");
        goBack();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "提交失败");
      } finally {
        submitting.value = false;
      }
    };

    /** 责任人：责任类型为人员看人员名，否则看岗位名。 */
    const responsibleText = (task: MaintenanceTaskRecord): string =>
      task.responsibilityType === "per" ? orDash(task.responsibilityPersonName) : orDash(task.responsibilityPositionName);

    const field = (label: string, value: unknown): JSX.Element => (
      <div class={styles.item}>
        <span class={styles.label}>{label}</span>
        <span class={styles.value}>{value}</span>
      </div>
    );

    const slots = {
      "layout-content": () => {
        const task = taskInfo.value;
        return (
          <Spin spinning={loading.value}>
            <Card title="基本信息" style={{ marginBottom: "16px" }}>
              <div class={styles.gridThree}>
                {field("任务编号", orDash(task.code))}
                {field("发布时间", orDash(timeFormat(task.maintenanceTime, true)))}
                {field("设备名称", orDash(task.objectName))}
                {field("产品品类", orDash(task.categoryName))}
                {field("责任人", responsibleText(task))}
                {field("任务状态", taskStatusLabel(task.maintenanceTaskStatus))}
              </div>
            </Card>
            {records.map((item, index) => (
              <Card title="维保记录" style={{ marginBottom: "16px" }} key={item.id ?? index}>
                <Form
                  ref={(element: unknown) => setFormRef(element, index)}
                  model={item}
                  rules={RECORD_RULES}
                  labelCol={{ span: 3 }}
                  wrapperCol={{ span: 21 }}
                >
                  <FormItem label="维保项名称">{orDash(item.maintrenaceProject)}</FormItem>
                  <FormItem label="维保结果" name="record">
                    <Input
                      value={item.record}
                      placeholder="请输入维保结果"
                      onUpdate:value={(value: string) => {
                        item.record = value;
                      }}
                    />
                  </FormItem>
                  <FormItem label="维保备注" name="maintenanceDescribe">
                    <Textarea
                      value={item.maintenanceDescribe}
                      placeholder="请输入维保备注"
                      rows={4}
                      onUpdate:value={(value: string) => {
                        item.maintenanceDescribe = value;
                      }}
                    />
                  </FormItem>
                </Form>
              </Card>
            ))}
            <Form labelCol={{ span: 3 }} wrapperCol={{ span: 21 }}>
              <FormItem label="总体结论">
                <Textarea
                  value={taskRemark.value}
                  placeholder="请输入总体结论"
                  rows={4}
                  onUpdate:value={(value: string) => {
                    taskRemark.value = value;
                  }}
                />
              </FormItem>
              <FormItem label="上传附件" required>
                <AttachmentUpload v-model:value={fileIds.value} max={10} maxSize={200} />
              </FormItem>
            </Form>
          </Spin>
        );
      },
      "footer-page": () => (
        <>
          <Button onClick={goBack}>返回</Button>
          <Button type="primary" loading={submitting.value} onClick={() => void submit()}>
            提交
          </Button>
        </>
      ),
    };

    return () => <PageLayout title="维保执行" v-slots={slots} />;
  },
});
