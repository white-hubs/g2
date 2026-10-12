import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Modal, Page, type PickerMode, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { SequentialDetail, SequentialLedgerExport, SequentialPage } from "@/api/attendance-ledger";
import { DeptTreeSelect } from "@/components/department-select";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";

import "./index.less";
interface TableTitle {
  day: string;
  week: string;
}

// interface TypeValueList {
//   /** 余额 */
//   availableBalance: string;
//   /** 假期类型id，假期规则id */
//   holidayRuleId: number;
//   /** 员工id */
//   staffId: string;
// }
export const State = defineComponent({
  setup: () => {
    const columns: PcTableColumn[] = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "staffName",
        fixed: "left",
        width: 180,
      },
      {
        title: "部门",
        dataIndex: "deptName",
        fixed: "left",
        width: 180,
      },
    ];
    const statusColumns: PcTableColumn[] = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "staffName",
        fixed: "left",
        width: 180,
      },
      {
        title: "状态",
        dataIndex: "status",
        fixed: "left",
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <span>{statusList[text]?.title ?? "--"}</span>,
      },
      {
        title: "开始时间",
        dataIndex: "startTime",
        fixed: "left",
        width: 180,
        customRender: ({ text }: { text: string }): string => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        title: "结束时间",
        dataIndex: "endTime",
        fixed: "left",
        width: 180,
        customRender: ({ text }: { text: string }): string => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      },
    ];
    const tableColumns = ref<PcTableColumn[]>([]);
    const NumColumns = ref<PcTableColumn[]>([]);
    // const = useRoute()
    const time = dayjs().startOf("month").format("YYYY-MM");
    const searchData = reactive<{
      timeType: PickerMode;
      staffName: string;
      deptId: string;
      groupId: string;
      yearMonth: string;
    }>({
      yearMonth: time,
      timeType: "month",
      staffName: "",
      deptId: "",
      groupId: "",
    });
    const currentMouth = ref(time);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });
    const getQuery = () => ({
      yearMonth: searchData.yearMonth,
      timeType: searchData.timeType,
      staffName: searchData.staffName,
      deptId: searchData.deptId,
      groupId: searchData.groupId,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: {
      yearMonth: string;
      timeType: PickerMode;
      staffName: string;
      deptId: string;
      groupId: string;
      pageNumber: number;
      pageSize: number;
    } = {
      yearMonth: time,
      timeType: "month",
      staffName: "",
      deptId: "",
      groupId: "",
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
      searchData.yearMonth = (next.yearMonth as string) ?? time;
      searchData.timeType = (next.timeType as PickerMode) ?? "month";
      searchData.staffName = (next.staffName as string) ?? "";
      searchData.deptId = (next.deptId as string) ?? "";
      searchData.groupId = (next.groupId as string) ?? "";
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        syncQuery();
      });
    };

    const statusList: Record<string, { title: string; color: string }> = {
      LEAVE: { title: "请假", color: "#b886f8" },
      POST: { title: "离岗", color: "#eba552" },
      AWAY: { title: "出差", color: "#e8a9b0" },
      REST: { title: "休息", color: "#96d3f4" },
      WORKING: { title: "在岗", color: "#c3c3c3" },
    };
    const ElementDiv: {
      workSum: (sunStatus: { day: string; count: string }[], day: string) => string;
      leaveSum: (sunStatus: { day: string; count: string }[], day: string) => string;
      postSum: (sunStatus: { day: string; count: string }[], day: string) => string;
      awaySum: (sunStatus: { day: string; count: string }[], day: string) => string;
      restSum: (sunStatus: { day: string; count: string }[], day: string) => string;
    } = {
      workSum: (sunStatus: { day: string; count: string }[], day: string) => {
        const number = sunStatus.find((ele) => ele.day === day);
        if (!number) {
          return "--";
        }
        return number?.count;
      },
      leaveSum: (sunStatus: { day: string; count: string }[], day: string) => {
        const number = sunStatus.find((ele) => ele.day === day);
        if (!number) {
          return "--";
        }
        return number?.count;
      },
      postSum: (sunStatus: { day: string; count: string }[], day: string) => {
        const number = sunStatus.find((ele) => ele.day === day);
        if (!number) {
          return "--";
        }
        return number?.count;
      },
      awaySum: (sunStatus: { day: string; count: string }[], day: string) => {
        const number = sunStatus.find((ele) => ele.day === day);
        if (!number) {
          return "--";
        }
        return number?.count;
      },
      restSum: (sunStatus: { day: string; count: string }[], day: string) => {
        const number = sunStatus.find((ele) => ele.day === day);
        if (!number) {
          return "--";
        }
        return number?.count;
      },
    };
    let requestVersion = 0;
    const loading = ref(false);
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        logger.info(currentMouth.value);
        const { data } = await SequentialPage({ ...searchData, ...pagination.value });
        if (request !== requestVersion) {
          return;
        }
        const { records, total, dateTableList, sumStatus } = data as unknown as {
          records: unknown[];
          total: number;
          dateTableList: TableTitle[];
          sumStatus: {
            awaySum: { day: string; count: string }[];
            leaveSum: { day: string; count: string }[];
            postSum: { day: string; count: string }[];
            restSum: { day: string; count: string }[];
            workSum: { day: string; count: string }[];
          };
        };
        dataSource.value = records;

        NumColumns.value = [
          {
            title: `${KEYWORD_ALIAS.staff}状态`,
            dataIndex: "title",
            fixed: "left",
            width: 180,
          },
          ...dateTableList.map((item) => ({
            title: `${item.week}(${item.day})`,
            dataIndex: `calendar-${item.day}`,
            ellipsis: true,
            width: 180,
            customRender: (record: {
              record: {
                type: string;
              };
            }): VNode => {
              const type = record.record.type as keyof typeof ElementDiv;
              return <span>{ElementDiv[type]?.(sumStatus[type], item.day) ?? "--"}</span>;
            },
          })),
        ];
        tableColumns.value = [
          ...columns,
          ...dateTableList.map((item) => ({
            title: `${item.week}(${item.day})`,
            dataIndex: `calendar-${item.day}`,
            ellipsis: true,
            width: 180,
            customRender: (record: {
              record: {
                staffId: string;
                dateList: {
                  day: string;
                  statusList: string[];
                }[];
              };
            }): VNode[] | string => {
              logger.info(record);
              const day = item.day;
              const number = record.record.dateList.find((ele) => ele.day === day);
              if (!number) return "--";
              logger.info(number, 7878);
              const list = number?.statusList.length > 1 ? number?.statusList.filter((status) => status !== "REST") : number.statusList;
              return list.map((info) => {
                return (
                  <span
                    key={info}
                    onClick={() => {
                      detailsList(record.record.staffId, day);
                    }}
                    style={{ color: statusList[info]?.color, marginRight: "10px", cursor: "pointer" }}
                  >
                    {statusList[info]?.title}
                  </span>
                );
              });
            },
          })),
        ];

        pagination.value.total = total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "数据加载失败");
      } finally {
        if (request === requestVersion) {
          loading.value = false;
        }
      }
    };
    const statusDetailsList = ref<{ id?: string; staffName: string; status: string; startTime: string; endTime: string }[]>([]);
    const detailLoading = ref(false);
    let detailVersion = 0;
    const detailsList = async (staffId: string, day: string): Promise<void> => {
      const version = ++detailVersion;
      visible.value = true;
      detailLoading.value = true;
      statusDetailsList.value = [];
      try {
        const { data } = await SequentialDetail({ staffId, day: Number(new Date(searchData.yearMonth + "-" + day)) });
        if (version === detailVersion && visible.value) {
          statusDetailsList.value = data as typeof statusDetailsList.value;
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "状态明细加载失败");
      } finally {
        if (version === detailVersion) {
          detailLoading.value = false;
        }
      }
    };
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      currentMouth.value = time;
      await getTableData();
    };
    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      syncQuery();
    };
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await SequentialLedgerExport({ ...searchData })
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
    onMounted(async () => {
      applyQuery(queryState.state);
      await getTableData();
      syncQuery();
    });
    const visible = ref(false);
    const layoutSlots = {
      "layout-header": (): VNode => (
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
              <PcDataTable1 />
            </div>
          </div>
          <Modal
            title={`${KEYWORD_ALIAS.staff}状态明细`}
            open={visible.value}
            okText="确定"
            cancelText="取消"
            onCancel={() => {
              visible.value = false;
              ++detailVersion;
            }}
            width={800}
            onOk={() => {
              visible.value = false;
            }}
          >
            <PcDataTable2 />
          </Modal>
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
    const dataSource = ref<unknown[]>([]);
    const numSource = ref<unknown[]>([
      { title: "在岗", type: "workSum" },
      { title: "请假", type: "leaveSum" },
      { title: "离岗", type: "postSum" },
      { title: "出差", type: "awaySum" },
      { title: "休息", type: "restSum" },
    ]);

    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "staffName",
          label: `${KEYWORD_ALIAS.staff}`,
          component: "Input",
          defaultValue: searchData.staffName,
          componentProps: {},
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
          },
        },
        {
          fieldName: "yearMonth",
          label: "",
          component: "DatePicker",
          defaultValue: searchData.yearMonth,
          componentProps: {
            get picker() {
              return "month";
            },
            get valueFormat() {
              return "YYYY-MM";
            },
            get format() {
              return "YYYY-MM";
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        searchData.staffName = values["staffName"] as typeof searchData.staffName;
        searchData.deptId = values["deptId"] as typeof searchData.deptId;
        searchData.yearMonth = values["yearMonth"] as typeof searchData.yearMonth;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({ staffName: searchData.staffName, deptId: searchData.deptId, yearMonth: searchData.yearMonth }),
    );
    const [PcDataTable, tableApi] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-attendance-ledger-state-tsx-0",
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });
    const [PcDataTable1, tableApi1] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-attendance-ledger-state-tsx-1",
      autoScrollY: false,
    });
    watchEffect(() => {
      tableApi1.setColumns(NumColumns.value as PcTableColumn[]);
      tableApi1.setDataSource(numSource.value);
      tableApi1.loading.value = false;
    });
    const [PcDataTable2, tableApi2] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-attendance-ledger-state-tsx-2",
      autoScrollY: false,
    });
    watchEffect(() => {
      tableApi2.setColumns(statusColumns as PcTableColumn[]);
      tableApi2.setDataSource(statusDetailsList.value);
      tableApi2.loading.value = detailLoading.value;
    });

    return (): VNode => <Layout title={`${KEYWORD_ALIAS.staff}状态表`} v-slots={layoutSlots} />;
  },
});
