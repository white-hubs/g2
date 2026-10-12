import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { pageIdentificationUnits, pageReviewTasks } from "@/api/server";
import {
  IDENTIFICATION_STATUS_LABEL,
  LIST_ACTION_LINK_PROPS,
  TABLE_CODE_COLUMN_WIDTH,
  TABLE_PAGE_SIZE,
  RISK_MODAL_BODY_STYLE,
} from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Modal, Page, PageLayout as PcLayout, Space, Table, Tag, usePcForm, usePcTable, type ColumnType } from "@/pc-ui-runtime";
import type { IdentificationUnitVO, IdentificationStatus, RejectedIdentificationVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapIdentificationFromApi, mapIdentificationStatusToApi, mapRejectedIdentificationFromApi } from "@/utils/risk-control-mapper";

const STATUS_COLOR: Partial<Record<IdentificationStatus, string>> = {
  PENDING: "default",
  IDENTIFYING: "processing",
  PENDING_REVIEW: "warning",
  REVIEWED: "success",
};

export const IdentificationListPage = defineComponent({
  name: "IdentificationListPage",
  setup() {
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      status: "" as IdentificationStatus | "",
    });
    const rejectedVisible = ref(false);
    const rejectedLoading = ref(false);
    const rejectedUnit = ref<IdentificationUnitVO | null>(null);
    const rejectedRecords = ref<RejectedIdentificationVO[]>([]);

    const showRejected = async (record: IdentificationUnitVO): Promise<void> => {
      rejectedUnit.value = record;
      rejectedRecords.value = [];
      rejectedVisible.value = true;
      rejectedLoading.value = true;
      try {
        const result = await useAuthRequest(() =>
          pageReviewTasks({
            unitId: record.id,
            status: "REJECTED",
            pageNumber: 1,
            pageSize: 500,
          }),
        );
        rejectedRecords.value = (result?.records ?? []).map(mapRejectedIdentificationFromApi);
      } catch (e) {
        showApiError(e);
        rejectedRecords.value = [];
      } finally {
        rejectedLoading.value = false;
      }
    };

    const goReIdentify = (unitId: string): void => {
      rejectedVisible.value = false;
      void router.push({ name: "identification-entry", query: { unitId } });
    };

    const renderIdentifyAction = (record: IdentificationUnitVO): JSX.Element => {
      if (record.status === "REVIEWED") {
        return (
          <Button {...LIST_ACTION_LINK_PROPS} disabled>
            已审核
          </Button>
        );
      }
      if (record.status === "PENDING_REVIEW" && record.rejectedCount <= 0) {
        return (
          <Button {...LIST_ACTION_LINK_PROPS} disabled>
            审核中
          </Button>
        );
      }
      return (
        <Button {...LIST_ACTION_LINK_PROPS} onClick={() => router.push({ name: "identification-entry", query: { unitId: record.id } })}>
          {record.status === "PENDING_REVIEW" ? "再次辨识" : "辨识"}
        </Button>
      );
    };

    const columns: ColumnType[] = [
      { title: "辨识编号", dataIndex: "code", width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      { title: "单元名称", dataIndex: "unitName", width: 180, ellipsis: true },
      { title: "单元类型", dataIndex: "unitType", width: 90 },
      { title: "所属区域", dataIndex: "zoneName", width: 140, ellipsis: true },
      {
        title: "辨识人员",
        dataIndex: "identifyUsers",
        width: 140,
        customRender: ({ text }: { text: string[] }) => text.join("、"),
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        customRender: ({ text }: { text: IdentificationStatus }) => (
          <Tag color={STATUS_COLOR[text]}>{IDENTIFICATION_STATUS_LABEL[text]}</Tag>
        ),
      },
      { title: "对象数", dataIndex: "objectCount", width: 72, align: "center" as const },
      {
        title: "驳回数",
        dataIndex: "rejectedCount",
        width: 80,
        align: "center" as const,
        customRender: ({ text, record }: { text: number; record: IdentificationUnitVO }) =>
          text > 0 ? (
            <Button
              {...LIST_ACTION_LINK_PROPS}
              onClick={() => {
                void showRejected(record);
              }}
            >
              {text}
            </Button>
          ) : (
            <span>0</span>
          ),
      },
      { title: "提交时间", dataIndex: "submitTime", width: 160, customRender: ({ text }: { text?: string }) => text ?? "--" },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 140,
        customRender: ({ record }: { record: IdentificationUnitVO }) => (
          <Space size={0}>
            {renderIdentifyAction(record)}
            <Button
              {...LIST_ACTION_LINK_PROPS}
              onClick={() => router.push({ name: "identification-history", query: { unitId: record.id } })}
            >
              历史
            </Button>
          </Space>
        ),
      },
    ];

    const fetchIdentificationPage = async () => {
      const result = await useAuthRequest(() =>
        pageIdentificationUnits({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          status: mapIdentificationStatusToApi(search.status || undefined),
        }),
      );
      const records = (result?.records ?? []).map(mapIdentificationFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_IDENTIFICATION_LIST",
      rowKey: "id",
      fetchApi: fetchIdentificationPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部状态",
            options: [
              { label: "全部状态", value: "" },
              ...(Object.keys(IDENTIFICATION_STATUS_LABEL) as IdentificationStatus[]).map((s) => ({
                label: IDENTIFICATION_STATUS_LABEL[s],
                value: s,
              })),
            ],
          },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "编号/单元/区域", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        status: (values.status as IdentificationStatus | "" | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.status = (values.status as IdentificationStatus | "" | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.status = "";
        page.pageNumber = 1;
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
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            title={`驳回记录 — ${rejectedUnit.value?.unitName ?? ""}`}
            open={rejectedVisible.value}
            width={960}
            footer={null}
            onCancel={() => {
              rejectedVisible.value = false;
            }}
          >
            <p style={{ marginBottom: 12, color: "#666" }}>共 {rejectedUnit.value?.rejectedCount ?? 0} 条驳回，请修改后重新提交辨识。</p>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              loading={rejectedLoading.value}
              dataSource={rejectedRecords.value}
              scroll={{ x: 880 }}
              columns={[
                { title: "风险对象", dataIndex: "objectName", width: 120, ellipsis: true },
                { title: "危险源描述", dataIndex: "hazardDesc", width: 140, ellipsis: true },
                {
                  title: "退回原因",
                  dataIndex: "rejectReason",
                  width: 140,
                  ellipsis: true,
                  customRender: ({ text }: { text?: string }) => text || "--",
                },
                { title: "退回时间", dataIndex: "reviewTime", width: 160, customRender: ({ text }: { text?: string }) => text || "--" },
                { title: "审核人", dataIndex: "reviewer", width: 90, customRender: ({ text }: { text?: string }) => text || "--" },
                {
                  title: "操作",
                  fixed: "right",
                  width: 90,
                  customRender: () => (
                    <Button {...LIST_ACTION_LINK_PROPS} onClick={() => goReIdentify(rejectedUnit.value?.id ?? "")}>
                      再次辨识
                    </Button>
                  ),
                },
              ]}
            />
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("风险辨识")} v-slots={slots} />;
  },
});
