import type { RenovationTicket, RenovationTicketQuery } from "@g2-client/renovation/client";
import {
  Button,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  RadioGroup,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive } from "vue";
import { useRouter } from "vue-router";

import { getRenovationClient, getRenovationRuntime } from "@/domain-context";
import { formatDateTime } from "@/utils/date";

import styles from "./renovation-order-list.module.css";

const STATUS_TABS = [
  { value: "all", label: "所有" },
  { value: "WAITING_HANDLE", label: "待处理" },
  { value: "COMPLETED", label: "已完成" },
];

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

const statusCell = (text: unknown): JSX.Element | string => {
  const value = String(text ?? "");
  if (!value) {
    return "--";
  }
  const waiting = value === "WAITING_HANDLE";
  return (
    <span class={styles.statusDot}>
      <i class={waiting ? styles.dotAudit : styles.dotNormal} />
      {waiting ? "待处理" : "已完成"}
    </span>
  );
};

export const RenovationOrderList = defineComponent({
  name: "RenovationOrderList",
  setup() {
    const client = getRenovationClient();
    const { basePath } = getRenovationRuntime();
    const router = useRouter();
    const title = "更新改造工单";
    const query = reactive({
      retrofitTicketStatus: "all",
      dateRange: undefined as string[] | undefined,
      keyword: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let version = 0;

    const openDetails = (row: RenovationTicket): void => {
      void router.push({ path: `${basePath}/renovation-order-details`, query: { id: String(row.id ?? ""), type: "detail" } });
    };

    const periodParam = (): string | undefined => {
      if (query.dateRange?.length !== 2) {
        return undefined;
      }
      return `${query.dateRange[0]} 00:00:00,${query.dateRange[1]} 23:59:59`;
    };

    const makeQuery = (): RenovationTicketQuery => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      ...(query.retrofitTicketStatus === "all" ? {} : { retrofitTicketStatus: query.retrofitTicketStatus }),
      ...(query.keyword ? { keyword: query.keyword } : {}),
      ...(periodParam() ? { period: periodParam() } : {}),
    });

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pageTickets(makeQuery());
        if (current !== version) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : `${title}加载失败`);
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const removeTicket = async (row: RenovationTicket): Promise<void> => {
      try {
        await client.deleteTicket(String(row.id ?? ""));
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      }
    };

    const columns: PcTableColumn[] = [
      { title: "工单编号", dataIndex: "code", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "改造对象", dataIndex: "retrofitObjectName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "期望解决时间",
        dataIndex: "expectSolveDate",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(formatDateTime(text as string | number | undefined)),
      },
      {
        title: "工单时间",
        dataIndex: "createTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(formatDateTime(text as string | number | undefined)),
      },
      { title: "状态", dataIndex: "status", ellipsis: true, customRender: ({ text }) => statusCell(text) },
      { title: "处理结果", dataIndex: "handleResultStatusName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 140,
        fixed: "right",
        customRender: ({ record }) => {
          const row = record as RenovationTicket;
          return (
            <>
              <Button type="link" onClick={() => openDetails(row)}>
                详情
              </Button>
              <PopConfirm title="确定删除该工单吗？" okText="确定" cancelText="取消" onConfirm={() => void removeTicket(row)}>
                <Button type="link" danger>
                  删除
                </Button>
              </PopConfirm>
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "RENOVATION_ORDER_LIST", rowKey: "id", autoFetch: false });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: true,
      cacheFields: ["retrofitTicketStatus", "dateRange", "keyword"],
      syncStateRef: query,
      schema: [
        {
          component: markRaw(RadioGroup),
          fieldName: "retrofitTicketStatus",
          label: "",
          defaultValue: "all",
          componentProps: { buttonStyle: "solid", optionType: "button", options: STATUS_TABS },
        },
        {
          component: "RangePicker",
          fieldName: "dateRange",
          label: "工单时间",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", placeholder: ["开始时间", "结束时间"] },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "设备名称" },
        },
      ],
      handleValuesChange(_values, _changed, meta) {
        if (meta?.fieldName !== "retrofitTicketStatus") {
          return;
        }
        query.retrofitTicketStatus = String(_values.retrofitTicketStatus ?? "all");
        page.pageNumber = 1;
        void load();
      },
      handleSubmit(values) {
        query.retrofitTicketStatus = String(values.retrofitTicketStatus ?? "all");
        query.dateRange = Array.isArray(values.dateRange) ? values.dateRange.map(String) : undefined;
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.retrofitTicketStatus = "all";
        query.dateRange = undefined;
        query.keyword = "";
        page.pageNumber = 1;
        void load();
      },
    });

    void load();

    const slots = {
      "layout-content": () => (
        <>
          <div class={styles.filterForm}>
            <PcForm />
          </div>
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            void load();
          }}
        />
      ),
    };

    return () => <PageLayout title={title} v-slots={slots} />;
  },
});
