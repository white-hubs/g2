import { defineComponent, onMounted, reactive, ref, toRef } from "vue";
import { useRouter } from "vue-router";

import { pageAreas, pageFourColorMapUnits, pageUnitTypes } from "@/api/server";
import { RiskGisMapEditor } from "@/components/risk-gis-map-editor/risk-gis-map-editor";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { LIST_ACTION_LINK_PROPS, LIST_FILTER_SELECT_WIDTH, LIST_SEARCH_INPUT_PROPS, RISK_LEVEL_LABEL } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { useListSearchClearReload } from "@/hooks/use-list-search-clear-reload";
import { useServerPagedList } from "@/hooks/use-server-paged-list";
import {
  Button,
  Card,
  Col,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout as PcLayout,
  Row,
  Select,
  SelectOption,
  Space,
  Table,
  Tooltip,
} from "@/pc-ui-runtime";
import type { RiskLevel, UnitTypeVO, UnitVO, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { unwrapPageRecords } from "@/utils/page-records";
import { useLayoutTitle } from "@/utils/page-title";
import { mapRiskLevelToApi, mapUnitFromApi, mapUnitTypeFromApi, mapZoneFromApi } from "@/utils/risk-control-mapper";

import styles from "./four-color-map.module.less";

const STAT_ITEMS = [
  { key: "major" as const, level: "MAJOR" as RiskLevel, label: RISK_LEVEL_LABEL.MAJOR, color: "#cf1322" },
  { key: "significant" as const, level: "SIGNIFICANT" as RiskLevel, label: RISK_LEVEL_LABEL.SIGNIFICANT, color: "#fa8c16" },
  { key: "general" as const, level: "GENERAL" as RiskLevel, label: RISK_LEVEL_LABEL.GENERAL, color: "#faad14" },
  { key: "low" as const, level: "LOW" as RiskLevel, label: RISK_LEVEL_LABEL.LOW, color: "#1890ff" },
];

type UnitRow = {
  id: string;
  name: string;
  zoneName: string;
  riskLevel?: UnitVO["controlRiskLevel"];
  inherentRiskLevel?: UnitVO["inherentRiskLevel"];
  controlRiskLevel?: UnitVO["controlRiskLevel"];
  unitCount: number;
  coordinateText: string;
};

type FourColorStats = {
  major: number;
  significant: number;
  general: number;
  low: number;
};

function formatCoordinate(location?: UnitVO["location"]): string {
  if (!location) return "--";
  return `${location.lng.toFixed(2)},${location.lat.toFixed(2)}`;
}

function mapUnitRow(vo: Parameters<typeof mapUnitFromApi>[0]): UnitRow {
  const unit = mapUnitFromApi(vo);
  return {
    id: unit.id,
    name: unit.name,
    zoneName: unit.zoneName || "--",
    riskLevel: unit.controlRiskLevel ?? unit.riskLevel,
    inherentRiskLevel: unit.inherentRiskLevel,
    controlRiskLevel: unit.controlRiskLevel,
    unitCount: vo.objectCount ?? 0,
    coordinateText: formatCoordinate(unit.location),
  };
}

function countZoneStats(zones: ZoneVO[]): FourColorStats {
  return zones.reduce<FourColorStats>(
    (acc, zone) => {
      const level = zone.riskLevel ?? zone.controlRiskLevel ?? zone.inherentRiskLevel;
      if (level === "MAJOR") acc.major += 1;
      if (level === "SIGNIFICANT") acc.significant += 1;
      if (level === "GENERAL") acc.general += 1;
      if (level === "LOW") acc.low += 1;
      return acc;
    },
    { major: 0, significant: 0, general: 0, low: 0 },
  );
}

export const FourColorMapPage = defineComponent({
  setup() {
    const router = useRouter();
    const layoutTitle = useLayoutTitle("风险四色图");
    const mapRef = ref<{ focusUnit: (unitId: string) => Promise<void> } | null>(null);
    const colorStats = ref<FourColorStats>({ major: 0, significant: 0, general: 0, low: 0 });
    const zones = ref<ZoneVO[]>([]);
    const zoneOptions = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);
    const unitRows = ref<UnitRow[]>([]);
    const selectedUnitId = ref("");
    const overviewLoading = ref(false);
    const tableLoading = ref(false);
    const { pageNumber, pageSize, total, onPageChange: bindPageChange, scheduleInitialLoad, rewindIfEmpty } = useServerPagedList();
    const filters = reactive({
      keyword: "",
      areaId: "",
      riskLevel: "" as "" | RiskLevel,
      unitTypeId: "",
    });

    const buildFilterParams = (): {
      keyword?: string;
      riskLevel?: string;
      areaId?: string;
      unitTypeId?: string;
    } => ({
      keyword: filters.keyword.trim() || undefined,
      riskLevel: mapRiskLevelToApi(filters.riskLevel || undefined) || undefined,
      areaId: filters.areaId || undefined,
      unitTypeId: filters.unitTypeId || undefined,
    });

    const loadFilterOptions = async (): Promise<void> => {
      try {
        const [areaPage, typePage] = await Promise.all([
          useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" })),
          useAuthRequest(() => pageUnitTypes({ pageNumber: 1, pageSize: 500, view: "option" })),
        ]);
        zoneOptions.value = unwrapPageRecords(areaPage).map(mapZoneFromApi);
        unitTypes.value = unwrapPageRecords(typePage).map(mapUnitTypeFromApi);
      } catch {
        zoneOptions.value = [];
        unitTypes.value = [];
      }
    };

    const loadOverview = async (): Promise<void> => {
      overviewLoading.value = true;
      try {
        const areaPage = await useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500 }));
        const nextZones = areaPage.records.map(mapZoneFromApi);
        zones.value = nextZones;
        colorStats.value = countZoneStats(nextZones);
      } catch (e) {
        showApiError(e);
        colorStats.value = { major: 0, significant: 0, general: 0, low: 0 };
        zones.value = [];
      } finally {
        overviewLoading.value = false;
      }
    };

    const loadUnitList = async (): Promise<void> => {
      tableLoading.value = true;
      try {
        const unitPage = await useAuthRequest(() =>
          pageFourColorMapUnits({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            ...buildFilterParams(),
          }),
        );
        unitRows.value = unitPage.records.map(mapUnitRow);
        total.value = unitPage.total ?? unitRows.value.length;
        await rewindIfEmpty(unitRows.value.length, loadUnitList);
      } catch (e) {
        showApiError(e);
        unitRows.value = [];
        total.value = 0;
      } finally {
        tableLoading.value = false;
      }
    };

    const loadAll = async (): Promise<void> => {
      await Promise.all([loadOverview(), loadUnitList()]);
    };

    onMounted(() => {
      void loadFilterOptions();
    });

    scheduleInitialLoad(loadAll);

    const onSearch = (): void => {
      pageNumber.value = 1;
      selectedUnitId.value = "";
      void loadUnitList();
    };

    useListSearchClearReload(toRef(filters, "keyword"), onSearch);

    const onReset = (): void => {
      filters.keyword = "";
      filters.areaId = "";
      filters.riskLevel = "";
      filters.unitTypeId = "";
      pageNumber.value = 1;
      selectedUnitId.value = "";
      void loadUnitList();
    };

    const onPageChange = bindPageChange(loadUnitList);

    const focusUnitOnMap = (unitId: string, event?: Event): void => {
      event?.stopPropagation();
      selectedUnitId.value = unitId;
      void mapRef.value?.focusUnit(unitId);
    };

    const goUnitInventory = (unitId: string, event?: Event): void => {
      event?.stopPropagation();
      void router.push({
        path: "/unit-inventory",
        query: { unitId },
      });
    };

    const goZoneDetail = (zoneId: string, event?: Event): void => {
      event?.stopPropagation();
      if (!zoneId) return;
      void router.push({
        name: "zone-form",
        query: { id: zoneId, mode: "view", from: "four-color-map" },
      });
    };

    const columns = [
      {
        dataIndex: "name",
        title: "风险单元",
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: UnitRow }): JSX.Element => (
          <Button {...LIST_ACTION_LINK_PROPS} onClick={(event: Event) => focusUnitOnMap(record.id, event)}>
            {text}
          </Button>
        ),
      },
      { dataIndex: "zoneName", title: "所属区域", width: 140, ellipsis: true },
      {
        dataIndex: "riskLevel",
        title: "风险等级",
        width: 110,
        customRender: ({ text }: { text: UnitRow["riskLevel"] }): JSX.Element => <RiskLevelTag level={text} />,
      },
      {
        dataIndex: "inherentRiskLevel",
        title: "固有风险",
        width: 110,
        customRender: ({ text }: { text: UnitRow["inherentRiskLevel"] }): JSX.Element => <RiskLevelTag level={text} />,
      },
      {
        dataIndex: "controlRiskLevel",
        title: "现状风险",
        width: 110,
        customRender: ({ text }: { text: UnitRow["controlRiskLevel"] }): JSX.Element => <RiskLevelTag level={text} />,
      },
      { dataIndex: "unitCount", title: "对象数", width: 90 },
      { dataIndex: "coordinateText", title: "坐标", width: 150, ellipsis: true },
      {
        title: "操作",
        width: 100,
        fixed: "right" as const,
        customRender: ({ record }: { record: UnitRow }): JSX.Element => (
          <Button {...LIST_ACTION_LINK_PROPS} onClick={(event: Event) => goUnitInventory(record.id, event)}>
            单元清单
          </Button>
        ),
      },
    ];

    return (): JSX.Element => (
      <PcLayout
        title={layoutTitle}
        v-slots={{
          "layout-content": (): JSX.Element => (
            <div class={styles.page}>
              <Row gutter={16} class={styles.statsRow}>
                {STAT_ITEMS.map((item) => {
                  return (
                    <Col key={item.key} xs={12} sm={6}>
                      <Tooltip title={`${item.label}风险区域 ${colorStats.value[item.key]} 个`}>
                        <Card loading={overviewLoading.value} class={styles.statCard}>
                          <div class={styles.statLabel}>
                            <span class={styles.statSwatch} style={{ background: item.color }} />
                            {item.label}
                          </div>
                          <div class={styles.statValue} style={{ color: item.color }}>
                            {colorStats.value[item.key]}
                            <span class={styles.statUnit}>个</span>
                          </div>
                        </Card>
                      </Tooltip>
                    </Col>
                  );
                })}
              </Row>

              <Card title="风险区域分布图" style={{ marginBottom: "16px" }} loading={overviewLoading.value}>
                <div class={styles.mapShell}>
                  <RiskGisMapEditor
                    ref={mapRef}
                    mode="readonly"
                    height={480}
                    overlayZones={zones.value}
                    overlayUnits={[]}
                    highlightedUnitId={selectedUnitId.value}
                    onUnitClick={(unitId: string) => focusUnitOnMap(unitId)}
                    onUnitInventoryClick={(unitId: string) => goUnitInventory(unitId)}
                    onZoneClick={(zoneId: string) => goZoneDetail(zoneId)}
                  />
                </div>
              </Card>

              <Card title="风险单元清单" class={styles.tableSection}>
                <Form
                  layout="inline"
                  class={styles.filterToolbar}
                  data-layout-toolbar
                  onSubmit={(e: Event) => {
                    e.preventDefault();
                  }}
                >
                  <FormItem label="区域">
                    <Select v-model:value={filters.areaId} allowClear placeholder="全部" style={{ width: LIST_FILTER_SELECT_WIDTH }}>
                      <SelectOption value="">全部</SelectOption>
                      {zoneOptions.value.map((zone) => (
                        <SelectOption key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <FormItem label="等级">
                    <Select v-model:value={filters.riskLevel} allowClear placeholder="全部" style={{ width: "140px" }}>
                      <SelectOption value="">全部</SelectOption>
                      {Object.entries(RISK_LEVEL_LABEL).map(([value, label]) => (
                        <SelectOption key={value} value={value}>
                          {label}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <FormItem label="类型">
                    <Select v-model:value={filters.unitTypeId} allowClear placeholder="全部" style={{ width: LIST_FILTER_SELECT_WIDTH }}>
                      <SelectOption value="">全部</SelectOption>
                      {unitTypes.value.map((type) => (
                        <SelectOption key={type.id} value={type.id}>
                          {type.name}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <FormItem label="搜索">
                    <Input
                      {...LIST_SEARCH_INPUT_PROPS}
                      v-model:value={filters.keyword}
                      placeholder="风险单元名称"
                      allowClear
                      style={{ width: "200px" }}
                      onPressEnter={onSearch}
                    />
                  </FormItem>
                  <FormItem>
                    <Space>
                      <Button type="primary" htmlType="button" onClick={onSearch}>
                        搜索
                      </Button>
                      <Button htmlType="button" onClick={onReset}>
                        重置
                      </Button>
                    </Space>
                  </FormItem>
                </Form>
                <div class="tableWrap">
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={unitRows.value}
                    pagination={false}
                    loading={tableLoading.value}
                    scroll={{ x: 1100 }}
                    customRow={(record: UnitRow) => ({
                      class: selectedUnitId.value === record.id ? styles.rowActive : "",
                      onClick: () => focusUnitOnMap(record.id),
                    })}
                  />
                </div>
              </Card>
            </div>
          ),
          "footer-page": () => (
            <Page current={pageNumber.value} pageSize={pageSize.value} total={total.value} onPageChange={onPageChange} />
          ),
        }}
      />
    );
  },
});
