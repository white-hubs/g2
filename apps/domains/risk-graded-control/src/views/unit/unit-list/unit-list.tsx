import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { deleteUnit, pageAreas, pageUnitTypes, pageUnits } from "@/api/server";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { LIST_ACTION_DELETE_PROPS, LIST_ACTION_LINK_PROPS, TABLE_CODE_COLUMN_WIDTH, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import { AntModal, Button, Page, PageLayout as PcLayout, Space, message, usePcForm, usePcTable, type ColumnType } from "@/pc-ui-runtime";
import type { UnitTypeVO, UnitVO, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { downloadBlob } from "@/utils/download-blob";
import { createListPageState } from "@/utils/list-page";
import { unwrapPageRecords } from "@/utils/page-records";
import { useLayoutTitle } from "@/utils/page-title";
import { mapUnitFromApi, mapUnitTypeFromApi, mapZoneFromApi } from "@/utils/risk-control-mapper";
import { exportRiskXlsx } from "@/utils/risk-export";

export const UnitListPage = defineComponent({
  name: "UnitListPage",
  setup() {
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const zones = ref<ZoneVO[]>([]);
    const unitTypes = ref<UnitTypeVO[]>([]);
    const search = reactive({
      keyword: "",
      zoneId: "",
      unitTypeId: "",
    });

    const loadZones = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" }));
        zones.value = unwrapPageRecords(result).map(mapZoneFromApi);
      } catch {
        zones.value = [];
      }
    };

    const loadUnitTypes = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageUnitTypes({ pageNumber: 1, pageSize: 500, view: "option" }));
        unitTypes.value = unwrapPageRecords(result).map(mapUnitTypeFromApi);
      } catch {
        unitTypes.value = [];
      }
    };

    const goCreate = (): void => {
      void router.push({ name: "unit-form" });
    };

    const goEdit = (record: UnitVO): void => {
      void router.push({ name: "unit-form", query: { id: record.id } });
    };

    const goView = (record: UnitVO): void => {
      void router.push({ name: "unit-form", query: { id: record.id, mode: "view" } });
    };

    const handleDelete = (record: UnitVO): void => {
      AntModal.confirm({
        centered: true,
        title: "删除确认",
        content: `确定删除单元「${record.name}」吗？`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteUnit(record.id));
            message.success("删除成功");
            tableApi.query();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const handleExport = async (): Promise<void> => {
      if (page.total === 0) {
        message.warning("当前没有可导出的数据");
        return;
      }
      try {
        const blob = await useAuthRequest(() =>
          exportRiskXlsx("units", {
            keyword: search.keyword.trim() || undefined,
            areaId: search.zoneId || undefined,
            unitTypeId: search.unitTypeId || undefined,
          }),
        );
        downloadBlob(blob, "风险单元列表.xlsx");
        message.success("导出成功");
      } catch (e) {
        showApiError(e);
      }
    };

    const columns: ColumnType[] = [
      { title: "编号", dataIndex: "code", width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      { title: "单元名称", dataIndex: "name", width: 180, ellipsis: true },
      { title: "单元类型", dataIndex: "unitType", width: 90 },
      { title: "所属区域", dataIndex: "zoneName", width: 150, ellipsis: true },
      {
        title: "辨识周期",
        dataIndex: "identifyCycleDays",
        width: 90,
        customRender: ({ text }: { text: number }) => `${text}天`,
      },
      {
        title: "安全警示标志",
        dataIndex: "warningSignName",
        width: 140,
        ellipsis: true,
        customRender: ({ record }: { record: UnitVO }) => record.warningSignName || "—",
      },
      {
        title: "辨识人员",
        dataIndex: "identifyUsers",
        width: 130,
        customRender: ({ record }: { record: UnitVO }) => record.identifyUsers.join("、"),
      },
      { title: "责任人员", dataIndex: "responsibleUser", width: 90 },
      {
        title: "固有风险评估",
        dataIndex: "inherentRiskLevel",
        width: 120,
        customRender: ({ text }: { text: UnitVO["inherentRiskLevel"] }) => <RiskLevelTag level={text} />,
      },
      {
        title: "现状风险评估",
        dataIndex: "controlRiskLevel",
        width: 120,
        customRender: ({ text }: { text: UnitVO["controlRiskLevel"] }) => <RiskLevelTag level={text} />,
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 180,
        customRender: ({ record }: { record: UnitVO }) => (
          <Space>
            <Button {...LIST_ACTION_LINK_PROPS} onClick={() => goView(record)}>
              查看
            </Button>
            <Button {...LIST_ACTION_LINK_PROPS} onClick={() => goEdit(record)}>
              编辑
            </Button>
            <Button {...LIST_ACTION_DELETE_PROPS} onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const fetchUnitPage = async () => {
      const result = await useAuthRequest(() =>
        pageUnits({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          areaId: search.zoneId || undefined,
          unitTypeId: search.unitTypeId || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapUnitFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_UNIT_LIST",
      rowKey: "id",
      fetchApi: fetchUnitPage,
      fetchLoaded: (data) => {
        page.total = data.total;
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
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.zoneId = (values.zoneId as string | undefined) ?? "";
        search.unitTypeId = (values.unitTypeId as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.zoneId = "";
        search.unitTypeId = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    onMounted(() => {
      void (async () => {
        await Promise.all([loadZones(), loadUnitTypes()]);
        formApi.updateSchema(buildFilterSchema());
      })();
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": () => (
        <Space>
          <Button
            onClick={() => {
              void handleExport();
            }}
          >
            导出
          </Button>
          <Button type="primary" onClick={goCreate}>
            新增
          </Button>
        </Space>
      ),
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("风险单元管理")} v-slots={slots} />;
  },
});
