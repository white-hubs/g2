import type { FlowRow } from "@g2-contract/government-management";
import { Button, Page, PageLayout, type PcFormSchemaProp, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient } from "../domain-context";
import { menuPath } from "../menu-data";
import { can, dateTime, display, download, errorText, flowStatus } from "./shared";

import styles from "./page.module.css";

const BUSINESS_TYPES = [
  { label: "事项审批", value: "OFFICIAL_FOCUS_WORK" },
  { label: "处理审批", value: "OFFICIAL_FOCUS_WORK_REPLY" },
  { label: "事项变更", value: "OFFICIAL_FOCUS_WORK_UPDATE" },
  { label: "事项催办", value: "OFFICIAL_URGENT_WORK" },
  { label: "制度征求", value: "OFFICIAL_REGULATION" },
  { label: "议题预报", value: "OFFICIAL_TOPIC" },
  { label: "用印申请", value: "OFFICIAL_SEAL" },
  { label: "公文传阅", value: "OFFICIAL_DOCUMENT_CIRCULATION" },
  { label: "来文处理", value: "OFFICIAL_DOCUMENT_RECEIVED" },
  { label: "部门工作", value: "OFFICIAL_KEY_WORK" },
];
const FLOW_STATUSES = [
  { label: "处理中", value: "ACTIVE" },
  { label: "驳回", value: "REJECT" },
  { label: "撤销", value: "UNDO" },
  { label: "完成", value: "FINISHED" },
];

export const AllFlowPage = defineComponent({
  name: "GovernmentAllFlowPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const filter = reactive<{ submitTime: string[]; organizationId?: string; businessType?: string; username?: string; status?: string }>({
      submitTime: [],
      organizationId: undefined,
      businessType: undefined,
      username: undefined,
      status: undefined,
    });
    const departments = ref<{ id?: string; name: string }[]>([]);
    const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const exporting = ref(false);
    const columns: PcTableColumn[] = [
      { title: "编号", dataIndex: "formNo", width: 190, ellipsis: true, customRender: ({ text }) => display(text) },
      { title: "申请名称", dataIndex: "instanceName", width: 220, ellipsis: true, customRender: ({ text }) => display(text) },
      { title: "发起人", dataIndex: "startUserName", width: 130, customRender: ({ text }) => display(text) },
      {
        title: "发起部门",
        dataIndex: "startUserInfo",
        width: 170,
        customRender: ({ record }) => display((record as FlowRow).startUserInfo?.organizationName),
      },
      { title: "发起时间", dataIndex: "submitedTime", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "处理状态", dataIndex: "status", width: 110, customRender: ({ text }) => flowStatus(text) },
      { title: "处理进度", dataIndex: "activeNodeName", width: 150, customRender: ({ text }) => display(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 90,
        fixed: "right",
        customRender: ({ record }) =>
          can("official:flowApprovalRecord:info") ? (
            <Button
              type="link"
              size="small"
              onClick={() => {
                const row = record as FlowRow;
                void router.push({
                  path: `${menuPath("approval-record")}/flow-render`,
                  query: {
                    type: "detail",
                    businessType: row.businessType ?? "",
                    processInstanceId: row.processInstanceId,
                    currentTaskId: row.currentTaskId ?? "",
                    status: row.status ?? "",
                    title: BUSINESS_TYPES.find((item) => item.value === row.businessType)?.label ?? "行政审批记录",
                    returnPath: route.fullPath,
                  },
                });
              }}
            >
              详情
            </Button>
          ) : null,
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "GOVERNMENT_APPROVAL_RECORD",
      rowKey: "processInstanceId",
      autoFetch: false,
      pagination: false,
    });
    let version = 0;
    const load = async () => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await getGovernmentClient().pageAllFlows({
          pageNumber: pager.pageNumber,
          pageSize: pager.pageSize,
          applicationCode: "OFFICIAL_MANAGEMENT",
          businessType: filter.businessType,
          submitTime: filter.submitTime.join(","),
          organizationId: filter.organizationId,
          username: filter.username,
          status: filter.status,
        });
        if (current !== version) {
          return;
        }
        tableApi.setDataSource(result.records);
        pager.total = result.total;
      } catch (error) {
        if (current !== version) {
          return;
        }
        message.error(errorText(error, "审批记录加载失败"));
        tableApi.setDataSource([]);
        pager.total = 0;
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const exportRecords = async () => {
      if (pager.total === 0) {
        message.warning("未查询到数据，无法导出");
        return;
      }
      exporting.value = true;
      try {
        const file = await getGovernmentClient().exportAllFlows({
          applicationCode: "OFFICIAL_MANAGEMENT",
          businessType: filter.businessType,
          submitTime: filter.submitTime.join(","),
          organizationId: filter.organizationId,
          username: filter.username,
          status: filter.status,
        });
        download(file, "行政审批记录.xlsx");
      } catch (error) {
        message.error(errorText(error, "审批记录导出失败"));
      } finally {
        exporting.value = false;
      }
    };
    const schema = (): PcFormSchemaProp[] => [
      {
        component: "RangePicker",
        fieldName: "submitTime",
        label: "发起时间",
        defaultValue: [],
        componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
      },
      {
        component: "Select",
        fieldName: "businessType",
        label: "业务类型",
        componentProps: {
          placeholder: "请选择",
          allowClear: true,
          options: BUSINESS_TYPES,
        },
      },
      {
        component: "Select",
        fieldName: "organizationId",
        label: "发起部门",
        componentProps: {
          placeholder: "请选择",
          allowClear: true,
          options: departments.value.map((item) => ({ value: item.id, label: item.name })),
        },
      },
      {
        component: "Select",
        fieldName: "status",
        label: "状态",
        componentProps: { placeholder: "请选择", allowClear: true, options: FLOW_STATUSES },
      },
      { component: "Input", fieldName: "username", label: "发起人", componentProps: { placeholder: "请输入发起人", allowClear: true } },
    ];
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: schema(),
      syncStateRef: filter,
      cache: true,
      showCollapseButton: false,
      actionsInline: true,
      handleSubmit(values) {
        filter.username = typeof values.username === "string" ? values.username : undefined;
        filter.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
        filter.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
        filter.status = typeof values.status === "string" ? values.status : undefined;
        filter.submitTime = Array.isArray(values.submitTime) ? values.submitTime.map(String) : [];
        pager.pageNumber = 1;
        void load();
      },
      handleReset() {
        filter.username = undefined;
        filter.organizationId = undefined;
        filter.businessType = undefined;
        filter.status = undefined;
        filter.submitTime = [];
        pager.pageNumber = 1;
        void load();
      },
    });
    onMounted(async () => {
      void load();
      try {
        departments.value = await getGovernmentClient().listOrganizations();
        formApi.updateSchema(schema());
      } catch (error) {
        message.error(errorText(error, "部门选项加载失败"));
      }
    });
    return () => (
      <PageLayout
        title="行政审批记录"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} onClick={() => void exportRecords()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.content}>
              <div class={styles.filterRow}>
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
