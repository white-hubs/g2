import type { RenovationTicket, RenovationTicketAssessment } from "@g2-client/renovation/client";
import { Button, Form, FormItem, Modal, PageLayout, Rate, Spin, Textarea, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getRenovationClient, getRenovationRuntime } from "@/domain-context";
import { formatDateTime } from "@/utils/date";

import styles from "./detail-form.module.css";

interface AssessmentDraft {
  retrofitTicketId: string;
  score: number;
  description: string;
  imageIdList: string[];
}

const emptyDraft = (): AssessmentDraft => ({
  retrofitTicketId: "",
  score: 0,
  description: "",
  imageIdList: [],
});

const display = (value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  return String(value);
};

export const RenovationOrderDetails = defineComponent({
  name: "RenovationOrderDetails",
  setup() {
    const client = getRenovationClient();
    const { basePath } = getRenovationRuntime();
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const saving = ref(false);
    const detail = ref<RenovationTicket | undefined>();
    const assessOpen = ref(false);
    const draft = reactive<AssessmentDraft>(emptyDraft());
    let requestVersion = 0;

    const ticketId = computed(() => String(route.query.id ?? route.query.hiddenDangerId ?? ""));

    const load = async (): Promise<void> => {
      if (!ticketId.value) {
        message.error("缺少工单 ID");
        return;
      }
      const current = ++requestVersion;
      loading.value = true;
      try {
        const row = await client.getTicket(ticketId.value);
        if (current !== requestVersion) {
          return;
        }
        detail.value = row;
      } catch (error) {
        if (current === requestVersion) {
          message.error(error instanceof Error ? error.message : "工单详情加载失败");
        }
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };

    const goBack = (): void => {
      void router.push(`${basePath}/renovation-order`);
    };

    const openAssessment = (): void => {
      Object.assign(draft, emptyDraft());
      draft.retrofitTicketId = ticketId.value;
      assessOpen.value = true;
    };

    const submitAssessment = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (!draft.score) {
        message.warning("请填写评估结果");
        return;
      }
      saving.value = true;
      try {
        const payload: RenovationTicketAssessment = {
          retrofitTicketId: draft.retrofitTicketId,
          score: draft.score,
          description: draft.description,
          imageIdList: [...draft.imageIdList],
        };
        await client.submitTicketAssessment(payload);
        message.success("操作成功");
        assessOpen.value = false;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "评估提交失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.detailForm}>
            <div class={styles.sectionTitle}>更新改造信息</div>
            <div class={styles.fieldGrid}>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>改造工单编号：</span>
                <span class={styles.fieldValue}>{display(detail.value?.code)}</span>
              </div>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>改造对象：</span>
                <span class={styles.fieldValue}>{display(detail.value?.retrofitObjectName)}</span>
              </div>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>期望解决时间：</span>
                <span class={styles.fieldValue}>{formatDateTime(detail.value?.expectSolveDate as string | number | undefined)}</span>
              </div>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>工单时间：</span>
                <span class={styles.fieldValue}>{formatDateTime(detail.value?.createTime as string | number | undefined)}</span>
              </div>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>状态：</span>
                <span class={styles.fieldValue}>
                  {detail.value?.status === "WAITING_HANDLE" ? "待处理" : detail.value?.status ? "已完成" : "--"}
                </span>
              </div>
              <div class={styles.fieldItem}>
                <span class={styles.fieldLabel}>处理结果：</span>
                <span class={styles.fieldValue}>{display(detail.value?.handleResultStatusName)}</span>
              </div>
            </div>

            <div class={styles.sectionTitle}>工单流程</div>
            {(detail.value?.processEventList ?? []).length > 0 ? (
              (detail.value?.processEventList ?? []).map((item) => (
                <div class={styles.stepItem} key={item.id}>
                  <strong>
                    【{display(item.createBy)}】{display(item.action)}
                  </strong>
                  <span>{display(item.createTime)}</span>
                </div>
              ))
            ) : (
              <div>--</div>
            )}

            {detail.value?.retrofitTicketStatus === "ASSESSMENTED" && detail.value.assessment ? (
              <>
                <div class={styles.sectionTitle}>效果评估</div>
                <div class={styles.fieldGrid}>
                  <div class={styles.fieldItem}>
                    <span class={styles.fieldLabel}>效果评估：</span>
                    <span class={styles.fieldValue}>
                      {detail.value.assessment.score ? <Rate value={Number(detail.value.assessment.score)} disabled /> : "--"}
                    </span>
                  </div>
                  <div class={styles.fieldItem}>
                    <span class={styles.fieldLabel}>评估描述：</span>
                    <span class={styles.fieldValue}>{display(detail.value.assessment.description)}</span>
                  </div>
                </div>
                <div class={styles.fieldItem}>
                  <span class={styles.fieldLabel}>评估附件：</span>
                  <div class={styles.imageRow}>
                    {(detail.value.assessment.imageList ?? []).length > 0
                      ? (detail.value.assessment.imageList ?? []).map((image) => (
                          <img class={styles.imageThumb} key={image.id} src={image.path} alt="" />
                        ))
                      : "--"}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <>
          <Button onClick={goBack}>返回</Button>
          {detail.value?.isCanAssessmented ? (
            <Button type="primary" onClick={openAssessment}>
              效果评估
            </Button>
          ) : null}
        </>
      ),
    };

    return () => (
      <>
        <PageLayout title="改造工单详情" v-slots={slots} />
        <Modal
          open={assessOpen.value}
          title="效果评估"
          centered
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void submitAssessment()}
          onCancel={() => {
            assessOpen.value = false;
          }}
        >
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <FormItem label="效果评估" required>
              <Rate
                value={draft.score}
                onUpdate:value={(value: unknown) => {
                  draft.score = Number(value ?? 0);
                }}
              />
            </FormItem>
            <FormItem label="评估描述">
              <Textarea
                value={draft.description}
                maxlength={200}
                placeholder="评估描述"
                autoSize={{ minRows: 2, maxRows: 8 }}
                onUpdate:value={(value: unknown) => {
                  draft.description = String(value ?? "");
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
