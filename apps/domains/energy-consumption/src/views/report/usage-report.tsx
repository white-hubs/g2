import { defineComponent, ref } from "vue";

import ImportModal from "./components/import-modal";
import ReportList from "./components/report-list";
import { areaColumns, classifyColumns, subItemColumns } from "./usage-report-columns";
import { classifyExport, subItemExport } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, TabPane, Tabs, message } from "@/pc-ui-runtime";

interface SearchItem {
  tableLength: number;
  instrumentType?: string;
  period?: string;
  projectId?: string;
}

function downloadExcel(data: BlobPart, title: string) {
  const link = document.createElement("a");
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  link.style.display = "none";
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", title);
  document.body.append(link);
  link.click();
  link.remove();
}

export const UsageReport = defineComponent({
  name: "UsageReport",
  setup() {
    const activeKey = ref("classify");
    const refresh = ref(true);
    const searchItem = ref<SearchItem>({ tableLength: 0 });
    const importVisible = ref(false);

    const handleExport = async () => {
      if (!searchItem.value || searchItem.value.tableLength === 0) {
        message.warning("未查询到数据，无法导出");
        return;
      }
      let exportData: BlobPart;
      let exportTitle: string;
      if (activeKey.value === "classify") {
        const { data } = await classifyExport({
          instrumentType: searchItem.value.instrumentType,
          period: searchItem.value.period,
          projectCategory: "CATEGORY",
          exportType: "USAGE",
        });
        exportData = data as BlobPart;
        exportTitle = "分类报表.xlsx";
      } else if (activeKey.value === "subItem") {
        const { data } = await subItemExport({
          instrumentType: searchItem.value.instrumentType,
          period: searchItem.value.period,
          projectCategory: "ITEM",
          exportType: "USAGE",
        });
        exportData = data as BlobPart;
        exportTitle = "分项报表.xlsx";
      } else {
        const { data } = await subItemExport({
          instrumentType: searchItem.value.instrumentType,
          projectId: searchItem.value.projectId,
          period: searchItem.value.period,
          projectCategory: "AREA",
          exportType: "USAGE",
        });
        exportData = data as BlobPart;
        exportTitle = "区域报表.xlsx";
      }
      downloadExcel(exportData, exportTitle);
    };

    return () => (
      <>
        <GLayout
          title="用能报表"
          v-slots={{
            "header-btn": () => (
              <>
                {activeKey.value === "classify" ? (
                  <Button type="primary" style={{ marginRight: "10px" }} onClick={() => (importVisible.value = true)}>
                    批量导入
                  </Button>
                ) : null}
                <Button type="primary" style={{ marginRight: "10px" }} onClick={() => void handleExport()}>
                  导出
                </Button>
              </>
            ),
            "content-data": () => (
              <Tabs
                activeKey={activeKey.value}
                onChange={(value: string | number) => {
                  activeKey.value = String(value);
                }}
              >
                <TabPane key="classify" tab="分类报表">
                  <ReportList
                    activeKey="classify"
                    columns={classifyColumns}
                    refresh={refresh.value}
                    onSearch={(val: SearchItem) => {
                      if (activeKey.value === "classify") {
                        searchItem.value = val;
                      }
                    }}
                  />
                </TabPane>
                <TabPane key="subItem" tab="分项报表">
                  <ReportList
                    activeKey="subItem"
                    columns={subItemColumns}
                    onSearch={(val: SearchItem) => {
                      if (activeKey.value === "subItem") {
                        searchItem.value = val;
                      }
                    }}
                  />
                </TabPane>
                <TabPane key="area" tab="区域报表">
                  <ReportList
                    activeKey="area"
                    columns={areaColumns}
                    onSearch={(val: SearchItem) => {
                      if (activeKey.value === "area") {
                        searchItem.value = val;
                      }
                    }}
                  />
                </TabPane>
              </Tabs>
            ),
          }}
        />
        <ImportModal
          visible={importVisible.value}
          activeKey={activeKey.value}
          onClose={() => {
            importVisible.value = false;
            refresh.value = !refresh.value;
          }}
        />
      </>
    );
  },
});

export default UsageReport;
