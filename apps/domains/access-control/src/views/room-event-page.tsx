import type { AccessControlClient } from "@g2-contract/access-control";
import { defineComponent, inject, reactive } from "vue";

import { DOMAIN_CONTEXT_KEY } from "../domain-context";
import { getAccessControlPcUi } from "../domain-context";
import { formatDateTime, formatRangeBound } from "./datetime";
import { normalizeDevicePage } from "./device-actions";
import { defineAsyncAccessPcUiComponent } from "./pc-ui-runtime";

const PopOver = defineAsyncAccessPcUiComponent("PopOver");
const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "RoomEventPage",
  setup: () => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    if (!ctx) {
      throw new Error("RoomEventPage requires DomainContext");
    }
    const { Page, usePcForm, usePcTable } = getAccessControlPcUi();
    const PageLayout = defineAsyncAccessPcUiComponent("PageLayout");

    const search = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      startTime: "",
      endTime: "",
    });

    const client = async (): Promise<AccessControlClient> => ctx.ensureClient<AccessControlClient>("accessControlClient");

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "ROOM_EVENT",
      columns: [
        {
          title: "时间",
          dataIndex: "eventTime",
          width: 180,
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(formatDateTime(text)),
        },
        {
          title: "门禁名称",
          dataIndex: "doorName",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "异常事件描述",
          // 源码 dataIndex 为 eventType（数字码）；线上别名列展示 eventName。无别名插件时优先 eventName。
          dataIndex: "eventName",
          ellipsis: true,
          customRender: ({ text, record }: { text: unknown; record: Record<string, unknown> }) => textCell(text || record?.eventType),
        },
      ],
      fetchApi: async () => {
        const api = await client();
        const result = await api.getAbnormalEvent({
          pageNumber: search.pageNumber,
          pageSize: search.pageSize,
          keyword: search.keyword,
          startTime: search.startTime,
          endTime: search.endTime,
        });
        return normalizeDevicePage(result);
      },
      fetchLoaded: (data) => {
        search.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "门禁名称",
          defaultValue: "",
          componentProps: { placeholder: "请输入门禁名称搜索", allowClear: true },
        },
        {
          component: "DateRangePicker",
          fieldName: "date",
          label: "时间范围",
          componentProps: { showTime: true },
        },
      ],
      handleSubmit: (values) => {
        const date = (values.date || []) as unknown[];
        search.keyword = String(values.keyword || "");
        search.startTime = formatRangeBound(date[0]);
        search.endTime = formatRangeBound(date[1]);
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.startTime = "";
        search.endTime = "";
        search.pageNumber = 1;
        tableApi.query();
      },
    });

    const slots = {
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
          showQuickJumper={false}
          showSizeChanger
          showTotal={(total: number) => `共 ${total} 条`}
          pageSizeOptions={["10", "20", "50", "100"]}
          onPageChange={(pageNumber: number, pageSize: number) => {
            search.pageNumber = pageNumber;
            search.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title="异常事件" v-slots={slots} />;
  },
});
