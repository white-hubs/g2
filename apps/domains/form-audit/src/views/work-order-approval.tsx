import type { FlowProcess } from "@g2-contract/form-audit";
import { Button, Page, PageLayout, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import {
  APPLICATION_CODE,
  errorMessage,
  flowStatusLabel,
  flowStatusOptions,
  formatDateTime,
  loadCommonOptions,
  rangePeriod,
} from "../shared";

export const WorkOrderApproval = defineComponent({
  name: "FormAuditWorkOrderApproval",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const title = String(route.query.flowName ?? "业务表单");
    const businessType = String(route.query.businessType ?? "");
    const flowId = String(route.query.flowId ?? "");
    const departments = ref<{ label: string; value: string }[]>([]);
    const query = reactive<{ organizationId?: string; status?: string; username: string; submitTime?: unknown[] }>({ username: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const [PcTable, tableApi] = usePcTable({
      tableCode: "FORM_AUDIT_APPROVAL",
      rowKey: "processInstanceId",
      columns: [
        { title: "编号", dataIndex: "formNo", width: 190, ellipsis: true },
        { title: "申请名称", dataIndex: "instanceName", width: 180, ellipsis: true },
        { title: "发起人", dataIndex: "startUserName", width: 120 },
        { title: "发起部门", dataIndex: "organizationName", width: 160, ellipsis: true },
        {
          title: "发起时间",
          dataIndex: "submitedTime",
          width: 170,
          customRender: ({ text }: { text?: string | number }) => formatDateTime(text),
        },
        {
          title: "处理状态",
          dataIndex: "status",
          width: 110,
          customRender: ({ text }: { text?: string }) => <Tag color={text === "FINISHED" ? "green" : "blue"}>{flowStatusLabel(text)}</Tag>,
        },
        { title: "处理进度", dataIndex: "activeNodeName", width: 140, ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 90,
          fixed: "right",
          customRender: ({ record }: { record: FlowProcess }) => (
            <Button
              type="link"
              size="small"
              onClick={() =>
                void router.push({
                  path: "/d/form-audit/approval-flow-render",
                  query: {
                    type: "detail",
                    title: `${title}详情`,
                    businessType: record.businessType,
                    processInstanceId: record.processInstanceId,
                    currentTaskId: record.currentTaskId,
                    status: record.status,
                  },
                })
              }
            >
              详情
            </Button>
          ),
        },
      ],
      fetchApi: () =>
        getFormAuditClient().pageFlowProcesses({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          type: "ALL",
          applicationCode: APPLICATION_CODE,
          flowId,
          businessType,
          organizationId: query.organizationId,
          status: query.status,
          username: query.username || undefined,
          submitTime: rangePeriod(query.submitTime),
        }),
      fetchLoaded(data) {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        { component: "Select", fieldName: "status", label: "处理状态", componentProps: { allowClear: true, options: flowStatusOptions } },
        { component: "RangePicker", fieldName: "submitTime", label: "发起时间", componentProps: { valueFormat: "YYYY-MM-DD" } },
        { component: "Select", fieldName: "organizationId", label: "发起部门", componentProps: { allowClear: true, options: departments } },
        { component: "Input", fieldName: "username", label: "发起人", defaultValue: "", componentProps: { allowClear: true } },
      ],
      handleSubmit(values) {
        query.status = typeof values.status === "string" ? values.status : undefined;
        query.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
        query.username = String(values.username ?? "").trim();
        query.submitTime = Array.isArray(values.submitTime) ? values.submitTime : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        Object.assign(query, { organizationId: undefined, status: undefined, username: "", submitTime: undefined });
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    void loadCommonOptions()
      .then((options) => {
        departments.value = options.departments;
      })
      .catch((error: unknown) => message.error(errorMessage(error, "部门加载失败")));

    return () => (
      <PageLayout
        title={title}
        v-slots={{
          "layout-header": () => (
            <div class="form-audit-actions">
              <Button onClick={() => void router.push("/d/form-audit/work-order-library")}>返回模板</Button>
              <Button
                type="primary"
                disabled={!businessType}
                onClick={() =>
                  void router.push({
                    path: "/d/form-audit/approval-flow-render",
                    query: { type: "add", title: `新增${title}`, businessType },
                  })
                }
              >
                新增
              </Button>
            </div>
          ),
          "layout-content": () => (
            <div class="form-audit-table-page">
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber: number, pageSize: number) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
