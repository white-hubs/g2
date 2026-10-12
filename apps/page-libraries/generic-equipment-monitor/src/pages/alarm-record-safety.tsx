import { Page, PageLayout, PopOver, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, type PropType } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import { formatAlarmTime, normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "GemAlarmRecordSafety",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    title: { type: String, default: "安全报警记录" },
  },
  setup(props) {
    const search = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "GEM_ALARM_SAFETY",
      columns: [
        {
          title: "报警时间",
          dataIndex: "alarmTime",
          width: 180,
          customRender: ({ text }: { text: unknown }) => textCell(formatAlarmTime(text)),
        },
        { title: "类型", dataIndex: "alarmTypeName", width: 120, customRender: ({ text }: { text: unknown }) => textCell(text) },
        { title: "描述", dataIndex: "alarmContent", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        {
          title: "操作",
          dataIndex: "action",
          fixed: "right",
          width: 100,
          customRender: ({ record }: { record: Record<string, unknown> }) => (
            <a
              onClick={(e) => {
                e.preventDefault();
                props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmSafetyDetail, params: { id: String(record.id || "") } });
              }}
            >
              详情
            </a>
          ),
        },
      ],
      fetchApi: async () => {
        const client = await props.getAlarmClient!();
        return normalizeAlarmPage(await client.getAlarmSafetyRecords({ pageNumber: search.pageNumber, pageSize: search.pageSize }));
      },
      fetchLoaded: (data) => {
        search.total = data.total;
      },
    });

    const slots = {
      "layout-content": () => <PcTable />,
      "footer-page": () => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
          showSizeChanger
          onPageChange={(pageNumber: number, pageSize: number) => {
            search.pageNumber = pageNumber;
            search.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
