import { dayjs } from "@g2-platform/pc-ui";
import { Button, Page, type PcTableColumn, PopOver, Tag, message, usePcForm, usePcQueryState, usePcTable } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { type AttClockInLedgerDetailsResult, clockInLedgerExport, clockInLedgerPage } from "@/api/staff-clock-in";
import { DeptTreeSelect } from "@/components/department-select";
import { convertToChineseWeekday } from "@/hook/calendar";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";
import { ClockInClassesStatus, ClockInStatus, ClockInStatusColor, ClockInStatusOptions } from "@/types/classes";

import style from "@/assets/style.module.less";

export const ClockInLedger = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceclockInLedger;
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
        await clockInLedgerExport({ ...formState })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "打卡台账.xlsx");
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
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

    const columns: PcTableColumn[] = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "userName",
        ellipsis: true,
        width: 120,
        align: "center" as const,
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "部门",
        dataIndex: "orgName",
        ellipsis: true,
        width: 120,
        align: "center" as const,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
    ];

    const tableColumns = ref<PcTableColumn[]>([...columns]);

    const loading = ref(false);
    const dataSource = ref<unknown[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });

    const queryDefaults: Record<string, unknown> = {
      userName: "",
      ledgerDate: dayjs().format("YYYY-MM"),
      orgId: undefined,
      pageNumber: 1,
      pageSize: 10,
    };
    const cachedQuery = usePcQueryState({ initialState: queryDefaults, storage: "url" });
    const readQuery = () => ({
      userName: formState.userName,
      ledgerDate: formState.ledgerDate,
      orgId: formState.orgId,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const restoreQuery = (next: Record<string, unknown>) => {
      formState.userName = (next.userName as string) ?? "";
      formState.ledgerDate = (next.ledgerDate as string) ?? dayjs().format("YYYY-MM");
      formState.orgId = next.orgId as undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };

    let queryVersion = 0;
    const getTableData = async (): Promise<void> => {
      const version = ++queryVersion;
      try {
        loading.value = true;
        const res = await clockInLedgerPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
        });
        if (version !== queryVersion) {
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
          const calendarColumns = details.map((calendarDay) => ({
            title: `${formState.ledgerDate}-${String(calendarDay.today).padStart(2, "0")}`,
            dataIndex: `calendar-${formState.ledgerDate}-${String(calendarDay.today).padStart(2, "0")}`,
            ellipsis: true,
            calendar: true,
            detail: calendarDay,
            width: 220,
            date: formState.ledgerDate,
            today: calendarDay.today,
            customRender: ({ record }: { record: { id: string; details: AttClockInLedgerDetailsResult[] } }): VNode[] | VNode => {
              const detail = record.details[calendarDay.today - 1];
              if (detail.details.length === 0 || detail.details.find((e) => e.state === ClockInClassesStatus.NO_CLOCK)) {
                return (
                  <div class={style["scheduling-item"]}>
                    <Tag color="green" class={style["cell-classes-tag"]} style="height:100%">
                      --
                    </Tag>
                  </div>
                );
              }
              if (detail.details.find((e) => e.state === ClockInClassesStatus.REST)) {
                return (
                  <div class={style["scheduling-item"]}>
                    <Tag color="green" class={style["cell-classes-tag"]} style="height:100%">
                      --
                    </Tag>
                  </div>
                );
              }

              return detail.details.map((e) => {
                const statusArr: JSX.Element[] = [];
                if (e.state === ClockInClassesStatus.NORMAL) {
                  statusArr.push(<span style={{ color: "green" }}>正常</span>);
                } else if (e.state === ClockInClassesStatus.NEGLECT_WORK) {
                  statusArr.push(<span style={{ color: "red" }}>上班缺卡、下班缺卡</span>);
                } else {
                  e.stateDetails.forEach((status, i) => {
                    let text = ClockInStatusOptions.find((op) => op.value === status.name)?.label;
                    if (status.name === ClockInStatus.ABNORMAL_WORK) {
                      // 异常状态把异常的值反显出来
                      text = status.value;
                    }
                    const color = ClockInStatusColor.find((op) => op.value === status.name)?.color ?? "";
                    statusArr.push(<span style={{ color }}>{text}</span>);
                    if (e.stateDetails.length > 1 && i !== e.stateDetails.length - 1) {
                      statusArr.push(<span>,</span>);
                    }
                  });
                }
                let timeDom = (
                  <span>
                    {`(${e.startWorkTime || "-"}${e.startWorkOmit ? "补卡" : ""}${e.startWorkOut ? "外勤" : ""},${e.endWorkTime || "-"}${e.endWorkOmit ? "补卡" : ""}${e.endWorkOut ? "外勤" : ""})`}
                  </span>
                );
                if (e.state === ClockInClassesStatus.NEGLECT_WORK) {
                  timeDom = <span>(-,-)</span>;
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
          tableColumns.value = [...columns, ...calendarColumns];
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.error(error);
      } finally {
        if (version === queryVersion) {
          loading.value = false;
        }
      }
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        cachedQuery.update(readQuery());
      });
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
      schema: [
        {
          fieldName: "ledgerDate",
          label: "日期",
          component: "DatePicker",
          defaultValue: dayjs().format("YYYY-MM"),
          componentProps: { picker: "month", valueFormat: "YYYY-MM", allowClear: false, placeholder: "请选择年月" },
        },
        { fieldName: "userName", label: "", component: "Input", defaultValue: "", componentProps: { placeholder: "请输入人员姓名" } },
        {
          fieldName: "orgId",
          label: "部门",
          component: DeptTreeSelect,
          componentProps: { placeholder: "请选择部门", style: { width: "223px" } },
        },
      ],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const [PcTable, tableApi] = usePcTable({
      columns: tableColumns.value,
      rowKey: "id",
      tableCode: "attendance-clock-in-ledger",
      autoFetch: false,
      headerCell: ({ column, title }) => {
        const field = String(column.dataIndex ?? "").replace(/^calendar-/, "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(field)) {
          return title;
        }
        const date = dayjs(field);
        const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.day()];
        return (
          <div class={style["calendar-tabel-header"]}>
            <span>{date.format("MM-DD")}</span>
            <span>{week}</span>
          </div>
        );
      },
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
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
          <PcForm />
          <PcTable class="ledger-table" />
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
    return (): VNode => <Layout title={pageTitle ?? "打卡台账"} v-slots={layoutSlots} class={style["clock-in-table"]} />;
  },
});
