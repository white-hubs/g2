import type {
  DutyAssignmentDetailVO,
  DutyAssignmentItemVO,
  DutyAssignmentOverviewAssignmentVO,
  DutyAssignmentOverviewRoleGroupVO,
  DutyAssignmentOverviewStatVO,
  DutyDateTime,
  DutyRecordSummaryVO,
} from "@g2-contract/safety-personnel";
import { markRaw } from "vue";
import { computed, defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import {
  getDutyAssignment,
  getDutyAssignmentOverviewStatistics,
  listDutyAssignmentOverviewRoleGroups,
  listDutyAssignmentItemRecords,
  listDutyRoleAssignments,
} from "@/api/server";
import { SIGN_STATUS_OPTIONS } from "@/constants";
import { PageLayout, usePcForm, usePcTable, Button, RadioGroup, Drawer, Empty, Modal, Space, Tag } from "@/pc-ui-runtime";
import { formatPercent, formatText, periodLabel, showApiError, statusTag, toPercentNumber } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

const UNKNOWN_ROLE_NAME = "未配置角色";

const OverviewAssignmentTable = defineComponent({
  props: {
    columns: { type: Array as PropType<Record<string, unknown>[]>, required: true },
    dataSource: { type: Array as PropType<DutyAssignmentOverviewAssignmentVO[]>, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    const [DutyTable, tableApi] = usePcTable({
      tableCode: "safety-duty-overview-1",
      autoScrollY: false,
      autoFetch: false,
      columns: props.columns,
      dataSource: props.dataSource,
      rowKey: "assignmentId",
    });

    watch(
      () => props.columns,
      (columns) => {
        tableApi.setColumns(columns);
      },
      { deep: true },
    );

    watch(
      () => props.dataSource,
      (rows) => {
        tableApi.setDataSource(rows);
      },
      { deep: true },
    );

    watch(
      () => props.loading,
      (loading) => {
        tableApi.loading.value = loading;
      },
      { immediate: true },
    );

    return (): JSX.Element => (
      <div class="safety-duty-table">
        <DutyTable />
      </div>
    );
  },
});

const AssignmentItemTable = defineComponent({
  props: {
    columns: { type: Array as PropType<Record<string, unknown>[]>, required: true },
    dataSource: { type: Array as PropType<DutyAssignmentItemVO[]>, default: () => [] },
  },
  setup(props) {
    const [DutyTable, tableApi] = usePcTable({
      tableCode: "safety-duty-overview-2",
      autoScrollY: false,
      autoFetch: false,
      columns: props.columns,
      dataSource: props.dataSource,
      rowKey: "assignmentItemId",
    });

    watch(
      () => props.columns,
      (columns) => {
        tableApi.setColumns(columns);
      },
      { deep: true },
    );

    watch(
      () => props.dataSource,
      (rows) => {
        tableApi.setDataSource(rows);
      },
      { deep: true },
    );

    return (): JSX.Element => <DutyTable />;
  },
});

const PERIOD_SCOPE_OPTIONS = [
  { value: "MONTH", label: "本月" },
  { value: "QUARTER", label: "本季" },
  { value: "YEAR", label: "本年" },
];

const pad = (value: number): string => String(value).padStart(2, "0");

const formatQueryTime = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const getCurrentPeriodRange = (periodType: string): { start: Date; end: Date } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (periodType === "YEAR") {
    return {
      start: new Date(year, 0, 1, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  if (periodType === "QUARTER") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      start: new Date(year, quarterStartMonth, 1, 0, 0, 0),
      end: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59),
    };
  }

  return {
    start: new Date(year, month, 1, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59),
  };
};

export const DutyOverviewPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const loading = ref(false);
    const stat = ref<DutyAssignmentOverviewStatVO>({});
    const rawRoleGroups = ref<DutyAssignmentOverviewRoleGroupVO[]>([]);
    const roleOptions = ref<string[]>([]);
    const detailOpen = ref(false);
    const detail = ref<DutyAssignmentDetailVO>();
    const recordsOpen = ref(false);
    const itemRecords = ref<DutyRecordSummaryVO[]>([]);
    const filters = reactive({
      periodType: "MONTH",
      roleName: "",
      signStatus: "",
      completionRateRange: "",
      keyword: "",
    });

    const currentPeriodRange = computed(() => getCurrentPeriodRange(filters.periodType));
    const periodScopeLabel = computed(() => PERIOD_SCOPE_OPTIONS.find((item) => item.value === filters.periodType)?.label ?? "本月");

    const roleGroups = computed<DutyAssignmentOverviewRoleGroupVO[]>(() => {
      const inRange = (rate?: number): boolean => {
        if (!filters.completionRateRange) {
          return true;
        }
        const value = toPercentNumber(rate) ?? 0;
        if (filters.completionRateRange === "GE_90") {
          return value >= 90;
        }
        if (filters.completionRateRange === "70_89") {
          return value >= 70 && value < 90;
        }
        if (filters.completionRateRange === "50_69") {
          return value >= 50 && value < 70;
        }
        return value < 50;
      };

      return rawRoleGroups.value
        .map((group) => {
          const assignments = (group.assignments ?? []).filter((assignment) => inRange(assignment.completionRate));
          const signedCount = assignments.filter((assignment) => assignment.signStatus === "SIGNED").length;
          const unsignedCount = assignments.filter((assignment) => assignment.signStatus !== "SIGNED").length;
          const averageCompletionRate = assignments.length
            ? assignments.reduce((sum, assignment) => sum + (assignment.completionRate ?? 0), 0) / assignments.length
            : group.averageCompletionRate;
          return {
            ...group,
            assignments,
            userCount: assignments.length || group.userCount,
            signedCount,
            unsignedCount,
            averageCompletionRate,
          };
        })
        .filter((group) => !filters.completionRateRange || (group.assignments ?? []).length > 0);
    });

    const periodQuery = (): { periodType?: string; periodStartTime?: string; periodEndTime?: string } => {
      const query: { periodType?: string; periodStartTime?: string; periodEndTime?: string } = {};
      if (filters.periodType) {
        query.periodType = filters.periodType;
      }
      query.periodStartTime = formatQueryTime(currentPeriodRange.value.start);
      query.periodEndTime = formatQueryTime(currentPeriodRange.value.end);
      return query;
    };

    const loadRoles = async (): Promise<void> => {
      try {
        const roles = await useAuthRequest(() => listDutyRoleAssignments());
        roleOptions.value = roles.map((item) => item.roleName).filter((role): role is string => !!role);
      } catch {
        roleOptions.value = [];
      }
    };

    const loadStats = async (): Promise<void> => {
      try {
        stat.value = await useAuthRequest(() => getDutyAssignmentOverviewStatistics(periodQuery()));
      } catch {
        stat.value = {};
      }
    };

    const loadRoleGroups = async (): Promise<void> => {
      loading.value = true;
      try {
        rawRoleGroups.value = await useAuthRequest(() =>
          listDutyAssignmentOverviewRoleGroups({
            keyword: filters.keyword.trim() || undefined,
            roleName: filters.roleName || undefined,
            signStatus: filters.signStatus || undefined,
            ...periodQuery(),
          }),
        );
      } catch (e) {
        showApiError(e, "查询责任清单总览失败");
        rawRoleGroups.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refresh = (): void => {
      void loadStats();
      void loadRoleGroups();
    };

    onMounted(() => {
      void loadRoles();
      refresh();
    });

    const openDetail = async (assignmentId?: number): Promise<void> => {
      if (!assignmentId) {
        return;
      }
      try {
        detail.value = await useAuthRequest(() => getDutyAssignment(assignmentId, periodQuery()));
        detailOpen.value = true;
      } catch (e) {
        showApiError(e, "查询清单详情失败");
      }
    };

    const openItemRecords = async (item: DutyAssignmentItemVO): Promise<void> => {
      const assignmentItemId = item.assignmentItemId;
      if (!assignmentItemId) {
        return;
      }
      try {
        itemRecords.value = await useAuthRequest(() => listDutyAssignmentItemRecords(assignmentItemId));
        recordsOpen.value = true;
      } catch (e) {
        showApiError(e, "查询关联记录失败");
      }
    };

    const assignmentColumns = computed(() => [
      { key: "人员", title: "人员", dataIndex: "responsibleUserName", width: 180, ellipsis: true },
      {
        key: "签收状态",
        title: "签收状态",
        dataIndex: "signStatus",
        width: 140,
        customRender: ({ text }: { text?: string }) => statusTag(text),
      },
      {
        title: `${periodScopeLabel.value}完成率`,
        dataIndex: "completionRate",
        width: 220,
        customRender: ({ text }: { text?: number }) => {
          const percent = Math.max(0, Math.min(100, Math.round(toPercentNumber(text) ?? 0)));
          return (
            <div class={styles.completionCell}>
              <div class={styles.completionTrack}>
                <div class={styles.completionBar} style={{ width: `${percent}%` }} />
              </div>
              <span>{formatPercent(text)}</span>
            </div>
          );
        },
      },
      {
        key: "操作",
        title: "操作",
        width: 120,
        fixed: "right" as const,
        customRender: ({ record }: { record: DutyAssignmentOverviewAssignmentVO }) => (
          <Button type="link" size="small" onClick={() => void openDetail(record.assignmentId)}>
            查看清单
          </Button>
        ),
      },
    ]);

    const itemColumns = [
      { key: "条款", title: "条款", dataIndex: "clauseNo", width: 120, ellipsis: true },
      { key: "法规", title: "法规", dataIndex: "lawNameLabel", width: 150, ellipsis: true },
      { key: "履职任务", title: "履职任务", dataIndex: "taskDescription", width: 280, ellipsis: true },
      {
        key: "截止时间",
        title: "截止时间",
        dataIndex: "deadlineTime",
        width: 170,
        ellipsis: true,
        customRender: ({ text }: { text?: DutyDateTime }) => formatText(text),
      },
      { key: "状态", title: "状态", dataIndex: "status", width: 100, customRender: ({ text }: { text?: string }) => statusTag(text) },
      { key: "记录", title: "记录", dataIndex: "recordCount", width: 90, customRender: ({ text }: { text?: number }) => `${text ?? 0} 条` },
      {
        key: "操作",
        title: "操作",
        width: 100,
        fixed: "right" as const,
        customRender: ({ record }: { record: DutyAssignmentItemVO }) => (
          <Button type="link" size="small" onClick={() => void openItemRecords(record)}>
            记录
          </Button>
        ),
      },
    ];

    const overviewFilterSchema = () => [
      {
        component: markRaw(RadioGroup),
        label: "周期",
        fieldName: "periodType",
        defaultValue: "MONTH",
        componentProps: {
          buttonStyle: "solid",
          options: PERIOD_SCOPE_OPTIONS,
        },
      },
      {
        component: "Select",
        label: "角色",
        fieldName: "roleName",
        defaultValue: "",
        componentProps: {
          style: { width: "190px" },
          allowClear: true,
          placeholder: "全部角色",
          options: roleOptions.value.map((role) => ({ value: role, label: role })),
        },
      },
      {
        component: "Select",
        label: "签收",
        fieldName: "signStatus",
        defaultValue: "",
        componentProps: {
          style: { width: "140px" },
          options: SIGN_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.value ? item.label : "全部签收状态" })),
        },
      },
      {
        component: "Select",
        label: "完成率",
        fieldName: "completionRateRange",
        defaultValue: "",
        componentProps: {
          style: { width: "130px" },
          options: [
            { value: "", label: "全部完成率" },
            { value: "GE_90", label: "≥90%" },
            { value: "70_89", label: "70%-89%" },
            { value: "50_69", label: "50%-69%" },
            { value: "LT_50", label: "<50%" },
          ],
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        defaultValue: "",
        componentProps: {
          style: { width: "220px" },
          placeholder: "搜索人员姓名或部门...",
          allowClear: true,
          showCount: false,
        },
      },
    ];

    const [QueryForm, formApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      syncStateRef: filters,
      schema: overviewFilterSchema(),
      handleSubmit: (values) => {
        filters.periodType = String(values.periodType || "MONTH");
        filters.roleName = String(values.roleName ?? "");
        filters.signStatus = String(values.signStatus ?? "");
        filters.completionRateRange = String(values.completionRateRange ?? "");
        filters.keyword = String(values.keyword ?? "");
        refresh();
      },
      handleReset: () => {
        filters.periodType = "MONTH";
        filters.roleName = "";
        filters.signStatus = "";
        filters.completionRateRange = "";
        filters.keyword = "";
        refresh();
      },
    });

    watch(
      roleOptions,
      () => {
        formApi.updateSchema(overviewFilterSchema());
      },
      { deep: true },
    );

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <>
          <QueryForm />
          <div class="statGrid">
            <div class="statCard">
              <div class="statLabel">总人数</div>
              <div class="statValue">{stat.value.totalUserCount ?? 0}</div>
            </div>
            <div class="statCard">
              <div class="statLabel">已签收</div>
              <div class="statValue">{stat.value.signedCount ?? 0}</div>
            </div>
            <div class="statCard">
              <div class="statLabel">未签收</div>
              <div class="statValue">{stat.value.unsignedCount ?? 0}</div>
            </div>
            <div class="statCard">
              <div class="statLabel">{periodScopeLabel.value}平均完成率</div>
              <div class="statValue">{formatPercent(stat.value.averageCompletionRate)}</div>
            </div>
          </div>
          <div class={styles.roleGroups}>
            {roleGroups.value.length === 0 && !loading.value ? (
              <div class={styles.emptyState}>
                <Empty description="暂无角色责任清单" />
              </div>
            ) : (
              roleGroups.value.map((group, index) => (
                <section class={styles.roleGroup} key={group.roleName || UNKNOWN_ROLE_NAME}>
                  <div class={styles.roleGroupHeader}>
                    <div class={styles.roleGroupTitle}>
                      <span class={styles.roleBadge}>{index + 1}</span>
                      <div class={styles.roleName}>{group.roleName || UNKNOWN_ROLE_NAME}</div>
                      <span class={styles.roleMeta}>{group.userCount ?? 0}人</span>
                    </div>
                  </div>
                  <OverviewAssignmentTable columns={assignmentColumns.value} dataSource={group.assignments ?? []} loading={loading.value} />
                </section>
              ))
            )}
          </div>
        </>
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} showFooter={false} v-slots={layoutSlots} />
        <Drawer open={detailOpen.value} title="责任清单详情" width={980} onUpdate:open={(v: boolean) => (detailOpen.value = v)}>
          {detail.value ? (
            <>
              <div class={styles.detailHeader}>
                <div class={styles.detailCell}>
                  <div class={styles.label}>责任人</div>
                  <div class={styles.value}>{formatText(detail.value.responsibleUserName)}</div>
                </div>
                <div class={styles.detailCell}>
                  <div class={styles.label}>角色</div>
                  <div class={styles.value}>{formatText(detail.value.roleName)}</div>
                </div>
                <div class={styles.detailCell}>
                  <div class={styles.label}>周期</div>
                  <div class={styles.value}>{periodLabel(detail.value.periodType)}</div>
                </div>
                <div class={styles.detailCell}>
                  <div class={styles.label}>签收状态</div>
                  <div class={styles.value}>{statusTag(detail.value.signStatus)}</div>
                </div>
                <div class={styles.detailCell}>
                  <div class={styles.label}>完成率</div>
                  <div class={styles.value}>{formatPercent(detail.value.completionRate)}</div>
                </div>
                <div class={styles.detailCell}>
                  <div class={styles.label}>待执行/超期</div>
                  <div class={styles.value}>
                    {detail.value.pendingItemCount ?? 0}/{detail.value.overdueItemCount ?? 0}
                  </div>
                </div>
              </div>
              {(detail.value.groups ?? []).map((group) => (
                <div class={styles.group} key={group.periodType}>
                  <div class={styles.groupTitle}>
                    <Tag color="blue">{periodLabel(group.periodType)}</Tag>
                    <span>{group.itemCount ?? 0} 项</span>
                  </div>
                  <AssignmentItemTable columns={itemColumns} dataSource={group.items ?? []} />
                </div>
              ))}
            </>
          ) : (
            <Empty description="暂无数据" />
          )}
        </Drawer>
        <Modal
          open={recordsOpen.value}
          title="关联记录"
          width={760}
          centered
          footer={null}
          onUpdate:open={(v: boolean) => (recordsOpen.value = v)}
        >
          <div class={styles.recordList}>
            {itemRecords.value.length === 0 ? (
              <Empty description="暂无记录" />
            ) : (
              itemRecords.value.map((record) => (
                <div class={styles.recordItem} key={record.recordId}>
                  <Space>
                    <Tag color={record.sourceType === "SYSTEM_COLLECT" ? "blue" : "green"}>
                      {record.sourceTypeLabel || record.sourceType}
                    </Tag>
                    <strong>{formatText(record.title)}</strong>
                    <span>{formatText(record.occurredTime)}</span>
                  </Space>
                  <div>{formatText(record.summary)}</div>
                </div>
              ))
            )}
          </div>
        </Modal>
      </>
    );
  },
});
