import { dayjs } from "@g2-platform/pc-ui";
import {
  AntModal,
  Button,
  Page,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  message,
  usePcForm,
  usePcQueryState,
  usePcTable,
} from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type SameShift, type SchedulingRule, schedulingRuleDel, schedulingRulePage } from "@/api/scheduling-manage";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
import { classesTypeOptions } from "@/types/classes";
export const SchedulingRules = defineComponent({
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const formState = reactive({
      name: "",
    });
    const permission = appFunctionCodes.attendanceSchedulingRules;
    const add = (): void => {
      router.push("/d/attendance/scheduling-rules-form?action=add");
    };
    const editRow = (record: { id: string }, detail?: boolean): void => {
      router.push(`/d/attendance/scheduling-rules-form?id=${record.id}&action=${detail ? "detail" : "edit"}`);
    };
    const delRow = async (record: { id: string }): Promise<void> => {
      try {
        loading.value = true;
        await schedulingRuleDel({ id: record.id });
        AntModal.destroyAll();
        message.success("操作成功");
        reset();
      } catch (error) {
        logger.error(error);
      } finally {
        loading.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "排班规则名称",
        dataIndex: "name",
        ellipsis: true,
        width: 250,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "规则内容",
        dataIndex: "themeName",
        ellipsis: true,
        customRender: ({ record }: { record: SchedulingRule }): VNode => {
          const sameShift: SameShift[] = record.sameShift ? JSON.parse(record.sameShift as string) : [];
          const showLimit =
            record.ways !== "FIXED" && (Boolean(record.continuousDays) || Boolean(record.intervalHour) || record.sameShift.length > 0);
          const res = (
            <>
              <span style="display:block">{`排班方式：${record.ways === "FIXED" ? "固定班制" : "倒班制"}`}</span>
              {record.ways !== "FIXED" && (
                <span style="display:flex">
                  限制条件：{!showLimit && "无"}
                  {showLimit && (
                    <div>
                      {Boolean(record.continuousDays) && (
                        <span style="display:block">不允许同一人一个月内连续排超过{record.continuousDays}天班</span>
                      )}
                      {Boolean(record.intervalHour) && (
                        <span style="display:block">同一人一天连续上两个班次时，中间必须间隔{record.intervalHour}小时</span>
                      )}
                      {sameShift.map((e) => {
                        const sameShiftType: string[] = [];
                        classesTypeOptions.forEach((ele) => {
                          if (e.sameShiftType?.includes(ele.value)) {
                            sameShiftType.push(ele.label);
                          }
                        });
                        return e.sameShiftNumber ? (
                          <span style="display:block">
                            不允许同一个人一个月内有超过{e.sameShiftNumber}个以上的规定{sameShiftType.join("、") ?? "--"}班次
                          </span>
                        ) : (
                          ""
                        );
                      })}
                    </div>
                  )}
                </span>
              )}
            </>
          );

          return <PopOver content={res as unknown as string}>{res}</PopOver>;
        },
      },
      {
        title: "规则编辑时间",
        dataIndex: "updateTime",
        ellipsis: true,
        width: 250,
        customRender: ({ text }: { text: string }): VNode => {
          const time = dayjs(text).format("YYYY-MM-DD HH:mm:ss");
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 250,
        customRender: ({ record }: { record: { id: string; name: string } }): VNode => (
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
    const queryDefaults: Record<string, unknown> = { name: "", pageNumber: 1, pageSize: 10 };
    const cachedQuery = usePcQueryState({ initialState: queryDefaults, storage: "url" });
    const readQuery = () => ({ name: formState.name, pageNumber: pagination.value.pageNumber, pageSize: pagination.value.pageSize });
    const restoreQuery = (next: Record<string, unknown>) => {
      formState.name = (next.name as string) ?? "";
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };

    let queryVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++queryVersion;
      try {
        loading.value = true;
        const res = await schedulingRulePage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
        });
        if (version !== queryVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
      } finally {
        if (version === queryVersion) {
          loading.value = false;
        }
      }
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => cachedQuery.update(readQuery()));
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      cachedQuery.update(readQuery());
    };
    const reset = async (): Promise<void> => {
      restoreQuery(queryDefaults);
      cachedQuery.update(queryDefaults);
      formApi.setFormValues(formState);
      await getTableData();
    };

    onMounted(async () => {
      restoreQuery(cachedQuery.getSnapshot());
      formApi.setFormValues(formState);
      await getTableData();
    });

    const [PcForm, formApi] = usePcForm({
      layout: "inline",
      cache: false,
      syncStateRef: formState,
      schema: [{ fieldName: "name", label: "", component: "Input", defaultValue: "", componentProps: { placeholder: "请输入名称" } }],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const [PcTable, tableApi] = usePcTable({ columns: columns, rowKey: "id", tableCode: tableCode, autoFetch: false });
    watchEffect(() => {
      tableApi.setColumns(columns);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    const layoutSlots = {
      "layout-header": (): VNode | boolean =>
        hasPermission(permission.add) && (
          <Button type="primary" onClick={add}>
            新增排班规则
          </Button>
        ),
      "layout-content": (): VNode => (
        <>
          <PcForm />
          <PcTable />
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
    return (): VNode => (
      <>
        <Layout title={pageTitle ?? "排班规则"} v-slots={layoutSlots} />
      </>
    );
  },
});
