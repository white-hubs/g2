import type { Organization } from "@g2-contract/person-management";
import { Button, Page, PageLayout, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementClient, getPersonManagementContext } from "../../domain-context";
import { BUSINESS_NAMES, dateTime, display, downloadWorkbook, errorText, statusText } from "./shared";

import styles from "./workflow.module.css";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "处理中" },
  { value: "REJECT", label: "驳回" },
  { value: "UNDO", label: "撤销" },
  { value: "FINISHED", label: "完成" },
];
const BUSINESS_OPTIONS = Object.entries(BUSINESS_NAMES).map(([value, label]) => ({ value, label }));

interface ApprovalRecordRow {
  processInstanceId?: string;
  businessType?: string;
  currentTaskId?: string;
  status?: string;
  startUserInfo?: { organizationName?: string };
  [key: string]: unknown;
}

function organizationOptions(nodes: Organization[]): { label: string; value: string }[] {
  return nodes.flatMap((item) => [{ label: item.name, value: String(item.id) }, ...organizationOptions(item.children ?? [])]);
}

export const ApprovalRecordPage = defineComponent({
  name: "PersonnelApprovalRecordPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const context = getPersonManagementContext();
    const client = getPersonManagementClient();
    const query = reactive<{ submitTime: string[]; businessType?: string; organizationId?: string; status?: string; username: string }>({
      submitTime: [],
      businessType: undefined,
      organizationId: undefined,
      status: undefined,
      username: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const departments = ref<{ label: string; value: string }[]>([]);
    const exporting = ref(false);
    let requestVersion = 0;

    const navigateDetail = (record: ApprovalRecordRow): void => {
      void router.push({
        path: "/d/person-management/flow-render/record",
        query: {
          businessType: record.businessType,
          processInstanceId: record.processInstanceId,
          currentTaskId: record.currentTaskId,
          status: record.status,
          type: "detail",
          title: BUSINESS_NAMES[String(record.businessType ?? "")] ?? "审批详情",
          appName: "personalManagement",
          returnPath: route.fullPath,
        },
      });
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
        customRender: ({ record }) => display((record as ApprovalRecordRow).startUserInfo?.organizationName),
      },
      { title: "发起时间", dataIndex: "submitedTime", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "处理状态", dataIndex: "status", width: 120, customRender: ({ text }) => statusText(text) },
      { title: "处理进度", dataIndex: "activeNodeName", width: 160, ellipsis: true, customRender: ({ text }) => display(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 100,
        fixed: "right",
        customRender: ({ record }) =>
          context.getFunctionCodes().size === 0 || context.getFunctionCodes().has("personnel:approval:record:detials") ? (
            <Button type="link" size="small" onClick={() => navigateDetail(record as ApprovalRecordRow)}>
              详情
            </Button>
          ) : null,
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "processInstanceId",
      tableCode: "PERSONNEL_APPROVAL_RECORD",
      pagination: false,
      autoFetch: false,
    });

    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      tableApi.loading.value = true;
      try {
        const result = await client.pageApprovalRecords({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          applicationCode: "PERSONNELMANAGEMENT",
          businessType: query.businessType,
          organizationId: query.organizationId,
          status: query.status,
          username: query.username.trim(),
          submitTime: query.submitTime.join(","),
        });
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource([]);
        page.total = 0;
        message.error(errorText(error, "审批记录加载失败"));
      } finally {
        if (version === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "RangePicker",
          fieldName: "submitTime",
          label: "发起时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true, onChange: () => undefined },
        },
        {
          component: "Select",
          fieldName: "businessType",
          label: "业务类型",
          defaultValue: undefined,
          componentProps: {
            options: BUSINESS_OPTIONS,
            allowClear: true,
            showSearch: true,
            optionFilterProp: "label",
            placeholder: "请选择业务类型",
            onChange: () => undefined,
          },
        },
        {
          component: "Select",
          fieldName: "organizationId",
          label: "部门",
          defaultValue: undefined,
          componentProps: {
            options: departments,
            allowClear: true,
            showSearch: true,
            optionFilterProp: "label",
            placeholder: "请选择部门",
            onChange: () => undefined,
          },
        },
        {
          component: "Select",
          fieldName: "status",
          label: "状态",
          defaultValue: undefined,
          componentProps: { options: STATUS_OPTIONS, allowClear: true, placeholder: "请选择", onChange: () => undefined },
        },
        {
          component: "Input",
          fieldName: "username",
          label: "发起人",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入发起人" },
        },
      ],
      syncStateRef: query,
      showCollapseButton: true,
      cache: true,
      handleSubmit(values) {
        query.submitTime = Array.isArray(values.submitTime) ? values.submitTime.map(String) : [];
        query.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
        query.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
        query.status = typeof values.status === "string" ? values.status : undefined;
        query.username = String(values.username ?? "");
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        Object.assign(query, { submitTime: [], businessType: undefined, organizationId: undefined, status: undefined, username: "" });
        page.pageNumber = 1;
        void load();
      },
    });

    const exportRows = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      if (page.total === 0) {
        message.warning("未查询到数据，无法导出");
        return;
      }
      exporting.value = true;
      try {
        const blob = await client.exportApprovalRecords({
          applicationCode: "PERSONNELMANAGEMENT",
          businessType: query.businessType,
          organizationId: query.organizationId,
          status: query.status,
          username: query.username.trim(),
          submitTime: query.submitTime.join(","),
        });
        downloadWorkbook(blob, "人事审批记录.xlsx");
      } catch (error) {
        message.error(errorText(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    onMounted(() => {
      void load();
      void client
        .listOrganizations()
        .then((list) => {
          departments.value = organizationOptions(list);
        })
        .catch((error: unknown) => {
          message.error(errorText(error, "部门加载失败"));
        });
    });

    return () => (
      <PageLayout
        title="人事审批记录"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} onClick={() => void exportRows()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
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
