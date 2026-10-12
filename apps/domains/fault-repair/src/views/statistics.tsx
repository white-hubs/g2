import type { FaultQuery, FaultRecord } from "@g2-client/fault-repair/client";
import { Button, Page, PageLayout, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getFaultMaintainRuntime, getFaultRepairClient } from "../domain-context";
import { currentMonthRange } from "./date";

const formatPeriod = (dates?: string[]): string => (dates?.length === 2 ? `${dates[0]} 00:00:00,${dates[1]} 23:59:59` : "");
const statColumns = (personnel: boolean, typeColumn: string): PcTableColumn[] => [
  { title: "序号", dataIndex: "tableIndex", width: 70 },
  ...(personnel
    ? [
        { title: "人员", dataIndex: "userName", ellipsis: true },
        { title: "所属部门", dataIndex: "organizationName", ellipsis: true },
      ]
    : [{ title: typeColumn, dataIndex: "objName", ellipsis: true }]),
  { title: "工单数", dataIndex: "totalNumber", ellipsis: true },
  { title: "待处理", dataIndex: "waitNumber", ellipsis: true },
  { title: "已处理", dataIndex: "dealNumber", ellipsis: true },
  { title: "处理率", dataIndex: "dealRate", ellipsis: true },
  { title: "平均处理时长", dataIndex: "avgWaitTime", ellipsis: true },
  ...(!personnel ? [{ title: "解决率", dataIndex: "result", ellipsis: true }] : []),
];
export function createStatisticsPage(personnel: boolean) {
  return defineComponent({
    name: personnel ? "PersonnelStatistics" : "WorkOrderStatistics",
    setup() {
      const { applicationCode, labels } = getFaultMaintainRuntime();
      const title = personnel ? labels.personnelStatTitle : labels.workOrderStatTitle;
      const client = getFaultRepairClient();
      const defaultDates = currentMonthRange();
      const query = reactive<{ keyword: string; organizationId?: string; faultTypeId?: string; dates?: string[] }>({
        keyword: "",
        dates: [...defaultDates],
      });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const typeOptions = ref<{ label: string; value: string }[]>([]);
      const deptOptions = ref<{ label: string; value: string }[]>([]);
      const exporting = ref(false);
      let version = 0;
      const makeQuery = (pageNumber = page.pageNumber, pageSize = page.pageSize): FaultQuery => ({
        pageNumber,
        pageSize,
        applicationCode,
        ...(personnel
          ? {
              keyword: query.keyword || undefined,
              organizationId: query.organizationId,
              period: formatPeriod(query.dates),
            }
          : { faultTypeId: query.faultTypeId, period: formatPeriod(query.dates) }),
      });
      const [PcTable, tableApi] = usePcTable({
        columns: statColumns(personnel, labels.typeColumn),
        tableCode: personnel ? `${applicationCode}_USER_STAT` : `${applicationCode}_ORDER_STAT`,
        rowKey: personnel ? "userName" : "objName",
        autoFetch: false,
      });
      const load = async (): Promise<void> => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = personnel ? await client.pagePersonnelStatistics(makeQuery()) : await client.pageOrderStatistics(makeQuery());
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(
            result.records.map((record: FaultRecord, index: number) => ({
              ...record,
              tableIndex: (page.pageNumber - 1) * page.pageSize + index + 1,
            })),
          );
          page.total = result.total;
        } catch (error) {
          if (current === version) {
            message.error(error instanceof Error ? error.message : `${title}加载失败`);
          }
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const [PcForm] = usePcForm({
        layout: "horizontal",
        cache: true,
        syncStateRef: query,
        schema: personnel
          ? [
              {
                component: "Input",
                fieldName: "keyword",
                label: "人员",
                componentProps: { placeholder: "请输入人员名称", allowClear: true },
                defaultValue: "",
              },
              {
                component: "Select",
                fieldName: "organizationId",
                label: "部门",
                componentProps: { placeholder: "请选择部门", allowClear: true, options: deptOptions },
                defaultValue: undefined,
              },
              {
                component: "RangePicker",
                fieldName: "dates",
                label: "时间",
                componentProps: { valueFormat: "YYYY-MM-DD" },
                defaultValue: [...defaultDates],
              },
            ]
          : [
              {
                component: "Select",
                fieldName: "faultTypeId",
                label: labels.typeColumn,
                componentProps: { placeholder: `请选择${labels.typeColumn}`, allowClear: true, options: typeOptions },
                defaultValue: undefined,
              },
              {
                component: "RangePicker",
                fieldName: "dates",
                label: "时间",
                componentProps: { valueFormat: "YYYY-MM-DD" },
                defaultValue: [...defaultDates],
              },
            ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          query.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
          query.faultTypeId = typeof values.faultTypeId === "string" ? values.faultTypeId : undefined;
          query.dates = Array.isArray(values.dates) ? values.dates.map(String) : undefined;
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.keyword = "";
          query.organizationId = undefined;
          query.faultTypeId = undefined;
          query.dates = [...defaultDates];
          page.pageNumber = 1;
          void load();
        },
      });
      const loadOptions = async (): Promise<void> => {
        try {
          if (personnel) {
            deptOptions.value = (await client.listDepartments()).map((item) => ({ label: item.name, value: String(item.id) }));
          } else {
            typeOptions.value = (await client.listTypes({ applicationCode })).map((item) => ({
              label: item.name,
              value: String(item.id),
            }));
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : "筛选项加载失败");
        }
      };
      const download = async (): Promise<void> => {
        if (exporting.value || !page.total) {
          return;
        }
        exporting.value = true;
        try {
          const blob = personnel
            ? await client.exportPersonnelStatistics(makeQuery(1, 99999))
            : await client.exportOrderStatistics(makeQuery(1, 999999));
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${title}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "导出失败");
        } finally {
          exporting.value = false;
        }
      };
      void loadOptions();
      void load();
      const slots = {
        "layout-header": () => (
          <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void download()}>
            导出
          </Button>
        ),
        "layout-content": () => (
          <>
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
            onPageChange={(pageNumber: number, pageSize: number) => {
              page.pageNumber = pageNumber;
              page.pageSize = pageSize;
              void load();
            }}
          />
        ),
      };
      return () => <PageLayout title={title} v-slots={slots} />;
    },
  });
}
export const WorkOrderStatistics = createStatisticsPage(false);
export const PersonnelStatistics = createStatisticsPage(true);
