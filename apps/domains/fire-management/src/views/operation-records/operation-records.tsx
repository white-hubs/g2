import type { FireOperationLogRecord } from "@g2-contract/fire-management";
import ExcelJS from "exceljs";
import { defineComponent, onMounted, reactive, ref, type VNode } from "vue";
import { useRoute } from "vue-router";

import {
  DEFAULT_OPERATION_RECORD_FILTERS,
  OPERATION_RESULT_LABEL,
  OPERATION_RESULT_OPTIONS,
  OPERATION_TYPE_COLOR,
  OPERATION_TYPE_LABEL,
  OPERATION_TYPE_OPTIONS,
  type FireOperationRecord,
  type OperationRecordFilters,
  type OperationResult,
  type OperationType,
} from "./operation-records.model";
import { listFireHostOverviews, listOperationLogs } from "@/api/server";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import { Button, DownloadOutlined, Page, Tag, message, type ColumnType } from "@/pc-ui-runtime";

import styles from "./operation-records.module.css";

interface OperationRecordSearch extends OperationRecordFilters {
  pageNumber: number;
  pageSize: number;
  total: number;
}

const normalizePeriod = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).slice(0, 2);
  }
  if (typeof value === "string") {
    return value.split(",").filter(Boolean).slice(0, 2);
  }
  return [];
};

const normalizeString = (value: unknown): string =>
  Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" || typeof value === "number" ? String(value) : "";

const readPositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(normalizeString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSearchValues = (values: Record<string, unknown>, current: OperationRecordSearch): Partial<OperationRecordSearch> => ({
  hostId: normalizeString(values.hostId),
  operationType: normalizeString(values.operationType) as OperationType | "",
  result: normalizeString(values.result) as OperationResult | "",
  operator: normalizeString(values.operator).trim(),
  period: normalizePeriod(values.period),
  pageNumber: readPositiveInteger(values.pageNumber, current.pageNumber),
  pageSize: readPositiveInteger(values.pageSize, current.pageSize),
});

const operationTypeMap: Record<string, OperationType> = {
  HOST_BUTTON: "controlButton",
  BUS_POINT: "busPanel",
  MULTI_LINE_POINT: "multiLinePanel",
};
const apiOperationTypeMap: Record<OperationType, "HOST_BUTTON" | "BUS_POINT" | "MULTI_LINE_POINT"> = {
  controlButton: "HOST_BUTTON",
  busPanel: "BUS_POINT",
  multiLinePanel: "MULTI_LINE_POINT",
};

const formatOperationTime = (value: string | number): string => {
  const normalizedValue = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  const time = dayjs(normalizedValue);
  return time.isValid() ? time.format("YYYY-MM-DD HH:mm:ss") : "--";
};

const mapRecord = (record: FireOperationLogRecord): FireOperationRecord => ({
  id: String(record.id),
  operationTime: formatOperationTime(record.operationTime),
  hostId: String(record.fireManageDeviceId),
  hostName: record.hostNameSnapshot || record.hostName || String(record.fireManageDeviceId),
  operator: record.operatorName || "--",
  operationType: operationTypeMap[record.operationCategory] || "controlButton",
  content: record.operationContent || record.operationName || "--",
  result: record.result === "SUCCESS" ? "success" : "failed",
  failureReason: record.result === "FAILED" ? record.failureReason || record.responseMessage || undefined : undefined,
});

export const OperationRecords = defineComponent({
  name: "OperationRecords",
  setup: () => {
    const route = useRoute();
    const searchParams = reactive<OperationRecordSearch>({
      ...DEFAULT_OPERATION_RECORD_FILTERS,
      pageNumber: readPositiveInteger(route.query.pageNumber, 1),
      pageSize: readPositiveInteger(route.query.pageSize, 10),
      total: 0,
    });
    const currentRecords = ref<FireOperationRecord[]>([]);
    const hostOptions = ref([{ label: "全部主机", value: "" }]);
    onMounted(
      () =>
        void listFireHostOverviews({ pageNumber: 1, pageSize: 100 })
          .then((page) => {
            hostOptions.value = [
              { label: "全部主机", value: "" },
              ...(page.records || []).map((host) => ({ label: host.deviceName, value: String(host.id) })),
            ];
          })
          .catch(() => message.warning("主机筛选列表加载失败，可稍后重试")),
    );

    const columns: ColumnType<FireOperationRecord>[] = [
      { title: "时间", dataIndex: "operationTime", key: "operationTime", align: "center", width: 190 },
      { title: "主机名称", dataIndex: "hostName", key: "hostName", align: "center", width: 220, ellipsis: true },
      { title: "操作人", dataIndex: "operator", key: "operator", align: "center", width: 130 },
      {
        title: "操作类型",
        dataIndex: "operationType",
        key: "operationType",
        align: "center",
        width: 140,
        customRender: ({ text }: { text: OperationType }): VNode => (
          <Tag class={styles.typeTag} color={OPERATION_TYPE_COLOR[text]}>
            {OPERATION_TYPE_LABEL[text]}
          </Tag>
        ),
      },
      { title: "操作内容", dataIndex: "content", key: "content", align: "center", width: 260, ellipsis: true },
      {
        title: "结果",
        dataIndex: "result",
        key: "result",
        align: "center",
        width: 200,
        customRender: ({ record }: { record: FireOperationRecord }): VNode => (
          <span class={[styles.result, record.result === "success" ? styles.resultSuccess : styles.resultFailed]}>
            {OPERATION_RESULT_LABEL[record.result]}
            {record.failureReason ? ` · ${record.failureReason}` : ""}
          </span>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "FIRE_OPERATION_RECORDS",
      rowKey: "id",
      fetchApi: async () => {
        const [startDate, endDate] = searchParams.period;
        const page = await listOperationLogs({
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          fireManageDeviceId: searchParams.hostId || undefined,
          operationCategory: searchParams.operationType ? apiOperationTypeMap[searchParams.operationType] : undefined,
          result: searchParams.result ? (searchParams.result === "success" ? "SUCCESS" : "FAILED") : undefined,
          operatorKeyword: searchParams.operator || undefined,
          startTime: startDate || undefined,
          endTime: endDate || undefined,
        });
        const records = (page.records || []).map(mapRecord);
        currentRecords.value = records;
        return {
          total: Number(page.total || 0),
          pages: Number(page.pages || 0),
          records,
        };
      },
      fetchLoaded: (data) => {
        searchParams.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      showCollapseButton: true,
      schema: [
        {
          component: "Select",
          fieldName: "hostId",
          label: "主机",
          defaultValue: "",
          componentProps: { allowClear: true, options: hostOptions },
        },
        {
          component: "Select",
          fieldName: "operationType",
          label: "操作类型",
          defaultValue: "",
          componentProps: { allowClear: true, options: OPERATION_TYPE_OPTIONS },
        },
        {
          component: "Select",
          fieldName: "result",
          label: "结果",
          defaultValue: "",
          componentProps: { allowClear: true, options: OPERATION_RESULT_OPTIONS },
        },
        {
          component: "Input",
          fieldName: "operator",
          label: "操作人",
          componentProps: { allowClear: true, placeholder: "搜索操作人" },
        },
        {
          component: "RangePicker",
          fieldName: "period",
          label: "时间",
          defaultValue: DEFAULT_OPERATION_RECORD_FILTERS.period,
          componentProps: { allowClear: false, valueFormat: "YYYY-MM-DD" },
        },
      ],
      syncStateRef: searchParams,
      syncMap: (values) => normalizeSearchValues(values, searchParams),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        const nextValues = normalizeSearchValues(values, searchParams);
        const [startDate, endDate] = nextValues.period ?? [];
        if (startDate && endDate && startDate > endDate) {
          message.warning("开始日期不能晚于结束日期");
          return;
        }
        Object.assign(searchParams, nextValues, { pageNumber: 1 });
        tableApi.query();
      },
      handleReset: () => {
        Object.assign(searchParams, DEFAULT_OPERATION_RECORD_FILTERS, { pageNumber: 1 });
        tableApi.query();
      },
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };

    const exportExcel = async (): Promise<void> => {
      const records = currentRecords.value;
      if (records.length === 0) {
        message.warning("暂无数据可导出");
        return;
      }
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("操作记录");
        worksheet.columns = [
          { header: "时间", key: "operationTime", width: 22 },
          { header: "主机名称", key: "hostName", width: 24 },
          { header: "操作人", key: "operator", width: 14 },
          { header: "操作类型", key: "operationType", width: 16 },
          { header: "操作内容", key: "content", width: 28 },
          { header: "结果", key: "result", width: 20 },
        ];
        records.forEach((record) => {
          worksheet.addRow({
            ...record,
            operationType: OPERATION_TYPE_LABEL[record.operationType],
            result: `${OPERATION_RESULT_LABEL[record.result]}${record.failureReason ? ` · ${record.failureReason}` : ""}`,
          });
        });
        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const [startDate = "", endDate = ""] = searchParams.period;
        anchor.href = url;
        anchor.download = `操作记录-${startDate}-${endDate}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
        message.success(`已导出 ${records.length} 条操作记录`);
      } catch {
        message.error("导出失败，请稍后重试");
      }
    };

    const slots = {
      "layout-header": (): VNode => (
        <Button type="primary" icon={<DownloadOutlined />} disabled={currentRecords.value.length === 0} onClick={() => void exportExcel()}>
          导出Excel
        </Button>
      ),
      "layout-content": (): VNode => (
        <div class={styles.page}>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): VNode => (
        <div class={styles.footer}>
          <Page
            current={searchParams.pageNumber}
            pageSize={searchParams.pageSize}
            total={searchParams.total}
            showTotal={(total: number): string => `共 ${total} 条`}
            onPageChange={handlePageChange}
          />
        </div>
      ),
    };

    return (): VNode => <PageLayout title="操作记录" v-slots={slots} />;
  },
});

export default OperationRecords;
