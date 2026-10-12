import { Button, Page, Space, message, type ColumnType } from "@g2-platform/pc-ui";
import { defineComponent, reactive } from "vue";
import { useRouter } from "vue-router";

import { StatusTag } from "./components";
import { persistApprovalDetailMode } from "./navigation-utils";
import {
  WORK_STATUS_META,
  canEnterMonitorBoard,
  getApprovalProgress,
  getPesticideDisplayName,
  getWarehouseDisplayName,
  isWorkApprovalPending,
  replaceFumigationWorks,
  type FumigationWork,
  type WorkStatus,
} from "./state";
import { listFumigationWorks } from "@/api/fumigation-client";
import { CubeLayout, useCubeForm, useCubeTable } from "@/compat/app-design";

import "./fumigation.less";

const statusOptions = [
  { label: "全部状态", value: "" },
  ...Object.entries(WORK_STATUS_META)
    .filter(([value]) => value !== "PENDING_START")
    .map(([value, meta]) => ({ label: meta.label, value })),
];

const canRecheck = (status: WorkStatus): boolean => status === "CHECK_FAILED";
const canViewCheck = (status: WorkStatus): boolean => status === "PENDING_CHECK";
const canArchive = (status: WorkStatus): boolean => status === "ARCHIVED";

export const FumigationWorkList = defineComponent({
  name: "FumigationWorkList",
  setup: () => {
    const router = useRouter();
    const searchParams = reactive<{
      pageNumber: number;
      pageSize: number;
      total: number;
      keyword: string;
      status: WorkStatus | "";
    }>({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      status: "",
    });

    const go = (name: string, work: FumigationWork, mode?: "view" | "approve"): void => {
      if (name === "fumigation-approval" && mode != null) {
        persistApprovalDetailMode(work.id, mode);
      }
      void router.push({
        name,
        query: {
          workId: work.id,
          ...(name === "fumigation-approval" && mode != null ? { mode } : {}),
        },
      });
    };

    const columns: ColumnType<FumigationWork>[] = [
      {
        title: "工单编号",
        dataIndex: "code",
        width: 160,
        fixed: "left",
        customRender: ({ record }: { record: FumigationWork }) => (
          <Button type="link" class="fumigation-code-link" onClick={() => go("fumigation-approval", record, "view")}>
            {record.code || record.id}
          </Button>
        ),
      },
      {
        title: "仓房",
        dataIndex: "warehouseCode",
        width: 110,
        customRender: ({ record }: { record: FumigationWork }) => getWarehouseDisplayName(record),
      },
      {
        title: "品种",
        dataIndex: "grainVarietyName",
        width: 90,
        customRender: ({ record }: { record: FumigationWork }) => record.grainVarietyName || "--",
      },
      {
        title: "药剂",
        dataIndex: "pesticideTypeName",
        width: 100,
        customRender: ({ record }: { record: FumigationWork }) => getPesticideDisplayName(record),
      },
      {
        title: "申请人",
        dataIndex: "applicantName",
        width: 90,
        customRender: ({ record }: { record: FumigationWork }) => record.applicantName || "--",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 110,
        customRender: ({ record }: { record: FumigationWork }) => <StatusTag status={record.status} />,
      },
      {
        title: "审批",
        dataIndex: "approvalRecords",
        width: 70,
        align: "center",
        customRender: ({ record }: { record: FumigationWork }) => getApprovalProgress(record),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 220,
        fixed: "right",
        className: "fumigation-action-column",
        customRender: ({ record }: { record: FumigationWork }) => (
          <Space size={4} class="fumigation-table-actions">
            <Button type="link" size="small" onClick={() => go("fumigation-approval", record, "view")}>
              查看
            </Button>
            {isWorkApprovalPending(record.status) ? (
              <Button type="link" size="small" onClick={() => go("fumigation-approval", record, "approve")}>
                审批
              </Button>
            ) : null}
            {canRecheck(record.status) ? (
              <Button type="link" size="small" onClick={() => go("fumigation-precheck", record)}>
                重新校验
              </Button>
            ) : null}
            {canViewCheck(record.status) ? (
              <Button type="link" size="small" onClick={() => go("fumigation-precheck", record)}>
                查看校验
              </Button>
            ) : null}
            {canEnterMonitorBoard(record) ? (
              <Button type="link" size="small" onClick={() => go("fumigation-monitor", record)}>
                监护
              </Button>
            ) : null}
            {canArchive(record.status) ? (
              <Button type="link" size="small" onClick={() => go("fumigation-archive", record)}>
                档案
              </Button>
            ) : null}
          </Space>
        ),
      },
    ];

    const [CubeTable, tableApi] = useCubeTable({
      columns,
      rowKey: "id",
      customRow: (record) => ({
        class: (record as FumigationWork).status === "CHECK_FAILED" ? "fumigation-row-locked" : "",
      }),
      fetchApi: async () => {
        try {
          const resp = await listFumigationWorks({
            pageNumber: searchParams.pageNumber,
            pageSize: searchParams.pageSize,
            keyword: searchParams.keyword,
            status: searchParams.status,
          });
          const records = resp.records as FumigationWork[];
          replaceFumigationWorks(records);
          return { ...resp, records };
        } catch (error) {
          message.error((error as Error).message || "获取熏蒸作业列表失败");
          replaceFumigationWorks([]);
          return { records: [], pages: 0, total: 0 };
        }
      },
      fetchLoaded: (data) => {
        searchParams.total = data.total;
      },
    });

    const [CubeForm] = useCubeForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键词",
          componentProps: {
            placeholder: "搜索工单编号、仓房、申请人",
            allowClear: true,
          },
        },
        {
          component: "Select",
          fieldName: "status",
          label: "状态",
          defaultValue: "",
          componentProps: {
            options: statusOptions,
          },
        },
      ],
      handleSubmit: (values) => {
        searchParams.keyword = (values.keyword as string | undefined)?.trim() ?? "";
        searchParams.status = (values.status as WorkStatus | "" | undefined) ?? "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.keyword = "";
        searchParams.status = "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
    });

    const handlePageChange = (nextPage: number, nextPageSize: number): void => {
      searchParams.pageNumber = nextPage;
      searchParams.pageSize = nextPageSize;
      tableApi.query();
    };

    return (): JSX.Element => (
      <CubeLayout
        title="作业列表"
        v-slots={{
          "layout-header": () => (
            <Button
              type="primary"
              onClick={() => {
                void router.push({ name: "fumigation-work-create" });
              }}
            >
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              <CubeForm />
              <CubeTable />
            </>
          ),
          "footer-page": () => (
            <Page
              current={searchParams.pageNumber}
              pageSize={searchParams.pageSize}
              total={searchParams.total}
              showQuickJumper={false}
              showSizeChanger
              showTotal={(total: number): string => `共 ${total} 条数据`}
              pageSizeOptions={["10", "20", "50", "100"]}
              onPageChange={handlePageChange}
              onShowSizeChange={handlePageChange}
            />
          ),
        }}
      />
    );
  },
});
