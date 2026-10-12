import type { PersonnelStatisticsRow, PersonnelStatisticsType } from "@g2-contract/person-management";
import { Button, Page, PageLayout, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPersonManagementClient } from "../../domain-context";
import { type StatisticsKind, dateTime, display, downloadWorkbook, errorText } from "./shared";

import styles from "./workflow.module.css";

const BASE = "/d/person-management";

interface StatisticsConfig {
  kind: StatisticsKind;
  title: string;
  apiType: PersonnelStatisticsType;
  tableCode: string;
  columns: PcTableColumn[];
}

const column = (title: string, dataIndex: string, width = 180): PcTableColumn => ({
  title,
  dataIndex,
  width,
  ellipsis: true,
  customRender: ({ text }) => display(text),
});

const NUM = column("人数", "num", 120);
export const STATISTICS: Record<StatisticsKind, StatisticsConfig> = {
  recruit: {
    kind: "recruit",
    title: "申请统计",
    apiType: "recruit",
    tableCode: "RECRUIT",
    columns: [column("申请岗位", "postName"), { ...NUM, title: "增补人数" }],
  },
  induction: {
    kind: "induction",
    title: "审批统计",
    apiType: "induction",
    tableCode: "INDUCTION_STATISTICS",
    columns: [column("入职岗位", "postName"), column("入职部门", "organizationName"), { ...NUM, title: "入职人数" }],
  },
  appraise: {
    kind: "appraise",
    title: "考核统计",
    apiType: "probation-assess",
    tableCode: "APPRAISE_STATISTICS",
    columns: [column("所在岗位", "postName"), { ...NUM, title: "被考核员工数" }],
  },
  regular: {
    kind: "regular",
    title: "转正统计",
    apiType: "regular-worker",
    tableCode: "REGULAR_STATISTICS",
    columns: [column("所在部门", "organizationName"), column("所在岗位", "postName"), { ...NUM, title: "转正人数" }],
  },
  depart: {
    kind: "depart",
    title: "离职统计",
    apiType: "leave-office",
    tableCode: "DEPART_STATISTICS",
    columns: [column("离职岗位", "postName"), { ...NUM, title: "离职人数" }],
  },
  "work-shift": {
    kind: "work-shift",
    title: "轮岗统计",
    apiType: "rotation-post",
    tableCode: "WORK_SHIFT_STATISTICS",
    columns: [column("拟轮岗部门", "rotationOrganizationName"), column("现所在部门", "organizationName"), { ...NUM, title: "轮岗人数" }],
  },
};

function positiveNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function createStatisticsPage(config: StatisticsConfig) {
  return defineComponent({
    name: `Personnel${config.kind.replace(/-./gu, (value) => value[1]?.toUpperCase() ?? "")}StatisticsPage`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const query = reactive<{ period: string[] }>({ period: [] });
      const page = reactive({
        pageNumber: positiveNumber(route.query.pageNumber, 1),
        pageSize: positiveNumber(route.query.pageSize, 10),
        total: 0,
      });
      const exporting = ref(false);
      let requestVersion = 0;

      const columns: PcTableColumn[] = [
        ...config.columns,
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          fixed: "right",
          customRender: ({ record }) => (
            <Button
              type="link"
              size="small"
              onClick={() => {
                const id = (record as PersonnelStatisticsRow).id;
                if (id === undefined || id === null) {
                  return;
                }
                void router.push({
                  path: `${BASE}/statistics-detail/${config.kind}`,
                  query: { id: String(id), period: query.period.join(","), returnPath: route.fullPath },
                });
              }}
            >
              详情
            </Button>
          ),
        },
      ];
      const [PcTable, tableApi] = usePcTable({ columns, rowKey: "id", tableCode: config.tableCode, pagination: false, autoFetch: false });

      const load = async (): Promise<void> => {
        const version = ++requestVersion;
        tableApi.loading.value = true;
        try {
          const result = await getPersonManagementClient().getPersonnelStatistics(config.apiType, {
            period: query.period.join(","),
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          if (version !== requestVersion) {
            return;
          }
          tableApi.setDataSource(result.records);
          page.total = result.total;
        } catch (error) {
          if (version !== requestVersion) {
            return;
          }
          tableApi.setDataSource([]);
          page.total = 0;
          message.error(errorText(error, `${config.title}加载失败`));
        } finally {
          if (version === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };

      const [PcForm] = usePcForm({
        layout: "horizontal",
        schema: [
          {
            component: "RangePicker",
            fieldName: "period",
            label: "时间",
            defaultValue: [],
            componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true, onChange: () => undefined },
          },
        ],
        syncStateRef: query,
        showCollapseButton: false,
        cache: true,
        handleSubmit(values) {
          query.period = Array.isArray(values.period) ? values.period.map(String) : [];
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.period = [];
          page.pageNumber = 1;
          void load();
        },
      });

      const exportRows = async (): Promise<void> => {
        if (exporting.value) {
          return;
        }
        exporting.value = true;
        try {
          const blob = await getPersonManagementClient().exportPersonnelStatistics(config.apiType, { period: query.period.join(",") });
          downloadWorkbook(blob, `${config.title}.xlsx`);
        } catch (error) {
          message.error(errorText(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };

      onMounted(() => {
        void load();
      });

      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" loading={exporting.value} onClick={() => void exportRows()}>
                导出
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.pageContent}>
                <PcForm />
                <PcTable />
              </div>
            ),
            "footer-page": () =>
              page.total > 0 ? (
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
              ) : null,
          }}
        />
      );
    },
  });
}

const DETAIL_COLUMNS: Record<StatisticsKind, PcTableColumn[]> = {
  recruit: [
    column("申请岗位", "postName"),
    column("增补人数", "num", 120),
    column("申请人", "applicantName"),
    { title: "申请时间", dataIndex: "applyTime", width: 180, customRender: ({ text }) => dateTime(text) },
    { title: "处理时间", dataIndex: "applyDoneTime", width: 180, customRender: ({ text }) => dateTime(text) },
  ],
  induction: [
    column("入职岗位", "postName"),
    column("入职部门", "organizationName"),
    column("入职员工", "staffName"),
    column("申请人", "applicantName"),
    { title: "申请时间", dataIndex: "applyTime", width: 180, customRender: ({ text }) => dateTime(text) },
    { title: "处理时间", dataIndex: "applyDoneTime", width: 180, customRender: ({ text }) => dateTime(text) },
  ],
  appraise: [
    column("员工名称", "staffName"),
    column("所在岗位", "postName"),
    column("所在部门", "organizationName"),
    column("绩效考核分数", "score", 150),
    column("考核时间", "assessTime"),
  ],
  regular: [
    column("岗位", "postName"),
    column("部门", "organizationName"),
    column("转正员工", "staffName"),
    column("申请人", "applicantName"),
    { title: "申请时间", dataIndex: "applyTime", width: 180, customRender: ({ text }) => dateTime(text) },
    { title: "处理时间", dataIndex: "applyDoneTime", width: 180, customRender: ({ text }) => dateTime(text) },
  ],
  depart: [
    column("离职岗位", "postName"),
    column("离职部门", "organizationName"),
    column("离职员工", "staffName"),
    column("申请人", "applicantName"),
    { title: "申请时间", dataIndex: "applyTime", width: 180, customRender: ({ text }) => dateTime(text) },
    { title: "处理时间", dataIndex: "applyDoneTime", width: 180, customRender: ({ text }) => dateTime(text) },
  ],
  "work-shift": [
    column("拟轮岗部门", "rotationOrganizationName"),
    column("现所在部门", "organizationName"),
    column("轮岗员工", "staffName"),
    column("轮岗时间", "rotationTime"),
    column("申请人", "applicantName"),
    { title: "申请时间", dataIndex: "applyTime", width: 180, customRender: ({ text }) => dateTime(text) },
    { title: "处理时间", dataIndex: "applyDoneTime", width: 180, customRender: ({ text }) => dateTime(text) },
  ],
};

export const StatisticsDetailPage = defineComponent({
  name: "PersonnelStatisticsDetailPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const kind = route.path.split("/").at(-1) as StatisticsKind;
    const config = STATISTICS[kind];
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const [PcTable, tableApi] = usePcTable({
      columns: DETAIL_COLUMNS[kind] ?? [],
      rowKey: "id",
      tableCode: `PERSONNEL_${kind.toUpperCase()}_STATISTICS_DETAIL`,
      pagination: false,
      autoFetch: false,
    });
    let requestVersion = 0;

    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      const id = String(route.query.id ?? "");
      if (!config || !id) {
        return;
      }
      tableApi.loading.value = true;
      try {
        const result = await getPersonManagementClient().getPersonnelStatisticsDetail(config.apiType, id, {
          period: String(route.query.period ?? ""),
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
        });
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource([]);
        page.total = 0;
        message.error(errorText(error, "统计详情加载失败"));
      } finally {
        if (version === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };

    const back = (): void => {
      const listPath = `${BASE}/${kind}-statistics-list`;
      const returnPath = String(route.query.returnPath ?? "");
      void router.push(returnPath.startsWith(`${listPath}?`) || returnPath === listPath ? returnPath : listPath);
    };
    onMounted(() => {
      void load();
    });

    return () => (
      <PageLayout
        title={`${config?.title ?? "统计"}详情`}
        v-slots={{
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footerActions}>
              {page.total > 0 ? (
                <Page
                  current={page.pageNumber}
                  pageSize={page.pageSize}
                  total={page.total}
                  cachePageQuery={false}
                  onPageChange={(number: number, size: number) => {
                    page.pageNumber = number;
                    page.pageSize = size;
                    void load();
                  }}
                />
              ) : null}
              <Button onClick={back}>返回</Button>
            </div>
          ),
        }}
      />
    );
  },
});
