import type { SmallEngineeringPage, SmallEngineeringRecord, SmallEngineeringStatistics } from "@g2-client/small-engineering/client";
import { Button, Page, PageLayout, type PcTableColumn, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { canUseSmallEngineeringFeature, getSmallEngineeringClient } from "@/domain-context";
import { downloadTable } from "@/utils/export";

type Scope = "ALL" | "APPLYING" | "SIGNING" | "UNDERWAY" | "WAIT_ACCEPT" | "COMPLETED";
const BASE = "/d/small-engineering";
const SCOPES: { key: Scope; title: string; field: keyof SmallEngineeringStatistics }[] = [
  { key: "ALL", title: "小散工程", field: "total" },
  { key: "APPLYING", title: "请示", field: "apply" },
  { key: "SIGNING", title: "签约", field: "signing" },
  { key: "UNDERWAY", title: "进行中", field: "underway" },
  { key: "WAIT_ACCEPT", title: "待验收", field: "waitAccept" },
  { key: "COMPLETED", title: "已完成", field: "completed" },
];
const STATUS: Record<string, string> = {
  ALL: "",
  APPLYING: "请示中",
  SIGNING: "签约中",
  UNDERWAY: "进行中",
  WAIT_ACCEPT: "待验收",
  COMPLETED: "已完成",
};
const FLOW_STATUS: Record<string, string> = { PASS: "通过", FINISHED: "完成", ACTIVE: "处理中", REJECT: "拒绝", UNDO: "撤销" };
const display = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const cell = (value: unknown): JSX.Element => <PopOver content={display(value)}>{display(value)}</PopOver>;
const date = (value: unknown): string => {
  if (!value) {
    return "--";
  }
  const result = new Date(value as string | number);
  return Number.isNaN(result.getTime()) ? String(value) : result.toLocaleString("zh-CN", { hour12: false });
};
const col = (
  title: string,
  dataIndex: string,
  width?: number,
  render?: (value: unknown, row: SmallEngineeringRecord) => unknown,
): PcTableColumn => ({
  title,
  dataIndex,
  ...(width ? { width } : {}),
  ellipsis: true,
  customRender: ({ text, record }) => cell(render ? render(text, record as SmallEngineeringRecord) : text),
});

export const Manage = defineComponent({
  name: "SmallEngineeringManage",
  setup() {
    const client = getSmallEngineeringClient();
    const router = useRouter();
    const query = reactive({ keyword: "", period: undefined as string[] | undefined, scope: "ALL" as Scope });
    const statistics = ref<SmallEngineeringStatistics>({});
    const countLoading = ref(false);
    const exportLoading = ref(false);
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let listVersion = 0;
    let statsVersion = 0;

    const openDetail = (row: SmallEngineeringRecord): void => {
      const id = String(row.id ?? "");
      const processInstanceId = String(row.processInstanceId ?? "");
      if (query.scope === "ALL") {
        void router.push({ path: `${BASE}/manage-detail`, query: { id } });
      } else if (query.scope === "APPLYING" || query.scope === "SIGNING") {
        void router.push({
          path: `${BASE}/${query.scope === "APPLYING" ? "request-flow" : "approve-flow"}`,
          query: {
            businessType: query.scope === "APPLYING" ? "PROJECT_APPLY" : "PROJECT_SIGN_CONTRACT",
            processInstanceId,
            currentTaskId: "",
            status: "ACTIVE",
            type: "detail",
            title: query.scope === "APPLYING" ? "工程请示" : "工程审批",
          },
        });
      } else {
        void router.push({ path: `${BASE}/supervise-detail`, query: { id } });
      }
    };
    const action: PcTableColumn = {
      title: "操作",
      dataIndex: "action",
      width: 100,
      fixed: "right",
      customRender: ({ record }) => (
        <Button type="link" onClick={() => openDetail(record as SmallEngineeringRecord)}>
          详情
        </Button>
      ),
    };
    const underway = [
      col("编号", "projectNum", 150),
      col("小散工程名称", "projectName"),
      col("乙方", "partyB"),
      col("完成时限", "completionTime", 180, date),
      col("监管部门", "depName"),
      col("监管负责人", "superviseUserName"),
      col("完成进度情况", "schedule", 130, (value) => `${value ?? 0}%`),
    ];
    const applying = [
      col("编号", "applyNum", 150),
      col("申请名称", "instanceName"),
      col("小散工程名称", "projectName"),
      col("发起人", "startUserName"),
      col("发起部门", "startUserInfo", 160, (value) => (value as { organizationName?: string } | undefined)?.organizationName),
      col("发起时间", "createTime", 180, date),
      col("处理状态", "status", 120, (value) => FLOW_STATUS[String(value)]),
      col("处理进度", "activeNodeName"),
    ];
    const columnsForScope = (scope: Scope): PcTableColumn[] => {
      switch (scope) {
        case "ALL": {
          return [
            col("编号", "projectNum", 150),
            col("小散工程名称", "projectName"),
            col("工程时间", "completionTime", 180, date),
            col("施工方", "partyB"),
            col("工程阶段", "status", 120, (value) => STATUS[String(value)]),
            action,
          ];
        }
        case "APPLYING": {
          return [...applying, action];
        }
        case "SIGNING": {
          return [...applying.slice(0, 3), col("乙方", "partyB"), ...applying.slice(3), action];
        }
        case "UNDERWAY": {
          return [...underway, action];
        }
        case "WAIT_ACCEPT": {
          return [...underway, col("验收人", "acceptanceUserName"), action];
        }
        case "COMPLETED": {
          return [
            ...underway,
            col("验收人", "acceptanceUserName"),
            col("验收时间", "acceptanceTime", 180, date),
            col("验收结果", "acceptanceResult", 120, (value) => (value === "QUALIFIED" ? "合格" : "不合格")),
            action,
          ];
        }
      }
    };
    const [PcTable, tableApi] = usePcTable({
      columns: columnsForScope(query.scope),
      tableCode: "SMALL_ENGINEERING_MANAGE",
      rowKey: "id",
      autoFetch: false,
    });
    const period = (): string | undefined =>
      query.period?.length === 2 ? `${query.period[0]} 00:00:00,${query.period[1]} 23:59:59` : undefined;
    const listParams = (number: number, size: number) => ({
      pageNumber: number,
      pageSize: size,
      keyword: query.keyword || undefined,
      period: period(),
    });
    const fetchPage = (number: number, size: number): Promise<SmallEngineeringPage> => {
      const params = listParams(number, size);
      if (query.scope === "ALL") {
        return client.listProjectNodes(params);
      }
      if (query.scope === "APPLYING" || query.scope === "SIGNING") {
        return client.listProjectApplies({
          ...params,
          period: undefined,
          submitTime: period(),
          status: "ACTIVE",
          businessType: query.scope === "APPLYING" ? "PROJECT_APPLY" : "PROJECT_SIGN_CONTRACT",
        });
      }
      return client.listSchedules({ ...params, status: query.scope });
    };
    const loadStatistics = async (): Promise<void> => {
      const current = ++statsVersion;
      countLoading.value = true;
      try {
        const result = await client.projectStatistics({ keyword: query.keyword || undefined, period: period() });
        if (current === statsVersion) {
          statistics.value = result;
        }
      } catch (error) {
        if (current === statsVersion) {
          message.error(error instanceof Error ? error.message : "统计数据加载失败");
        }
      } finally {
        if (current === statsVersion) {
          countLoading.value = false;
        }
      }
    };
    const load = async (includeStatistics = true): Promise<void> => {
      const current = ++listVersion;
      tableApi.loading.value = true;
      tableApi.setColumns(columnsForScope(query.scope));
      if (includeStatistics) {
        void loadStatistics();
      }
      try {
        const result = await fetchPage(page.pageNumber, page.pageSize);
        if (current !== listVersion) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === listVersion) {
          message.error(error instanceof Error ? error.message : "获取列表数据失败");
        }
      } finally {
        if (current === listVersion) {
          tableApi.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: true,
      cacheFields: ["keyword", "period"],
      syncStateRef: query,
      schema: [
        {
          component: "RangePicker",
          label: "",
          fieldName: "period",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "250px" } },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "请输入工程名称、负责人、施工方", style: { width: "270px" } },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "");
        query.period = Array.isArray(values.period) ? values.period.map(String) : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.keyword = "";
        query.period = undefined;
        page.pageNumber = 1;
        void load();
      },
    });
    const setScope = (scope: Scope): void => {
      query.scope = scope;
      page.pageNumber = 1;
      void load(false);
    };
    const downloadExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      exportLoading.value = true;
      try {
        const first = await fetchPage(1, 100);
        const rows = [...first.records];
        for (let number = 2; number <= first.pages; number++) {
          rows.push(...(await fetchPage(number, 100)).records);
        }
        if (rows.length === 0) {
          message.warning("当前检索条件下暂无数据");
          return;
        }
        const cols = columnsForScope(query.scope).filter((item) => item.dataIndex !== "action");
        await downloadTable(
          `小散工程${STATUS[query.scope]}`,
          cols,
          rows.map((row) => ({
            ...row,
            completionTime: date(row.completionTime),
            acceptanceTime: date(row.acceptanceTime),
            createTime: date(row.createTime),
            schedule: `${row.schedule ?? 0}%`,
            status: query.scope === "ALL" ? (STATUS[String(row.status)] ?? "--") : (FLOW_STATUS[String(row.status)] ?? row.status),
            acceptanceResult: row.acceptanceResult === "QUALIFIED" ? "合格" : "不合格",
            startUserInfo: (row.startUserInfo as { organizationName?: string } | undefined)?.organizationName ?? "--",
          })),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exportLoading.value = false;
      }
    };
    void load();
    const slots = {
      "layout-header": () =>
        canUseSmallEngineeringFeature("projectManage", "download") ? (
          <Button
            type="primary"
            loading={exportLoading.value}
            onClick={() => {
              void downloadExcel();
            }}
          >
            导出
          </Button>
        ) : null,
      "layout-content": () => (
        <>
          <div style={{ display: "flex", gap: "12px", margin: "12px 0 16px" }}>
            {SCOPES.map((item) => (
              <button
                type="button"
                onClick={() => setScope(item.key)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: query.scope === item.key ? "#e6f4ff" : "#f7f8fa",
                  border: query.scope === item.key ? "1px solid #1677ff" : "1px solid #eee",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>{item.title}</div>
                <strong style={{ fontSize: "22px" }}>{countLoading.value ? "--" : (statistics.value[item.field] ?? 0)}</strong>
              </button>
            ))}
          </div>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => <PageLayout title="工程管理" v-slots={slots} />;
  },
});
