import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { pageAreas, pageUnitInventory, pageUnitTypes } from "@/api/server";
import { ExpandableUnitPanel } from "@/components/expandable-unit-panel/expandable-unit-panel";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { OBJECT_STATUS_LABEL, TABLE_CODE_COLUMN_WIDTH, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Page, PageLayout as PcLayout, Spin, Tag, message, usePcForm, usePcTable, type ColumnType } from "@/pc-ui-runtime";
import type { RiskLevel, UnitInventoryRowVO, UnitTypeVO, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { downloadBlob } from "@/utils/download-blob";
import { createListPageState } from "@/utils/list-page";
import { loadUnitInventoryDetail } from "@/utils/load-unit-inventory-detail";
import { useLayoutTitle } from "@/utils/page-title";
import { mapUnitTypeFromApi, mapUnitInventoryRowFromApi, mapZoneFromApi } from "@/utils/risk-control-mapper";
import { exportRiskXlsx } from "@/utils/risk-export";

/** usePcTable 要求 string rowKey，补齐顶层 id 供展开与滚动定位。 */
type InventoryTableRow = UnitInventoryRowVO & { id: string };

const resolveObjectCount = (row: UnitInventoryRowVO): number => row.objectCount ?? row.objects.length;

const maxRiskLevel = (levels: (RiskLevel | undefined)[]): RiskLevel | undefined => {
  const order: RiskLevel[] = ["MAJOR", "SIGNIFICANT", "GENERAL", "LOW"];
  for (const lv of order) {
    if (levels.includes(lv)) return lv;
  }
  return undefined;
};

const riskLevelValue = (level?: RiskLevel): JSX.Element =>
  level ? <RiskLevelTag level={level} /> : <span style={{ color: "#999" }}>未评估</span>;

const deriveControlStatus = (row: UnitInventoryRowVO): { label: string; color: string } => {
  const statuses = row.objects.map((o) => o.status);
  if (statuses.length === 0) {
    const status = row.unit.controlStatus;
    if (!status) return { label: "--", color: "default" };
    if (status === "ACTIVE") return { label: "管控中", color: "green" };
    if (status === "EXECUTING") return { label: "执行中", color: "blue" };
    if (status === "CONTROL_SET" || status === "CONTROL_EVAL") return { label: "待配置", color: "gold" };
    return { label: OBJECT_STATUS_LABEL[status] ?? status, color: "default" };
  }
  if (statuses.every((s) => s === "ACTIVE")) {
    return { label: "管控中", color: "green" };
  }
  if (statuses.some((s) => s === "EXECUTING")) {
    return { label: "执行中", color: "blue" };
  }
  if (statuses.some((s) => s === "CONTROL_SET" || s === "CONTROL_EVAL")) {
    return { label: "待配置", color: "gold" };
  }
  return { label: OBJECT_STATUS_LABEL[statuses[0] ?? "DRAFT"], color: "default" };
};

const toTableRow = (row: UnitInventoryRowVO): InventoryTableRow => ({
  ...row,
  id: row.unit.id,
});

export const UnitInventoryPage = defineComponent({
  name: "UnitInventoryPage",
  setup() {
    const route = useRoute();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const zones = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);
    const search = reactive({
      keyword: "",
      zoneId: "",
      unitTypeId: "",
    });
    const expandedRowKeys = ref<string[]>([]);
    const detailLoadingIds = ref<string[]>([]);
    const fetchUnitId = ref<string | undefined>();
    const pendingExpandUnitId = ref<string | null>(null);
    let bootstrapped = false;

    const loadZones = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" }));
        zones.value = (result?.records ?? []).map(mapZoneFromApi);
      } catch {
        zones.value = [];
      }
    };

    const loadUnitTypes = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageUnitTypes({ pageNumber: 1, pageSize: 500, view: "option" }));
        unitTypes.value = (result?.records ?? []).map(mapUnitTypeFromApi);
      } catch {
        unitTypes.value = [];
      }
    };

    const bumpTable = (): void => {
      tableApi.setState({ dataSource: [...(tableApi.getDataSource() ?? [])] });
    };

    const scrollToUnitRow = async (unitId: string): Promise<void> => {
      await nextTick();
      const row = document.querySelector(`[data-unit-id="${unitId}"]`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const loadRowDetail = async (unitId: string): Promise<void> => {
      const records = (tableApi.getDataSource() ?? []) as InventoryTableRow[];
      const row = records.find((r) => r.id === unitId);
      if (!row || row.detailLoaded || detailLoadingIds.value.includes(unitId)) return;
      detailLoadingIds.value = [...detailLoadingIds.value, unitId];
      bumpTable();
      try {
        const { objects, measures } = await loadUnitInventoryDetail(unitId, useAuthRequest);
        row.objects = objects;
        row.measures = measures;
        row.detailLoaded = true;
        if (objects.length > 0) {
          row.objectCount = objects.length;
        }
        if (measures.length > 0) {
          row.measureCount = measures.length;
        }
      } catch (e) {
        showApiError(e);
      } finally {
        detailLoadingIds.value = detailLoadingIds.value.filter((id) => id !== unitId);
        bumpTable();
      }
    };

    const openUnitDetail = async (unitId: string): Promise<void> => {
      expandedRowKeys.value = [unitId];
      tableApi.setState({ expandedRowKeys: expandedRowKeys.value });
      await loadRowDetail(unitId);
      await scrollToUnitRow(unitId);
    };

    const handleExport = async (): Promise<void> => {
      if (page.total === 0) {
        message.warning("当前没有可导出的数据");
        return;
      }
      try {
        const blob = await useAuthRequest(() =>
          exportRiskXlsx("unit-inventory", {
            keyword: search.keyword.trim() || undefined,
            areaId: search.zoneId || undefined,
            unitTypeId: search.unitTypeId || undefined,
          }),
        );
        downloadBlob(blob, "单元清单.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e);
      }
    };

    const columns: ColumnType[] = [
      { title: "编号", dataIndex: ["unit", "code"], width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      { title: "单元名称", dataIndex: ["unit", "name"], width: 180, ellipsis: true },
      { title: "单元类型", dataIndex: ["unit", "unitType"], width: 90 },
      { title: "所属区域", dataIndex: ["unit", "zoneName"], width: 150, ellipsis: true },
      { title: "责任人", dataIndex: ["unit", "responsibleUser"], width: 90 },
      {
        title: "固有风险评估",
        dataIndex: "inherentRisk",
        width: 120,
        customRender: ({ record }: { record: InventoryTableRow }) => {
          const level = maxRiskLevel(record.objects.map((o) => o.innateLevel)) ?? record.unit.inherentRiskLevel;
          return riskLevelValue(level);
        },
      },
      {
        title: "现状风险评估",
        dataIndex: "controlRisk",
        width: 120,
        customRender: ({ record }: { record: InventoryTableRow }) => {
          const level = maxRiskLevel(record.objects.map((o) => o.controlLevel)) ?? record.unit.controlRiskLevel;
          return riskLevelValue(level);
        },
      },
      {
        title: "管控状态",
        dataIndex: "controlStatus",
        width: 100,
        customRender: ({ record }: { record: InventoryTableRow }) => {
          const st = deriveControlStatus(record);
          return <Tag color={st.color}>{st.label}</Tag>;
        },
      },
      {
        title: "风险对象数",
        dataIndex: "objectCountCol",
        width: 100,
        align: "center" as const,
        customRender: ({ record }: { record: InventoryTableRow }) => resolveObjectCount(record),
      },
    ];

    const fetchInventoryPage = async () => {
      const result = await useAuthRequest(() =>
        pageUnitInventory({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          areaId: search.zoneId || undefined,
          unitTypeId: search.unitTypeId || undefined,
          unitId: fetchUnitId.value || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapUnitInventoryRowFromApi).map(toTableRow);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_UNIT_INVENTORY",
      rowKey: "id",
      autoFetch: false,
      expandedRowKeys: expandedRowKeys.value,
      fetchApi: fetchInventoryPage,
      fetchLoaded: (data) => {
        page.total = data.total;
        const expandId = pendingExpandUnitId.value;
        if (!expandId) return;
        const records = data.records as InventoryTableRow[];
        if (records.some((row) => row.id === expandId)) {
          pendingExpandUnitId.value = null;
          fetchUnitId.value = undefined;
          void openUnitDetail(expandId);
          return;
        }
        if (fetchUnitId.value) {
          fetchUnitId.value = undefined;
          tableApi.query();
          return;
        }
        pendingExpandUnitId.value = null;
      },
      customRow: (record) => ({
        "data-unit-id": (record as InventoryTableRow).id,
      }),
      onExpand: (expanded, record) => {
        const key = (record as InventoryTableRow).id;
        expandedRowKeys.value = expanded ? [...expandedRowKeys.value, key] : expandedRowKeys.value.filter((k) => k !== key);
        tableApi.setState({ expandedRowKeys: expandedRowKeys.value });
        if (expanded) void loadRowDetail(key);
      },
      expandedRowRender: ({ record }) => {
        const row = record as InventoryTableRow;
        return detailLoadingIds.value.includes(row.id) ? <Spin style={{ padding: "16px" }} /> : <ExpandableUnitPanel row={row} />;
      },
    });

    const buildFilterSchema = () => [
      {
        component: "Select",
        label: "区域",
        fieldName: "zoneId",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部区域",
          options: [{ label: "全部区域", value: "" }, ...zones.value.map((z) => ({ label: z.name, value: z.id }))],
        },
      },
      {
        component: "Select",
        label: "类型",
        fieldName: "unitTypeId",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部类型",
          options: [{ label: "全部类型", value: "" }, ...unitTypes.value.map((t) => ({ label: t.name, value: t.id }))],
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: { placeholder: "搜索单元名称", allowClear: true, maxlength: 100 },
      },
    ];

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: buildFilterSchema(),
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        zoneId: (values.zoneId as string | undefined) ?? "",
        unitTypeId: (values.unitTypeId as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        void bootstrap();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.zoneId = (values.zoneId as string | undefined) ?? "";
        search.unitTypeId = (values.unitTypeId as string | undefined) ?? "";
        page.pageNumber = 1;
        fetchUnitId.value = undefined;
        pendingExpandUnitId.value = null;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.zoneId = "";
        search.unitTypeId = "";
        page.pageNumber = 1;
        fetchUnitId.value = undefined;
        pendingExpandUnitId.value = null;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    const bootstrap = async (): Promise<void> => {
      if (bootstrapped) return;
      bootstrapped = true;
      await Promise.all([loadZones(), loadUnitTypes()]);
      formApi.updateSchema(buildFilterSchema());
      const unitId = String(route.query.unitId ?? "").trim();
      if (unitId) {
        page.pageNumber = 1;
        fetchUnitId.value = unitId;
        pendingExpandUnitId.value = unitId;
        tableApi.query();
        return;
      }
      tableApi.query();
    };

    onMounted(() => {
      void bootstrap();
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      fetchUnitId.value = undefined;
      pendingExpandUnitId.value = null;
      expandedRowKeys.value = [];
      tableApi.setState({ expandedRowKeys: [] });
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <Button
          onClick={() => {
            void handleExport();
          }}
        >
          导出
        </Button>
      ),
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("单元清单")} v-slots={slots} />;
  },
});
