import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { leaveBalanceExport, leaveBalancePage } from "@/api/staff-leave";
import { AttendanceGroupSelect } from "@/components/business/attendance-group-select/attendance-group-select";
import { BatchUpdateModel } from "@/components/business/vacation-balance-modal/batch-update-modal";
import { DeptTreeSelect } from "@/components/department-select";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";

interface TableTitle {
  id: number;
  name: string;
  notLimit: boolean;
  unit: "天" | "小时";
}

interface TypeValueList {
  /** 余额 */
  availableBalance: string;
  /** 假期类型id，假期规则id */
  holidayRuleId: number;
  /** 员工id */
  staffId: string;
}

/** 员工假期余额 */
export const VacationBalance = defineComponent({
  setup: () => {
    const router = useRouter();
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const permission = appFunctionCodes.attendanceVacationBalance;
    const formState = reactive({
      staffName: "",
      deptId: undefined,
      groupId: undefined,
    });
    const exportLoading = ref(false);
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await leaveBalanceExport({ ...formState })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "假期余额.xlsx");
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

    const toDetail = (record: { staffId: string }, holidayRuleId?: number): void => {
      void router.push(`/d/attendance/leave-balance-detail?id=${record.staffId}&holidayRuleId=${holidayRuleId}`);
    };

    /**
     * 跳转详情-新窗口
     * @param record
     */
    const toDetailWindow = (record: { staffId: string }): void => {
      window.open(`/d/attendance/leave-balance-detail?id=${record.staffId}&holidayRuleId=undefined`, "_blank");
    };

    const columns: PcTableColumn[] = [
      {
        title: "姓名",
        dataIndex: "staffName",
        ellipsis: true,
        fixed: "left",
        width: 180,
        customRender: ({ record }: { record: { staffName: string; staffId: string } }): VNode => (
          <Button
            type="link"
            size="small"
            onClick={() => {
              toDetailWindow(record);
            }}
          >
            {record.staffName}
          </Button>
        ),
      },
      {
        title: "考勤组",
        dataIndex: "groupName",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "部门",
        dataIndex: "deptName",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "入职时间",
        dataIndex: "enterDate",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD") : "--";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
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
    const getQuery = () => ({
      staffName: formState.staffName,
      deptId: formState.deptId,
      groupId: formState.groupId,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: ReturnType<typeof getQuery> = {
      staffName: "",
      deptId: undefined,
      groupId: undefined,
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
      formState.staffName = (next.staffName as string) ?? "";
      formState.deptId = next.deptId as undefined;
      formState.groupId = next.groupId as undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const current = ++requestVersion;
      try {
        loading.value = true;
        const res = await leaveBalancePage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
        });
        if (current !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total, tableTitle } = res.data as unknown as { records: unknown[]; total: number; tableTitle: TableTitle[] };

          tableColumns.value = [
            ...columns,
            ...tableTitle.map((e) => ({
              title: `${e.name}(${e.unit})`,
              dataIndex: `${e.name}(${e.unit})`,
              ellipsis: true,
              width: 180,
              customRender: ({ record }: { record: { typeValueList: TypeValueList[]; staffId: string } }): VNode | string => {
                const holidayRuleId = e.id;
                // 判断你是否有这个假期
                if (!record.typeValueList.find((ele) => ele.holidayRuleId === holidayRuleId)) {
                  return "--";
                }
                if (e.notLimit) {
                  return "不限额";
                }
                const balance = record.typeValueList.find((ele) => ele.holidayRuleId === e.id);
                if (balance) {
                  return (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        toDetail(record, holidayRuleId);
                      }}
                    >
                      {balance.availableBalance}
                    </Button>
                  );
                }
                return "--";
              },
            })),
          ];
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
        message.error("加载数据失败");
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };

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
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      queryFormApi.setFormValues(formState);
      await getTableData();
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      queryFormApi.setFormValues(formState);
      await getTableData();
    });
    const updateModelRef = ref<{ openModal: () => void }>();
    const actionType = ref<"add" | "update">("update");
    const batchUpdate = (action: "add" | "update"): void => {
      actionType.value = action;
      updateModelRef.value?.openModal();
    };
    const [ResultTable, tableApi] = usePcTable({ columns: tableColumns.value, rowKey: "staffId", tableCode: tableCode, autoFetch: false });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      syncStateRef: formState,
      schema: [
        {
          component: "Input",
          fieldName: "staffName",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "人员姓名", showCount: false },
        },
        {
          component: DeptTreeSelect,
          fieldName: "deptId",
          label: "部门",
          defaultValue: undefined,
          componentProps: { style: { width: "180px" } },
        },
        {
          component: AttendanceGroupSelect,
          fieldName: "groupId",
          label: "考勤组",
          defaultValue: undefined,
          componentProps: { style: { width: "180px" } },
        },
      ],
      handleSubmit: () => {
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const layoutSlots = {
      "layout-header": (): VNode => (
        <div>
          {hasPermission(permission.batchUpdate) && (
            <Button
              style={{ marginRight: "16px" }}
              type="primary"
              onClick={() => {
                batchUpdate("update");
              }}
            >
              批量修改
            </Button>
          )}
          {hasPermission(permission.batchAdd) && (
            <Button
              style={{ marginRight: "16px" }}
              type="primary"
              onClick={() => {
                batchUpdate("add");
              }}
            >
              批量新增
            </Button>
          )}
          {hasPermission(permission.export) && (
            <Button type="primary" disabled={dataSource.value.length === 0} onClick={exportExcel} loading={exportLoading.value}>
              导出
            </Button>
          )}
        </div>
      ),
      "layout-content": (): VNode => (
        <>
          <QueryForm />
          <ResultTable />
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
        <Layout title={pageTitle ?? `${KEYWORD_ALIAS.staff}假期余额`} v-slots={layoutSlots} />
        <BatchUpdateModel ref={updateModelRef} action={actionType.value} onEnter={getTableData} />
      </>
    );
  },
});
