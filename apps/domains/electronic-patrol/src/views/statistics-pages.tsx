import type { PatrolArea, PatrolDepartment } from "@g2-contract/electronic-patrol";
import type { PcFormSchemaProp, PcTableColumn } from "@g2-platform/pc-ui";
import * as VueApi from "vue";

import * as PatrolContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { areaText, downloadBlob, errorMessage, rangePeriod } from "../shared";

import styles from "../styles.module.less";

const { Button, Page, PageLayout, message, usePcForm, usePcTable } = PcUi;
const { defineComponent, reactive, ref } = VueApi;

type StatisticsKind = "route" | "point" | "personnel";

function dateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createStatisticsPage(kind: StatisticsKind) {
  const config = {
    route: {
      title: "巡更路线统计",
      tableCode: "ELECTRONIC_PATROL_ROUTE_STAT",
      filename: "巡更路线统计.xlsx",
      columns: [
        { title: "序号", dataIndex: "sequence", width: 70 },
        { title: "巡更路线", dataIndex: "patrolRouteName", width: 180, ellipsis: true },
        { title: "包含巡更点", dataIndex: "patrolLocationNumber", width: 140 },
        { title: "应巡查的点位次数", dataIndex: "totalNum", width: 170 },
        { title: "实际巡查的点位次数", dataIndex: "realNum", width: 180 },
        { title: "漏巡", dataIndex: "omitNum", width: 110 },
        { title: "路线完成率", dataIndex: "patrolRatio", width: 140 },
      ] as PcTableColumn[],
    },
    point: {
      title: "巡更点统计",
      tableCode: "ELECTRONIC_PATROL_POINT_STAT",
      filename: "巡更点统计.xlsx",
      columns: [
        { title: "序号", dataIndex: "sequence", width: 70 },
        { title: "巡更点", dataIndex: "locationName", width: 180, ellipsis: true },
        { title: "应巡次数", dataIndex: "totalNum", width: 120 },
        { title: "巡更点区域", dataIndex: "area", width: 200, ellipsis: true, customRender: ({ text: value }) => areaText(value) },
        { title: "实巡", dataIndex: "realNum", width: 100 },
        { title: "漏巡", dataIndex: "omitNum", width: 100 },
        { title: "巡更率", dataIndex: "patrolRatio", width: 120 },
        { title: "异常次数", dataIndex: "abnormalNum", width: 120 },
        { title: "隐患数", dataIndex: "hiddenNum", width: 110 },
        { title: "隐患处理数", dataIndex: "hiddenHandleNum", width: 130 },
      ] as PcTableColumn[],
    },
    personnel: {
      title: "巡更人员统计",
      tableCode: "ELECTRONIC_PATROL_PERSONNEL_STAT",
      filename: "巡更人员统计.xlsx",
      columns: [
        { title: "序号", dataIndex: "sequence", width: 70 },
        { title: "巡更人员", dataIndex: "userName", width: 160, ellipsis: true },
        { title: "所属部门", dataIndex: "depName", width: 180, ellipsis: true },
        { title: "巡更任务数", dataIndex: "taskNum", width: 130 },
        { title: "异常任务数", dataIndex: "abnormalTaskNum", width: 130 },
        { title: "巡更点总数", dataIndex: "totalNum", width: 130 },
        { title: "已巡更点数", dataIndex: "realNum", width: 130 },
        { title: "漏巡更点数", dataIndex: "omitNum", width: 130 },
        { title: "巡更率", dataIndex: "patrolRatio", width: 120 },
      ] as PcTableColumn[],
    },
  }[kind];

  return defineComponent({
    name: `ElectronicPatrol${kind}StatisticsPage`,
    setup() {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 30);
      const query = reactive<{ period?: unknown[]; keyword: string; areaPath?: string[]; depId?: string }>({
        keyword: "",
        period: kind === "route" ? [dateValue(monthAgo), dateValue(today)] : undefined,
      });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const exporting = ref(false);
      const areaOptions = ref<PatrolArea[]>([]);
      const departmentOptions = ref<{ label: string; value: string }[]>([]);
      const makeQuery = () => ({
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        period: rangePeriod(query.period),
        keyword: query.keyword || undefined,
        areaId: query.areaPath?.join(","),
        depId: query.depId,
      });
      const [PcTable, tableApi] = usePcTable({
        tableCode: config.tableCode,
        rowKey: "tableKey",
        columns: config.columns.map((column) =>
          column.dataIndex === "sequence"
            ? { ...column, customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1 }
            : column,
        ),
        fetchApi: async () => {
          try {
            const client = PatrolContext.getElectronicPatrolClient();
            const result =
              kind === "route"
                ? await client.pageRouteStatistics(makeQuery())
                : kind === "point"
                  ? await client.pagePointStatistics(makeQuery())
                  : await client.pagePersonnelStatistics(makeQuery());
            page.total = result.total;
            return {
              ...result,
              records: result.records.map((record, index) => Object.assign(record, { tableKey: `${record.id ?? kind}-${index}` })),
            };
          } catch (error) {
            message.error(errorMessage(error, `${config.title}加载失败`));
            return { records: [], total: 0, pages: 0 };
          }
        },
      });
      const schema: PcFormSchemaProp[] = [
        {
          component: "RangePicker",
          fieldName: "period",
          label: "巡更时间",
          componentProps: { valueFormat: "YYYY-MM-DD" },
          defaultValue: query.period,
        },
      ];
      if (kind === "route") {
        schema.push({
          component: "Input",
          fieldName: "keyword",
          label: "巡更路线",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更路线名称" },
        });
      }
      if (kind === "point") {
        schema.push({
          component: "Cascader",
          fieldName: "areaPath",
          label: "所属区域",
          componentProps: {
            allowClear: true,
            changeOnSelect: true,
            options: areaOptions,
            fieldNames: { label: "name", value: "id", children: "children" },
          },
        });
        schema.push({
          component: "Input",
          fieldName: "keyword",
          label: "巡更点",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更点名称" },
        });
      }
      if (kind === "personnel") {
        schema.push({
          component: "Select",
          fieldName: "depId",
          label: "部门",
          componentProps: { allowClear: true, showSearch: true, options: departmentOptions, placeholder: "请选择部门" },
        });
        schema.push({
          component: "Input",
          fieldName: "keyword",
          label: "巡更人员",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入巡更人员名称" },
        });
      }
      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema,
        handleSubmit(values) {
          query.period = Array.isArray(values.period) ? values.period : undefined;
          query.keyword = String(values.keyword ?? "").trim();
          query.areaPath = Array.isArray(values.areaPath) ? values.areaPath.map(String) : undefined;
          query.depId = typeof values.depId === "string" ? values.depId : undefined;
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          query.period = undefined;
          query.keyword = "";
          query.areaPath = undefined;
          query.depId = undefined;
          page.pageNumber = 1;
          tableApi.query();
        },
      });
      if (kind === "point") {
        void PatrolContext.getElectronicPatrolClient()
          .listAreas()
          .then((items) => {
            areaOptions.value = items;
          })
          .catch((error: unknown) => message.error(errorMessage(error, "区域加载失败")));
      }
      if (kind === "personnel") {
        const flatten = (items: PatrolDepartment[]): { label: string; value: string }[] =>
          items.flatMap((item) => [{ label: item.name, value: item.id }, ...flatten(item.children ?? [])]);
        void PatrolContext.getElectronicPatrolClient()
          .listDepartments()
          .then((items) => {
            departmentOptions.value = flatten(items);
          })
          .catch((error: unknown) => message.error(errorMessage(error, "部门加载失败")));
      }
      const exportData = async (): Promise<void> => {
        exporting.value = true;
        try {
          const client = PatrolContext.getElectronicPatrolClient();
          const result =
            kind === "route"
              ? await client.exportRouteStatistics(makeQuery())
              : kind === "point"
                ? await client.exportPointStatistics(makeQuery())
                : await client.exportPersonnelStatistics(makeQuery());
          downloadBlob(result, config.filename);
        } catch (error) {
          message.error(errorMessage(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };
      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void exportData()}>
                导出
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.tablePage}>
                <PcForm />
                <PcTable />
              </div>
            ),
            "footer-page": () => (
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(number: number, size: number) => {
                  page.pageNumber = number;
                  page.pageSize = size;
                  tableApi.query();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}

export const PatrolRouteStatisticsPage = createStatisticsPage("route");
export const PatrolPointStatisticsPage = createStatisticsPage("point");
export const PatrolPersonnelStatisticsPage = createStatisticsPage("personnel");
