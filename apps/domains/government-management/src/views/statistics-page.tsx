import type { OfficialRow } from "@g2-contract/government-management";
import { Button, Page, PageLayout, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient } from "../domain-context";
import { type StatisticPageConfig, menuPath } from "../menu-data";
import { can, dateTime, display, download, errorText, positiveInt } from "./shared";

import styles from "./page.module.css";

const PERMISSIONS: Record<string, string> = {
  system: "official:institutionalStatistics",
  seal: "official:useSealStatistics",
  issue: "official:issueStatistics",
  documentReceived: "official:documentReceivedStatistics",
  keywork: "official:departmentWorkStatistics",
  focusWork: "official:approvalStatistics",
  focusWorkChange: "official:eventChangeStat",
};

export function createStatisticsPage(config: StatisticPageConfig) {
  return defineComponent({
    name: `GovernmentStatistics${config.slug}`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const filter = reactive({ period: [] as string[] });
      const pager = reactive({
        pageNumber: positiveInt(route.query.pageNumber, 1),
        pageSize: positiveInt(route.query.pageSize, 10),
        total: 0,
      });
      const exporting = ref(false);
      let version = 0;
      const columns: PcTableColumn[] = config.columns.map((column) => ({
        title: column.title,
        dataIndex: column.dataIndex,
        ellipsis: true,
        customRender: ({ text }) => (column.dataIndex.toLowerCase().includes("time") && text ? dateTime(text).slice(0, 10) : display(text)),
      }));
      if (config.detailKey) {
        columns.push({
          title: "操作",
          dataIndex: "action",
          width: 100,
          fixed: "right",
          customRender: ({ record }) =>
            can(`${PERMISSIONS[config.kind]}:details`) ? (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  const id = (record as OfficialRow)[config.detailKey!];
                  if (id !== undefined && id !== null) {
                    void router.push({
                      path: `${menuPath(config.slug)}/detail`,
                      query: { id: String(id), period: filter.period.join(","), returnPath: route.fullPath },
                    });
                  }
                }}
              >
                详情
              </Button>
            ) : null,
        });
      }
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: config.tableCode,
        rowKey: "_rowKey",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = await getGovernmentClient().pageStatistics(config.kind, {
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
            period: filter.period.join(","),
          });
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(
            result.records.map((row, index) => ({
              ...row,
              _rowKey: String(row.id ?? row[config.detailKey ?? ""] ?? `${pager.pageNumber}-${index}`),
            })),
          );
          pager.total = result.total;
        } catch (error) {
          if (current !== version) {
            return;
          }
          message.error(errorText(error, "统计数据加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          if (current === version) {
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
            label: "发起时间",
            defaultValue: [],
            componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
          },
        ],
        syncStateRef: filter,
        cache: true,
        showCollapseButton: false,
        handleSubmit(values) {
          filter.period = Array.isArray(values.period) ? values.period.map(String) : [];
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          filter.period = [];
          pager.pageNumber = 1;
          void load();
        },
      });
      const exportFile = async () => {
        exporting.value = true;
        try {
          download(await getGovernmentClient().exportStatistics(config.kind, filter.period.join(",")), `${config.title}.xlsx`);
        } catch (error) {
          message.error(errorText(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };
      onMounted(() => void load());
      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () =>
              can(`${PERMISSIONS[config.kind]}:export`) ? (
                <Button type="primary" loading={exporting.value} onClick={() => void exportFile()}>
                  导出
                </Button>
              ) : null,
            "layout-content": () => (
              <div class={styles.content}>
                <div class={styles.filterRow}>
                  <PcForm />
                </div>
                <PcTable />
              </div>
            ),
            "footer-page": () =>
              pager.total > 0 ? (
                <Page
                  current={pager.pageNumber}
                  pageSize={pager.pageSize}
                  total={pager.total}
                  cachePageQuery={true}
                  onPageChange={(number: number, size: number) => {
                    pager.pageNumber = number;
                    pager.pageSize = size;
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
