import type { PcTableColumn } from "@g2-platform/pc-ui";
import { Button, Page, PageLayout, PopOver, RadioGroup, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive } from "vue";
import { useRouter } from "vue-router";

import { canUseSmallEngineeringFeature, getFlowClient, getSmallEngineeringClient } from "@/domain-context";

type FlowKind = "request" | "approve" | "correction";
type FlowRecord = Record<string, unknown> & { processInstanceId?: string; currentTaskId?: string; status?: string };
const BASE = "/d/small-engineering";
const STATUS_TEXT: Record<string, string> = { PASS: "通过", FINISHED: "完成", ACTIVE: "处理中", REJECT: "拒绝", UNDO: "撤销" };
const tabs = [
  { value: "WAITING", label: "待我处理的" },
  { value: "SUBMIT", label: "我发起的" },
  { value: "SERVED", label: "抄送我的" },
  { value: "ALL", label: "全部" },
];
const textCell = (value: unknown): JSX.Element => (
  <PopOver content={value == null || value === "" ? "--" : String(value)}>{value == null || value === "" ? "--" : String(value)}</PopOver>
);
const dateCell = (value: unknown): string => {
  if (value == null || value === "") {
    return "--";
  }
  const time = new Date(value as string | number);
  return Number.isNaN(time.getTime()) ? String(value) : time.toLocaleString("zh-CN", { hour12: false });
};

function createFlowList(kind: FlowKind) {
  const titles = { request: "工程请示", approve: "工程审批", correction: "工程整改" };
  const businessTypes = { request: "PROJECT_APPLY", approve: "PROJECT_SIGN_CONTRACT", correction: "PROJECT_REFORM" };
  const flowPaths = { request: "request-flow", approve: "approve-flow", correction: "correction-flow" };
  return defineComponent({
    name: `SmallEngineering${kind}List`,
    setup() {
      const router = useRouter();
      const smallClient = getSmallEngineeringClient();
      const flowClient = getFlowClient();
      const title = titles[kind];
      const defaultType = kind === "correction" ? "ALL" : "WAITING";
      const state = reactive({ type: defaultType, dateRange: undefined as string[] | undefined });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      let requestVersion = 0;

      const openFlow = (row?: FlowRecord): void => {
        const query: Record<string, string> = {
          businessType: businessTypes[kind],
          type: row ? "detail" : "add",
          title,
        };
        if (row?.processInstanceId) {
          query.processInstanceId = row.processInstanceId;
        }
        if (row?.currentTaskId) {
          query.currentTaskId = row.currentTaskId;
        }
        if (row?.status) {
          query.status = row.status;
        }
        void router.push({ path: `${BASE}/${flowPaths[kind]}`, query });
      };

      const columns: PcTableColumn[] = [
        ...(kind === "correction"
          ? []
          : [
              {
                title: kind === "approve" ? "工程编号" : "编号",
                dataIndex: "applyNum",
                width: 140,
                ellipsis: true,
                customRender: ({ text }: { text: unknown }) => textCell(text),
              },
            ]),
        {
          title: kind === "correction" ? "表单名称" : "申请名称",
          dataIndex: "instanceName",
          ellipsis: true,
          customRender: ({ text }) => textCell(text),
        },
        ...(kind === "correction"
          ? []
          : [
              {
                title: "小散工程名称",
                dataIndex: "projectName",
                ellipsis: true,
                customRender: ({ text }: { text: unknown }) => textCell(text),
              },
            ]),
        { title: "发起人", dataIndex: "startUserName", width: 120, customRender: ({ text }) => textCell(text) },
        ...(kind === "correction"
          ? []
          : [
              {
                title: "发起部门",
                dataIndex: "startUserInfo",
                width: 150,
                customRender: ({ text, record }: { text: unknown; record: Record<string, unknown> }) =>
                  textCell(
                    (text as { organizationName?: string } | undefined)?.organizationName ??
                      (record.startUserInfo as { organizationName?: string } | undefined)?.organizationName,
                  ),
              },
            ]),
        { title: "发起时间", dataIndex: "submitedTime", width: 180, customRender: ({ text }) => dateCell(text) },
        { title: "处理状态", dataIndex: "status", width: 110, customRender: ({ text }) => STATUS_TEXT[String(text)] ?? "--" },
        { title: "处理进度", dataIndex: "activeNodeName", ellipsis: true, customRender: ({ text }) => textCell(text) },
        {
          title: "操作",
          dataIndex: "action",
          width: 90,
          fixed: "right",
          customRender: ({ record }) => (
            <Button type="link" onClick={() => openFlow(record as FlowRecord)}>
              详情
            </Button>
          ),
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: `SMALL_ENGINEERING_${kind.toUpperCase()}`,
        rowKey: "processInstanceId",
        autoFetch: false,
      });

      const load = async (): Promise<void> => {
        const current = ++requestVersion;
        tableApi.loading.value = true;
        const params: Record<string, unknown> = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          ...(kind === "correction" ? { status: state.type } : { type: state.type }),
          businessType: businessTypes[kind],
          ...(state.dateRange?.length === 2 ? { submitTime: state.dateRange.join(",") } : {}),
        };
        try {
          const result =
            kind === "request"
              ? await smallClient.listProjectApplies(params)
              : kind === "approve"
                ? await smallClient.listSignContracts(params)
                : await flowClient.pageHistorical(params);
          if (current !== requestVersion) {
            return;
          }
          tableApi.setDataSource(result.records);
          page.total = result.total;
        } catch (error) {
          if (current === requestVersion) {
            message.error(error instanceof Error ? error.message : `${title}加载失败`);
          }
        } finally {
          if (current === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };

      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        cache: true,
        cacheFields: ["type", "dateRange"],
        syncStateRef: state,
        schema: [
          {
            component: kind === "correction" ? "Select" : markRaw(RadioGroup),
            label: kind === "correction" ? "类型" : "",
            fieldName: "type",
            defaultValue: defaultType,
            componentProps: { buttonStyle: "solid", optionType: "button", options: tabs },
          },
          {
            component: "RangePicker",
            label: "发起时间",
            fieldName: "dateRange",
            defaultValue: undefined,
            componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "260px" } },
          },
        ],
        handleValuesChange(_values, _changed, meta) {
          if (meta?.fieldName === "type") {
            state.type = String(formApi.formValues.type ?? defaultType);
            page.pageNumber = 1;
            void load();
          }
        },
        handleSubmit(values) {
          state.type = String(values.type ?? defaultType);
          state.dateRange = Array.isArray(values.dateRange) ? values.dateRange.map(String) : undefined;
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          state.type = defaultType;
          state.dateRange = undefined;
          page.pageNumber = 1;
          void load();
        },
      });
      void load();
      const slots = {
        "layout-header": () =>
          canUseSmallEngineeringFeature(
            kind === "request" ? "projectRequest" : kind === "approve" ? "projectExamineApprove" : "projectCorrection",
            "create",
          ) ? (
            <Button type="primary" onClick={() => openFlow()}>
              新增
            </Button>
          ) : null,
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
      return () => <PageLayout title={title} v-slots={slots} />;
    },
  });
}

export const Request = createFlowList("request");
export const ExamineApprove = createFlowList("approve");
export const EngineeringCorrection = createFlowList("correction");
