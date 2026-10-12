import { Button, Page, PageLayout, PopOver, Popconfirm, Space, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onMounted, reactive, ref } from "vue";

import { hasCapability } from "../capability";
import { GEM_ACTION_KEYS, GEM_PAGE_KEYS } from "../page-keys";
import {
  ALARM_OVERTIME_OPTIONS,
  ALARM_RESULT_OPTIONS,
  ALARM_STATUS_OPTIONS,
  buildAlarmRecordListQuery,
  canAssignOrHandle,
  canSuspend,
  formatHandlerResult,
} from "./alarm-record.model";
import AlarmAssignUsersModal, { type AssignUserRow } from "./components/alarm-assign-users-modal";
import AlarmHandleModal, { type AlarmHandlePayload } from "./components/alarm-handle-modal";
import AlarmSuspendModal from "./components/alarm-suspend-modal";
import { formatAlarmTime, normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

const LEVEL_COLOR: Record<string, string> = {
  一级: "var(--g2-color-danger, #ff4d4f)",
  二级: "var(--g2-color-warning, #fa8c16)",
  三级: "var(--g2-color-warning, #fa8c16)",
  四级: "var(--g2-color-info, #1677ff)",
};

const STATUS_COLOR: Record<string, string> = {
  已挂起: "var(--g2-color-info, #1677ff)",
  待接收: "var(--g2-color-danger, #ff4d4f)",
  待确认: "var(--g2-color-danger, #ff4d4f)",
  处理中: "var(--g2-color-warning, #fa8c16)",
  已关闭: "var(--g2-color-text-tertiary, #8c8c8c)",
  已处理: "var(--g2-color-success, #52c41a)",
  超时: "var(--g2-color-danger, #ff4d4f)",
  正常: "var(--g2-color-success, #52c41a)",
};

interface LevelOption {
  label: string;
  value: string;
}

function asInitialQuery(raw: Record<string, unknown>): Record<string, unknown> {
  const searchValue = raw.searchValue;
  if (typeof searchValue !== "string" || !searchValue || searchValue === "undefined") {
    return raw;
  }
  try {
    const parsed = JSON.parse(searchValue);
    return parsed && typeof parsed === "object" ? { ...raw, ...(parsed as Record<string, unknown>) } : raw;
  } catch {
    return raw;
  }
}

function formatDateLike(value: unknown): string {
  if (!value) {
    return "";
  }
  const formatter = (value as { format?: (format: string) => string }).format;
  if (typeof formatter === "function") {
    return formatter.call(value, "YYYY-MM-DD HH:mm:ss");
  }
  return String(value);
}

function downloadExport(raw: unknown, filename: string): void {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data = root.data ?? raw;
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function asLevelOptions(raw: unknown): LevelOption[] {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (Array.isArray(raw) ? raw : root.data || root.records || root.list || []) as unknown[];
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
  name: "GemAlarmRecord",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<GemPageProps["getOuaaClient"]> },
    getFileClient: { type: Function as PropType<GemPageProps["getFileClient"]> },
    getDictionaryClient: { type: Function as PropType<GemPageProps["getDictionaryClient"]> },
    title: { type: String, default: "报警记录" },
    applicationCode: { type: String, default: "" },
    /** Host statistics pages can prefill drill-down filters without coupling this shared page to vue-router. */
    initialQuery: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const initialQuery = asInitialQuery(props.initialQuery);
    const applicationCode = () => props.applicationCode.trim();
    const search = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: String(initialQuery.keyword ?? initialQuery.alarmEventName ?? initialQuery.userName ?? ""),
      alarmLevelId: String(initialQuery.alarmLevelId ?? ""),
      alarmStatus: String(initialQuery.alarmStatus ?? ""),
      alarmHandlerResult: String(initialQuery.alarmHandlerResult ?? ""),
      alarmHandlerTimeoutStatus: String(initialQuery.alarmHandlerTimeoutStatus ?? ""),
      startTime: String(initialQuery.startTime ?? (String(initialQuery.period ?? "").split(",")[0] || "")),
      endTime: String(initialQuery.endTime ?? (String(initialQuery.period ?? "").split(",")[1] || "")),
    });
    const levelSelectProps = reactive({
      placeholder: "请选择报警级别",
      allowClear: true,
      style: { minWidth: 140 },
      options: [] as LevelOption[],
    });
    const selectedRows = ref<Record<string, unknown>[]>([]);
    const currentRecord = ref<Record<string, unknown> | null>(null);
    const handleModalRef = ref<{ open: () => void } | null>(null);
    const batchHandleModalRef = ref<{ open: () => void } | null>(null);
    const suspendModalRef = ref<{ open: () => void } | null>(null);
    const assignModalRef = ref<{ open: () => void } | null>(null);
    const batchDeleteLoading = ref(false);
    const exportLoading = ref(false);

    const can = (action: (typeof GEM_ACTION_KEYS)[keyof typeof GEM_ACTION_KEYS]) =>
      hasCapability(props.codes, props.functionCodes, "action", action);

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "alarm-record-list",
      rowSelection: "checkbox",
      rowSelectionChange: (_keys, rows) => {
        selectedRows.value = (rows || []) as Record<string, unknown>[];
      },
      columns: [
        {
          title: "报警事件",
          dataIndex: "alarmEventName",
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "报警级别",
          dataIndex: "alarmLevelName",
          width: 80,
          align: "center",
          customRender: ({ text }: { text: unknown }) => (
            <span style={{ color: LEVEL_COLOR[String(text)] || undefined }}>{String(text || "--")}</span>
          ),
        },
        {
          title: "报警区域",
          dataIndex: "areaName",
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "详细位置",
          dataIndex: "alarmTargetAddress",
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "报警时间",
          dataIndex: "alarmTime",
          align: "center",
          width: 200,
          customRender: ({ text }: { text: unknown }) => textCell(formatAlarmTime(text)),
        },
        {
          title: "报警设备",
          dataIndex: "alarmTargetName",
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "处理时限",
          dataIndex: "timeoutProcessTimesName",
          width: 100,
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "超时状态",
          dataIndex: "alarmHandlerTimeoutStatusName",
          width: 80,
          align: "center",
          customRender: ({ text }: { text: unknown }) => (
            <span style={{ color: STATUS_COLOR[String(text)] || undefined }}>{String(text || "--")}</span>
          ),
        },
        {
          title: "处理状态",
          dataIndex: "alarmStatusName",
          width: 100,
          align: "center",
          customRender: ({ text }: { text: unknown }) => (
            <span style={{ color: STATUS_COLOR[String(text)] || undefined }}>{String(text || "--")}</span>
          ),
        },
        {
          title: "处理结果",
          dataIndex: "alarmHandlerResult",
          width: 100,
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(formatHandlerResult(text)),
        },
        {
          title: "处理人",
          dataIndex: "alarmHandlerName",
          width: 100,
          align: "center",
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          title: "操作",
          dataIndex: "action",
          fixed: "right",
          width: 220,
          customRender: ({ record }: { record: Record<string, unknown> }) => {
            // 旧报警接口可能只提供 alarmStatusName，因此这里优先读取枚举值，缺失时回退展示值。
            const alarmStatus = record.alarmStatus ?? record.alarmStatusName;
            return (
              <Space size={0}>
                <Button
                  type="link"
                  onClick={() =>
                    props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmDetail, params: { id: String(record.businessKey || record.id || "") } })
                  }
                >
                  详情
                </Button>
                {canAssignOrHandle(alarmStatus) ? (
                  <Button
                    type="link"
                    onClick={() => {
                      currentRecord.value = record;
                      assignModalRef.value?.open();
                    }}
                  >
                    指派
                  </Button>
                ) : null}
                {canSuspend(alarmStatus) ? (
                  <Button
                    type="link"
                    onClick={() => {
                      currentRecord.value = record;
                      suspendModalRef.value?.open();
                    }}
                  >
                    挂起
                  </Button>
                ) : null}
                {canAssignOrHandle(alarmStatus) ? (
                  <Button
                    type="link"
                    onClick={() => {
                      currentRecord.value = record;
                      handleModalRef.value?.open();
                    }}
                  >
                    处理
                  </Button>
                ) : null}
              </Space>
            );
          },
        },
      ],
      fetchApi: async () => {
        const code = applicationCode();
        if (!code) {
          throw new Error("applicationCode is required from host Domain config");
        }
        const client = await props.getAlarmClient!();
        return normalizeAlarmPage(await client.getAlarmRecordPage(currentQuery()));
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
          defaultValue: search.keyword,
          componentProps: { placeholder: "请输入设备名称/报警事件", allowClear: true, style: { width: 198 } },
        },
        {
          component: "Select",
          fieldName: "alarmLevelId",
          label: "报警级别",
          defaultValue: search.alarmLevelId || undefined,
          componentProps: levelSelectProps,
        },
        {
          component: "Select",
          fieldName: "alarmStatus",
          label: "处理状态",
          defaultValue: search.alarmStatus || undefined,
          componentProps: {
            placeholder: "请选择处理状态",
            allowClear: true,
            options: [...ALARM_STATUS_OPTIONS].filter((o) => o.value),
            style: { minWidth: 140 },
          },
        },
        {
          component: "Select",
          fieldName: "alarmHandlerResult",
          label: "处理结果",
          defaultValue: undefined,
          componentProps: {
            placeholder: "请选择处理结果",
            allowClear: true,
            options: [...ALARM_RESULT_OPTIONS],
            style: { minWidth: 140 },
          },
        },
        {
          component: "Select",
          fieldName: "alarmHandlerTimeoutStatus",
          label: "超时状态",
          defaultValue: search.alarmHandlerTimeoutStatus || undefined,
          componentProps: {
            placeholder: "请选择超时状态",
            allowClear: true,
            options: [...ALARM_OVERTIME_OPTIONS],
            style: { minWidth: 140 },
          },
        },
        {
          component: "DateRangePicker",
          fieldName: "date",
          label: "报警时间",
          componentProps: { showTime: true },
        },
      ],
      handleSubmit: (values) => {
        const date = (values.date || []) as unknown[];
        search.keyword = String(values.keyword || "");
        search.alarmLevelId = String(values.alarmLevelId || "");
        search.alarmStatus = String(values.alarmStatus || "");
        search.alarmHandlerResult = String(values.alarmHandlerResult || "");
        search.alarmHandlerTimeoutStatus = String(values.alarmHandlerTimeoutStatus || "");
        search.startTime = formatDateLike(date[0]);
        search.endTime = formatDateLike(date[1]);
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.alarmLevelId = "";
        search.alarmStatus = "";
        search.alarmHandlerResult = "";
        search.alarmHandlerTimeoutStatus = "";
        search.startTime = "";
        search.endTime = "";
        search.pageNumber = 1;
        tableApi.query();
      },
    });

    async function onAssignOk(users: AssignUserRow[]): Promise<void> {
      if (!currentRecord.value?.id || users.length === 0) {
        return;
      }
      try {
        const client = await props.getAlarmClient!();
        await client.assignAlarmRecord(currentRecord.value.id, { assignUsers: users });
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "指派失败");
      }
    }

    async function onHandleOk(payload: AlarmHandlePayload, batch: boolean): Promise<void> {
      try {
        const client = await props.getAlarmClient!();
        if (batch) {
          const ids = selectedRows.value.map((r) => r.id).filter(Boolean);
          if (ids.length === 0) {
            message.warning("请选择需要处理的报警记录");
            return;
          }
          if (!selectedRows.value.every((r) => canAssignOrHandle(r.alarmStatus ?? r.alarmStatusName))) {
            message.warning("只能选择待确认、处理中或已挂起的报警记录");
            return;
          }
          await client.batchHandleAlarmRecords({
            ids,
            alarmHandlerResult: payload.alarmHandlerResult,
            alarmHandlerResultRemark: payload.alarmHandlerResultRemark,
          });
        } else if (currentRecord.value?.id) {
          await client.handleAlarmRecord(currentRecord.value.id, payload);
        }
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "处理失败");
      }
    }

    async function onSuspendOk(payload: { remark: string; estimatedProcessTime?: string; fileVOS?: unknown[] }): Promise<void> {
      if (!currentRecord.value?.id) {
        return;
      }
      try {
        const client = await props.getAlarmClient!();
        await client.suspendAlarmRecord(currentRecord.value.id, payload);
        message.success("操作成功！");
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "挂起失败");
      }
    }

    function currentQuery(pageOverride?: Partial<typeof search>): Record<string, unknown> {
      return {
        ...buildAlarmRecordListQuery({
          pageNumber: pageOverride?.pageNumber ?? search.pageNumber,
          pageSize: pageOverride?.pageSize ?? search.pageSize,
          applicationCode: applicationCode(),
          keyword: search.keyword,
          alarmLevelId: search.alarmLevelId,
          alarmStatus: search.alarmStatus,
          alarmHandlerResult: search.alarmHandlerResult,
          alarmHandlerTimeoutStatus: search.alarmHandlerTimeoutStatus,
          startTime: search.startTime,
          endTime: search.endTime,
        }),
        alarmEvent: initialQuery.alarmEvent || undefined,
        userId: initialQuery.userId || undefined,
        departmentId: initialQuery.departmentId || undefined,
      };
    }

    async function exportAlarmRecords(): Promise<void> {
      exportLoading.value = true;
      try {
        const client = await props.getAlarmClient!();
        const raw = await client.exportAlarmRecords(currentQuery({ pageNumber: 1, pageSize: search.total || 99999 }));
        downloadExport(raw, "报警记录.xlsx");
      } catch (e) {
        message.error(e instanceof Error ? e.message : "导出失败");
      } finally {
        exportLoading.value = false;
      }
    }

    async function batchDelete(): Promise<void> {
      const ids = selectedRows.value.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) {
        message.warning("请选择需要删除的报警记录");
        return;
      }
      batchDeleteLoading.value = true;
      try {
        const client = await props.getAlarmClient!();
        await client.deleteAlarmRecords({ ids });
        message.success("操作成功！");
        selectedRows.value = [];
        tableApi.setSelectedRowKeys([]);
        tableApi.query();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "删除失败");
      } finally {
        batchDeleteLoading.value = false;
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

    const canBatchHandle = () =>
      selectedRows.value.length > 0 && selectedRows.value.every((r) => canAssignOrHandle(r.alarmStatus ?? r.alarmStatusName));

    const slots = {
      "layout-header": () => (
        <Space>
          {can(GEM_ACTION_KEYS.exportAlarm) ? (
            <Button loading={exportLoading.value} onClick={() => void exportAlarmRecords()}>
              导出
            </Button>
          ) : null}
          <Button type="primary" disabled={!canBatchHandle()} onClick={() => batchHandleModalRef.value?.open()}>
            批量处理
          </Button>
          {can(GEM_ACTION_KEYS.alarmRecordDelete) ? (
            selectedRows.value.length > 0 ? (
              <Popconfirm title="确定删除当前数据？" onConfirm={() => void batchDelete()}>
                <Button type="primary" danger loading={batchDeleteLoading.value}>
                  批量删除
                </Button>
              </Popconfirm>
            ) : (
              <Button type="primary" danger disabled>
                批量删除
              </Button>
            )
          ) : null}
        </Space>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
          <AlarmHandleModal
            ref={handleModalRef}
            applicationCode={applicationCode()}
            getAlarmClient={props.getAlarmClient}
            getFileClient={props.getFileClient}
            getDictionaryClient={props.getDictionaryClient}
            onOk={(p) => void onHandleOk(p, false)}
          />
          <AlarmHandleModal
            ref={batchHandleModalRef}
            batchMode
            applicationCode={applicationCode()}
            getAlarmClient={props.getAlarmClient}
            onOk={(p) => void onHandleOk(p, true)}
          />
          <AlarmSuspendModal ref={suspendModalRef} getFileClient={props.getFileClient} onOk={(payload) => void onSuspendOk(payload)} />
          <AlarmAssignUsersModal ref={assignModalRef} getOuaaClient={props.getOuaaClient} onOk={(users) => void onAssignOk(users)} />
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

    // AliasTable 已提供与表格内容同步的横向滚动条；此处再开启 PageLayout 的外置滚动条会重复渲染一条。
    return () => <PageLayout title={props.title} v-slots={slots} />;
  },
});
