import { Button, Page, PageLayout, type PcTableColumn, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient } from "../domain-context";
import { type StatisticPageConfig, menuPath } from "../menu-data";
import { dateTime, display, errorText } from "./shared";

export function createStatisticsDetailPage(config: StatisticPageConfig) {
  return defineComponent({
    name: `GovernmentStatisticDetail${config.slug}`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const columns: PcTableColumn[] = (
        config.kind === "seal"
          ? [
              { title: "申请印章", dataIndex: "sealName" },
              { title: "申请人", dataIndex: "applicantName" },
              { title: "最近申请时间", dataIndex: "applyTime" },
              { title: "审批时间", dataIndex: "applyDoneTime" },
            ]
          : [
              { title: "所在部门", dataIndex: "deptName" },
              { title: "申请人", dataIndex: "applicantName" },
              { title: config.kind === "issue" ? "预报时间" : "征求时间", dataIndex: "applyTime" },
              { title: "处理时间", dataIndex: "applyDoneTime" },
            ]
      ).map((column) => ({
        ...column,
        customRender: ({ text }) => (column.dataIndex.toLowerCase().includes("time") && text ? dateTime(text).slice(0, 10) : display(text)),
      }));
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: `${config.tableCode}_DETAIL`,
        rowKey: "_rowKey",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        if (!route.query.id || !["system", "seal", "issue"].includes(config.kind)) {
          return;
        }
        tableApi.loading.value = true;
        try {
          const result = await getGovernmentClient().getStatisticDetail(
            config.kind as "system" | "seal" | "issue",
            String(route.query.id),
            { pageNumber: pager.pageNumber, pageSize: pager.pageSize, period: String(route.query.period ?? "") },
          );
          tableApi.setDataSource(
            result.records.map((row, index) => ({ ...row, _rowKey: String(row.id ?? `${pager.pageNumber}-${index}`) })),
          );
          pager.total = result.total;
        } catch (error) {
          message.error(errorText(error, "统计明细加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          tableApi.loading.value = false;
        }
      };
      onMounted(() => void load());
      return () => (
        <PageLayout
          title={`${config.title}详情`}
          v-slots={{
            "layout-content": () => <PcTable />,
            "footer-page": () => (
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                {pager.total > 0 ? (
                  <Page
                    current={pager.pageNumber}
                    pageSize={pager.pageSize}
                    total={pager.total}
                    cachePageQuery={false}
                    onPageChange={(number: number, size: number) => {
                      pager.pageNumber = number;
                      pager.pageSize = size;
                      void load();
                    }}
                  />
                ) : (
                  <span />
                )}
                <Button
                  onClick={() =>
                    void router.push(typeof route.query.returnPath === "string" ? route.query.returnPath : menuPath(config.slug))
                  }
                >
                  返回
                </Button>
              </div>
            ),
          }}
        />
      );
    },
  });
}
