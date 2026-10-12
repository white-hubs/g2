import type { LossStatistic } from "@g2-contract/line-loss-management";
import { Page, PageLayout, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { defineComponent, reactive } from "vue";

import { useLineLossClient } from "../api";

function text(value: unknown) {
  const display = value === undefined || value === null || value === "" ? "--" : String(value);
  return <PopOver content={display === "--" ? "" : display}>{display}</PopOver>;
}

export default defineComponent({
  name: "LineLossStatistics",
  setup() {
    const client = useLineLossClient();
    const query = reactive({ pageNumber: 1, pageSize: 10, total: 0, keyword: "", period: [] as string[] });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "lineId",
      tableCode: "LINE_LOSS_STATISTICS",
      columns: [
        { title: "线路ID", dataIndex: "lineId", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "线路名称", dataIndex: "lineName", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "起点", dataIndex: "fromNodeName", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "终点", dataIndex: "toNodeName", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "起点位置",
          dataIndex: "fromNodeLocation",
          align: "center",
          ellipsis: true,
          customRender: ({ text: value }) => text(value),
        },
        { title: "终点位置", dataIndex: "toNodeLocation", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "计量设备", dataIndex: "deviceName", align: "center", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "输入电量(kWh)", dataIndex: "inputEnergy", align: "center", customRender: ({ text: value }) => text(value) },
        { title: "输出电量(kWh)", dataIndex: "outputEnergy", align: "center", customRender: ({ text: value }) => text(value) },
        { title: "设备损耗(kWh)", dataIndex: "lossEnergy", align: "center", customRender: ({ text: value }) => text(value) },
        {
          title: "设备线损率(%)",
          dataIndex: "lossRate",
          align: "center",
          customRender: ({ text: value }) => {
            if (value === undefined || value === null || value === "") {
              return text(value);
            }
            const numberValue = Number(value);
            return text(Number.isNaN(numberValue) ? value : numberValue * 100);
          },
        },
        {
          title: "收集时间",
          dataIndex: "collectTime",
          align: "center",
          width: 180,
          customRender: ({ text: value }) => text(value ? dayjs(value as string | number).format("YYYY-MM-DD HH:mm:ss") : value),
        },
      ],
      fetchApi: async () => {
        try {
          const api = await client();
          const [start, end] = query.period;
          const result = await api.getLossStatistics({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            startTime: start ? `${start} 00:00:00` : "",
            endTime: end ? `${end} 23:59:59` : "",
            lineName: query.keyword,
          });
          return { total: result.total ?? 0, pages: result.pages ?? 0, records: (result.records ?? []) as LossStatistic[] };
        } catch (error) {
          message.error(error instanceof Error ? error.message : "损耗统计加载失败");
          return { total: 0, pages: 0, records: [] as LossStatistic[] };
        }
      },
      fetchLoaded: (result) => {
        query.total = result.total;
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: true,
      syncStateRef: query,
      schema: [
        {
          component: "RangePicker",
          label: "时间范围",
          fieldName: "period",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "线路名称", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        query.period = (values.period as string[] | undefined) ?? [];
        query.keyword = String(values.keyword ?? "");
        query.pageNumber = 1;
        void tableApi.query();
      },
      handleReset: () => {
        query.period = [];
        query.keyword = "";
        query.pageNumber = 1;
        void tableApi.query();
      },
    });
    return () => (
      <PageLayout
        title="损耗统计"
        v-slots={{
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
            </>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              cachePageQuery
              onPageChange={(page: number, size: number) => {
                query.pageNumber = page;
                query.pageSize = size;
                void tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
