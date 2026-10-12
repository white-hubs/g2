import { type PcTableColumn, dayjs, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, RadioGroup, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFlowProcessPage } from "@/api/flow";
import { DeptTreeSelect } from "@/components/department-select";
import { hasPermission } from "@/permission";

interface Props {
  title: string;
  flowCode: string;
  permission: Record<string, string>;
}

/** 流程列表页表格组件 */
export const FlowListTable = defineComponent({
  props: ["title", "flowCode", "permission"],
  setup: (props: Props) => {
    const router = useRouter();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    /** 跳转到流引擎新增 */
    const addFlow = (): void => {
      void router.push(`${route.path}/flow-render?businessType=${props.flowCode}&type=add&title=${props.title}`);
    };
    /** 跳转到详情页 */
    const goDetail = (record: unknown): void => {
      const { processInstanceId, currentTaskId, status } = record as { processInstanceId: string; currentTaskId: string; status: string };
      void router.push(
        `${route.path}/flow-render?businessType=${props.flowCode}&processInstanceId=${processInstanceId}&currentTaskId=${currentTaskId}&status=${status}&type=detail&title=${props.title}`,
      );
    };
    const formState = reactive<{
      type: string;
      status: string | undefined;
      organizationId: string | undefined;
      username: string | undefined;
      submitTime: string[];
    }>({
      type: "ALL",
      status: undefined,
      organizationId: undefined,
      username: undefined,
      submitTime: [],
    });
    const statusText = (str: string): string => {
      const statusMap = new Map([
        ["SUBMIT", "提交"],
        ["UNDO", "撤销"],
        ["REPEAT", "重新提交"],
        ["APPROVAL", "审批"],
        ["BACK", "撤回"],
        ["COPY", "抄送"],
        ["REJECT", "驳回"],
        ["FINISHED", "完成"],
      ]);
      return statusMap.get(str) || "处理中";
    };
    const columns = [
      {
        title: "编号",
        dataIndex: "formNo",
        key: "formNo",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起部门",
        dataIndex: "organizationName",
        key: "organizationName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起人",
        dataIndex: "startUserName",
        key: "startUserName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起时间",
        dataIndex: "submitedTime",
        key: "submitedTime",
        customRender: ({ text }: { text: string }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: "处理状态",
        dataIndex: "status",
        key: "status",
        customRender: ({ text }: { text: string }): VNode => {
          text = text ? statusText(text) : "-";
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
      {
        title: "处理进度",
        dataIndex: "activeNodeName",
        key: "activeNodeName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        customRender: ({ record }: { record: unknown }): VNode => (
          <>
            {hasPermission(props.permission?.info) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  goDetail(record);
                }}
              >
                详情
              </Button>
            )}
          </>
        ),
      },
    ];

    const loading = ref(false);
    const dataSource = ref<unknown[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });

    const getQuery = () => ({
      type: formState.type,
      status: formState.status,
      organizationId: formState.organizationId,
      username: formState.username,
      submitTime: formState.submitTime,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: ReturnType<typeof getQuery> = {
      type: "ALL",
      status: undefined,
      organizationId: undefined,
      username: undefined,
      submitTime: [],
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
        if (field === "submitTime") {
          return String(raw).split(",");
        }
        return raw;
      },
    });
    const applyQuery = (next: Partial<typeof queryDefaults>): void => {
      formState.type = (next.type as string) ?? "ALL";
      formState.status = next.status as string | undefined;
      formState.organizationId = next.organizationId as string | undefined;
      formState.username = next.username as string | undefined;
      formState.submitTime = Array.isArray(next.submitTime)
        ? next.submitTime
        : typeof next.submitTime === "string"
          ? String(next.submitTime).split(",")
          : [];
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        const res = await getFlowProcessPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
          submitTime: formState.submitTime.length > 0 ? formState.submitTime.join(",") : undefined,
          businessType: props.flowCode,
        });
        if (request !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
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

    const handleTypeChange = async (event: { target: { value: string } }): Promise<void> => {
      formState.type = event.target.value;
      pagination.value.pageNumber = 1;
      loading.value = true;
      syncQuery();
      await getTableData();
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => syncQuery());
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      syncQuery();
    };

    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      await getTableData();
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      await getTableData();
      syncQuery();
    });

    const layoutSlots = {
      "layout-header": (): VNode | boolean =>
        hasPermission(props.permission?.add) && (
          <Button type="primary" onClick={addFlow}>
            新增
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
          current={pagination.value.pageNumber}
          pageSize={pagination.value.pageSize}
          total={pagination.value.total}
          onPageChange={pageChange}
        />
      ),
    };

    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "type",
          label: "",
          component: RadioGroup,
          defaultValue: formState.type,
          componentProps: {
            options: [
              { value: "ALL", label: "全部" },
              { value: "WAITING", label: "待我处理" },
              { value: "SUBMIT", label: "我发起的" },
              { value: "SERVED", label: "抄送给我" },
              { value: "PROCESSED", label: "已处理" },
            ],
            optionType: "button",
            buttonStyle: "solid",
            get onChange() {
              return handleTypeChange;
            },
          },
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
              return "width:180px";
            },
            get options() {
              return [
                { value: "ACTIVE", label: "处理中" },
                { value: "REJECT", label: "驳回" },
                { value: "UNDO", label: "撤销" },
                { value: "FINISHED", label: "完成" },
              ];
            },
          },
        },
        {
          fieldName: "submitTime",
          label: "发起时间",
          component: "DateRangePicker",
          defaultValue: formState.submitTime,
          componentProps: {
            get "value-format"() {
              return "YYYY-MM-DD";
            },
          },
        },
        {
          fieldName: "organizationId",
          label: "发起部门",
          component: DeptTreeSelect,
          defaultValue: formState.organizationId,
          componentProps: {
            get style() {
              return "width:180px";
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
              return "人员姓名";
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
        formState.type = values["type"] as typeof formState.type;
        formState.status = values["status"] as typeof formState.status;
        formState.submitTime = Array.isArray(values["submitTime"]) ? (values["submitTime"] as string[]) : [];
        formState.organizationId = values["organizationId"] as typeof formState.organizationId;
        formState.username = values["username"] as typeof formState.username;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({
        type: formState.type,
        status: formState.status,
        submitTime: formState.submitTime,
        organizationId: formState.organizationId,
        username: formState.username,
      }),
    );
    const [PcDataTable, tableApi] = usePcTable({ columns: [], autoFetch: false, rowKey: "id", tableCode: tableCode });
    watchEffect(() => {
      tableApi.setColumns(columns as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    return (): VNode => <Layout title={props.title} v-slots={layoutSlots} />;
  },
});
