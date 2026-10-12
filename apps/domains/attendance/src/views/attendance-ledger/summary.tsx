import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, type PickerMode, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";

import { SummaryLedgerExport, SummaryLedgerPage } from "@/api/attendance-ledger";
import { DeptTreeSelect } from "@/components/department-select";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";

import "./index.less";
interface TableTitle {
  id: string;
  name: string;
  notLimit: boolean;
  unit: "天" | "小时";
}
interface Row {
  staffId: string;
  id: string;
  staffName: string;
}

export const Summary = defineComponent({
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceAttendanceStatistics;
    const columns = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "staffName",
        ellipsis: true,
        width: "150px",
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "部门",
        dataIndex: "deptName",
        ellipsis: true,
        width: "150px",
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "应出勤天数",
        dataIndex: "legalWorkDays",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "实际出勤天数",
        dataIndex: "realWorkDays",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "排班出勤天数",
        key: "shift-days",
        children: [
          {
            title: "合计",
            dataIndex: "sumShiftNum",
            key: "sumShiftNum",
            ellipsis: true,
            customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
          },
          {
            title: "白班",
            dataIndex: "morningNum",
            key: "morningNum",
            ellipsis: true,
            customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
          },
          {
            title: "中班",
            dataIndex: "middleNum",
            key: "middleNum",
            ellipsis: true,
            customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
          },
          {
            title: "夜班",
            dataIndex: "nightNum",
            key: "nightNum",
            ellipsis: true,
            customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
          },
        ],
      },
      {
        title: "离岗(天）",
        dataIndex: "leavePostDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "离岗");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "出差(天）",
        dataIndex: "awayBusinessDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "出差");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "旷工天数",
        dataIndex: "skipWorkDay",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "缺卡次数",
        dataIndex: "noClockNum",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "补卡次数",
        dataIndex: "repairClockNum",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "补卡次数");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "迟到次数",
        dataIndex: "lateNum",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "迟到时长(分钟)",
        dataIndex: "lateTotalTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "早退次数",
        dataIndex: "earlyNum",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "早退时长(分钟)",
        dataIndex: "earlyTotalTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? 0}>{text ?? 0}</PopOver>,
      },
      {
        title: "工作日加班(小时）",
        dataIndex: "overtimeWorkDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "工作日加班");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "休息日加班(小时）",
        dataIndex: "overtimeRestDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "休息日加班");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "节假日加班(小时）",
        dataIndex: "overtimeFestDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "节假日加班");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },

      {
        title: "工作日计加班费的时长(小时)",
        dataIndex: "overtimeWorkCostDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "工作日计加班费的时长");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "休息日计加班费的时长(小时）",
        dataIndex: "overtimeRestCostDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "休息日计加班费的时长");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
      {
        title: "节假日计加班费的时长(小时)",
        dataIndex: "overtimeFestCostDuration",
        customRender: ({ text, record }: { text: string; record: Row }): VNode => (
          <PopOver content={text ?? "0"}>
            {text !== "0" && Number(text) > 0 ? (
              <Button
                type="link"
                onClick={() => {
                  handleLink(record, "节假日计加班费的时长");
                }}
              >
                {text ?? "0"}
              </Button>
            ) : (
              <div style="margin-left:20px">{text ?? 0}</div>
            )}
          </PopOver>
        ),
      },
    ];
    const tableColumns = ref<PcTableColumn[]>([]);
    // const = useRoute()
    const time = dayjs().startOf("month").format("YYYY-MM");
    const searchData = reactive<{
      timeType: PickerMode;
      staffName: string;
      deptId: string | undefined;
      groupId: string;
      period: string;
    }>({
      timeType: "month",
      staffName: "",
      deptId: undefined,
      groupId: "",
      period: `${time}-01 00:00:00,${time}-31 23:59:59`,
    });
    const currentMouth = ref(time);
    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        syncQuery();
      });
    };
    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      syncQuery();
    };
    let requestVersion = 0;
    const loading = ref(false);
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        logger.info(currentMouth.value);
        const { data } = await SummaryLedgerPage({ ...searchData, ...pagination.value });
        if (request !== requestVersion) {
          return;
        }
        const { records, total, tableTitle } = data as unknown as { records: unknown[]; total: number; tableTitle: TableTitle[] };
        dataSource.value = records;
        tableColumns.value = [
          ...columns,
          ...tableTitle.map((item) => ({
            title: `${item.name} (${item.unit})`,
            dataIndex: `holiday-${item.id}`,
            ellipsis: true,
            width: 180,
            customRender: (record: {
              record: { staffId: string; statLeaveValueList: { holidayRuleId: string; number: string }[] };
            }): VNode => {
              const holidayRuleId: string = item.id;
              const number = record.record.statLeaveValueList.find((ele) => ele.holidayRuleId === holidayRuleId)?.number;
              let result = "0";
              if (record.record.statLeaveValueList.length > 0) {
                if (number) {
                  result = number;
                } else {
                  result = "0";
                }
              }

              if (!number) {
                result = "0";
              }
              return (
                <PopOver content={result ?? "0"}>
                  {result !== "0" && Number(result) > 0 ? (
                    <Button
                      type="link"
                      onClick={() => {
                        handleLink({ id: holidayRuleId, staffId: record.record?.staffId } as unknown as Row, "动态类型");
                      }}
                    >
                      {result ?? "0"}
                    </Button>
                  ) : (
                    <div style="margin-left:20px">{result ?? 0}</div>
                  )}
                </PopOver>
              );
            },
          })),
        ] as PcTableColumn[];
        pagination.value.total = total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "数据加载失败");
      } finally {
        if (request === requestVersion) {
          loading.value = false;
        }
      }
    };
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      currentMouth.value = time;
      await getTableData();
    };
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await SummaryLedgerExport({ ...searchData })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "汇总统计.xlsx");
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          })
          .catch((res) => {
            logger.debug(res);
            message.error("导出失败");
          });
      } catch (error) {
        logger.error(error);
      } finally {
        exportLoading.value = false;
      }
    };
    const handleLink = (record: Row, code: string): void => {
      const params = {
        period: searchData.period,
        businessType: "",
        sceneCode: "",
        userId: record.staffId ?? "",
      };
      switch (code) {
        case "离岗": {
          params.businessType = "LEAVE_THE_POST";
          params.sceneCode = "";
          break;
        }
        case "出差": {
          params.businessType = "AWAY_BUSINESS";
          params.sceneCode = "";
          break;
        }
        case "补卡次数": {
          params.businessType = "REPAIR_CLOCK";
          params.sceneCode = "";
          break;
        }
        case "工作日加班": {
          params.businessType = "OVERTIME";
          params.sceneCode = "WORK";
          break;
        }
        case "休息日加班": {
          params.businessType = "OVERTIME";
          params.sceneCode = "REST";
          break;
        }
        case "节假日加班": {
          params.businessType = "OVERTIME";
          params.sceneCode = "FESTIVAL";
          break;
        }
        case "工作日计加班费的时长": {
          params.businessType = "OVERTIME";
          params.sceneCode = "WORK";
          break;
        }
        case "休息日计加班费的时长": {
          params.businessType = "OVERTIME";
          params.sceneCode = "REST";
          break;
        }
        case "节假日计加班费的时长": {
          params.businessType = "OVERTIME";
          params.sceneCode = "FESTIVAL";
          break;
        }
        case "动态类型": {
          params.businessType = "LEAVE";
          params.sceneCode = record.id;
          break;
        }
      }
      void router.push(`/d/attendance/attendance-record?title=考勤汇总统计&searchValue=${JSON.stringify(params)}`);
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
          <div class="classes-Summary-form">
            <div class="search">
              <QueryForm />
            </div>
            <div class="search">
              <PcDataTable />
            </div>
          </div>
        </>
      ),
      "footer-page": (): VNode => (
        <>
          <Page
            cachePageQuery={false}
            current={pagination.value.pageNumber}
            pageSize={pagination.value.pageSize}
            total={pagination.value.total}
            onPageChange={pageChange}
          />
        </>
      ),
    };
    const exportLoading = ref(false);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });
    const getQuery = () => ({
      timeType: searchData.timeType,
      staffName: searchData.staffName,
      deptId: searchData.deptId,
      groupId: searchData.groupId,
      period: searchData.period,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: {
      timeType: PickerMode;
      staffName: string;
      deptId: string | undefined;
      groupId: string;
      period: string;
      pageNumber: number;
      pageSize: number;
    } = {
      timeType: "month",
      staffName: "",
      deptId: undefined,
      groupId: "",
      period: `${time}-01 00:00:00,${time}-31 23:59:59`,
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
      searchData.timeType = (next.timeType as PickerMode) ?? "month";
      searchData.staffName = (next.staffName as string) ?? "";
      searchData.deptId = (next.deptId as string | undefined) ?? undefined;
      searchData.groupId = (next.groupId as string) ?? "";
      searchData.period = (next.period as string) ?? `${time}-01 00:00:00,${time}-31 23:59:59`;
      const periodStart = searchData.period.split(",")[0] ?? `${time}-01 00:00:00`;
      currentMouth.value = searchData.timeType === "year" ? dayjs(periodStart).format("YYYY") : dayjs(periodStart).format("YYYY-MM");
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    const dataSource = ref<unknown[]>([]);

    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "staffName",
          label: `${KEYWORD_ALIAS.staff}`,
          component: "Input",
          defaultValue: searchData.staffName,
          componentProps: {
            get placeholder() {
              return "请输入人员姓名";
            },
          },
        },
        {
          fieldName: "deptId",
          label: "部门",
          component: DeptTreeSelect,
          defaultValue: searchData.deptId,
          componentProps: {
            get style() {
              return { width: "200px" };
            },
            get placeholder() {
              return "请选择";
            },
          },
        },
        {
          fieldName: "timeType",
          label: "时间选择",
          component: "Select",
          defaultValue: searchData.timeType,
          componentProps: {
            get style() {
              return { width: "100px" };
            },
            get options() {
              return [
                { label: "按月", value: "month" },
                { label: "按年", value: "year" },
              ];
            },
            get onChange() {
              return (value: typeof searchData.timeType) => {
                if (value === "month") {
                  currentMouth.value = dayjs().startOf("month").format("YYYY-MM");
                  searchData.period = `${currentMouth.value}-01 00:00:00,${currentMouth.value}-31 23:59:59`;
                } else {
                  currentMouth.value = dayjs().startOf("year").format("YYYY");
                  searchData.period = `${currentMouth.value}-01-01 00:00:00,${currentMouth.value}-12-31 23:59:59`;
                }
              };
            },
          },
        },
        {
          fieldName: "currentMouth",
          label: "",
          component: "DatePicker",
          defaultValue: currentMouth.value,
          componentProps: {
            get picker() {
              return searchData.timeType;
            },
            get valueFormat() {
              return searchData.timeType === "month" ? "YYYY-MM" : "YYYY";
            },
            get format() {
              return searchData.timeType === "month" ? "YYYY-MM" : "YYYY";
            },
            get onChange() {
              return (value: typeof currentMouth.value) => {
                if (searchData.timeType === "month") {
                  searchData.period = `${value}-01 00:00:00,${value}-31 23:59:59`;
                } else {
                  searchData.period = `${value}-01-01 00:00:00,${value}-12-31 23:59:59`;
                }
              };
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        searchData.staffName = values["staffName"] as typeof searchData.staffName;
        searchData.deptId = values["deptId"] as typeof searchData.deptId;
        searchData.timeType = values["timeType"] as typeof searchData.timeType;
        currentMouth.value = values["currentMouth"] as typeof currentMouth.value;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({
        staffName: searchData.staffName,
        deptId: searchData.deptId,
        timeType: searchData.timeType,
        currentMouth: currentMouth.value,
      }),
    );
    const [PcDataTable, tableApi] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-attendance-ledger-summary-tsx-0",
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    return (): VNode => <Layout title={pageTitle} v-slots={layoutSlots} />;
  },
});
