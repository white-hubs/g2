import type { Key } from "ant-design-vue/es/table/interface";
import { defineComponent, reactive, ref } from "vue";

import { createReviews, pageReviewTasks } from "@/api/server";
import { ReviewObjectModal } from "@/components/review-object-modal/review-object-modal";
import { FORM_INPUT_PROPS, LIST_ACTION_LINK_PROPS, TABLE_PAGE_SIZE, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout as PcLayout,
  RadioGroup,
  Tag,
  Textarea,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { ReviewItemVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { readCurrentUserId } from "@/utils/read-current-user";
import { mapReviewFromApi } from "@/utils/risk-control-mapper";

type ReviewTaskStatusFilter = "" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

const STATUS_LABEL = { PENDING: "待审核", APPROVED: "已通过", REJECTED: "已退回" } as const;
const STATUS_COLOR = { PENDING: "processing", APPROVED: "success", REJECTED: "error" } as const;
const REVIEW_STATUS_OPTIONS: Array<{ label: string; value: Exclude<ReviewTaskStatusFilter, ""> }> = [
  { label: "待审核", value: "PENDING_REVIEW" },
  { label: "已通过", value: "APPROVED" },
  { label: "已退回", value: "REJECTED" },
];

export const ReviewPendingPage = defineComponent({
  name: "ReviewPendingPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      status: "" as ReviewTaskStatusFilter,
    });
    const selectedRowKeys = ref<Key[]>([]);
    const batchVisible = ref(false);
    const batchAction = ref<"APPROVED" | "REJECTED">("APPROVED");
    const batchReason = ref("");
    const batchComment = ref("");
    const reviewVisible = ref(false);
    const reviewObjectId = ref("");
    const reviewPreview = ref<ReviewItemVO | null>(null);

    const openReview = (record: ReviewItemVO): void => {
      reviewObjectId.value = record.objectId || record.id;
      reviewPreview.value = record;
      reviewVisible.value = true;
    };

    const onReviewSuccess = (result: "APPROVED" | "REJECTED"): void => {
      message.success(result === "APPROVED" ? "审核通过" : "已退回修改");
      tableApi.query();
    };

    const openBatchReview = (): void => {
      if (selectedRowKeys.value.length === 0) {
        message.warning("请先选择待审核项");
        return;
      }
      batchAction.value = "APPROVED";
      batchReason.value = "";
      batchComment.value = "";
      batchVisible.value = true;
    };

    const confirmBatch = async (): Promise<void> => {
      if (batchAction.value === "REJECTED" && !batchReason.value.trim()) {
        message.error("退回时请填写原因");
        return;
      }
      const selectedKeys = new Set(selectedRowKeys.value.map(String));
      const records = (tableApi.getDataSource() ?? []) as ReviewItemVO[];
      const objectIds = records
        .filter((record) => record.status === "PENDING" && selectedKeys.has(record.id))
        .map((record) => record.objectId || record.id);
      if (!objectIds.length) {
        message.warning("请选择待审核项");
        return;
      }
      try {
        await useAuthRequest(() =>
          createReviews({
            objectIds,
            reviewResult: batchAction.value,
            rejectReason: batchAction.value === "REJECTED" ? batchReason.value.trim() : undefined,
            reviewComment: batchComment.value.trim() || undefined,
            userId: readCurrentUserId(),
          }),
        );
        message.success(`已批量${batchAction.value === "APPROVED" ? "通过" : "退回修改"} ${objectIds.length} 条`);
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        batchVisible.value = false;
        tableApi.query();
      } catch (e) {
        showApiError(e);
      }
    };

    const columns: ColumnType[] = [
      { title: "风险对象", dataIndex: "objectName", width: 160, ellipsis: true },
      { title: "所属单元", dataIndex: "unitName", width: 160, ellipsis: true },
      { title: "辨识人", dataIndex: "identifyUser", width: 90 },
      { title: "危险源描述", dataIndex: "hazardDesc", ellipsis: true },
      {
        title: "事故类型",
        dataIndex: "accidentTypes",
        width: 140,
        customRender: ({ text }: { text: string[] }) => text.join("、"),
      },
      { title: "提交时间", dataIndex: "submitTime", width: 160 },
      { title: "审核人", dataIndex: "reviewerUser", width: 90, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "审核时间", dataIndex: "reviewTime", width: 160, customRender: ({ text }: { text?: string }) => text || "--" },
      {
        title: "退回原因/审核意见",
        dataIndex: "rejectReason",
        width: 180,
        ellipsis: true,
        customRender: ({ record }: { record: ReviewItemVO }) => record.rejectReason || record.reviewComment || "--",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 90,
        customRender: ({ text }: { text: ReviewItemVO["status"] }) => <Tag color={STATUS_COLOR[text]}>{STATUS_LABEL[text]}</Tag>,
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 100,
        customRender: ({ record }: { record: ReviewItemVO }) => (
          <Button {...LIST_ACTION_LINK_PROPS} disabled={record.status !== "PENDING"} onClick={() => openReview(record)}>
            审核
          </Button>
        ),
      },
    ];

    const fetchReviewPage = async () => {
      const result = await useAuthRequest(() =>
        pageReviewTasks({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          status: search.status || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapReviewFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_REVIEW_PENDING",
      rowKey: "id",
      rowSelection: "checkbox",
      fetchApi: fetchReviewPage,
      fetchLoaded: (data) => {
        page.total = data.total;
        const pendingIds = new Set(
          (data.records as ReviewItemVO[]).filter((record) => record.status === "PENDING").map((record) => record.id),
        );
        selectedRowKeys.value = selectedRowKeys.value.filter((key) => pendingIds.has(String(key)));
        tableApi.setSelectedRowKeys(selectedRowKeys.value);
      },
      getCheckboxProps: (record) => ({
        disabled: (record as unknown as ReviewItemVO).status !== "PENDING",
      }),
      rowSelectionChange: (keys) => {
        selectedRowKeys.value = keys;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "审核状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部状态",
            options: [{ label: "全部状态", value: "" }, ...REVIEW_STATUS_OPTIONS],
          },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "对象/单元/辨识人", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        status: (values.status as ReviewTaskStatusFilter | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.status = (values.status as ReviewTaskStatusFilter | undefined) ?? "";
        page.pageNumber = 1;
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.status = "";
        page.pageNumber = 1;
        selectedRowKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={openBatchReview}>
          批量审核（已选 {selectedRowKeys.value.length} 条）
        </Button>
      ),
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <ReviewObjectModal
            open={reviewVisible.value}
            objectId={reviewObjectId.value}
            preview={reviewPreview.value}
            onUpdate:open={(v: boolean) => {
              reviewVisible.value = v;
            }}
            onSuccess={onReviewSuccess}
          />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            title="批量审核"
            open={batchVisible.value}
            onOk={() => {
              void confirmBatch();
            }}
            onCancel={() => {
              batchVisible.value = false;
            }}
          >
            <p style={{ marginBottom: 12 }}>已选 {selectedRowKeys.value.length} 条待审核记录</p>
            <Form layout="vertical">
              <FormItem label="审核结果" required>
                <RadioGroup
                  v-model:value={batchAction.value}
                  optionType="default"
                  options={[
                    { label: "通过", value: "APPROVED" },
                    { label: "退回修改", value: "REJECTED" },
                  ]}
                />
              </FormItem>
              {batchAction.value === "REJECTED" && (
                <FormItem label="退回原因" required>
                  <Textarea {...FORM_INPUT_PROPS} v-model:value={batchReason.value} rows={3} maxlength={200} placeholder="请填写退回原因" />
                </FormItem>
              )}
              <FormItem label="审核意见">
                <Textarea
                  {...FORM_INPUT_PROPS}
                  v-model:value={batchComment.value}
                  rows={3}
                  maxlength={500}
                  placeholder="输入审核意见（可选）"
                />
              </FormItem>
            </Form>
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("待审核")} v-slots={slots} />;
  },
});
