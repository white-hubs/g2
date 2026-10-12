import { Button, Page, PageLayout, PopOver, Space, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onMounted, reactive, ref } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import {
  buildAlarmConfigEditorNavigateParams,
  buildAlarmConfigListQuery,
  formatDisableDuration,
  formatDuration,
} from "./alarm-config-list.model";
import DisableRuleModal, { type DisableRulePayload } from "./components/disable-rule-modal";
import { normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

interface LevelOption {
  label: string;
  value: string;
}

function asLevelOptions(raw: unknown): LevelOption[] {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (Array.isArray(root) ? root : root.data || root.records || root.list || []) as unknown[];
  return list
    .map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const value = String(row.id ?? row.value ?? "");
      const label = String(row.label ?? row.name ?? row.alarmLevelName ?? value);
      return value ? { label, value } : null;
    })
    .filter((item): item is LevelOption => Boolean(item));
}

export default defineComponent({
  name: "GemAlarmConfigList",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "报警配置" },
  },
  setup(props) {
    const applicationCode = () => props.applicationCode.trim();
    const search = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      alarmLevelId: "",
    });
    const levelSelectProps = reactive({
      placeholder: "请选择报警级别",
      allowClear: true,
      style: { minWidth: 160 },
      options: [] as LevelOption[],
    });
    const disableModalRef = ref<{ openModal: (record: { id?: unknown }) => void } | null>(null);

    const navigateEditor = (mode: "add" | "edit" | "detail" | "copy", id?: string) => {
      props.onNavigatePage({
        page: GEM_PAGE_KEYS.alarmConfigureAdd,
        params: buildAlarmConfigEditorNavigateParams(mode, id),
      });
    };

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "alarm-config-list",
      columns: [
        {
          title: "预警规则名称",
          dataIndex: "name",
          fixed: "left",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "报警级别",
          dataIndex: "alarmLevelName",
          align: "center",
          width: 100,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "去重周期",
          dataIndex: "repeatTime",
          align: "center",
          width: 120,
          customRender: ({ record }: { record: Record<string, unknown> }) =>
            textCell(formatDuration(record.repeatTime, record.repeatTimeUnit)),
        },
        {
          title: "处理时限",
          dataIndex: "estimatedHandlerTime",
          align: "center",
          width: 120,
          customRender: ({ record }: { record: Record<string, unknown> }) =>
            textCell(formatDuration(record.estimatedHandlerTime, record.estimatedHandlerUnit)),
        },
        {
          title: "状态",
          dataIndex: "enabled",
          align: "center",
          width: 100,
          customRender: ({ record }: { record: Record<string, unknown> }) =>
            record.enabled ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
        },
        {
          title: "禁用时长",
          dataIndex: "disableDuration",
          align: "center",
          width: 120,
          customRender: ({ text }: { text: unknown }) => textCell(formatDisableDuration(text) || "--"),
        },
        {
          title: "说明",
          dataIndex: "remark",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "操作",
          dataIndex: "action",
          fixed: "right",
          width: 280,
          customRender: ({ record }: { record: Record<string, unknown> }) => (
            <Space size={0}>
              <Button type="link" onClick={() => navigateEditor("detail", String(record.id || ""))}>
                详情
              </Button>
              <Button type="link" onClick={() => navigateEditor("edit", String(record.id || ""))}>
                编辑
              </Button>
              <Button type="link" onClick={() => navigateEditor("copy", String(record.id || ""))}>
                复制
              </Button>
              {record.enabled ? (
                <Button type="link" danger onClick={() => disableModalRef.value?.openModal(record)}>
                  禁用规则
                </Button>
              ) : (
                <Button type="link" onClick={() => void enableRule(record)}>
                  启用规则
                </Button>
              )}
              <Button type="link" danger onClick={() => void deleteRule(record)}>
                删除
              </Button>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        const code = applicationCode();
        if (!code) {
          throw new Error("applicationCode is required from host Domain config");
        }
        const client = await props.getAlarmClient!();
        return normalizeAlarmPage(
          await client.getEmergencyRulesPage(
            buildAlarmConfigListQuery({
              pageNumber: search.pageNumber,
              pageSize: search.pageSize,
              applicationCode: code,
              keyword: search.keyword,
              alarmLevelId: search.alarmLevelId,
            }),
          ),
        );
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
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入规则名称", allowClear: true },
        },
        {
          component: "Select",
          fieldName: "alarmLevelId",
          label: "报警级别",
          defaultValue: undefined,
          componentProps: levelSelectProps,
        },
      ],
      handleSubmit: (values) => {
        search.keyword = String(values.keyword || "");
        search.alarmLevelId = String(values.alarmLevelId || "");
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.alarmLevelId = "";
        search.pageNumber = 1;
        tableApi.query();
      },
    });

    async function enableRule(record: Record<string, unknown>): Promise<void> {
      try {
        const client = await props.getAlarmClient!();
        await client.setEmergencyRuleEnabled({ id: record.id, enabled: true });
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "操作失败");
      }
    }

    async function deleteRule(record: Record<string, unknown>): Promise<void> {
      try {
        const client = await props.getAlarmClient!();
        await client.deleteEmergencyRule(record.id);
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "删除失败");
      }
    }

    async function onDisableOk(payload: DisableRulePayload): Promise<void> {
      try {
        const client = await props.getAlarmClient!();
        await client.setEmergencyRuleEnabled(payload);
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "操作失败");
      }
    }

    onMounted(async () => {
      try {
        const client = await props.getAlarmClient!();
        levelSelectProps.options = asLevelOptions(await client.getAlarmLevels({}));
      } catch {
        levelSelectProps.options = [];
      }
    });

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => navigateEditor("add")}>
          新 增
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
          <DisableRuleModal ref={disableModalRef} onOk={(payload) => void onDisableOk(payload)} />
        </>
      ),
      "footer-page": () => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
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

    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
