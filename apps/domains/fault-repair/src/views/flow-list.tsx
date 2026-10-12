import type { FaultQuery, FaultRecord } from "@g2-client/fault-repair/client";
import { Button, Page, PageLayout, type PcTableColumn, RadioGroup, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getFaultMaintainRuntime, getFaultRepairClient } from "../domain-context";
import { formatDateTime } from "./date";

import styles from "./flow-list.module.css";

const STATUS_TEXT: Record<string, string> = {
  SUBMIT: "提交",
  UNDO: "撤销",
  REPEAT: "重新提交",
  APPROVAL: "审批",
  BACK: "撤回",
  COPY: "抄送",
  REJECT: "驳回",
  FINISHED: "完成",
};
const statusOptions = [
  { value: "ACTIVE", label: "处理中" },
  { value: "REJECT", label: "驳回" },
  { value: "UNDO", label: "撤销" },
  { value: "FINISHED", label: "完成" },
];
const flowColumns = (
  open: (row: FaultRecord) => void,
  personal: boolean,
  labels: { instanceNameColumn: string; objectColumn: string; typeColumn: string },
): PcTableColumn[] => [
  { title: "编号", dataIndex: "code", width: 150, ellipsis: true },
  {
    title: "发起时间",
    dataIndex: "submitedTime",
    width: 200,
    customRender: ({ text }) => formatDateTime(text as string | number | undefined),
  },
  { title: labels.instanceNameColumn, dataIndex: "instanceName", width: 200, ellipsis: true },
  { title: labels.objectColumn, dataIndex: "objName", ellipsis: true },
  { title: labels.typeColumn, dataIndex: "faultType", ellipsis: true },
  { title: "紧急程度", dataIndex: "urgencyLevel", ellipsis: true },
  { title: "发起人", dataIndex: "startUserName", ellipsis: true },
  { title: "处理状态", dataIndex: "status", customRender: ({ text }) => (text ? (STATUS_TEXT[String(text)] ?? "处理中") : "--") },
  { title: "处理进度", dataIndex: "activeNodeName", ellipsis: true },
  { title: "处理结果", dataIndex: "result", ellipsis: true },
  ...(!personal
    ? [
        {
          title: "确认时间",
          dataIndex: "confirmTime",
          width: 200,
          customRender: ({ text }: { text: unknown }) => formatDateTime(text as string | number | undefined),
        },
        {
          title: "完成时间",
          dataIndex: "completeTime",
          width: 200,
          customRender: ({ text }: { text: unknown }) => formatDateTime(text as string | number | undefined),
        },
        {
          title: "耗时",
          dataIndex: "timeConsuming",
          width: 120,
          customRender: ({ text }: { text: unknown }) => (text || text === 0 ? `${String(text)}分钟` : "--"),
        },
      ]
    : []),
  {
    title: "操作",
    dataIndex: "action",
    width: 90,
    fixed: "right",
    customRender: ({ record }) => (
      <Button type="link" onClick={() => open(record as FaultRecord)}>
        详情
      </Button>
    ),
  },
];
const flowTabs = [
  { value: "ALL", label: "全部" },
  { value: "WAITING", label: "待我处理" },
  { value: "SUBMIT", label: "我发起的" },
  { value: "SERVED", label: "抄送给我" },
  { value: "PROCESSED", label: "已处理" },
];
const statusFilterTabs = new Set(["ALL", "SUBMIT", "SERVED"]);

export function createFlowListPage(personal: boolean) {
  return defineComponent({
    name: personal ? "FaultRepairList" : "FaultRepairRecord",
    setup() {
      const runtime = getFaultMaintainRuntime();
      const { applicationCode, basePath, labels } = runtime;
      const title = personal ? labels.listTitle : labels.recordTitle;
      const tableCode = personal ? `${applicationCode}_LIST` : `${applicationCode}_RECORD`;
      const client = getFaultRepairClient();
      const router = useRouter();
      const query = reactive({
        type: "ALL",
        status: undefined as string | undefined,
        dateRange: undefined as string[] | undefined,
        keyword: "",
        faultTypeId: undefined as string | undefined,
        progress: undefined as string | undefined,
      });
      const typeOptions = ref<{ label: string; value: string }[]>([]);
      const progressOptions = ref<{ label: string; value: string }[]>([]);
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const exporting = ref(false);
      let version = 0;

      const openFlow = (row?: FaultRecord): void => {
        const routeQuery: Record<string, string> = {
          businessType: applicationCode,
          type: row ? "detail" : "add",
          title,
        };
        if (row) {
          if (row.processInstanceId) {
            routeQuery.processInstanceId = row.processInstanceId;
          }
          if (row.currentTaskId) {
            routeQuery.currentTaskId = row.currentTaskId;
          }
          if (row.status) {
            routeQuery.status = row.status;
          }
        }
        void router.push({ path: personal ? `${basePath}/flow-render` : `${basePath}/record-flow-render`, query: routeQuery });
      };
      const makeQuery = (pageNumber = page.pageNumber, pageSize = page.pageSize): FaultQuery => ({
        pageNumber,
        pageSize,
        businessType: applicationCode,
        ...(personal ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(!personal ? { keyword: query.keyword || undefined, faultTypeId: query.faultTypeId, progress: query.progress } : {}),
        ...(query.dateRange?.length === 2
          ? { submitTime: personal ? `${query.dateRange[0]} 00:00:00,${query.dateRange[1]} 23:59:59` : query.dateRange.join(",") }
          : {}),
      });
      const [PcTable, tableApi] = usePcTable({
        columns: flowColumns(openFlow, personal, labels),
        tableCode,
        rowKey: "processInstanceId",
        autoFetch: false,
        scrollY: undefined,
      });
      const load = async (): Promise<void> => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = personal ? await client.pagePersonal(makeQuery()) : await client.pageRecords(makeQuery());
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(result.records);
          page.total = result.total;
        } catch (error) {
          if (current === version) {
            message.error(error instanceof Error ? error.message : `${title}加载失败`);
          }
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      // Tab 作为表单项：与筛选同网格流式换行，并走同一套 URL 缓存。
      const typeSchema = {
        component: markRaw(RadioGroup),
        fieldName: "type",
        label: "",
        defaultValue: "ALL",
        componentProps: {
          buttonStyle: "solid",
          optionType: "button",
          options: flowTabs,
        },
      };
      const statusSchema = {
        component: "Select",
        fieldName: "status",
        label: "状态",
        componentProps: { allowClear: true, placeholder: "请选择", options: statusOptions, style: { width: "220px" } },
        defaultValue: undefined,
      };
      const dateSchema = {
        component: "RangePicker",
        fieldName: "dateRange",
        label: "发起时间",
        componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "220px" } },
        defaultValue: undefined,
      };
      const buildSchema = (type: string) => {
        const fields = [];
        if (personal) {
          fields.push(typeSchema);
        }
        if (!personal) {
          fields.push(
            {
              component: "Input",
              fieldName: "keyword",
              label: "关键字",
              componentProps: { placeholder: "请输入工单编号、工单名称搜索", maxlength: 20, allowClear: true },
              defaultValue: "",
            },
            {
              component: "Select",
              fieldName: "faultTypeId",
              label: labels.typeColumn,
              componentProps: { placeholder: "请选择", allowClear: true, options: typeOptions },
              defaultValue: undefined,
            },
          );
        }
        if (!personal || statusFilterTabs.has(type)) {
          fields.push(
            personal
              ? statusSchema
              : {
                  ...statusSchema,
                  componentProps: {
                    ...statusSchema.componentProps,
                    options: statusOptions.map((item) => (item.value === "FINISHED" ? { value: "PASS", label: "完成" } : item)),
                  },
                },
          );
        }
        if (!personal) {
          fields.push({
            component: "Select",
            fieldName: "progress",
            label: "处理进度",
            componentProps: { placeholder: "请输入/选择", allowClear: true, showSearch: true, options: progressOptions },
            defaultValue: undefined,
          });
        }
        fields.push(dateSchema);
        return fields;
      };
      const applyType = (type: string): void => {
        query.type = type;
        if (!statusFilterTabs.has(type)) {
          query.status = undefined;
          formApi.setFieldValue("status", undefined);
        }
        formApi.updateSchema(buildSchema(type));
      };
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        cache: true,
        cacheFields: personal ? ["type", "status", "dateRange"] : ["keyword", "faultTypeId", "status", "progress", "dateRange"],
        syncStateRef: query,
        schema: buildSchema(query.type),
        handleValuesChange(_values, _changed, meta) {
          if (!personal || meta?.fieldName !== "type") {
            return;
          }
          applyType(String(formApi.formValues.type ?? "ALL"));
        },
        handleSubmit(values) {
          if (personal) {
            query.type = String(values.type ?? "ALL");
          }
          query.status = typeof values.status === "string" ? values.status : undefined;
          query.keyword = String(values.keyword ?? "").trim();
          query.faultTypeId = typeof values.faultTypeId === "string" ? values.faultTypeId : undefined;
          query.progress = typeof values.progress === "string" ? values.progress : undefined;
          query.dateRange = Array.isArray(values.dateRange) ? values.dateRange.map(String) : undefined;
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.status = undefined;
          query.keyword = "";
          query.faultTypeId = undefined;
          query.progress = undefined;
          query.dateRange = undefined;
          query.type = "ALL";
          if (personal) {
            formApi.updateSchema(buildSchema("ALL"));
          }
          page.pageNumber = 1;
          void load();
        },
      });
      // 缓存恢复后按 type 纠正 schema（隐藏不适用的状态项）。
      if (personal) {
        formApi.updateSchema(buildSchema(String(query.type || "ALL")));
      }
      const exportRows = async (): Promise<void> => {
        if (exporting.value || !page.total) {
          return;
        }
        exporting.value = true;
        try {
          const ExcelJS = (await import("exceljs")).default;
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet(title);
          const columns = flowColumns(openFlow, personal, labels).slice(0, -1);
          sheet.columns = columns.map((column) => ({ header: String(column.title), key: String(column.dataIndex), width: 28 }));
          for (let pageNumber = 1; pageNumber <= Math.ceil(page.total / 999); pageNumber++) {
            const result = personal
              ? await client.pagePersonal(makeQuery(pageNumber, 999))
              : await client.pageRecords(makeQuery(pageNumber, 999));
            for (const row of result.records) {
              sheet.addRow({
                ...row,
                submitedTime: formatDateTime(row.submitedTime),
                status: row.status ? (STATUS_TEXT[row.status] ?? "处理中") : "--",
              });
            }
          }
          const buffer = await workbook.xlsx.writeBuffer();
          const url = URL.createObjectURL(new Blob([buffer as BlobPart]));
          const link = document.createElement("a");
          link.href = url;
          link.download = `${title}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "导出失败");
        } finally {
          exporting.value = false;
        }
      };
      if (!personal) {
        void client
          .listTypes({ applicationCode })
          .then((rows) => {
            typeOptions.value = rows.map((item) => ({ label: item.name, value: String(item.id) }));
          })
          .catch((error) => message.error(String(error)));
        void client
          .listFlowNodeNames({ businessType: applicationCode })
          .then((rows) => {
            progressOptions.value = rows.map((item) => ({ label: item, value: item }));
          })
          .catch((error) => message.error(String(error)));
      }
      const onPage = (pageNumber: number, pageSize: number) => {
        page.pageNumber = pageNumber;
        page.pageSize = pageSize;
        void load();
      };
      void load();
      const slots = {
        "layout-header": () => (
          <div style={{ display: "flex", gap: "8px" }}>
            {personal && (
              <Button type="primary" onClick={() => openFlow()}>
                新增
              </Button>
            )}
            {!personal && (
              <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void exportRows()}>
                导出
              </Button>
            )}
          </div>
        ),
        "layout-content": () => (
          <>
            <div class={[styles.filterForm, personal ? styles.withTabs : null]}>
              <PcForm />
            </div>
            <PcTable />
          </>
        ),
        "footer-page": () => (
          <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} cachePageQuery={true} onPageChange={onPage} />
        ),
      };
      return () => <PageLayout title={title} v-slots={slots} />;
    },
  });
}
export const FaultRepairList = createFlowListPage(true);
export const FaultRepairRecord = createFlowListPage(false);
