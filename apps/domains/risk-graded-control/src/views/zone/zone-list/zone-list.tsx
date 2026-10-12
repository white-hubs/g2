import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getOrganizationTree } from "@/api/ouaa";
import { deleteArea, getArea, pageAreas } from "@/api/server";
import { RiskGisMapEditor } from "@/components/risk-gis-map-editor/risk-gis-map-editor";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import {
  LIST_ACTION_DELETE_PROPS,
  LIST_ACTION_LINK_PROPS,
  RISK_LEVEL_LABEL,
  TABLE_CODE_COLUMN_WIDTH,
  TABLE_PAGE_SIZE,
  RISK_MODAL_BODY_STYLE,
} from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  AntModal,
  Button,
  Modal,
  Page,
  PageLayout as PcLayout,
  Space,
  Tooltip,
  TreeSelect,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { RiskLevel, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { mapOrganizationsToTreeData, type OrganizationTreeNode } from "@/utils/organization-tree";
import { useLayoutTitle } from "@/utils/page-title";
import { mapRiskLevelToApi, mapZoneFromApi } from "@/utils/risk-control-mapper";

export const ZoneListPage = defineComponent({
  name: "ZoneListPage",
  setup() {
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const mapVisible = ref(false);
    const mapZone = ref<ZoneVO | null>(null);
    const deptTree = ref<OrganizationTreeNode[]>([]);
    const search = reactive({
      keyword: "",
      riskLevel: "" as RiskLevel | "",
      departmentId: undefined as string | undefined,
    });

    const loadDeptTree = async (): Promise<void> => {
      try {
        const orgs = await useAuthRequest(() => getOrganizationTree({ enabled: true }));
        deptTree.value = mapOrganizationsToTreeData(orgs);
      } catch (e) {
        showApiError(e);
        deptTree.value = [];
      }
    };

    const goCreate = (): void => {
      void router.push({ name: "zone-form" });
    };

    const goEdit = (record: ZoneVO): void => {
      void router.push({ name: "zone-form", query: { id: record.id } });
    };

    const openMap = async (record: ZoneVO): Promise<void> => {
      try {
        const vo = await useAuthRequest(() => getArea(record.id));
        mapZone.value = mapZoneFromApi(vo);
        mapVisible.value = true;
      } catch (e) {
        showApiError(e);
      }
    };

    const handleDelete = (record: ZoneVO): void => {
      AntModal.confirm({
        centered: true,
        title: "删除确认",
        content: `确定删除区域「${record.name}」吗？删除后不可恢复。`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteArea(record.id));
            message.success("删除成功");
            tableApi.query();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const columns: ColumnType[] = [
      { title: "区域编号", dataIndex: "code", width: TABLE_CODE_COLUMN_WIDTH, ellipsis: true },
      {
        title: "区域名称",
        dataIndex: "name",
        width: 150,
        customRender: ({ record }: { record: ZoneVO }) => (
          <Button
            {...LIST_ACTION_LINK_PROPS}
            style={{ padding: 0 }}
            onClick={() => {
              void openMap(record);
            }}
          >
            {record.name}
          </Button>
        ),
      },
      { title: "所属部门", dataIndex: "department", width: 110 },
      {
        title: "区域范围",
        dataIndex: "scopeText",
        width: 200,
        ellipsis: true,
        customRender: ({ text }: { text: string }) => (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
      },
      { title: "负责人", dataIndex: "manager", width: 90 },
      {
        title: "固有风险评估",
        dataIndex: "inherentRiskLevel",
        width: 120,
        customRender: ({ text }: { text: ZoneVO["inherentRiskLevel"] }) => <RiskLevelTag level={text} />,
      },
      {
        title: "现状风险评估",
        dataIndex: "controlRiskLevel",
        width: 120,
        customRender: ({ text }: { text: ZoneVO["controlRiskLevel"] }) => <RiskLevelTag level={text} />,
      },
      { title: "风险单元数", dataIndex: "unitCount", width: 100, align: "center" as const },
      {
        title: "备注",
        dataIndex: "remark",
        width: 140,
        ellipsis: true,
        customRender: ({ record }: { record: ZoneVO }) => {
          const remark = record.remark?.trim();
          if (!remark) return "—";
          return (
            <Tooltip title={remark}>
              <span>{remark}</span>
            </Tooltip>
          );
        },
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 140,
        customRender: ({ record }: { record: ZoneVO }) => (
          <Space>
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

    const fetchZonePage = async () => {
      const result = await useAuthRequest(() =>
        pageAreas({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          riskLevel: search.riskLevel ? mapRiskLevelToApi(search.riskLevel) : undefined,
          departmentId: search.departmentId || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapZoneFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_ZONE_LIST",
      rowKey: "id",
      fetchApi: fetchZonePage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const buildFilterSchema = () => [
      {
        component: "Select",
        label: "现状风险",
        fieldName: "riskLevel",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          placeholder: "全部风险",
          options: [
            { label: "全部风险", value: "" },
            ...(Object.keys(RISK_LEVEL_LABEL) as RiskLevel[]).map((lv) => ({ label: RISK_LEVEL_LABEL[lv], value: lv })),
          ],
        },
      },
      {
        component: TreeSelect,
        label: "部门",
        fieldName: "departmentId",
        defaultValue: undefined,
        componentProps: {
          placeholder: "全部",
          allowClear: true,
          showSearch: true,
          treeDefaultExpandAll: true,
          treeData: deptTree.value,
          treeNodeFilterProp: "title",
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: { placeholder: "搜索区域名称", allowClear: true, maxlength: 100 },
      },
    ];

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: buildFilterSchema(),
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        riskLevel: (values.riskLevel as RiskLevel | "" | undefined) ?? "",
        departmentId: (values.departmentId as string | undefined) || undefined,
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.riskLevel = (values.riskLevel as RiskLevel | "" | undefined) ?? "";
        search.departmentId = (values.departmentId as string | undefined) || undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.riskLevel = "";
        search.departmentId = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    onMounted(() => {
      void (async () => {
        await loadDeptTree();
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
        <Button type="primary" onClick={goCreate}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <Modal
            wrapClassName="risk-modal"
            bodyStyle={RISK_MODAL_BODY_STYLE}
            open={mapVisible.value}
            title={`区域地图：${mapZone.value?.name ?? ""}`}
            width={800}
            destroyOnClose
            footer={
              <Button
                onClick={() => {
                  mapVisible.value = false;
                }}
              >
                关闭
              </Button>
            }
            onCancel={() => {
              mapVisible.value = false;
            }}
          >
            {mapZone.value && (
              <>
                <p style={{ marginBottom: "8px", color: "#666" }}>{mapZone.value.scopeText}</p>
                {mapZone.value.remark?.trim() && <p style={{ marginBottom: "8px", color: "#666" }}>备注：{mapZone.value.remark}</p>}
                <RiskGisMapEditor key={mapZone.value.id} mode="readonly" height={360} value={{ polygon: mapZone.value.polygon }} />
              </>
            )}
          </Modal>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("风险区域管理")} v-slots={slots} />;
  },
});
