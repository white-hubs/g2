import type { FlowInstanceRow } from "@g2-contract/person-management";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  Radio,
  RadioGroup,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementClient } from "../../domain-context";
import { type WorkflowConfig, dateTime, display, errorText, statusText } from "./shared";

import styles from "./workflow.module.css";

const BASE = "/d/person-management";
const VIEWS = [
  { value: "ALL", label: "全部" },
  { value: "WAITING", label: "待我处理" },
  { value: "SUBMIT", label: "我发起的" },
  { value: "SERVED", label: "抄送给我" },
  { value: "PROCESSED", label: "已处理" },
];
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "处理中" },
  { value: "REJECT", label: "驳回" },
  { value: "UNDO", label: "撤销" },
  { value: "FINISHED", label: "完成" },
];
const STATUS_VIEWS = new Set(["ALL", "SUBMIT", "SERVED"]);

function isView(value: unknown): value is string {
  return typeof value === "string" && VIEWS.some((item) => item.value === value);
}

function pageNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createApprovalPage(config: WorkflowConfig) {
  return defineComponent({
    name: `Personnel${config.kind.replace(/-./gu, (value) => value[1]?.toUpperCase() ?? "")}ApprovalPage`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const query = reactive<{ type: string; status?: string; submitTime: string[] }>({
        type: isView(route.query.type) ? route.query.type : "ALL",
        status: undefined,
        submitTime: [],
      });
      const page = reactive({
        pageNumber: pageNumber(route.query.pageNumber, 1),
        pageSize: pageNumber(route.query.pageSize, 10),
        total: 0,
      });
      let requestVersion = 0;
      let latestRecords: FlowInstanceRow[] = [];

      const navigate = (type: "add" | "detail", record?: FlowInstanceRow): void => {
        const params: Record<string, string> = {
          businessType: config.businessType,
          appName: "personalManagement",
          prefix: config.prefix,
          type,
          title: config.title,
          returnPath: route.fullPath,
        };
        if (record) {
          params.processInstanceId = String(record.processInstanceId ?? "");
          params.currentTaskId = String(record.currentTaskId ?? "");
          params.status = String(record.status ?? "");
        }
        void router.push({ path: `${BASE}/flow-render/${config.kind}`, query: params });
      };

      const columns: PcTableColumn[] = [
        { title: "编号", dataIndex: "formNo", width: 190, ellipsis: true, customRender: ({ text }) => display(text) },
        { title: "申请名称", dataIndex: "instanceName", width: 220, ellipsis: true, customRender: ({ text }) => display(text) },
        { title: "发起人", dataIndex: "startUserName", width: 130, customRender: ({ text }) => display(text) },
        {
          title: "发起部门",
          dataIndex: "startUserInfo",
          width: 180,
          ellipsis: true,
          customRender: ({ record }) => display((record as FlowInstanceRow).startUserInfo?.organizationName),
        },
        { title: "发起时间", dataIndex: "submitedTime", width: 180, customRender: ({ text }) => dateTime(text) },
        { title: "处理状态", dataIndex: "status", width: 120, customRender: ({ text }) => statusText(text) },
        { title: "处理进度", dataIndex: "activeNodeName", width: 160, ellipsis: true, customRender: ({ text }) => display(text) },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          fixed: "right",
          customRender: ({ record }) => (
            <Button type="link" size="small" onClick={() => navigate("detail", record as FlowInstanceRow)}>
              详情
            </Button>
          ),
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: config.tableCode,
        rowKey: "processInstanceId",
        autoFetch: false,
        pagination: false,
      });

      const load = async (): Promise<void> => {
        const version = ++requestVersion;
        tableApi.loading.value = true;
        try {
          const result = await getPersonManagementClient().getFlowProcessPage({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            type: query.type,
            businessType: config.businessType,
            status: STATUS_VIEWS.has(query.type) ? (query.status ?? null) : null,
            submitTime: query.submitTime.join(","),
          });
          if (version !== requestVersion) {
            return;
          }
          latestRecords = result.records;
          tableApi.setDataSource(latestRecords);
          page.total = result.total;
        } catch (error) {
          if (version !== requestVersion) {
            return;
          }
          message.error(errorText(error, "审批列表加载失败"));
          latestRecords = [];
          tableApi.setDataSource(latestRecords);
          page.total = 0;
        } finally {
          if (version === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };

      const formSchema = (): PcFormSchemaProp[] => [
        ...(STATUS_VIEWS.has(query.type)
          ? [
              {
                component: "Select" as const,
                fieldName: "status",
                label: "状态",
                defaultValue: undefined,
                componentProps: { allowClear: true, options: STATUS_OPTIONS, placeholder: "请选择", onChange: () => undefined },
              },
            ]
          : []),
        {
          component: "RangePicker",
          fieldName: "submitTime",
          label: "时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true, onChange: () => undefined },
        },
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        schema: formSchema(),
        syncStateRef: query,
        showCollapseButton: false,
        cache: true,
        handleSubmit(values) {
          query.status = typeof values.status === "string" ? values.status : undefined;
          query.submitTime = Array.isArray(values.submitTime) ? values.submitTime.map(String) : [];
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.type = "ALL";
          query.status = undefined;
          query.submitTime = [];
          formApi.updateSchema(formSchema());
          formApi.setFormValues({ status: undefined, submitTime: [] });
          page.pageNumber = 1;
          void router.replace({ path: route.path, query: { type: "ALL" } });
          void load();
        },
      });
      const changeView = (value: string): void => {
        query.type = value;
        query.status = undefined;
        formApi.setFieldValue("status", undefined);
        formApi.updateSchema(formSchema());
        page.pageNumber = 1;
        const { status: _status, ...rest } = route.query;
        void router.replace({ path: route.path, query: { ...rest, type: value, pageNumber: "1" } });
        void load();
      };

      onMounted(() => {
        void load();
      });

      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => navigate("add")}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.pageContent}>
                <div class={styles.filterRow}>
                  <RadioGroup
                    value={query.type}
                    buttonStyle="solid"
                    onChange={(event) => {
                      const selected = event.target.value;
                      if (typeof selected === "string") {
                        changeView(selected);
                      }
                    }}
                  >
                    {VIEWS.map((item) => (
                      <Radio.Button key={item.value} value={item.value}>
                        {item.label}
                      </Radio.Button>
                    ))}
                  </RadioGroup>
                  <PcForm />
                </div>
                <PcTable />
              </div>
            ),
            "footer-page": () =>
              page.total > 0 ? (
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
              ) : null,
          }}
        />
      );
    },
  });
}
