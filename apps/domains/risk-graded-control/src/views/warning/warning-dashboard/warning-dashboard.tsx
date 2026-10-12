import dayjs from "dayjs";
import { defineComponent, reactive, ref } from "vue";

import { pageWarningRecords, patchWarningRecord } from "@/api/server";
import { FORM_INPUT_PROPS, LIST_ACTION_LINK_PROPS, TABLE_PAGE_SIZE, RISK_MODAL_BODY_STYLE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout as PcLayout,
  Select,
  SelectOption,
  Tag,
  Textarea,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
  type FormExpose,
  type FormRule,
} from "@/pc-ui-runtime";
import type { WarningEventVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapWarningEventFromApi } from "@/utils/risk-control-mapper";

const WARNING_TYPE_LABEL: Record<string, string> = {
  LEVEL_UPGRADE: "等级升级预警",
  ASSESSMENT_OVERDUE: "评估超期预警",
  INDICATOR_EXCEED: "指标超标预警",
};

const SEVERITY_LABEL: Record<WarningEventVO["severity"], string> = {
  RED: "红色",
  ORANGE: "橙色",
  YELLOW: "黄色",
};

const SEVERITY_COLOR: Record<WarningEventVO["severity"], string> = {
  RED: "red",
  ORANGE: "orange",
  YELLOW: "gold",
};

const STATUS_LABEL = {
  ACTIVE: "待处置",
  DISPOSED: "已处置",
} as const;

const DISPOSE_RESULT_OPTIONS = ["已确认", "需补充管控措施", "误报"] as const;

const normalizeTimeRange = (period: unknown): string[] | undefined => {
  if (Array.isArray(period)) {
    const values = period.map((item) => String(item)).filter(Boolean);
    return values.length > 0 ? values : undefined;
  }
  if (typeof period === "string" && period.trim()) {
    return period.split(",").filter(Boolean);
  }
  return undefined;
};

export const WarningDashboardPage = defineComponent({
  name: "WarningDashboardPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const disposeVisible = ref(false);
    const disposing = ref<WarningEventVO | null>(null);
    const disposeFormRef = ref<FormExpose>();
    const submitting = ref(false);

    const search = reactive({
      severity: "" as "" | WarningEventVO["severity"],
      status: "" as "" | "ACTIVE" | "DISPOSED",
      timeRange: undefined as string[] | undefined,
    });

    const disposeForm = reactive({
      disposeDesc: "",
      disposeResult: "已确认",
    });

    const disposeRules: Record<string, FormRule[]> = {
      disposeDesc: [
        { required: true, message: "请输入处置说明", trigger: "blur" },
        { max: 500, message: "处置说明不能超过500个字符", trigger: "blur" },
      ],
      disposeResult: [
        { required: true, message: "请选择处置结果", trigger: "change" },
        { max: 50, message: "处置结果不能超过50个字符", trigger: "change" },
      ],
    };

    const openDispose = (record: WarningEventVO): void => {
      disposing.value = record;
      disposeForm.disposeDesc = record.disposeDesc ?? "";
      disposeForm.disposeResult = record.disposeResult ?? "已确认";
      disposeVisible.value = true;
    };

    const closeDispose = (): void => {
      disposeVisible.value = false;
      disposing.value = null;
      disposeForm.disposeDesc = "";
      disposeForm.disposeResult = "已确认";
    };

    const confirmDispose = async (): Promise<void> => {
      if (!disposing.value || disposing.value.status !== "ACTIVE") return;
      try {
        await disposeFormRef.value?.validate();
      } catch {
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          patchWarningRecord(disposing.value!.id, {
            disposeDesc: disposeForm.disposeDesc.trim(),
            disposeResult: disposeForm.disposeResult,
          }),
        );
        message.success("预警处置已提交");
        closeDispose();
        tableApi.query();
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const renderWarningType = (type?: string): JSX.Element => <Tag color="blue">{WARNING_TYPE_LABEL[type ?? ""] ?? type ?? "--"}</Tag>;

    const columns: ColumnType[] = [
      {
        dataIndex: "warningType",
        title: "预警类型",
        width: 130,
        customRender: ({ text }: { text?: string }): JSX.Element => renderWarningType(text),
      },
      {
        dataIndex: "severity",
        title: "等级",
        width: 90,
        customRender: ({ text }: { text: WarningEventVO["severity"] }): JSX.Element => (
          <Tag color={SEVERITY_COLOR[text]}>{SEVERITY_LABEL[text]}</Tag>
        ),
      },
      { dataIndex: "unitName", title: "风险单元", width: 180, ellipsis: true },
      {
        dataIndex: "objectName",
        title: "风险对象",
        width: 220,
        ellipsis: true,
        customRender: ({ record }: { record: WarningEventVO }): JSX.Element => (
          <span>{record.objectName || record.objectCode || "--"}</span>
        ),
      },
      { dataIndex: "description", title: "预警内容", width: 260, ellipsis: true },
      {
        dataIndex: "triggerTime",
        title: "触发时间",
        width: 170,
        customRender: ({ text }: { text?: string }): JSX.Element => <span style={{ whiteSpace: "nowrap" }}>{text || "-"}</span>,
      },
      {
        dataIndex: "status",
        title: "状态",
        width: 90,
        customRender: ({ text }: { text: WarningEventVO["status"] }): JSX.Element => (
          <Tag color={text === "ACTIVE" ? "red" : "green"}>{STATUS_LABEL[text]}</Tag>
        ),
      },
      {
        dataIndex: "disposeResult",
        title: "处置结果",
        width: 130,
        ellipsis: true,
        customRender: ({ text }: { text?: string }): string => text || "--",
      },
      {
        dataIndex: "disposeTime",
        title: "处置时间",
        width: 170,
        customRender: ({ text }: { text?: string }): JSX.Element => <span style={{ whiteSpace: "nowrap" }}>{text || "-"}</span>,
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 90,
        align: "center",
        customRender: ({ record }: { record: WarningEventVO }): JSX.Element => (
          <Button {...LIST_ACTION_LINK_PROPS} onClick={() => openDispose(record)}>
            {record.status === "ACTIVE" ? "处置" : "查看"}
          </Button>
        ),
      },
    ];

    const fetchWarningPage = async () => {
      const [start, end] = search.timeRange ?? [];
      const result = await useAuthRequest(() =>
        pageWarningRecords({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          warningType: "LEVEL_UPGRADE",
          severity: search.severity || undefined,
          status: search.status || undefined,
          startTime: start ? dayjs(start).startOf("day").format("YYYY-MM-DD HH:mm:ss") : undefined,
          endTime: end ? dayjs(end).endOf("day").format("YYYY-MM-DD HH:mm:ss") : undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapWarningEventFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_WARNING_DASHBOARD",
      rowKey: "id",
      fetchApi: fetchWarningPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "预警等级",
          fieldName: "severity",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部",
            options: [
              { label: "全部", value: "" },
              { label: "红色", value: "RED" },
              { label: "橙色", value: "ORANGE" },
              { label: "黄色", value: "YELLOW" },
            ],
          },
        },
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部",
            options: [
              { label: "全部", value: "" },
              { label: "待处置", value: "ACTIVE" },
              { label: "已处置", value: "DISPOSED" },
            ],
          },
        },
        {
          component: "RangePicker",
          label: "触发时间",
          fieldName: "timeRange",
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        severity: (values.severity as "" | WarningEventVO["severity"] | undefined) ?? "",
        status: (values.status as "" | "ACTIVE" | "DISPOSED" | undefined) ?? "",
        timeRange: normalizeTimeRange(values.timeRange),
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.severity = (values.severity as "" | WarningEventVO["severity"] | undefined) ?? "";
        search.status = (values.status as "" | "ACTIVE" | "DISPOSED" | undefined) ?? "";
        search.timeRange = normalizeTimeRange(values.timeRange);
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.severity = "";
        search.status = "";
        search.timeRange = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
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
            open={disposeVisible.value}
            title="预警处置"
            width={560}
            destroyOnClose
            onCancel={closeDispose}
            footer={
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button onClick={closeDispose}>取消</Button>
                {disposing.value?.status === "ACTIVE" && (
                  <Button
                    type="primary"
                    loading={submitting.value}
                    onClick={() => {
                      void confirmDispose();
                    }}
                  >
                    确认处置
                  </Button>
                )}
              </div>
            }
          >
            {disposing.value && (
              <>
                <div style={{ marginBottom: 16, padding: 12, background: "#fff7e6", borderRadius: 4 }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>{disposing.value.unitName || "--"}</strong>
                    {" - "}
                    {renderWarningType(disposing.value.warningType)}
                  </div>
                  <div style={{ color: "#666", fontSize: 13 }}>{disposing.value.description || disposing.value.objectName || "--"}</div>
                </div>
                <Form model={disposeForm} ref={disposeFormRef} rules={disposeRules} labelCol={{ style: { width: "88px" } }}>
                  <FormItem label="处置说明" name="disposeDesc">
                    <Textarea
                      {...FORM_INPUT_PROPS}
                      v-model:value={disposeForm.disposeDesc}
                      rows={3}
                      maxlength={500}
                      disabled={disposing.value.status !== "ACTIVE"}
                      placeholder="请说明处置措施和结果"
                    />
                  </FormItem>
                  <FormItem label="处置结果" name="disposeResult">
                    <Select
                      v-model:value={disposeForm.disposeResult}
                      disabled={disposing.value.status !== "ACTIVE"}
                      style={{ width: "100%" }}
                    >
                      {DISPOSE_RESULT_OPTIONS.map((option) => (
                        <SelectOption key={option} value={option}>
                          {option}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                </Form>
              </>
            )}
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("预警看板")} v-slots={slots} />;
  },
});
