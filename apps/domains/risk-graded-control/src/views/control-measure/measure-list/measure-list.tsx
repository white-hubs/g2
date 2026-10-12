import { defineComponent, reactive } from "vue";

import { pageControlMeasures } from "@/api/server";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { Button, Page, PageLayout as PcLayout, Tag, message, usePcForm, usePcTable, type ColumnType } from "@/pc-ui-runtime";
import type { ControlMeasureVO, RiskLevel } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { downloadBlob } from "@/utils/download-blob";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapMeasureFromApi, mapRiskLevelFromApi, optionDisplayName } from "@/utils/risk-control-mapper";
import { exportRiskXlsx } from "@/utils/risk-export";

const EXEC_STATUS = {
  PENDING: { label: "待执行", color: "default" },
  EXECUTING: { label: "执行中", color: "processing" },
  DONE: { label: "已执行", color: "success" },
  OVERDUE: { label: "超期", color: "error" },
} as const;

interface MeasureListRow extends ControlMeasureVO {
  unitName: string;
  objectName: string;
  riskLevel?: RiskLevel;
}

export const MeasureListPage = defineComponent({
  name: "MeasureListPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
    });

    const exportData = async (): Promise<void> => {
      if (page.total === 0) {
        message.warning("当前没有可导出的数据");
        return;
      }
      try {
        const blob = await useAuthRequest(() =>
          exportRiskXlsx("control-measures", {
            keyword: search.keyword.trim() || undefined,
          }),
        );
        downloadBlob(blob, "管控措施清单.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e);
      }
    };

    const columns: ColumnType[] = [
      { title: "风险单元", dataIndex: "unitName", width: 160, ellipsis: true },
      { title: "风险对象", dataIndex: "objectName", width: 160, ellipsis: true },
      {
        title: "风险等级",
        dataIndex: "riskLevel",
        width: 100,
        customRender: ({ text }: { text: RiskLevel | undefined }) => <RiskLevelTag level={text} />,
      },
      { title: "管控类型", dataIndex: "controlType", width: 110 },
      { title: "管控层级", dataIndex: "controlLevel", width: 100 },
      { title: "执行人", dataIndex: "executor", width: 100 },
      { title: "措施内容", dataIndex: "content", ellipsis: true },
      {
        title: "执行状态",
        dataIndex: "execStatus",
        width: 100,
        customRender: ({ text }: { text: ControlMeasureVO["execStatus"] }) => {
          const status = EXEC_STATUS[text];
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
    ];

    const fetchMeasurePage = async () => {
      const result = await useAuthRequest(() =>
        pageControlMeasures({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
        }),
      );
      const records: MeasureListRow[] = (result?.records ?? []).map((vo) => ({
        ...mapMeasureFromApi(vo),
        unitName: optionDisplayName(vo.unit) || String(vo.unitName ?? "").trim(),
        objectName: vo.objectName ?? "",
        riskLevel: mapRiskLevelFromApi(vo.controlRiskLevel ?? vo.inherentRiskLevel),
      }));
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_MEASURE_LIST",
      rowKey: "id",
      fetchApi: fetchMeasurePage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          label: "关键词",
          fieldName: "keyword",
          componentProps: { placeholder: "对象/措施/执行人", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          onClick={() => {
            void exportData();
          }}
        >
          导出清单
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

    return () => <PcLayout title={useLayoutTitle("措施清单")} v-slots={slots} />;
  },
});
