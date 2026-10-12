import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { flowApprovalRecordExport, flowApprovalRecordPage } from "@/api/attendance-record";
import { DeptTreeSelect } from "@/components/department-select";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
import { businessTypeMap } from "@/types/vacation-type";

interface SearchForm {
  submitTime: string[] | undefined;
  businessTime: string[] | undefined;
  businessType: string | undefined;
  organizationId: string;
  status: string | undefined;
  username: string;
}

type QueryCacheValue = string | number | boolean | null | undefined | (string | number | boolean | null | undefined)[];

interface QueryCacheState {
  [key: string]: QueryCacheValue;
  submitTime: string[] | string | undefined;
  businessTime: string[] | string | undefined;
  businessType: string | undefined;
  organizationId: string;
  status: string | undefined;
  username: string;
  pageNumber: number;
  pageSize: number;
}

interface ApprovalRecordRow {
  processInstanceId: string;
  formNo: string;
  instanceName: string;
  startUserName: string;
  startUserInfo: { organizationName?: string } | null;
  submitedTime: string;
  status: string;
  activeNodeName: string;
  currentTaskId: string;
  businessType: string;
}

const applicationCode = "ATTENDANCE_MANAGEMENT";
const legacyDetailPermissionCode = "attendance:approval:record:info";
const statusOptions = [
  { value: "ACTIVE", label: "处理中" },
  { value: "REJECT", label: "驳回" },
  { value: "UNDO", label: "撤销" },
  { value: "FINISHED", label: "完成" },
];
const businessTypeOptions = Array.from(businessTypeMap, ([value, label]) => ({ value, label }));
const statusText = new Map([
  ["SUBMIT", "提交"],
  ["UNDO", "撤销"],
  ["REPEAT", "重新提交"],
  ["APPROVAL", "审批"],
  ["BACK", "撤回"],
  ["COPY", "抄送"],
  ["REJECT", "驳回"],
  ["FINISHED", "完成"],
]);
const parseRange = (value: string[] | string | undefined): string[] | undefined => (Array.isArray(value) ? value : value?.split(","));
const serializeRange = (value: string[] | undefined): string | undefined =>
  value?.length === 2 && value.every(Boolean) ? value.join(",") : undefined;

/** 考勤流程审批记录 */
export const FlowApprovalRecord = defineComponent({
  setup: () => {
    const router = useRouter();
    const route = useRoute();
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.flowApprovalRecord;
    const canViewDetail = (): boolean =>
      Boolean(permission?.info && hasPermission(permission.info)) || hasPermission(legacyDetailPermissionCode);
    const tableCode = route.path.replaceAll("/", "");
    const formState = reactive<SearchForm>({
      submitTime: undefined,
      businessTime: undefined,
      businessType: undefined,
      organizationId: "",
      status: undefined,
      username: "",
    });
    const pagination = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const loading = ref(false);
    const exportLoading = ref(false);
    const dataSource = ref<ApprovalRecordRow[]>([]);

    const goDetail = (record: ApprovalRecordRow): void => {
      const title = businessTypeMap.get(record.businessType) ?? "考勤审批";
      void router.push(
        `/d/attendance/flow-approval-record/flow-render?businessType=${record.businessType}&processInstanceId=${record.processInstanceId}&currentTaskId=${record.currentTaskId}&status=${record.status}&type=detail&title=${title}&appName=考勤管理`,
      );
    };

    const columns = [
      {
        title: "编号",
        dataIndex: "formNo",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "申请名称",
        dataIndex: "instanceName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起人",
        dataIndex: "startUserName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起部门",
        dataIndex: "startUserInfo",
        customRender: ({ text }: { text: ApprovalRecordRow["startUserInfo"] }): VNode => {
          const organizationName = text?.organizationName || "--";
          return <PopOver content={organizationName}>{organizationName}</PopOver>;
        },
      },
      {
        title: "发起时间",
        dataIndex: "submitedTime",
        customRender: ({ text }: { text: string }): VNode => {
          const submittedTime = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={submittedTime}>{submittedTime}</PopOver>;
        },
      },
      {
        title: "处理状态",
        dataIndex: "status",
        customRender: ({ text }: { text: string }): VNode => {
          const label = text ? (statusText.get(text) ?? "处理中") : "--";
          return <PopOver content={label}>{label}</PopOver>;
        },
      },
      {
        title: "处理进度",
        dataIndex: "activeNodeName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作",
        dataIndex: "action",
        width: "100px",
        customRender: ({ record }: { record: ApprovalRecordRow }): VNode =>
          canViewDetail() ? (
            <Button type="link" size="small" onClick={() => goDetail(record)}>
              详情
            </Button>
          ) : (
            <></>
          ),
      },
    ];

    const getQuery = () => ({
      ...formState,
      pageNumber: pagination.pageNumber,
      pageSize: pagination.pageSize,
    });
    const queryDefaults: QueryCacheState = {
      submitTime: undefined,
      businessTime: undefined,
      businessType: undefined,
      organizationId: "",
      status: undefined,
      username: "",
      pageNumber: 1,
      pageSize: 10,
    };
    const queryState = usePcQueryState({
      initialState: queryDefaults,
      storage: "url",
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize") {
          return Number(raw);
        }
        if (field === "submitTime" || field === "businessTime") {
          return String(raw).split(",");
        }
        return raw;
      },
    });
    const applyQuery = (next: Partial<typeof queryDefaults>): void => {
      formState.submitTime = parseRange(next.submitTime);
      formState.businessTime = parseRange(next.businessTime);
      formState.businessType = next.businessType;
      formState.organizationId = next.organizationId ?? "";
      formState.status = next.status;
      formState.username = next.username ?? "";
      pagination.pageNumber = Number(next.pageNumber ?? 1);
      pagination.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        const { data } = await flowApprovalRecordPage({
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          applicationCode,
          businessType: formState.businessType,
          organizationId: formState.organizationId || undefined,
          submitTime: serializeRange(formState.submitTime),
          businessTime: serializeRange(formState.businessTime),
          status: formState.status,
          username: formState.username || undefined,
        });
        if (request !== requestVersion) {
          return;
        }
        dataSource.value = data.records as ApprovalRecordRow[];
        pagination.total = data.total;
      } catch (error) {
        if (request === requestVersion) {
          message.error(error instanceof Error ? error.message : "数据加载失败");
        }
      } finally {
        if (request === requestVersion) {
          loading.value = false;
        }
      }
    };

    const queryForm = async (): Promise<void> => {
      pagination.pageNumber = 1;
      await getTableData();
      syncQuery();
    };

    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      if (dataSource.value.length === 0) {
        message.warn("未查询到数据，无法导出");
        return;
      }
      exportLoading.value = true;
      try {
        const { data } = await flowApprovalRecordExport({
          applicationCode,
          businessType: formState.businessType,
          organizationId: formState.organizationId || undefined,
          submitTime: serializeRange(formState.submitTime),
          businessTime: serializeRange(formState.businessTime),
          status: formState.status,
          username: formState.username || undefined,
        });
        const link = document.createElement("a");
        const blobUrl = URL.createObjectURL(
          new Blob([data as BlobPart], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        );
        link.style.display = "none";
        link.href = blobUrl;
        link.download = `${pageTitle ?? "考勤流程审批记录"}.xlsx`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        logger.error(error);
        message.warn("导出失败");
      } finally {
        exportLoading.value = false;
      }
    };

    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      await getTableData();
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.pageNumber = pageNumber || 1;
      pagination.pageSize = pageSize;
      getTableData().then(() => syncQuery());
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      await getTableData();
      syncQuery();
    });

    const layoutSlots = {
      "layout-header": (): VNode => (
        <Button type="primary" onClick={exportExcel} loading={exportLoading.value}>
          导出
        </Button>
      ),
      "layout-content": (): VNode => (
        <>
          <QueryForm />
          <PcDataTable />
        </>
      ),
      "footer-page": (): VNode => (
        <Page
          cachePageQuery={false}
          current={pagination.pageNumber}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showQuickJumper={false}
          showSizeChanger={true}
          showTotal={(total: number): string => `共 ${total} 条数据`}
          pageSizeOptions={["10", "20", "50", "100"]}
          onPageChange={pageChange}
        />
      ),
    };

    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "submitTime",
          label: "发起时间",
          component: "DateRangePicker",
          defaultValue: formState.submitTime,
          componentProps: {
            get valueFormat() {
              return "YYYY-MM-DD";
            },
          },
        },
        {
          fieldName: "businessTime",
          label: "业务开始时间",
          component: "DateRangePicker",
          defaultValue: formState.businessTime,
          componentProps: {
            get valueFormat() {
              return "YYYY-MM-DD";
            },
          },
        },
        {
          fieldName: "businessType",
          label: "业务类型",
          component: "Select",
          defaultValue: formState.businessType,
          componentProps: {
            get placeholder() {
              return "请选择业务类型";
            },
            get style() {
              return { width: "180px" };
            },
            get options() {
              return businessTypeOptions;
            },
            get allowClear() {
              return true;
            },
          },
        },
        {
          fieldName: "filter3",
          label: "部门",
          component: defineComponent({
            inheritAttrs: false,
            setup: () => () => (
              <>
                <DeptTreeSelect
                  value={formState.organizationId}
                  onUpdate:value={(value: string | string[]): void => {
                    formState.organizationId = Array.isArray(value) ? (value[0] ?? "") : value;
                  }}
                  multiple={false}
                  cheakable={false}
                  placeholder="请选择部门"
                  readonly={false}
                  showSearch={true}
                  treeNodeFilterProp="name"
                  treeNodeLabelProp="name"
                  style={{ width: "180px" }}
                />
              </>
            ),
          }),
        },
        {
          fieldName: "status",
          label: "状态",
          component: "Select",
          defaultValue: formState.status,
          componentProps: {
            get placeholder() {
              return "请选择";
            },
            get style() {
              return { width: "180px" };
            },
            get options() {
              return statusOptions;
            },
            get allowClear() {
              return true;
            },
          },
        },
        {
          fieldName: "username",
          label: "发起人",
          component: "Input",
          defaultValue: formState.username,
          componentProps: {
            get placeholder() {
              return "请输入发起人";
            },
            get showCount() {
              return false;
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        formState.submitTime = values["submitTime"] as typeof formState.submitTime;
        formState.businessTime = values["businessTime"] as typeof formState.businessTime;
        formState.businessType = values["businessType"] as typeof formState.businessType;
        formState.status = values["status"] as typeof formState.status;
        formState.username = values["username"] as typeof formState.username;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({
        submitTime: formState.submitTime,
        businessTime: formState.businessTime,
        businessType: formState.businessType,
        status: formState.status,
        username: formState.username,
      }),
    );
    const [PcDataTable, tableApi] = usePcTable({ columns: [], autoFetch: false, rowKey: "processInstanceId", tableCode: tableCode });
    watchEffect(() => {
      tableApi.setColumns(columns as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    return (): VNode => <Layout title={pageTitle ?? "考勤流程审批记录"} v-slots={layoutSlots} />;
  },
});
