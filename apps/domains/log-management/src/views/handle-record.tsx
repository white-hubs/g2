import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLogClient } from "../domain-context";
import { dayjs, message, Page, PageLayout, PopOver, usePcForm, usePcTable, type PcTableColumn } from "../pc-ui-runtime";

interface LogRecord {
  id?: number | string;
  userName?: string;
  createTime?: string;
  url?: string;
  method?: string;
  statusCode?: string | number;
  parameters?: string;
  result?: string;
}

const display = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const cell = (value: unknown) => <PopOver content={display(value)}>{display(value)}</PopOver>;
const methodLabel = (value: unknown): string => {
  const raw = display(value);
  return ["GET", "POST", "PUT", "DELETE"].find((method) => raw.includes(method)) ?? "--";
};
const resultLabel = (value: unknown): string => {
  const raw = display(value);
  return raw.includes("OK") ? "成功" : raw.includes("FAIL") ? "失败" : "--";
};

export const HandleRecord = defineComponent({
  name: "LogManagementHandleRecord",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const monthPeriod = [dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().endOf("month").format("YYYY-MM-DD")];
    const query = reactive({
      period: [...monthPeriod],
      userName: "",
      method: undefined as string | undefined,
      result: undefined as string | undefined,
    });
    const pageNumber = Number(route.query.pageNumber);
    const pageSize = Number(route.query.pageSize);
    const page = reactive({
      pageNumber: Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
      pageSize: Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10,
      total: 0,
    });
    let version = 0;
    const columns: PcTableColumn[] = [
      { title: "操作人", dataIndex: "userName", width: 120, ellipsis: true, customRender: ({ text }) => cell(text) },
      {
        title: "操作时间",
        dataIndex: "createTime",
        width: 120,
        ellipsis: true,
        customRender: ({ text }) => cell(text ? dayjs(text as string).format("YYYY-MM-DD HH:mm:ss") : "--"),
      },
      { title: "请求地址", dataIndex: "url", width: 240, ellipsis: true, customRender: ({ text }) => cell(text) },
      { title: "请求方式", dataIndex: "method", width: 90, ellipsis: true, customRender: ({ text }) => cell(methodLabel(text)) },
      { title: "请求状态码", dataIndex: "statusCode", width: 90, ellipsis: true, customRender: ({ text }) => cell(text) },
      { title: "请求参数", dataIndex: "parameters", width: 240, ellipsis: true, customRender: ({ text }) => cell(text) },
      { title: "请求结果", dataIndex: "result", width: 120, ellipsis: true, customRender: ({ text }) => cell(resultLabel(text)) },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "d/log-management/handle-record",
      pagination: false,
      autoFetch: false,
    });
    async function load(): Promise<void> {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const response = await getLogClient().pageOperationLogs({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          period: query.period.join(","),
          userName: query.userName || undefined,
          method: query.method,
          result: query.result,
        });
        const data = response && typeof response === "object" && "data" in response ? response.data : response;
        if (!data || typeof data !== "object" || !("records" in data) || !Array.isArray(data.records))
          throw new Error("日志列表响应格式错误");
        const result = data as { records: LogRecord[]; total?: number };
        if (current === version) {
          tableApi.setDataSource(result.records);
          page.total = Number(result.total ?? 0);
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "操作日志加载失败");
      } finally {
        if (current === version) tableApi.loading.value = false;
      }
    }
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "RangePicker",
          fieldName: "period",
          label: "时间范围",
          defaultValue: monthPeriod,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
        },
        {
          component: "Select",
          fieldName: "result",
          label: "请求结果",
          defaultValue: undefined,
          componentProps: {
            options: [
              { value: "OK", label: "成功" },
              { value: "FAIL", label: "失败" },
            ],
            placeholder: "请选择请求结果",
            allowClear: true,
          },
        },
        {
          component: "Select",
          fieldName: "method",
          label: "请求方式",
          defaultValue: undefined,
          componentProps: {
            options: ["GET", "POST", "PUT", "DELETE"].map((value) => ({ value, label: value })),
            placeholder: "请选择请求方式",
            allowClear: true,
          },
        },
        {
          component: "Input",
          fieldName: "userName",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入操作人名称", allowClear: true },
        },
      ],
      handleSubmit: () => {
        page.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        query.period = [...monthPeriod];
        query.userName = "";
        query.method = undefined;
        query.result = undefined;
        page.pageNumber = 1;
        page.pageSize = 10;
        void router.replace({ query: {} });
        void load();
      },
    });
    void load();
    const slots = {
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => <PageLayout title="操作日志记录" v-slots={slots} />;
  },
});
