import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { pageAreas, pageAssessmentTasks, pageUnitTypes } from "@/api/server";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { LIST_ACTION_LINK_PROPS, TABLE_CODE_COLUMN_WIDTH, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Page, PageLayout as PcLayout, Tag, usePcForm, usePcTable, type ColumnType } from "@/pc-ui-runtime";
import type { AssessmentUnitVO, UnitTypeVO, ZoneVO } from "@/types/risk";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapAssessmentTaskFromApi, mapUnitTypeFromApi, mapZoneFromApi } from "@/utils/risk-control-mapper";

const ASSESSMENT_STATUS = {
  PENDING: { label: "待评估", color: "gold" },
  ASSESSING: { label: "评估中", color: "blue" },
  COMPLETED: { label: "已完成", color: "green" },
} as const;

type SelectOptionItem = { label: string; value: string };

const buildSearchSchema = (zoneOptions: SelectOptionItem[]) => [
  {
    component: "Select" as const,
    label: "所属区域",
    fieldName: "zoneId",
    defaultValue: "",
    componentProps: {
      allowClear: true,
      placeholder: "全部区域",
      options: zoneOptions,
    },
  },
  {
    component: "Select" as const,
    label: "评估状态",
    fieldName: "status",
    defaultValue: "",
    componentProps: {
      allowClear: true,
      placeholder: "全部状态",
      options: [
        { label: "全部状态", value: "" },
        ...Object.entries(ASSESSMENT_STATUS).map(([value, option]) => ({
          label: option.label,
          value,
        })),
      ],
    },
  },
  {
    component: "Input" as const,
    label: "关键词",
    fieldName: "keyword",
    componentProps: { placeholder: "搜索单元名称", allowClear: true, maxlength: 100 },
  },
];

export const AssessmentListPage = defineComponent({
  name: "AssessmentListPage",
  setup() {
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const zones = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);
    const search = reactive({
      keyword: "",
      zoneId: "",
      status: "" as AssessmentUnitVO["status"] | "",
    });

    const resolveStatus = (record: AssessmentUnitVO): keyof typeof ASSESSMENT_STATUS => {
      if (record.status) return record.status;
      if (record.objectCount > 0 && (record.completedCount ?? 0) >= record.objectCount) return "COMPLETED";
      if ((record.completedCount ?? 0) > 0) return "ASSESSING";
      return "PENDING";
    };

    const hydrateRecord = (record: AssessmentUnitVO): AssessmentUnitVO => ({
      ...record,
      zoneName: record.zoneName || zones.value.find((zone) => zone.id === record.zoneId)?.name || "--",
      unitType: record.unitType || unitTypes.value.find((type) => type.id === record.unitTypeId)?.name || "--",
    });

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

    const riskCell = (level?: AssessmentUnitVO["riskLevel"]): JSX.Element =>
      level ? <RiskLevelTag level={level} /> : <span style={{ color: "#999" }}>待评估</span>;

    const columns: ColumnType[] = [
      {
        title: "编号",
        dataIndex: "code",
        width: TABLE_CODE_COLUMN_WIDTH,
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => text || "--",
      },
      { title: "单元名称", dataIndex: "unitName", width: 180, ellipsis: true },
      { title: "单元类型", dataIndex: "unitType", width: 120, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "所属区域", dataIndex: "zoneName", width: 150, ellipsis: true },
      {
        title: "固有评估",
        dataIndex: "inherentRiskLevel",
        width: 120,
        customRender: ({ text }: { text: AssessmentUnitVO["inherentRiskLevel"] }) => riskCell(text),
      },
      {
        title: "控制评估",
        dataIndex: "controlRiskLevel",
        width: 120,
        customRender: ({ text }: { text: AssessmentUnitVO["controlRiskLevel"] }) => riskCell(text),
      },
      {
        title: "评估状态",
        dataIndex: "status",
        width: 100,
        customRender: ({ record }: { record: AssessmentUnitVO }): JSX.Element => {
          const status = ASSESSMENT_STATUS[resolveStatus(record)];
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
      { title: "风险对象数", dataIndex: "objectCount", width: 100, align: "center" as const },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 110,
        customRender: ({ record }: { record: AssessmentUnitVO }): JSX.Element => (
          <Button
            {...LIST_ACTION_LINK_PROPS}
            onClick={() => router.push({ name: "assessment-detail", query: { unitId: record.unitId ?? record.id } })}
          >
            进入评估
          </Button>
        ),
      },
    ];

    const fetchAssessmentPage = async () => {
      const result = await useAuthRequest(() =>
        pageAssessmentTasks({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          areaId: search.zoneId || undefined,
          status: search.status || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapAssessmentTaskFromApi).map(hydrateRecord);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_ASSESSMENT_LIST",
      rowKey: "id",
      fetchApi: fetchAssessmentPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: buildSearchSchema([{ label: "全部区域", value: "" }]),
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        zoneId: (values.zoneId as string | undefined) ?? "",
        status: (values.status as AssessmentUnitVO["status"] | "" | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.zoneId = (values.zoneId as string | undefined) ?? "";
        search.status = (values.status as AssessmentUnitVO["status"] | "" | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.zoneId = "";
        search.status = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    onMounted(async () => {
      await Promise.all([loadZones(), loadUnitTypes()]);
      formApi.updateSchema(
        buildSearchSchema([{ label: "全部区域", value: "" }, ...zones.value.map((zone) => ({ label: zone.name, value: zone.id }))]),
      );
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("风险评估管理")} v-slots={slots} />;
  },
});
