import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { DayLedgerExport, DayLedgerPage } from "@/api/attendance-ledger";
import type { AttClockInLedgerDetailsResult } from "@/api/staff-clock-in";
import { DeptTreeSelect } from "@/components/department-select";
import { convertToChineseWeekday } from "@/hook/calendar";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
import { ClockInClassesStatus, DayInStatusColor } from "@/types/classes";

import style from "@/assets/style.module.less";
export const Day = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceAttendanceStatisticsDaily;
    const formState = reactive({
      userName: "",
      ledgerDate: dayjs().format("YYYY-MM"),
      orgId: undefined,
    });
    const exportLoading = ref(false);
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await DayLedgerExport({ ...formState })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "考勤每日统计.xlsx");
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          })
          .catch((res) => {
            logger.debug(res);
            message.warn("未查询到数据，无法导出");
          });
      } catch (error) {
        logger.error(error);
      } finally {
        exportLoading.value = false;
      }
    };

    const columns = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "userName",
        ellipsis: true,
        width: 120,
        align: "center",
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "部门",
        dataIndex: "orgName",
        ellipsis: true,
        width: 120,
        align: "center",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
    ];

    const tableColumns = ref<PcTableColumn[]>(columns as PcTableColumn[]);
    const tableSolt = {
      headerCell: ({
        column,
      }: {
        column: { calendar: true; detail: AttClockInLedgerDetailsResult; title: string; date: string };
      }): VNode | string => {
        if (column.calendar) {
          return (
            <div class={style["calendar-tabel-header"]}>
              <span>
                {dayjs(column.date).format("MM")}-{`${column.detail.today < 10 ? 0 : ""}${column.detail.today}`}
              </span>
              <span>{column.detail.week}</span>
            </div>
          );
        }
        return column.title;
      },
    };

    const loading = ref(false);
    const dataSource = ref<unknown[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });
    const getQuery = () => ({
      userName: formState.userName,
      ledgerDate: formState.ledgerDate,
      orgId: formState.orgId,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: ReturnType<typeof getQuery> = {
      userName: "",
      ledgerDate: dayjs().format("YYYY-MM"),
      orgId: undefined,
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

        return raw;
      },
    });
    const applyQuery = (next: Partial<typeof queryDefaults>): void => {
      formState.userName = (next.userName as string) ?? "";
      formState.ledgerDate = (next.ledgerDate as string) ?? dayjs().format("YYYY-MM");
      formState.orgId = next.orgId as undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        const res = await DayLedgerPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
        });
        if (request !== requestVersion) {
          return;
        }
        if (res.data) {
          // 默认显示表头日期
          const endDate = dayjs(formState.ledgerDate).endOf("month").date();
          const defaultDetails = [];
          for (let index = 1; index <= endDate; index++) {
            const today = dayjs(formState.ledgerDate)
              .startOf("month")
              .add(index - 1, "day");
            defaultDetails.push({
              week: convertToChineseWeekday(today.day()),
              today: today.date(),
              details: [],
            });
          }
          const details =
            res.data.records.length > 0 ? (res.data.records[0] as { details: AttClockInLedgerDetailsResult[] }).details : defaultDetails;
          const calendarColumns = details.map((calendarEntry) => ({
            title: calendarEntry.week,
            dataIndex: `calendar-${formState.ledgerDate}-${calendarEntry.today}`,
            ellipsis: true,
            calendar: true,
            detail: calendarEntry,
            width: 220,
            date: formState.ledgerDate,
            today: calendarEntry.today,
            customRender: ({
              record,
              column,
            }: {
              record: { id: string; details: AttClockInLedgerDetailsResult[] };
              index: number;
              column: { today: number };
            }): VNode | VNode[] => {
              const detail = record.details[column.today - 1];
              if (detail.details.length === 0 || detail.details.find((e) => e.state === ClockInClassesStatus.NO_CLOCK)) {
                return <div class={style["scheduling-item"]} />;
              }
              if (detail.details.find((e) => e.state === ClockInClassesStatus.REST)) {
                return (
                  <div class={style["scheduling-item"]}>
                    <div class={style["cell-classes-tag"]} style="height:100%">
                      休息
                    </div>
                  </div>
                );
              }
              if (detail.details.find((e) => e.state === ClockInClassesStatus.NEGLECT_WORK)) {
                return (
                  <div class={style["scheduling-item"]}>
                    <div class={style["cell-classes-tag"]} style="height:100%;color:red">
                      旷工
                    </div>
                  </div>
                );
              }

              return detail.details.map((e) => {
                const statusArr: JSX.Element[] = [];
                if (e.state === ClockInClassesStatus.NORMAL) {
                  statusArr.push(<span style={{ color: "#1CC59B" }}>正常</span>);
                } else {
                  e.stateDetails.forEach((status, i) => {
                    const color = DayInStatusColor.find((op) => op.value === status.name)?.color ?? "";
                    statusArr.push(<span style={{ color }}>{status.value}</span>);
                    if (e.stateDetails.length > 1 && i !== e.stateDetails.length - 1) {
                      statusArr.push(<span>,</span>);
                    }
                  });
                }
                let timeDom = (
                  <span>
                    {`(${e.startWorkTime || "-"},${e.endWorkTime || "-"})`}
                    {/* {`(${e.startWorkTime || '-'}${e.startWorkOut ? '外勤' : ''},${e.endWorkOut ? '外勤' : ''})`} */}
                  </span>
                );
                if (e.state === ClockInClassesStatus.NEGLECT_WORK) {
                  timeDom = <span>(旷工)</span>;
                }

                return (
                  <div class={style["clock-in-legder-status"]} key={Math.floor(Math.random() * parseInt(record.id) + 1)}>
                    <span>{statusArr}</span>
                    {timeDom}
                  </div>
                );
              });
            },
          }));
          tableColumns.value = [...columns, ...calendarColumns] as PcTableColumn[];
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

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => syncQuery());
    };

    const queryForm = (): void => {
      pagination.value.pageNumber = 1;
      getTableData().then(() => syncQuery());
    };
    const reset = (): void => {
      applyQuery(queryDefaults);
      syncQuery();
      void getTableData();
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      await getTableData();
      syncQuery();
    });

    const layoutSlots = {
      "layout-header": (): VNode | boolean =>
        hasPermission(permission.export) && (
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
          fieldName: "ledgerDate",
          label: "日期",
          component: "DatePicker",
          defaultValue: formState.ledgerDate,
          componentProps: {
            get picker() {
              return "month";
            },
            get placeholder() {
              return "请选择年月";
            },
            get valueFormat() {
              return "YYYY-MM";
            },
            get allowClear() {
              return false;
            },
          },
        },
        {
          fieldName: "userName",
          label: "",
          component: "Input",
          defaultValue: formState.userName,
          componentProps: {
            get placeholder() {
              return "请输入人员姓名";
            },
            get showCount() {
              return false;
            },
          },
        },
        {
          fieldName: "orgId",
          label: "部门",
          component: DeptTreeSelect,
          defaultValue: formState.orgId,
          componentProps: {
            get style() {
              return { width: "223px" };
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        formState.ledgerDate = values["ledgerDate"] as typeof formState.ledgerDate;
        formState.userName = values["userName"] as typeof formState.userName;
        formState.orgId = values["orgId"] as typeof formState.orgId;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({ ledgerDate: formState.ledgerDate, userName: formState.userName, orgId: formState.orgId }),
    );
    const [PcDataTable, tableApi] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-attendance-ledger-day-tsx-0",
      headerCell: ({ column }) => tableSolt.headerCell({ column: column as Parameters<typeof tableSolt.headerCell>[0]["column"] }),
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    return (): VNode => <Layout title={pageTitle} v-slots={layoutSlots} class={style["clock-in-table"]} />;
  },
});
