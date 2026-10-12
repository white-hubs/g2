import { Page, PageLayout, PopOver, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, type PropType } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import { normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "GemAlarmConfigEnergyList",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    title: { type: String, default: "能源报警配置" },
  },
  setup(props) {
    const search = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "GEM_ALARM_CONFIG_ENERGY",
      columns: [
        { title: "规则名称", dataIndex: "name", ellipsis: true, customRender: ({ text }: { text: unknown }) => textCell(text) },
        { title: "状态", dataIndex: "statusName", width: 100, customRender: ({ text }: { text: unknown }) => textCell(text) },
        {
          title: "操作",
          dataIndex: "action",
          fixed: "right",
          width: 100,
          customRender: ({ record }: { record: Record<string, unknown> }) => (
            <a
              onClick={(e) => {
                e.preventDefault();
                props.onNavigatePage({
                  page: GEM_PAGE_KEYS.alarmConfigureAdd,
                  params: { id: String(record.id || "") },
                });
              }}
            >
              编辑
            </a>
          ),
        },
      ],
      fetchApi: async () => {
        const client = await props.getAlarmClient!();
        return normalizeAlarmPage(await client.getEnergyAlarmRulesPage({ pageNumber: search.pageNumber, pageSize: search.pageSize }));
      },
      fetchLoaded: (data) => {
        search.total = data.total;
      },
    });

    const slots = {
      "layout-content": () => (
        <>
          <button
            type="button"
            style={{ marginBottom: "12px" }}
            onClick={() => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmConfigureAdd })}
          >
            新增规则
          </button>
          <PcTable />
        </>
      ),
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
