import { defineComponent, ref } from "vue";

import { electricColumns, gasColumns, totalFeeColumns, waterColumns } from "./columns";
import { ReportList } from "./components/report-list";
import { exportReportElectric, exportReportOther, exportReportTotal } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, TabPane, Tabs, message } from "@/pc-ui-runtime";
import { downloadBlob } from "@/utils/common";

export const FeeReport = defineComponent({
  name: "FeeReport",
  setup() {
    const activeKey = ref("total");
    const refresh = ref(true);
    const searchItem = ref<{ period?: string; tableLength?: number }>();

    const handleExport = async () => {
      if (searchItem.value?.tableLength === 0) {
        message.warning("未查询到数据，无法导出");
        return;
      }
      let exportData: Blob | ArrayBuffer | unknown;
      let exportTitle = "";
      if (activeKey.value === "total") {
        const { data } = (await exportReportTotal({ period: searchItem.value?.period })) as { data: Blob };
        exportData = data;
        exportTitle = "总费用报表.xlsx";
      } else if (activeKey.value === "electric") {
        const { data } = (await exportReportElectric({ period: searchItem.value?.period })) as { data: Blob };
        exportData = data;
        exportTitle = "电费报表.xlsx";
      } else if (activeKey.value === "water") {
        const { data } = (await exportReportOther({
          instrumentTypeList: "water_meter",
          period: searchItem.value?.period,
        })) as { data: Blob };
        exportData = data;
        exportTitle = "水费报表.xlsx";
      } else {
        const { data } = (await exportReportOther({
          instrumentTypeList: "gas_meter",
          period: searchItem.value?.period,
        })) as { data: Blob };
        exportData = data;
        exportTitle = "气费报表.xlsx";
      }
      const blob =
        exportData instanceof Blob
          ? exportData
          : new Blob([exportData as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      downloadBlob(blob, exportTitle);
    };

    return () => (
      <GLayout
        title="费用报表"
        v-slots={{
          "header-btn": () => (
            <Button type="primary" style="margin-right: 10px;" onClick={() => void handleExport()}>
              导出
            </Button>
          ),
          "content-data": () => (
            <Tabs v-model:activeKey={activeKey.value} onChange={(value: string | number) => (activeKey.value = String(value))}>
              <TabPane key="total" tab="总费用报表">
                <ReportList
                  activeKey={activeKey.value}
                  columns={totalFeeColumns}
                  refresh={refresh.value}
                  onSearch={(val: { period?: string; tableLength?: number }) => (searchItem.value = val)}
                />
              </TabPane>
              <TabPane key="electric" tab="电费报表">
                <ReportList
                  activeKey={activeKey.value}
                  columns={electricColumns}
                  onSearch={(val: { period?: string; tableLength?: number }) => (searchItem.value = val)}
                />
              </TabPane>
              <TabPane key="water" tab="水费报表">
                <ReportList
                  activeKey={activeKey.value}
                  columns={waterColumns}
                  onSearch={(val: { period?: string; tableLength?: number }) => (searchItem.value = val)}
                />
              </TabPane>
              <TabPane key="gas" tab="燃气费报表">
                <ReportList
                  activeKey={activeKey.value}
                  columns={gasColumns}
                  onSearch={(val: { period?: string; tableLength?: number }) => (searchItem.value = val)}
                />
              </TabPane>
            </Tabs>
          ),
        }}
      />
    );
  },
});
