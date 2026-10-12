import type { AssetRow, DepartmentAssetRow, DepartmentSummary, DepartmentUse } from "@g2-contract/asset-management";
import type { PcChartOption } from "@g2-platform/pc-chart";
import type { PcFormSchemaProp } from "@g2-platform/pc-ui";
import { computed, defineComponent, markRaw, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ChartPanel } from "./chart-panel";
import { getClient } from "./domain-context";
import { BASE } from "./menu-data";
import { ORDER_TYPES, cleanQuery, download, errorText, money, positiveInt, text } from "./model";
import { useOptions } from "./options";
import { loadPcUi } from "./runtime-modules";
import { columnsFor, inoutColumns } from "./table-columns";
import { TimeFilter, datePeriod } from "./time-filter";

import styles from "./styles.module.css";
const { Button, Page, PageLayout, Select, Space, Tag, TreeSelect, message, usePcForm, usePcTable } = await loadPcUi();
export const DepartmentAssets = defineComponent({
  setup() {
    const router = useRouter();
    const route = useRoute();
    const filter = reactive({ name: "" });
    const summary = ref<DepartmentSummary>({ depAll: [], totalNumber: 0, totalPrice: 0 });
    const exporting = ref(false);
    let version = 0;
    const columns = columnsFor("deptAsset");
    const count = columns.find((item) => item.dataIndex === "totalNumber");
    if (count) {
      count.customRender = ({ record }) => (
        <Button
          type="link"
          size="small"
          onClick={() =>
            void router.push({
              path: `${BASE}/deptAssetList`,
              query: { id: (record as DepartmentAssetRow).depId, returnPath: route.fullPath },
            })
          }
        >
          {(record as DepartmentAssetRow).totalNumber}
        </Button>
      );
    }
    const [PcTable, table] = usePcTable({ tableCode: "DEPT_ASSET", rowKey: "depId", autoFetch: false, pagination: false, columns });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const result = await getClient().departmentSummary(filter);
        if (current === version) {
          summary.value = result;
          table.setDataSource(result.depAll);
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: filter,
      actionsInline: true,
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "部门名称", allowClear: true },
        },
      ],
      handleSubmit: () => void load(),
      handleReset: () => void load(),
    });
    const exportData = async () => {
      exporting.value = true;
      try {
        download(await getClient().export("departments", filter), "部门资产汇总.xlsx");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        exporting.value = false;
      }
    };
    onMounted(() => void load());
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="部门资产汇总"
        showFooter={false}
        class={styles.page}
        v-slots={{
          "layout-header": () => (
            <Button loading={exporting.value} onClick={() => void exportData()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.main}>
              <PcForm />
              <div class={styles.summary}>
                <span>
                  资产总数<strong>{summary.value.totalNumber}</strong>
                </span>
                <span>
                  总金额（元）<strong>{money(summary.value.totalPrice)}</strong>
                </span>
              </div>
              <PcTable />
            </div>
          ),
        }}
      />
    );
  },
});
export const DepartmentAssetList = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const pager = reactive({
      pageNumber: positiveInt(route.query.pageNumber, 1),
      pageSize: positiveInt(route.query.pageSize, 10),
      total: 0,
    });
    let version = 0;
    const [PcTable, table] = usePcTable({
      tableCode: "DEPT_ASSET_LIST",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns: columnsFor("deptAssetList", () => (pager.pageNumber - 1) * pager.pageSize),
    });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const page = await getClient().page("inventory", {
          receiveDepId: String(route.query.id ?? ""),
          pageNumber: pager.pageNumber,
          pageSize: pager.pageSize,
        });
        if (current === version) {
          table.setDataSource(page.records);
          pager.total = page.total;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    onMounted(() => void load());
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="部门资产清单"
        class={styles.page}
        v-slots={{
          "layout-content": () => <PcTable />,
          "footer-page": () => (
            <Space>
              <Page
                cachePageQuery
                current={pager.pageNumber}
                pageSize={pager.pageSize}
                total={pager.total}
                onPageChange={(number: number, size: number) => {
                  pager.pageNumber = number;
                  pager.pageSize = size;
                  void load();
                }}
              />
              <Button
                onClick={() =>
                  void router.push(
                    typeof route.query.returnPath === "string" && route.query.returnPath.startsWith(`${BASE}/deptAsset`)
                      ? route.query.returnPath
                      : `${BASE}/deptAsset`,
                  )
                }
              >
                返回
              </Button>
            </Space>
          ),
        }}
      />
    );
  },
});
export const InoutStatistics = defineComponent({
  setup() {
    const route = useRoute();
    const filter = reactive<Record<string, unknown>>({ period: undefined, categoryId: undefined, keyword: "" });
    const choices = useOptions();
    const exporting = ref(false);
    const pager = reactive({
      pageNumber: positiveInt(route.query.pageNumber, 1),
      pageSize: positiveInt(route.query.pageSize, 10),
      total: 0,
    });
    let version = 0;
    const [PcTable, table] = usePcTable({
      tableCode: "CONSUMABLE_INOUT",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns: inoutColumns(),
    });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const page = await getClient().page("inout", { ...cleanQuery(filter), pageNumber: pager.pageNumber, pageSize: pager.pageSize });
        if (current === version) {
          table.setDataSource(page.records);
          pager.total = page.total;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const schema = (): PcFormSchemaProp[] => [
      { component: "DatePicker", fieldName: "period", label: "统计时间", componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true } },
      {
        component: markRaw(TreeSelect),
        fieldName: "categoryId",
        label: "耗材分类",
        componentProps: {
          treeData: choices.data.categories,
          fieldNames: { label: "name", value: "id", children: "children" },
          allowClear: true,
          placeholder: "请选择耗材分类",
        },
      },
      {
        component: "Input",
        fieldName: "keyword",
        label: "",
        defaultValue: "",
        componentProps: { placeholder: "耗材名称、编码", allowClear: true },
      },
    ];
    const [PcForm, form] = usePcForm({
      layout: "horizontal",
      syncStateRef: filter,
      actionsInline: true,
      showCollapseButton: false,
      schema: schema(),
      handleSubmit: () => {
        pager.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        pager.pageNumber = 1;
        void load();
      },
    });
    const exportData = async () => {
      exporting.value = true;
      try {
        download(await getClient().export("inout", cleanQuery(filter)), "耗材出入库统计.xlsx");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        exporting.value = false;
      }
    };
    onMounted(() => {
      void load();
      void choices
        .load(["categories"])
        .then(() => form.updateSchema(schema()))
        .catch((error: unknown) => message.error(errorText(error)));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="耗材出入库统计"
        class={styles.page}
        v-slots={{
          "layout-header": () => (
            <Button loading={exporting.value} onClick={() => void exportData()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.main}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              cachePageQuery
              current={pager.pageNumber}
              pageSize={pager.pageSize}
              total={pager.total}
              onPageChange={(number: number, size: number) => {
                pager.pageNumber = number;
                pager.pageSize = size;
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});
export const DepartmentUseStatistics = defineComponent({
  setup() {
    const router = useRouter();
    const route = useRoute();
    const filter = reactive({
      dimension: "TODAY",
      period: datePeriod("TODAY"),
      deptId: undefined as string | undefined,
      relatedOrderType: undefined as string | undefined,
    });
    const choices = useOptions();
    const rows = ref<DepartmentUse[]>([]);
    const selected = ref("");
    const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let version = 0;
    const link = (row: AssetRow) => {
      if (!row.processInstanceId || !ORDER_TYPES.some((item) => item.value === row.relatedOrderType)) {
        return;
      }
      void router.push({
        path: `${BASE}/deptUseStatistics/flow-render`,
        query: {
          type: "detail",
          businessType: text(row, "relatedOrderType"),
          processInstanceId: text(row, "processInstanceId"),
          returnPath: route.fullPath,
        },
      });
    };
    const columns = columnsFor("departmentUse", () => (pager.pageNumber - 1) * pager.pageSize);
    columns.push({
      title: "操作",
      dataIndex: "action",
      width: 90,
      fixed: "right",
      customRender: ({ record }) => {
        const row = record as AssetRow;
        return row.processInstanceId && ORDER_TYPES.some((item) => item.value === row.relatedOrderType) ? (
          <Button type="link" size="small" onClick={() => link(row)}>
            详情
          </Button>
        ) : (
          "--"
        );
      },
    });
    const orderNumberColumn = columns.find((item) => item.dataIndex === "relatedOrderNumber");
    if (orderNumberColumn) {
      orderNumberColumn.customRender = ({ record }) => (
        <Button type="link" size="small" onClick={() => link(record as AssetRow)}>
          {text(record as AssetRow, "relatedOrderNumber")}
        </Button>
      );
    }
    const [PcTable, table] = usePcTable({
      rowKey: "id",
      tableCode: "CONSUMABLE_REQUISITION",
      autoFetch: false,
      pagination: false,
      columns,
    });
    const load = async (chart = true) => {
      const current = ++version;
      table.loading.value = true;
      try {
        const [page, stat] = await Promise.all([
          getClient().page("departmentUse", {
            ...filter,
            deptId: selected.value || filter.deptId,
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
          }),
          chart ? getClient().departmentUse(filter) : Promise.resolve(rows.value),
        ]);
        if (current === version) {
          rows.value = stat;
          table.setDataSource(page.records);
          pager.total = page.total;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const option = computed<PcChartOption>(() => ({
      tooltip: { trigger: "axis" },
      grid: { left: 45, right: 24, bottom: 50, top: 20, containLabel: true },
      xAxis: { type: "category", data: rows.value.map((row) => row.deptName) },
      yAxis: [
        { type: "value", name: "耗材数量" },
        { type: "value", name: "金额（元）" },
      ],
      series: [
        { type: "bar", name: "耗材数量", data: rows.value.map((row) => row.consumableNum), barMaxWidth: 32 },
        { type: "line", name: "金额（元）", yAxisIndex: 1, data: rows.value.map((row) => row.amount) },
      ],
    }));
    onMounted(() => {
      void load();
      void choices.load(["departments"]).catch((error: unknown) => message.error(errorText(error)));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="耗材部门领用统计"
        class={styles.page}
        v-slots={{
          "layout-header": () => (
            <TimeFilter
              onReset={() => {
                filter.deptId = undefined;
                filter.relatedOrderType = undefined;
              }}
              onChange={(value) => {
                Object.assign(filter, value);
                selected.value = "";
                pager.pageNumber = 1;
                void load();
              }}
              v-slots={{
                filters: () => (
                  <>
                    <TreeSelect
                      style={{ width: "160px" }}
                      value={filter.deptId}
                      treeData={choices.data.departments}
                      fieldNames={{ label: "name", value: "id", children: "children" }}
                      allowClear
                      placeholder="领用部门"
                      onChange={(value) => {
                        filter.deptId = value === undefined ? undefined : String(value);
                      }}
                    />
                    <Select
                      style={{ width: "150px" }}
                      value={filter.relatedOrderType}
                      options={ORDER_TYPES}
                      allowClear
                      placeholder="领用类型"
                      onChange={(value) => {
                        filter.relatedOrderType = value === undefined ? undefined : String(value);
                      }}
                    />
                  </>
                ),
              }}
            />
          ),
          "layout-content": () => (
            <div class={styles.main}>
              <div style={{ flex: "0 0 350px", minHeight: 0 }}>
                <ChartPanel
                  title="耗材领用统计（点击部门查看明细）"
                  option={option.value}
                  empty={rows.value.length === 0}
                  onSelect={(index) => {
                    selected.value = rows.value[index]?.deptId ?? "";
                    pager.pageNumber = 1;
                    void load(false);
                  }}
                />
              </div>
              <div class={styles.toolbar} style={{ marginTop: "16px", marginBottom: "10px" }}>
                <strong>耗材领用明细表</strong>
                {selected.value && (
                  <Tag
                    closable
                    onClose={() => {
                      selected.value = "";
                      pager.pageNumber = 1;
                      void load(false);
                    }}
                  >
                    {rows.value.find((row) => row.deptId === selected.value)?.deptName}
                  </Tag>
                )}
              </div>
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              cachePageQuery={false}
              current={pager.pageNumber}
              pageSize={pager.pageSize}
              total={pager.total}
              syncToUrl={false}
              onPageChange={(number: number, size: number) => {
                pager.pageNumber = number;
                pager.pageSize = size;
                void load(false);
              }}
            />
          ),
        }}
      />
    );
  },
});
