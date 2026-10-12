import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getIdentification, getUnit, pageIdentifications } from "@/api/server";
import { LIST_ACTION_LINK_PROPS, TABLE_PAGE_SIZE, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Descriptions,
  DescriptionsItem,
  Modal,
  Page,
  PageLayout as PcLayout,
  Tag,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { IdentificationHistoryRecordVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapIdentificationObjectHistoryFromApi, mapUnitFromApi } from "@/utils/risk-control-mapper";

const REVIEW_STATUS_LABEL = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
} as const;

const REVIEW_STATUS_COLOR = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
} as const;

export const IdentificationHistoryPage = defineComponent({
  name: "IdentificationHistoryPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
    });
    const detailVisible = ref(false);
    const detailLoading = ref(false);
    const detailRecord = ref<IdentificationHistoryRecordVO | null>(null);
    const unitName = ref("");

    const unitId = computed(() => route.query.unitId as string | undefined);

    const loadUnitName = async (): Promise<void> => {
      if (!unitId.value) {
        unitName.value = "";
        return;
      }
      try {
        const vo = await useAuthRequest(() => getUnit(unitId.value!));
        unitName.value = mapUnitFromApi(vo).name;
      } catch {
        unitName.value = "";
      }
    };

    const showDetail = async (record: IdentificationHistoryRecordVO): Promise<void> => {
      detailVisible.value = true;
      detailLoading.value = true;
      detailRecord.value = null;
      try {
        const vo = await useAuthRequest(() => getIdentification(record.id));
        detailRecord.value = mapIdentificationObjectHistoryFromApi(vo);
      } catch (e) {
        showApiError(e);
        detailVisible.value = false;
      } finally {
        detailLoading.value = false;
      }
    };

    const columns: ColumnType[] = [
      { title: "辨识轮次", dataIndex: "identifyRoundNo", width: 160, ellipsis: true },
      { title: "风险对象", dataIndex: "objectName", width: 180, ellipsis: true },
      { title: "操作类型", dataIndex: "operationLabel", width: 90 },
      { title: "提交时间", dataIndex: "submitTime", width: 170, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "辨识人", dataIndex: "identifyUser", width: 100 },
      { title: "危险源", dataIndex: "hazardDesc", ellipsis: true },
      {
        title: "审核状态",
        dataIndex: "reviewStatus",
        width: 100,
        customRender: ({ text }: { text?: IdentificationHistoryRecordVO["reviewStatus"] }) =>
          text ? <Tag color={REVIEW_STATUS_COLOR[text]}>{REVIEW_STATUS_LABEL[text]}</Tag> : "--",
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 80,
        customRender: ({ record }: { record: IdentificationHistoryRecordVO }) => (
          <Button
            {...LIST_ACTION_LINK_PROPS}
            onClick={() => {
              void showDetail(record);
            }}
          >
            查看
          </Button>
        ),
      },
    ];

    const fetchHistoryPage = async () => {
      const result = await useAuthRequest(() =>
        pageIdentifications({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          unitId: unitId.value,
        }),
      );
      const records = (result?.records ?? []).map(mapIdentificationObjectHistoryFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_IDENTIFICATION_HISTORY",
      rowKey: "id",
      fetchApi: fetchHistoryPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          label: "关键词",
          fieldName: "keyword",
          componentProps: { placeholder: "对象/辨识人/危险源", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    onMounted(() => {
      void loadUnitName();
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => <Button onClick={() => router.push({ name: "identifications" })}>返回列表</Button>,
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          {unitName.value && <div style={{ marginBottom: 12, color: "#666" }}>当前单元：{unitName.value}</div>}
          <PcForm />
          <PcTable />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            title={`辨识记录 — ${detailRecord.value?.objectName ?? ""}`}
            open={detailVisible.value}
            width={640}
            footer={
              <Button
                onClick={() => {
                  detailVisible.value = false;
                }}
              >
                关闭
              </Button>
            }
            onCancel={() => {
              detailVisible.value = false;
            }}
          >
            {detailLoading.value ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#999" }}>加载中...</div>
            ) : (
              detailRecord.value && (
                <Descriptions column={1} bordered size="small">
                  <DescriptionsItem label="辨识轮次">{detailRecord.value.identifyRoundNo || "--"}</DescriptionsItem>
                  <DescriptionsItem label="操作类型">{detailRecord.value.operationLabel}</DescriptionsItem>
                  <DescriptionsItem label="风险对象">{detailRecord.value.objectName || "--"}</DescriptionsItem>
                  <DescriptionsItem label="提交时间">{detailRecord.value.submitTime || "--"}</DescriptionsItem>
                  <DescriptionsItem label="辨识人">{detailRecord.value.identifyUser || "--"}</DescriptionsItem>
                  <DescriptionsItem label="危险源">{detailRecord.value.hazardDesc || "--"}</DescriptionsItem>
                  <DescriptionsItem label="事故类型">{detailRecord.value.accidentTypes.join("、") || "--"}</DescriptionsItem>
                  <DescriptionsItem label="事故原因">{detailRecord.value.cause || "--"}</DescriptionsItem>
                  <DescriptionsItem label="触发因素">{detailRecord.value.triggerFactors || "--"}</DescriptionsItem>
                  <DescriptionsItem label="应急处理措施">{detailRecord.value.emergencyMeasures || "--"}</DescriptionsItem>
                  <DescriptionsItem label="审核状态">
                    {detailRecord.value.reviewStatus ? (
                      <Tag color={REVIEW_STATUS_COLOR[detailRecord.value.reviewStatus]}>
                        {REVIEW_STATUS_LABEL[detailRecord.value.reviewStatus]}
                      </Tag>
                    ) : (
                      "--"
                    )}
                  </DescriptionsItem>
                  {detailRecord.value.reviewerUser ? (
                    <DescriptionsItem label="审核人">{detailRecord.value.reviewerUser}</DescriptionsItem>
                  ) : null}
                  {detailRecord.value.reviewTime ? (
                    <DescriptionsItem label="审核时间">{detailRecord.value.reviewTime}</DescriptionsItem>
                  ) : null}
                  {detailRecord.value.rejectReason ? (
                    <DescriptionsItem label="驳回原因">{detailRecord.value.rejectReason}</DescriptionsItem>
                  ) : null}
                  {detailRecord.value.reviewComment ? (
                    <DescriptionsItem label="审核意见">{detailRecord.value.reviewComment}</DescriptionsItem>
                  ) : null}
                </Descriptions>
              )
            )}
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("辨识历史")} v-slots={slots} />;
  },
});
