import { dayjs } from "@g2-platform/pc-ui";
import { Button, Page, type PcTableColumn, PopConfirm, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { leaveRulesDelete, leaveRulesPage } from "@/api/staff-leave";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
/** 请假规则 */
export const LeaveRules = defineComponent({
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const formState = reactive({
      name: "",
    });
    const permission = appFunctionCodes.attendanceLeaveRules;

    const add = (): void => {
      void router.push("/d/attendance/leave-rules-form?action=add");
    };
    const editRow = (record: { id: string }, detail?: boolean): void => {
      void router.push(`/d/attendance/leave-rules-form?id=${record.id}&action=${detail ? "detail" : "edit"}`);
    };
    const delRow = async (record: { id: string }): Promise<void> => {
      if (loading.value) {
        return;
      }
      try {
        loading.value = true;
        await leaveRulesDelete({ id: record.id });
        message.success("操作成功");
        await getTableData();
      } catch (error) {
        logger.error(error);
        message.error("删除规则失败");
      } finally {
        loading.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "假期类型",
        dataIndex: "name",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "假期规则内容",
        dataIndex: "leaveTimeUnit",
        ellipsis: true,
        customRender: ({ record }: { record: { notLimit: boolean; minAskUnit: number; calculationWay: string } }): VNode => {
          const res = (
            <>
              <span>最小请假单位：按{record.minAskUnit}小时请假</span>
              <br />
              <span>请假时长计算方式：{record.calculationWay === "WORKING_DAY" ? "按工作日计算时长" : "按自然日计算时长"}</span>
              <br />
              <span>假期额度：{record.notLimit ? "不限额" : "限额"}</span>
            </>
          );
          return <PopOver content={res as unknown as string}>{res}</PopOver>;
        },
      },
      {
        title: "规则编辑时间",
        dataIndex: "updateTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        customRender: ({ record }: { record: { id: string } }): VNode => (
          <>
            {hasPermission(permission.update) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  editRow(record);
                }}
              >
                编辑
              </Button>
            )}
            {hasPermission(permission.delete) && (
              <PopConfirm
                okText="确定"
                cancelText="取消"
                title="确认删除该项？"
                onConfirm={() => {
                  delRow(record);
                }}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
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

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++requestVersion;
      try {
        loading.value = true;
        const res = await leaveRulesPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          name: formState.name,
        });
        if (version !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
        message.error("加载规则失败");
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };
    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      void getTableData();
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
    };
    const reset = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      pagination.value.pageSize = 10;
      formState.name = "";
      await getTableData();
    };

    onMounted(async () => {
      await getTableData();
    });

    const [QueryForm] = usePcForm({
      layout: "inline",
      cache: true,
      syncStateRef: formState,
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "假期类型", showCount: false },
        },
      ],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const [RulesTable, rulesTableApi] = usePcTable({ columns, rowKey: "id", tableCode, autoFetch: false });
    watchEffect(() => {
      rulesTableApi.setDataSource(dataSource.value);
      rulesTableApi.loading.value = loading.value;
    });
    const layoutSlots = {
      "layout-header": (): VNode | boolean =>
        hasPermission(permission.add) && (
          <Button type="primary" onClick={add}>
            新增
          </Button>
        ),
      "layout-content": (): VNode => (
        <>
          <QueryForm />
          <RulesTable />
        </>
      ),
      "footer-page": (): VNode => (
        <Page
          cachePageQuery={true}
          current={pagination.value.pageNumber}
          pageSize={pagination.value.pageSize}
          total={pagination.value.total}
          onPageChange={pageChange}
        />
      ),
    };
    return (): VNode => (
      <>
        <Layout title={pageTitle ?? "请假规则"} v-slots={layoutSlots} />
      </>
    );
  },
});
