import { defineComponent, onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createReviews, getReviewTask } from "@/api/server";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  PageLayout as PcLayout,
  Radio,
  RadioGroup,
  Space,
  Tag,
  message,
} from "@/pc-ui-runtime";
import type { ReviewItemVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { useLayoutTitle } from "@/utils/page-title";
import { mapReviewFromApi } from "@/utils/risk-control-mapper";

export const ReviewExecutePage = defineComponent({
  setup() {
    const layoutTitle = useLayoutTitle("审核执行");
    const route = useRoute();
    const router = useRouter();
    const reviewAction = ref<"APPROVED" | "REJECTED">("APPROVED");
    const rejectReason = ref("");
    const reviewComment = ref("");
    const submitting = ref(false);
    const loading = ref(false);
    const item = ref<ReviewItemVO | null>(null);

    const reviewId = computed(() => (route.query.objectId ?? route.query.id) as string);

    const loadDetail = async (): Promise<void> => {
      if (!reviewId.value) return;
      loading.value = true;
      try {
        const vo = await useAuthRequest(() => getReviewTask(reviewId.value));
        item.value = mapReviewFromApi(vo);
      } catch (e) {
        showApiError(e);
        item.value = null;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadDetail();
    });

    const submit = async (): Promise<void> => {
      if (!item.value) {
        message.error("未找到审核项");
        return;
      }
      const target = item.value;
      if (reviewAction.value === "REJECTED" && !rejectReason.value.trim()) {
        message.error("退回时请填写原因");
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          createReviews({
            objectIds: [target.objectId || target.id],
            reviewResult: reviewAction.value,
            rejectReason: reviewAction.value === "REJECTED" ? rejectReason.value.trim() : undefined,
            reviewComment: reviewComment.value.trim() || undefined,
          }),
        );
        message.success(reviewAction.value === "APPROVED" ? "审核通过" : "已退回");
        void router.push({ name: "review-pending" });
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        showFooter={false}
        v-slots={{
          "layout-content": () =>
            item.value ? (
              <div style={{ display: "flex", gap: 16, minHeight: 480 }}>
                <Card title="辨识详情" style={{ flex: 1 }} size="small" loading={loading.value}>
                  <Descriptions column={1} bordered size="small">
                    <DescriptionsItem label="风险对象">{item.value.objectName}</DescriptionsItem>
                    <DescriptionsItem label="所属单元">{item.value.unitName}</DescriptionsItem>
                    <DescriptionsItem label="辨识人">{item.value.identifyUser}</DescriptionsItem>
                    <DescriptionsItem label="提交时间">{item.value.submitTime}</DescriptionsItem>
                    <DescriptionsItem label="危险源描述">{item.value.hazardDesc}</DescriptionsItem>
                    <DescriptionsItem label="事故类型">
                      {item.value.accidentTypes.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </DescriptionsItem>
                    <DescriptionsItem label="当前状态">
                      <Tag color={item.value.status === "PENDING" ? "processing" : item.value.status === "APPROVED" ? "success" : "error"}>
                        {item.value.status === "PENDING" ? "待审核" : item.value.status === "APPROVED" ? "已通过" : "已退回"}
                      </Tag>
                    </DescriptionsItem>
                    {item.value.rejectReason && <DescriptionsItem label="退回原因">{item.value.rejectReason}</DescriptionsItem>}
                  </Descriptions>
                </Card>
                <Card title="审核操作" style={{ width: 360 }} size="small">
                  <Form layout="vertical">
                    <FormItem label="审核结果" required>
                      <RadioGroup v-model:value={reviewAction.value}>
                        <Radio value="APPROVED">通过</Radio>
                        <Radio value="REJECTED">退回</Radio>
                      </RadioGroup>
                    </FormItem>
                    {reviewAction.value === "REJECTED" && (
                      <FormItem label="退回原因" required>
                        <Input.TextArea
                          v-model:value={rejectReason.value}
                          rows={4}
                          maxlength={200}
                          placeholder="请说明退回原因，便于辨识人修改"
                        />
                      </FormItem>
                    )}
                    <FormItem label="审核意见">
                      <Input.TextArea v-model:value={reviewComment.value} rows={3} maxlength={500} placeholder="输入审核意见（可选）" />
                    </FormItem>
                    <FormItem>
                      <Space>
                        <Button
                          type="primary"
                          loading={submitting.value}
                          onClick={() => {
                            void submit();
                          }}
                        >
                          提交审核
                        </Button>
                        <Button onClick={() => router.back()}>返回</Button>
                      </Space>
                    </FormItem>
                  </Form>
                </Card>
              </div>
            ) : (
              <Card loading={loading.value}>
                <p>未找到审核项，请从待审核列表进入。</p>
                <Button type="primary" onClick={() => router.push({ name: "review-pending" })}>
                  返回列表
                </Button>
              </Card>
            ),
        }}
      />
    );
  },
});
