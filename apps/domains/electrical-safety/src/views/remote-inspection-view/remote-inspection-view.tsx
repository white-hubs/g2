import type { RemoteInspectionData, RemoteInspectionTemplateListItem } from "@g2-contract/electrical-safety";
import { Button, Empty, Page, PageLayout, PopOver, Spin, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { computed, defineComponent, onMounted, reactive, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  exportRemoteInspectionData,
  getRemoteInspectionData,
  getRemoteInspectionTemplate,
  listRemoteInspectionTemplates,
} from "@/api/electrical-safety";
import { usePageName } from "@/utils/page-name";
import { createRemoteInspectionColumns } from "@/utils/remote-inspection";

import "../shared/page.less";
import "./remote-inspection-view.less";

const PAGE_SIZE = 10;
const TEMPLATE_PAGE_SIZE = 10;

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
}

export const RemoteInspectionView = defineComponent({
  name: "RemoteInspectionView",
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    const templates = shallowRef<RemoteInspectionTemplateListItem[]>([]);
    const templatesLoading = shallowRef(false);
    const templatesExhausted = shallowRef(false);
    const nextTemplatePageNumber = shallowRef(1);
    const data = shallowRef<RemoteInspectionData | null>(null);
    const loading = shallowRef(false);
    const filters = reactive({
      templateId: typeof route.query.templateId === "string" ? route.query.templateId : "",
      dates: [
        typeof route.query.start === "string" ? route.query.start : dayjs().subtract(6, "day").format("YYYY-MM-DD"),
        typeof route.query.end === "string" ? route.query.end : dayjs().format("YYYY-MM-DD"),
      ] as [string, string],
    });
    const applied = reactive({
      templateId: filters.templateId,
      dates: [...filters.dates] as [string, string],
      pageNumber: Math.max(1, Number(route.query.pageNumber) || 1),
      pageSize: Math.max(1, Number(route.query.pageSize) || PAGE_SIZE),
    });

    const template = computed(() => templates.value.find((item) => String(item.id) === applied.templateId) ?? null);
    const rows = computed(() => data.value?.records ?? []);
    const columns = computed(() => [
      { title: "设备名称", dataIndex: "deviceName", width: 180, fixed: "left" as const },
      {
        title: "采集时间",
        dataIndex: "collectTime",
        width: 170,
        fixed: "left" as const,
        customRender: ({ text }: { text: string }) => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      ...createRemoteInspectionColumns(data.value?.headers ?? []),
    ]);

    const syncQuery = (): void => {
      void router.replace({
        query: {
          templateId: applied.templateId || undefined,
          start: applied.dates[0] || undefined,
          end: applied.dates[1] || undefined,
          pageNumber: applied.pageNumber > 1 ? String(applied.pageNumber) : undefined,
          pageSize: applied.pageSize !== PAGE_SIZE ? String(applied.pageSize) : undefined,
        },
      });
    };
    const mergeTemplates = (records: RemoteInspectionTemplateListItem[]): void => {
      const existingIds = new Set(templates.value.map((item) => String(item.id)));
      templates.value = [...templates.value, ...records.filter((item) => !existingIds.has(String(item.id)))];
    };
    const loadMoreTemplates = async (): Promise<void> => {
      if (templatesLoading.value || templatesExhausted.value) {
        return;
      }
      templatesLoading.value = true;
      try {
        const result = await listRemoteInspectionTemplates({
          pageNumber: nextTemplatePageNumber.value,
          pageSize: TEMPLATE_PAGE_SIZE,
          enabled: true,
        });
        mergeTemplates(result.records);
        nextTemplatePageNumber.value += 1;
        templatesExhausted.value = templates.value.length >= Number(result.total) || result.records.length < TEMPLATE_PAGE_SIZE;
      } finally {
        templatesLoading.value = false;
      }
    };
    const ensureSelectedTemplate = async (): Promise<void> => {
      if (!filters.templateId || templates.value.some((item) => String(item.id) === filters.templateId)) {
        return;
      }
      try {
        const detail = await getRemoteInspectionTemplate(filters.templateId);
        if (detail.enabled) {
          mergeTemplates([{ ...detail, createTime: "" }]);
        } else {
          filters.templateId = "";
          applied.templateId = "";
          data.value = null;
        }
      } catch {
        filters.templateId = "";
        applied.templateId = "";
        data.value = null;
      }
    };
    const handleTemplateSelectScroll = (event: UIEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || templatesLoading.value) {
        return;
      }
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
        void loadMoreTemplates();
      }
    };
    let dataRequest = 0;
    const loadData = async (): Promise<void> => {
      const request = ++dataRequest;
      loading.value = true;
      try {
        const result = await getRemoteInspectionData(applied.templateId, {
          startTime: applied.dates[0],
          endTime: applied.dates[1],
          pageNumber: applied.pageNumber,
          pageSize: applied.pageSize,
        });
        if (request === dataRequest) data.value = result;
      } catch {
        if (request === dataRequest) data.value = null;
      } finally {
        if (request === dataRequest) loading.value = false;
      }
    };
    const query = async (): Promise<void> => {
      if (!filters.templateId) {
        message.warning("请先选择远检模板");
        return;
      }
      if (!filters.dates[0] || !filters.dates[1] || dayjs(filters.dates[1]).isBefore(dayjs(filters.dates[0]))) {
        message.warning("请选择正确的日期范围");
        return;
      }
      applied.templateId = filters.templateId;
      applied.dates = [...filters.dates];
      applied.pageNumber = 1;
      syncQuery();
      await loadData();
    };
    const templateField = () => ({
      component: "Select",
      fieldName: "templateId",
      label: "远检模板",
      componentProps: {
        showSearch: true,
        allowClear: true,
        optionFilterProp: "label",
        placeholder: "选择远检模板",
        loading: templatesLoading.value,
        onPopupScroll: handleTemplateSelectScroll,
        options: templates.value.map((item) => ({ label: `${item.templateName}（${item.frequencyHours}小时）`, value: String(item.id) })),
      },
    });
    const defaultDates = [dayjs().subtract(6, "day").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];
    const [QueryForm, formApi] = usePcForm({
      layout: "horizontal",
      cache: false,
      schema: [
        templateField(),
        {
          component: "RangePicker",
          fieldName: "dates",
          label: "日期范围",
          defaultValue: defaultDates,
          componentProps: { valueFormat: "YYYY-MM-DD" },
        },
      ],
      handleSubmit: (values) => {
        filters.templateId = typeof values.templateId === "string" ? values.templateId : "";
        filters.dates = Array.isArray(values.dates) ? [String(values.dates[0] ?? ""), String(values.dates[1] ?? "")] : ["", ""];
        void query();
      },
      handleReset: () => {
        filters.templateId = templates.value[0] ? String(templates.value[0].id) : "";
        filters.dates = [defaultDates[0], defaultDates[1]];
        formApi.setFieldValue("templateId", filters.templateId || undefined);
        if (filters.templateId) void query();
      },
    });
    formApi.setFieldValue("templateId", filters.templateId || undefined);
    formApi.setFieldValue("dates", filters.dates);
    watch([templates, templatesLoading], () => formApi.updateFieldSchema(templateField()));
    const exportData = async (): Promise<void> => {
      if (!template.value || rows.value.length === 0) {
        message.warning("当前没有可导出的巡检数据");
        return;
      }
      try {
        const blob = await exportRemoteInspectionData(template.value!.id, { startTime: applied.dates[0], endTime: applied.dates[1] });
        downloadBlob(blob, `远检数据_${template.value.templateName}_${dayjs().format("YYYYMMDD")}.xlsx`);
        message.success("远检数据已导出");
      } catch {
        // 网关已展示失败原因。
      }
    };

    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-remote-inspection-view",
      rowKey: "index",
      columns: [],
      dataSource: [],
      pagination: false,
    });
    watch(
      [columns, rows],
      ([nextColumns, records]) => {
        tableApi.setColumns(nextColumns);
        tableApi.setDataSource(records);
      },
      { immediate: true },
    );
    onMounted(() => {
      void (async () => {
        await loadMoreTemplates();
        await ensureSelectedTemplate();
        if (!filters.templateId && templates.value[0]) {
          filters.templateId = String(templates.value[0].id);
        }
        if (filters.templateId) {
          formApi.setFieldValue("templateId", filters.templateId);
          applied.templateId = filters.templateId;
          syncQuery();
          await loadData();
        }
      })();
    });

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button disabled={rows.value.length === 0} onClick={() => void exportData()}>
          导出 Excel
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="electrical-page remote-view-page">
          <div class="page-toolbar">
            <span class="muted">仅展示已启用模板</span>
          </div>
          <QueryForm />
          <div class="content-card">
            {!template.value ? (
              <Empty description="暂无可用远检模板，请先在远检配置中新增并启用" />
            ) : rows.value.length === 0 && !loading.value ? (
              <Empty description="当前日期范围内没有巡检数据" />
            ) : (
              <Spin spinning={loading.value}>
                <CubeTable />
              </Spin>
            )}
          </div>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          cachePageQuery={false}
          current={applied.pageNumber}
          pageSize={applied.pageSize}
          total={data.value?.total ?? 0}
          onPageChange={(pageNumber: number, pageSize: number) => {
            applied.pageNumber = pageNumber;
            applied.pageSize = pageSize;
            syncQuery();
            void loadData();
          }}
        />
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle.value} v-slots={slots} />;
  },
});
