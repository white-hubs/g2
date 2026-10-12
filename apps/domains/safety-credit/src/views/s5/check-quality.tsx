import type {
  CheckExecutionStatus,
  QualityReviewResult,
  QualityStatus,
  SafetyCreditCheckExecutionVO,
  SafetyCreditCheckPhotoVO,
  SafetyCreditCheckQualityPageQuery,
  SafetyCreditCheckQualityReviewCommand,
  SafetyCreditCheckQualitySummaryVO,
  SafetyCreditCheckQualityVO,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import {
  Button,
  Form,
  FormItem,
  Image,
  Modal,
  Page,
  PageLayout,
  PopOver,
  Select,
  Space,
  Tag,
  Textarea,
  message,
  usePcForm,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import {
  checkExecutionStatusColor,
  checkExecutionStatusLabel,
  cleanText,
  displayText,
  formatDateTime,
  qualityReviewResultLabel,
  qualityReviewResultOptions,
  qualityStatusColor,
  qualityStatusLabel,
  qualityStatusOptions,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s5.less";

type OptionalQualityStatus = QualityStatus | "";
type QualityModalMode = "detail" | "review";

interface QualityQueryForm {
  pageNumber: number;
  pageSize: number;
  merchantName: string;
  qualityStatus: OptionalQualityStatus;
}

interface ReviewForm {
  reviewResult: QualityReviewResult;
  opinion: string;
}

function createReviewForm(): ReviewForm {
  return {
    reviewResult: "CONFIRMED_QUALIFIED",
    opinion: "",
  };
}

function photoFileName(photo: SafetyCreditCheckPhotoVO): string {
  return displayText(photo.file?.name ?? photo.fileId);
}

function photoFilePath(photo: SafetyCreditCheckPhotoVO): string | undefined {
  return cleanText(photo.file?.path);
}

export const CheckQuality = defineComponent({
  name: "CheckQuality",
  setup: () => {
    const loading = ref(false);
    const detailLoading = ref(false);
    const reviewing = ref(false);
    const rows = ref<SafetyCreditCheckQualityVO[]>([]);
    const total = ref(0);
    const summary = ref<SafetyCreditCheckQualitySummaryVO>({});
    const qualityModalVisible = ref(false);
    const qualityModalMode = ref<QualityModalMode>("detail");
    const selectedQuality = ref<SafetyCreditCheckQualityVO | null>(null);
    const detail = ref<SafetyCreditCheckExecutionVO | null>(null);

    const query = reactive<QualityQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      merchantName: "",
      qualityStatus: "",
    });

    const reviewForm = reactive<ReviewForm>(createReviewForm());

    function buildQuery(): SafetyCreditCheckQualityPageQuery {
      const payload: SafetyCreditCheckQualityPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const merchantName = cleanText(query.merchantName);
      if (merchantName !== undefined) {
        payload.merchantName = merchantName;
      }
      if (query.qualityStatus !== "") {
        payload.qualityStatus = query.qualityStatus;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const payload = buildQuery();
        const [summaryResult, pageResult] = await Promise.all([
          getSafetyCreditClient().getCheckQualitySummary(payload),
          getSafetyCreditClient().pageCheckQuality(payload),
        ]);
        summary.value = summaryResult ?? {};
        rows.value = pageResult.records ?? [];
        total.value = pageResult.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.merchantName = "";
      query.qualityStatus = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    async function openQualityModal(record: SafetyCreditCheckQualityVO, mode: QualityModalMode): Promise<void> {
      selectedQuality.value = record;
      detail.value = null;
      qualityModalMode.value = mode;
      if (mode === "review") {
        Object.assign(reviewForm, createReviewForm());
      }
      qualityModalVisible.value = true;
      detailLoading.value = true;
      try {
        detail.value = await getSafetyCreditClient().getCheckExecution(record.executionId);
      } finally {
        detailLoading.value = false;
      }
    }

    async function openDetail(record: SafetyCreditCheckQualityVO): Promise<void> {
      await openQualityModal(record, "detail");
    }

    async function openReview(record: SafetyCreditCheckQualityVO): Promise<void> {
      if (record.qualityStatus !== "SUSPECTED_FAKE") {
        message.warning("只有疑似虚假的记录需要复核");
        return;
      }
      await openQualityModal(record, "review");
    }

    async function submitReview(): Promise<void> {
      if (selectedQuality.value === null) {
        return;
      }
      const payload: SafetyCreditCheckQualityReviewCommand = {
        reviewResult: reviewForm.reviewResult,
      };
      const opinion = cleanText(reviewForm.opinion);
      if (opinion !== undefined) {
        payload.opinion = opinion;
      }
      reviewing.value = true;
      try {
        await getSafetyCreditClient().reviewCheckQuality(selectedQuality.value.executionId, payload);
        message.success("复核已提交");
        qualityModalVisible.value = false;
        await load();
      } finally {
        reviewing.value = false;
      }
    }

    function closeQualityModal(): void {
      qualityModalVisible.value = false;
    }

    function qualityModalTitle(): string {
      return qualityModalMode.value === "review" ? "质检复核" : "自查明细";
    }

    const columns: PcTableColumn[] = [
      {
        title: "商户名称",
        dataIndex: "merchantName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "清单名称",
        dataIndex: "checkName",
        align: "center" as const,
        width: 200,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "执行状态",
        dataIndex: "executionStatus",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: CheckExecutionStatus }): JSX.Element => (
          <Tag color={checkExecutionStatusColor(text)}>{checkExecutionStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "质量状态",
        dataIndex: "qualityStatus",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: QualityStatus }): JSX.Element => (
          <Tag color={qualityStatusColor(text)}>{qualityStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "提交时间",
        dataIndex: "submitTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: unknown }): string => formatDateTime(text),
      },
      {
        title: "操作",
        align: "center" as const,
        fixed: "right" as const,
        width: 160,
        customRender: ({ record }: { record: SafetyCreditCheckQualityVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => void openDetail(record)}>
              详情
            </Button>
            {record.qualityStatus === "SUSPECTED_FAKE" ? (
              <Button type="link" size="small" onClick={() => void openReview(record)}>
                复核
              </Button>
            ) : null}
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({
      rowKey: "executionId",
      tableCode: "SAFETY_CREDIT_check-quality",
      columns,
      dataSource: [],
    });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "商户名称",
        fieldName: "merchantName",
        componentProps: {
          placeholder: "请输入商户名称",
        },
      },
      {
        component: "Select",
        label: "质量状态",
        fieldName: "qualityStatus",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...qualityStatusOptions],
        },
      },
    ];

    const [CubeForm] = usePcForm({
      syncStateRef: query,
      layout: "horizontal",
      schema: searchFormSchema,
      showCollapseButton: true,
      handleSubmit: (data) => {
        query.pageNumber = 1;
        query.merchantName = String(data.merchantName ?? "").trim();
        query.qualityStatus = (data.qualityStatus ?? "") as OptionalQualityStatus;
        void load();
      },
      handleReset: resetQuery,
    });

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <section class="s5-summary-grid">
            <div class="summary-card">
              <span>质检总数</span>
              <strong>{displayText(summary.value.totalCount)}</strong>
            </div>
            <div class="summary-card">
              <span>进行中</span>
              <strong>{displayText(summary.value.pendingAiCount)}</strong>
            </div>
            <div class="summary-card">
              <span>合格</span>
              <strong>{displayText(summary.value.qualifiedCount)}</strong>
            </div>
            <div class="summary-card">
              <span>疑似虚假</span>
              <strong>{displayText(summary.value.suspectedFakeCount)}</strong>
            </div>
            <div class="summary-card">
              <span>确认虚假</span>
              <strong>{displayText(summary.value.confirmedFakeCount)}</strong>
            </div>
          </section>

          <CubeForm />

          <section class="table-wrap">
            <DataTable />
          </section>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <>
          <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
        </>
      ),
      default: (): JSX.Element => (
        <>
          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={qualityModalVisible.value}
            title={qualityModalTitle()}
            width={880}
            footer={qualityModalMode.value === "detail" ? null : undefined}
            confirmLoading={reviewing.value}
            onOk={() => void submitReview()}
            onCancel={closeQualityModal}
          >
            <div class="s2-modal-body">
              {detailLoading.value ? <div class="empty-tip">正在加载...</div> : null}
              {detail.value !== null ? (
                <>
                  <div class="s2-detail-grid">
                    <div class="detail-item">
                      <span>商户</span>
                      <strong>{displayText(detail.value.merchantName)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>清单</span>
                      <strong>{displayText(detail.value.checkName)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>周期开始</span>
                      <strong>{formatDateTime(detail.value.cycleBegin)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>周期结束</span>
                      <strong>{formatDateTime(detail.value.cycleEnd)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>执行状态</span>
                      <strong>{checkExecutionStatusLabel(detail.value.status)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>提交时间</span>
                      <strong>{formatDateTime(detail.value.submitTime)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>最终质检</span>
                      <strong>{qualityStatusLabel(detail.value.qualityStatus)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>复核结果</span>
                      <strong>{qualityReviewResultLabel(detail.value.reviewResult)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>复核时间</span>
                      <strong>{formatDateTime(detail.value.reviewTime)}</strong>
                    </div>
                    <div class="detail-item">
                      <span>复核意见</span>
                      <strong>{displayText(detail.value.reviewOpinion)}</strong>
                    </div>
                  </div>
                  <section class="s2-section">
                    <h3>检查项</h3>
                    <div class="s5-check-items">
                      {(detail.value.items ?? []).map((item) => (
                        <article class="s5-check-card" key={item.id ?? item.itemId}>
                          <div>
                            <strong>{displayText(item.itemName)}</strong>
                            <Tag color={item.checked ? "green" : "orange"}>{item.checked ? "已完成" : "未完成"}</Tag>
                          </div>
                          <p>{displayText(item.remark)}</p>
                          {(item.photos ?? []).length > 0 ? (
                            <div class="s5-photo-list">
                              {(item.photos ?? []).map((photo) => {
                                const filePath = photoFilePath(photo);
                                return (
                                  <div class="s5-photo-item" key={photo.id ?? photo.fileId}>
                                    {filePath === undefined ? (
                                      <div class="s5-photo-placeholder">无预览</div>
                                    ) : (
                                      <Image
                                        src={filePath}
                                        aria-label={photoFileName(photo)}
                                        width={56}
                                        height={50}
                                        preview={{ getContainer: () => document.body }}
                                      />
                                    )}
                                    <div class="s5-photo-meta">
                                      <div>
                                        <span>AI判定结果：</span>
                                        <Tag color={qualityStatusColor(photo.qualityStatus)}>{qualityStatusLabel(photo.qualityStatus)}</Tag>
                                      </div>
                                      {photo.qualityStatus === "SUSPECTED_FAKE" && cleanText(photo.qualityReason) !== undefined ? (
                                        <em title={cleanText(photo.qualityReason)}>{cleanText(photo.qualityReason)}</em>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                  {qualityModalMode.value === "review" ? (
                    <section class="s2-section">
                      <h3>复核信息</h3>
                      <Form class="s2-form-grid" model={reviewForm} layout="vertical">
                        <FormItem class="form-item wide" label="复核意见">
                          <Textarea
                            value={reviewForm.opinion}
                            placeholder="请输入复核意见"
                            maxlength={500}
                            onUpdate:value={(inputValue) => {
                              const value = inputValue as string;
                              return (reviewForm.opinion = value);
                            }}
                          />
                        </FormItem>
                        <FormItem class="form-item wide" label="复核结果" required>
                          <Select
                            value={reviewForm.reviewResult}
                            options={qualityReviewResultOptions.filter((option) => option.value !== "PENDING_REVIEW")}
                            onChange={(inputValue) => {
                              const value = inputValue as QualityReviewResult;
                              return (reviewForm.reviewResult = value);
                            }}
                          />
                        </FormItem>
                      </Form>
                    </section>
                  ) : null}
                </>
              ) : null}
            </div>
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="自查质检" v-slots={layoutSlots} />;
  },
});
