import dayjs from "dayjs";
import { defineComponent, ref, watch } from "vue";

import { createReviews, getReviewTask } from "@/api/server";
import { FORM_INPUT_PROPS, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Form, FormItem, Input, Modal, RadioGroup, Spin, Textarea } from "@/pc-ui-runtime";
import type { ReviewItemVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { readCurrentUserDisplayName, readCurrentUserId } from "@/utils/read-current-user";
import { mapReviewFromApi } from "@/utils/risk-control-mapper";

import styles from "./review-object-modal.module.less";

export const ReviewObjectModal = defineComponent({
  props: {
    open: { type: Boolean, default: false },
    objectId: { type: String, default: "" },
    preview: { type: Object as () => ReviewItemVO | null, default: null },
  },
  emits: ["update:open", "success"],
  setup(props, { emit }) {
    const loading = ref(false);
    const submitting = ref(false);
    const detail = ref<ReviewItemVO | null>(null);
    const reviewAction = ref<"APPROVED" | "REJECTED">("APPROVED");
    const rejectReason = ref("");
    const reviewComment = ref("");
    const auditTime = ref(dayjs().format("YYYY-MM-DD HH:mm:ss"));
    const auditorName = ref(readCurrentUserDisplayName());

    const resetForm = (): void => {
      reviewAction.value = "APPROVED";
      rejectReason.value = "";
      reviewComment.value = "";
      auditTime.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
      auditorName.value = readCurrentUserDisplayName();
    };

    const loadDetail = async (objectId: string): Promise<void> => {
      if (!objectId) {
        detail.value = null;
        return;
      }
      loading.value = true;
      try {
        const vo = await useAuthRequest(() => getReviewTask(objectId));
        detail.value = mapReviewFromApi(vo);
      } catch (e) {
        showApiError(e);
        detail.value = props.preview;
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.open,
      (visible) => {
        if (visible) {
          resetForm();
          detail.value = props.preview;
          void loadDetail(props.objectId);
        }
      },
    );

    const close = (): void => {
      emit("update:open", false);
    };

    const submit = async (): Promise<void> => {
      const targetId = detail.value?.objectId || props.objectId;
      if (!targetId) return;
      if (reviewAction.value === "REJECTED" && !rejectReason.value.trim()) {
        showApiError(new Error("退回时请填写退回原因"));
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          createReviews({
            objectId: targetId,
            reviewResult: reviewAction.value,
            rejectReason: reviewAction.value === "REJECTED" ? rejectReason.value.trim() : undefined,
            reviewComment: reviewComment.value.trim() || undefined,
            userId: readCurrentUserId(),
          }),
        );
        emit("success", reviewAction.value);
        close();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const renderInfoItem = (label: string, value?: string, fullWidth = false): JSX.Element => (
      <div class={fullWidth ? styles.infoItemFull : undefined}>
        <span class={styles.summaryLabel}>{label}：</span>
        <span>{value || "--"}</span>
      </div>
    );

    return (): JSX.Element => {
      const item = detail.value;
      return (
        <Modal
          wrapClassName="risk-modal"
          bodyStyle={RISK_MODAL_BODY_STYLE}
          title="审核风险对象"
          open={props.open}
          width={720}
          destroyOnClose
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <Button onClick={close}>取消</Button>
              <Button
                type="primary"
                loading={submitting.value}
                onClick={() => {
                  void submit();
                }}
              >
                确认提交
              </Button>
            </div>
          }
          onCancel={close}
        >
          <Spin spinning={loading.value}>
            {item && (
              <>
                <div class={styles.summary}>
                  <div class={styles.summaryGrid}>
                    <div class={styles.summaryItem}>
                      <span class={styles.summaryLabel}>风险对象：</span>
                      <span class={styles.summaryValue}>{item.objectName}</span>
                    </div>
                    <div class={styles.summaryItem}>
                      <span class={styles.summaryLabel}>所属单元：</span>
                      <span class={styles.summaryValue}>{item.unitName}</span>
                    </div>
                    <div class={styles.summaryItem}>
                      <span class={styles.summaryLabel}>辨识人：</span>
                      <span class={styles.summaryValue}>{item.identifyUser}</span>
                    </div>
                    <div class={styles.summaryItem}>
                      <span class={styles.summaryLabel}>提交时间：</span>
                      <span class={styles.summaryValue}>{item.submitTime || "--"}</span>
                    </div>
                  </div>
                </div>
                <div class={styles.infoBox}>
                  <div class={styles.infoTitle}>辨识信息</div>
                  <div class={styles.infoGrid}>
                    {renderInfoItem("危险源", item.hazardDesc, true)}
                    {renderInfoItem("事故类型", item.accidentTypes.join("、"))}
                    {renderInfoItem("事故原因", item.cause)}
                    {renderInfoItem("触发因素", item.triggerFactors)}
                    {renderInfoItem("应急措施", item.emergencyMeasures, true)}
                    {renderInfoItem("责任人员", item.responsibleUser)}
                  </div>
                </div>
                <Form layout="vertical">
                  <FormItem label="审核人">
                    <Input {...FORM_INPUT_PROPS} value={auditorName.value} disabled class={styles.readonlyField} />
                  </FormItem>
                  <FormItem label="审核时间">
                    <Input {...FORM_INPUT_PROPS} value={auditTime.value} disabled class={styles.readonlyField} />
                  </FormItem>
                  <FormItem label="审核结果" required>
                    <RadioGroup
                      v-model:value={reviewAction.value}
                      optionType="default"
                      options={[
                        { label: "通过", value: "APPROVED" },
                        { label: "退回修改", value: "REJECTED" },
                      ]}
                    />
                  </FormItem>
                  {reviewAction.value === "REJECTED" && (
                    <FormItem label="退回原因" required>
                      <Input
                        {...FORM_INPUT_PROPS}
                        v-model:value={rejectReason.value}
                        placeholder="退回原因（退回时必填）"
                        maxlength={200}
                      />
                    </FormItem>
                  )}
                  <FormItem label="审核意见">
                    <Textarea
                      {...FORM_INPUT_PROPS}
                      v-model:value={reviewComment.value}
                      rows={3}
                      maxlength={500}
                      placeholder="输入审核意见（可选）"
                    />
                  </FormItem>
                </Form>
              </>
            )}
          </Spin>
        </Modal>
      );
    };
  },
});
