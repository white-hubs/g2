import type { OfficialRow } from "@g2-contract/government-management";
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

import { getGovernmentClient } from "../domain-context";
import { menuPath } from "../menu-data";
import { FLOW_STATUSES, FLOW_VIEWS, STATUS_VIEWS, can, dateTime, display, errorText, flowStatus } from "./shared";

import styles from "./page.module.css";

const CONFIGS = {
  approval: {
    slug: "eventApprovalList",
    title: "事项审批",
    businessType: "OFFICIAL_FOCUS_WORK",
    tableCode: "EVENT_APPROVAL",
    permission: "official:eventApproval",
  },
  exchange: {
    slug: "eventExchangeList",
    title: "事项变更",
    businessType: "OFFICIAL_FOCUS_WORK_UPDATE",
    tableCode: "EVENT_EXCHANGE",
    permission: "official:eventChange",
  },
  handleApproval: {
    slug: "eventHandleApprovalList",
    title: "事项处理审批",
    businessType: "OFFICIAL_FOCUS_WORK_REPLY",
    tableCode: "EVENT_HANDLE_APPROVAL",
    permission: "official:eventHandleApproval",
  },
} as const;

export function createFocusFlowPage(kind: keyof typeof CONFIGS) {
  const config = CONFIGS[kind];
  return defineComponent({
    name: `GovernmentFocusFlow${kind}`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const filter = reactive<{ type: string; status?: string; submitTime: string[] }>({ type: "ALL", status: undefined, submitTime: [] });
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      let version = 0;
      const navigate = (type: "add" | "detail", row?: OfficialRow) => {
        void router.push({
          path: `${menuPath(config.slug)}/flow-render`,
          query: {
            businessType: config.businessType,
            appName: "governmentManagement",
            type,
            title: config.title,
            returnPath: route.fullPath,
            ...(row
              ? {
                  processInstanceId: String(row.processInstanceId ?? ""),
                  status: String(row.processInstanceStatus ?? row.status ?? ""),
                  currentTaskId: String(row.currentTaskId ?? ""),
                }
              : {}),
          },
        });
      };
      const fields =
        kind === "handleApproval"
          ? [
              { title: "编号", dataIndex: "processInstanceCode" },
              { title: "督办事项", dataIndex: "workDesc" },
              { title: "发起人", dataIndex: "applicantName" },
              { title: "发起时间", dataIndex: "applyTime" },
              { title: "处理状态", dataIndex: "processInstanceStatus" },
              { title: "处理进度", dataIndex: "processInstanceNode" },
            ]
          : kind === "exchange"
            ? [
                { title: "编号", dataIndex: "processInstanceCode" },
                { title: "督办事项", dataIndex: "workDesc" },
                { title: "完成时限", dataIndex: "completeTimeStr" },
                { title: "变更后状态", dataIndex: "status" },
                { title: "变更后时限", dataIndex: "updateCompleteTimeStr" },
                { title: "发起人", dataIndex: "applicantName" },
                { title: "发起部门", dataIndex: "applicantDeptName" },
                { title: "发起时间", dataIndex: "applyTime" },
                { title: "处理状态", dataIndex: "processInstanceStatus" },
                { title: "处理进度", dataIndex: "processInstanceNode" },
              ]
            : [
                { title: "编号", dataIndex: "processInstanceCode" },
                { title: "督办事项", dataIndex: "workDesc" },
                { title: "完成时限", dataIndex: "completeTimeStr" },
                { title: "发起人", dataIndex: "applicantName" },
                { title: "发起时间", dataIndex: "applyTime" },
                { title: "处理状态", dataIndex: "processInstanceStatus" },
                { title: "处理进度", dataIndex: "processInstanceNode" },
              ];
      const columns: PcTableColumn[] = fields.map((field) => ({
        ...field,
        ellipsis: true,
        customRender: ({ text }) =>
          field.dataIndex === "applyTime" ? dateTime(text) : field.dataIndex === "processInstanceStatus" ? flowStatus(text) : display(text),
      }));
      columns.push({
        title: "操作",
        dataIndex: "action",
        width: 90,
        fixed: "right",
        customRender: ({ record }) =>
          can(`${config.permission}:details`) ? (
            <Button type="link" size="small" onClick={() => navigate("detail", record as OfficialRow)}>
              详情
            </Button>
          ) : null,
      });
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: config.tableCode,
        rowKey: "_rowKey",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = await getGovernmentClient().pageFocusFlows({
            businessType: config.businessType,
            type: filter.type,
            submitTime: filter.submitTime.join(","),
            status: kind === "handleApproval" || !STATUS_VIEWS.has(filter.type) ? null : (filter.status ?? null),
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
          });
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(
            result.records.map((row, index) => ({
              ...row,
              _rowKey: String(row.processInstanceId ?? row.id ?? `${pager.pageNumber}-${index}`),
            })),
          );
          pager.total = result.total;
        } catch (error) {
          if (current !== version) {
            return;
          }
          message.error(errorText(error, "督办审批列表加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const schema = (): PcFormSchemaProp[] => [
        ...(kind !== "handleApproval" && STATUS_VIEWS.has(filter.type)
          ? [
              {
                component: "Select" as const,
                fieldName: "status",
                label: "状态",
                componentProps: { allowClear: true, placeholder: "请选择", options: FLOW_STATUSES },
              },
            ]
          : []),
        {
          component: "RangePicker",
          fieldName: "submitTime",
          label: "发起时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        schema: schema(),
        syncStateRef: filter,
        showCollapseButton: false,
        cache: true,
        handleSubmit(values) {
          filter.status = typeof values.status === "string" ? values.status : undefined;
          filter.submitTime = Array.isArray(values.submitTime) ? values.submitTime.map(String) : [];
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          filter.type = "ALL";
          filter.status = undefined;
          filter.submitTime = [];
          pager.pageNumber = 1;
          formApi.updateSchema(schema());
          formApi.setFormValues({ status: undefined, submitTime: [] });
          void load();
        },
      });
      onMounted(() => void load());
      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () =>
              kind !== "handleApproval" && can(`${config.permission}:add`) ? (
                <Button type="primary" onClick={() => navigate("add")}>
                  新增
                </Button>
              ) : null,
            "layout-content": () => (
              <div class={styles.content}>
                <div class={styles.filterRow}>
                  <RadioGroup
                    value={filter.type}
                    buttonStyle="solid"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (typeof next !== "string") {
                        return;
                      }
                      filter.type = next;
                      filter.status = undefined;
                      pager.pageNumber = 1;
                      formApi.setFieldValue("status", undefined);
                      formApi.updateSchema(schema());
                      void load();
                    }}
                  >
                    {FLOW_VIEWS.filter((view) => kind !== "handleApproval" || view.value !== "SUBMIT").map((view) => (
                      <Radio.Button key={view.value} value={view.value}>
                        {view.label}
                      </Radio.Button>
                    ))}
                  </RadioGroup>
                  <PcForm />
                </div>
                <PcTable />
              </div>
            ),
            "footer-page": () =>
              pager.total > 0 ? (
                <Page
                  current={pager.pageNumber}
                  pageSize={pager.pageSize}
                  total={pager.total}
                  cachePageQuery={true}
                  onPageChange={(number: number, size: number) => {
                    pager.pageNumber = number;
                    pager.pageSize = size;
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
