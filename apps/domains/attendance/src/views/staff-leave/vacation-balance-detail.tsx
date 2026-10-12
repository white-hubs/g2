import { type PcTableColumn, dayjs, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, Spin, TabPane, Tabs, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, onMounted, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getStaffLeaveBalance, leaveBalanceDetailPage, leaveRulesList } from "@/api/staff-leave";
import { CancelBalanceModal } from "@/components/business/cancel-balance-modal/cancel-balance-modal";
import { ChangeBalanceModal } from "@/components/business/change-balance-modal/change-balance-modal";
import { logger } from "@/logger";
import { businessTypeMap } from "@/types/vacation-type";

interface LeaveRule {
  id: string | number;
  name: string;
  notLimit: boolean;
  unit: "天" | "小时";
}

/** 员工假期余额 详情 */
export const VacationBalanceDetail = defineComponent({
  setup: () => {
    const router = useRouter();
    const { id: staffId, holidayRuleId } = useRoute().query;
    const activeKey = ref<string | number>();
    const unit = ref<"天" | "小时">("天");
    const leaveRules = ref<LeaveRule[]>([]);
    const changeBalanceModalRef = ref<{ openModal: (params: unknown, unit: string) => void }>();
    const cancelBalanceModalRef = ref<{ openModal: (params: unknown, type: string) => void }>();
    const activeRule = computed(() => leaveRules.value.find((e) => String(e.id) === String(activeKey.value)));
    const availableBalance = ref(0);
    const notLimit = ref(false);
    const tableCell = (effective: boolean, content: string): VNode => <span style={{ color: !effective ? "#b5b5b5" : "" }}>{content}</span>;
    const columns: PcTableColumn[] = [
      {
        title: "时间",
        dataIndex: "createTime",
        ellipsis: true,
        width: 180,
        customRender: ({ text, record }: { text: string; record: { effective: boolean } }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time || "--"}>{tableCell(record.effective, time || "--")}</PopOver>;
        },
      },
      {
        title: "修改人",
        dataIndex: "updateName",
        ellipsis: true,
        width: 180,
        customRender: ({ text, record }: { text: string; record: { effective: boolean } }): VNode => (
          <PopOver content={text ?? "--"}>{tableCell(record.effective, text ?? "--")}</PopOver>
        ),
      },
      {
        title: "余额变动",
        dataIndex: "changeNumber",
        ellipsis: true,
        width: 180,
        customRender: ({ text, record }: { text: string; record: { effective: boolean } }): VNode => (
          <PopOver content={text ?? "--"}>{tableCell(record.effective, text ?? "--")}</PopOver>
        ),
      },
      {
        title: "有效期",
        dataIndex: "deadline",
        ellipsis: true,
        width: 180,
        customRender: ({ text, record }: { text: string; record: { effective: boolean } }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD") : "--";
          return <PopOver content={text ?? "--"}>{tableCell(record.effective, time || "--")}</PopOver>;
        },
      },
      {
        title: "备注",
        dataIndex: "remark",
        ellipsis: true,
        width: 180,
        customRender: ({ text, record }: { text: string; record: { effective: boolean } }): VNode => (
          <PopOver content={text ?? "--"}>{tableCell(record.effective, text ?? "--")}</PopOver>
        ),
      },
      {
        title: "操作",
        ellipsis: true,
        width: 180,
        customRender: ({
          record,
        }: {
          record: { id: string; effective: boolean; businessType: string; processInstanceId: string };
        }): VNode => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                cancelRecord(record);
              }}
            >
              {!record.effective ? "详情" : "作废"}
            </Button>
            {record.businessType && record.processInstanceId && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  orderDetail(record);
                }}
              >
                工单详情
              </Button>
            )}
          </>
        ),
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
      activeKey: activeKey.value,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: {
      activeKey: string | number | undefined;
      pageNumber: number;
      pageSize: number;
    } = {
      activeKey: undefined,
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
      if (next.activeKey !== undefined) {
        activeKey.value = String(next.activeKey);
      }
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    const getTypeList = async (): Promise<void> => {
      const res = await leaveRulesList();
      leaveRules.value = res.data as LeaveRule[];
      applyQuery(queryState.state);
      const activeKeyInUrl = leaveRules.value.find((item) => item.id.toString() === String(activeKey.value));
      const activeKeyInHolidayRuleId = holidayRuleId && leaveRules.value.find((item) => item.id.toString() === holidayRuleId);
      if (activeKeyInUrl) {
        activeKey.value = activeKeyInUrl.id;
      } else if (activeKeyInHolidayRuleId) {
        activeKey.value = activeKeyInHolidayRuleId.id;
      } else {
        activeKey.value = leaveRules.value[0]?.id;
      }
    };
    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const current = ++requestVersion;
      try {
        loading.value = true;
        const res = await leaveBalanceDetailPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          staffId,
          holidayRuleId: activeRule.value?.id,
        });
        if (current !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          const rule = leaveRules.value.find((e) => String(e.id) === String(activeKey.value));
          const unitStr = rule ? rule?.unit : "";
          dataSource.value = records.map(
            (e) =>
              ({
                ...(e as Record<string, string>),
                changeNumber: (e as { changeNumber: string }).changeNumber + unitStr,
              }) as unknown,
          );
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
        message.error("加载余额记录失败");
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };
    let tabVersion = 0;
    const balanceLoading = ref(false);
    const fetchTabData = async (): Promise<void> => {
      const current = ++tabVersion;
      if (!activeRule.value) {
        dataSource.value = [];
        pagination.value.total = 0;
        return;
      }
      unit.value = activeRule.value.unit;
      availableBalance.value = 0;
      balanceLoading.value = true;
      try {
        const [balance] = await Promise.all([
          getStaffLeaveBalance({ staffId: String(staffId ?? ""), holidayRuleId: activeRule.value.id, unit: unit.value }),
          getTableData(),
        ]);
        if (current !== tabVersion) {
          return;
        }
        availableBalance.value = balance.data.total;
        notLimit.value = balance.data.notLimit;
      } catch (error) {
        logger.error(error);
        message.error("加载假期余额失败");
      } finally {
        if (current === tabVersion) {
          balanceLoading.value = false;
        }
      }
    };
    const tabChange = (): void => {
      pagination.value.pageNumber = 1;
      void fetchTabData().then(() => syncQuery());
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      void fetchTabData().then(() => syncQuery());
    };

    const cancelRecord = (record: { effective: boolean }): void => {
      cancelBalanceModalRef.value?.openModal(record, record.effective ? "cancel" : "confirm");
    };
    const orderDetail = (record: { businessType: string; processInstanceId: string }): void => {
      try {
        const { businessType, processInstanceId } = record;
        const applicationName = JSON.parse(sessionStorage.getItem("GH-currentApplication") ?? JSON.stringify({}))?.name || "";
        const title = businessTypeMap.get(businessType) || "";
        void router.push(
          `/d/attendance/vacation-balance/flow-render?businessType=${businessType}&processInstanceId=${processInstanceId}&type=detail&title=${title}&appName=${applicationName}`,
        );
      } catch (error) {
        logger.error(error);
        message.error("无法打开工单详情");
      }
    };

    onMounted(async () => {
      loading.value = true;
      try {
        await getTypeList();
        await fetchTabData();
        syncQuery();
      } catch (error) {
        logger.error(error);
        message.error("加载假期类型失败");
      } finally {
        loading.value = false;
      }
    });

    const [ResultTable, tableApi] = usePcTable({
      columns: tableColumns.value,
      rowKey: "id",
      tableCode: "attendance-vacation-balance-detail",
      autoFetch: false,
    });
    watchEffect(() => {
      tableApi.setColumns(tableColumns.value);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });
    const layoutSlots = {
      "layout-content": (): VNode => (
        <>
          <Tabs
            v-model:activeKey={activeKey.value}
            onChange={(key) => {
              activeKey.value = String(key);
              tabChange();
            }}
          >
            {leaveRules.value.map((e) => (
              <TabPane key={e.id} tab={e.name} />
            ))}
          </Tabs>
          <div style="margin:10px 0;height:30px;display:flex;justify-content:space-between;align-items: center;">
            <Spin spinning={balanceLoading.value}>
              <span style="margin-right:10px">
                当前余额：
                {activeRule.value?.notLimit ? "无限制" : `${availableBalance.value}${unit.value}`}
              </span>
            </Spin>
            <Button
              type="primary"
              size="small"
              v-show={Boolean(activeRule.value) && !activeRule.value?.notLimit}
              disabled={balanceLoading.value}
              onClick={() => {
                changeBalanceModalRef.value?.openModal(
                  { staffId, holidayRuleId: activeRule.value?.id, availableBalance: availableBalance.value },
                  unit.value,
                );
              }}
            >
              新增
            </Button>
          </div>
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
        <Layout title="假期余额明细" v-slots={layoutSlots} />
        <ChangeBalanceModal
          ref={changeBalanceModalRef}
          onSuccess={async () => {
            tabChange();
          }}
        />
        <CancelBalanceModal
          ref={cancelBalanceModalRef}
          onSuccess={async () => {
            tabChange();
          }}
        />
      </>
    );
  },
});
