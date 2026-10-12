import type {
  LongId,
  RemoteInspectionTemplateDetail,
  RemoteInspectionTemplateListItem,
  RemoteInspectionTemplateSaveRequest,
} from "@g2-contract/electrical-safety";
import { AntModal, Button, Page, PageLayout, PopOver, Space, Switch, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { defineComponent, onMounted, reactive, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { type TemplateDraft, TemplateEditorModal } from "./template-editor-modal";
import {
  createRemoteInspectionTemplate,
  deleteRemoteInspectionTemplate,
  getRemoteInspectionTemplate,
  listRemoteInspectionTemplates,
  updateRemoteInspectionTemplate,
  updateRemoteInspectionTemplateEnabled,
} from "@/api/electrical-safety";
import { useFacilityReferences } from "@/composables/use-facility-references";
import { usePageName } from "@/utils/page-name";

import "../shared/page.less";
import "./remote-inspection-config.less";

const PAGE_SIZE = 10;

const routeBoolean = (value: unknown): boolean | undefined => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
};

export const RemoteInspectionConfig = defineComponent({
  name: "RemoteInspectionConfig",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    const { facilities, facilitiesLoading, loadMoreFacilities, ensureFacilityReference } = useFacilityReferences();
    const editorOpen = shallowRef(false);
    const editingTemplate = shallowRef<RemoteInspectionTemplateDetail | null>(null);
    const loadingTemplate = shallowRef(false);
    const filters = reactive({
      keyword: typeof route.query.keyword === "string" ? route.query.keyword : "",
      facilityId: typeof route.query.facilityId === "string" ? route.query.facilityId : "",
      enabled: routeBoolean(route.query.enabled),
      pageNumber: Math.max(1, Number(route.query.pageNumber) || 1),
      pageSize: Math.max(1, Number(route.query.pageSize) || PAGE_SIZE),
      total: 0,
    });

    const syncQuery = (): void => {
      void router.replace({
        query: {
          keyword: filters.keyword.trim() || undefined,
          facilityId: filters.facilityId || undefined,
          enabled: filters.enabled === undefined ? undefined : String(filters.enabled),
          pageNumber: filters.pageNumber > 1 ? String(filters.pageNumber) : undefined,
          pageSize: filters.pageSize !== PAGE_SIZE ? String(filters.pageSize) : undefined,
        },
      });
    };
    const loadMoreFacilityOptions = (): void => {
      void loadMoreFacilities().catch(() => {
        // 网关已展示失败提示；此处仅阻止未处理的 Promise rejection。
      });
    };
    const handleFacilitySelectScroll = (event: UIEvent): void => {
      const { target } = event;
      if (!(target instanceof HTMLElement) || facilitiesLoading.value) {
        return;
      }
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
        loadMoreFacilityOptions();
      }
    };

    const columns = [
      { title: "模板名称", dataIndex: "templateName", width: 220 },
      { title: "关联设施", dataIndex: "facilityName", width: 180 },
      { title: "巡检频率", dataIndex: "frequencyHours", width: 110, customRender: ({ text }: { text: number }) => `${text}小时` },
      {
        title: "展示实时数据",
        dataIndex: "showRealtimeData",
        width: 130,
        customRender: ({ text }: { text: boolean }) => <Tag color={text ? "green" : "default"}>{text ? "展示" : "隐藏"}</Tag>,
      },
      {
        title: "状态",
        dataIndex: "enabled",
        width: 110,
        customRender: ({ record }: { record: RemoteInspectionTemplateListItem }) => (
          <Switch
            checked={record.enabled}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onUpdate:checked={(inputValue) => {
              const value = inputValue as boolean;
              return void changeEnabled(record, value);
            }}
          />
        ),
      },
      {
        title: "创建时间",
        dataIndex: "createTime",
        width: 180,
        customRender: ({ text }: { text: string }) => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: "操作",
        key: "action",
        width: 160,
        fixed: "right" as const,
        customRender: ({ record }: { record: RemoteInspectionTemplateListItem }) => (
          <Space>
            <Button type="link" size="small" onClick={() => void openEdit(record.id)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() =>
                AntModal.confirm({
                  okText: "确定",
                  cancelText: "取消",
                  title: `确认删除模板“${record.templateName}”？`,
                  content: "删除后将无法继续查询该模板的远检数据。",
                  onOk: () => removeTemplate(record),
                })
              }
            >
              删除
            </Button>
          </Space>
        ),
      },
    ];
    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-remote-inspection-config",
      rowKey: "id",
      columns,
      pagination: false,
      fetchApi: async () => {
        try {
          return await listRemoteInspectionTemplates({
            pageNumber: filters.pageNumber,
            pageSize: filters.pageSize,
            ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
            ...(filters.facilityId ? { facilityId: filters.facilityId } : {}),
            ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
          });
        } catch {
          return { total: 0, pages: 0, records: [] };
        }
      },
      fetchLoaded: (result) => {
        filters.total = Number(result.total);
      },
    });
    const [CubeForm, formApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      showCollapseButton: true,
      syncStateRef: filters,
      syncStateFields: ["keyword", "facilityId", "enabled"],
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "关键词",
          defaultValue: "",
          componentProps: { placeholder: "搜索模板名称" },
        },
        {
          component: "Select",
          fieldName: "facilityId",
          label: "关联设施",
          defaultValue: null,
          componentProps: {
            allowClear: true,
            showSearch: true,
            placeholder: "请选择关联设施",
            options: [],
            loading: facilitiesLoading.value,
            onPopupScroll: handleFacilitySelectScroll,
          },
        },
        {
          component: "Select",
          fieldName: "enabled",
          label: "启用状态",
          defaultValue: null,
          componentProps: {
            allowClear: true,
            placeholder: "全部状态",
            options: [
              { label: "已启用", value: true },
              { label: "已停用", value: false },
            ],
          },
        },
      ],
      handleSubmit: (values) => {
        filters.keyword = typeof values.keyword === "string" ? values.keyword : "";
        filters.facilityId = typeof values.facilityId === "string" ? values.facilityId : "";
        filters.enabled = typeof values.enabled === "boolean" ? values.enabled : undefined;
        filters.pageNumber = 1;
        syncQuery();
        tableApi.query();
      },
      handleReset: () => {
        filters.keyword = "";
        filters.facilityId = "";
        filters.enabled = undefined;
        filters.pageNumber = 1;
        syncQuery();
        tableApi.query();
      },
    });
    formApi.setFormValues({
      keyword: filters.keyword,
      facilityId: filters.facilityId || null,
      enabled: filters.enabled ?? null,
    });
    watch(
      [facilities, facilitiesLoading],
      () => {
        formApi.updateFieldSchema({
          component: "Select",
          fieldName: "facilityId",
          label: "关联设施",
          defaultValue: null,
          componentProps: {
            allowClear: true,
            showSearch: true,
            placeholder: "请选择关联设施",
            options: facilities.value.map((item) => ({ label: item.name, value: item.id })),
            loading: facilitiesLoading.value,
            onPopupScroll: handleFacilitySelectScroll,
          },
        });
      },
      { immediate: true },
    );

    const openCreate = (): void => {
      editingTemplate.value = null;
      editorOpen.value = true;
    };
    const openEdit = async (id: LongId): Promise<void> => {
      editingTemplate.value = null;
      editorOpen.value = true;
      loadingTemplate.value = true;
      try {
        editingTemplate.value = await getRemoteInspectionTemplate(id);
      } catch {
        // 网关已展示失败原因。
      } finally {
        loadingTemplate.value = false;
      }
    };
    const saveTemplate = async (draft: TemplateDraft): Promise<void> => {
      const payload: RemoteInspectionTemplateSaveRequest = {
        templateName: draft.templateName.trim(),
        facilityId: draft.facilityId,
        frequencyHours: draft.frequencyHours,
        columns: draft.columns.map(({ id: _id, ...column }) => {
          const baseColumn = {
            columnType: column.columnType,
            firstHeader: column.firstHeader.trim(),
            secondHeader: column.secondHeader.trim() || undefined,
            sort: column.sort,
          };
          if (column.columnType !== "REMOTE_PARAMETER") {
            return baseColumn;
          }
          return {
            ...baseColumn,
            propertyCode: column.propertyCode,
            propertyName: column.propertyName || undefined,
            unit: column.unit || undefined,
            productCategoryCode: column.productCategoryCode,
            productCategoryName: column.productCategoryName || undefined,
            productId: column.productId,
            productName: column.productName || undefined,
          };
        }),
      };
      if (draft.showRealtimeData !== undefined) {
        payload.showRealtimeData = draft.showRealtimeData;
      }
      if (draft.enabled !== undefined) {
        payload.enabled = draft.enabled;
      }
      if (draft.remark?.trim()) {
        payload.remark = draft.remark.trim();
      }
      try {
        if (draft.id != null) {
          await updateRemoteInspectionTemplate(draft.id as LongId, payload);
        } else {
          await createRemoteInspectionTemplate(payload);
        }
        editorOpen.value = false;
        tableApi.query();
        message.success(draft.id != null ? "远检模板已更新" : "远检模板已新增");
      } catch {
        // 网关已展示失败原因。
      }
    };
    const changeEnabled = async (record: RemoteInspectionTemplateListItem, enabled: boolean): Promise<void> => {
      try {
        await updateRemoteInspectionTemplateEnabled(record.id, { enabled });
        tableApi.query();
        message.success(enabled ? "模板已启用" : "模板已停用");
      } catch {
        // 网关已展示失败原因。
      }
    };
    const removeTemplate = async (record: RemoteInspectionTemplateListItem): Promise<void> => {
      try {
        await deleteRemoteInspectionTemplate(record.id);
        if (filters.total <= (filters.pageNumber - 1) * filters.pageSize + 1 && filters.pageNumber > 1) {
          filters.pageNumber -= 1;
          syncQuery();
        }
        tableApi.query();
        message.success("模板已删除");
      } catch {
        // 网关已展示失败原因。
      }
    };

    onMounted(() => {
      loadMoreFacilityOptions();
      tableApi.query();
    });

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openCreate}>
          新增模板
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="electrical-page">
          <CubeForm />
          <div class="content-card">
            <CubeTable />
          </div>
          <TemplateEditorModal
            open={editorOpen.value}
            template={editingTemplate.value}
            facilities={facilities.value}
            facilitiesLoading={facilitiesLoading.value}
            loadMoreFacilities={loadMoreFacilities}
            ensureFacilityReference={ensureFacilityReference}
            loadingTemplate={loadingTemplate.value}
            onClose={() => (editorOpen.value = false)}
            onSave={(payload: TemplateDraft) => void saveTemplate(payload)}
          />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          cachePageQuery={false}
          current={filters.pageNumber}
          pageSize={filters.pageSize}
          total={filters.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            filters.pageNumber = pageNumber;
            filters.pageSize = pageSize;
            syncQuery();
            tableApi.query();
          }}
        />
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle.value} v-slots={slots} />;
  },
});
