import type { EventRecord } from "@g2-contract/fire-management";
import ExcelJS from "exceljs";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { DEFAULT_EVENT_RECORD_FILTERS, type EventRecordFilters, type FireEventRecord } from "./event-records.model";
import { getFirePointEventOptions, listFireHostOverviews, listFirePointEvents } from "@/api/server";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, DownloadOutlined, Page, Tag, message, type ColumnType } from "@/pc-ui-runtime";
import { FIRE_EVENT_TAG_COLOR, normalizeFireEventType } from "@/utils/fire-event";

import styles from "./event-records.module.css";

interface EventRecordSearch extends EventRecordFilters {
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

const normalizeSearchValues = (values: Record<string, unknown>, current: EventRecordSearch): Partial<EventRecordSearch> => ({
  hostId: normalizeString(values.hostId),
  eventCode: normalizeString(values.eventCode),
  circuit: normalizeString(values.circuit).trim(),
  address: normalizeString(values.address).trim(),
  code: normalizeString(values.code).trim(),
  period: normalizePeriod(values.period),
  pageNumber: readPositiveInteger(values.pageNumber, current.pageNumber),
  pageSize: readPositiveInteger(values.pageSize, current.pageSize),
});

const mapRecord = (record: EventRecord): FireEventRecord => ({
  id: String(record.id ?? `${record.eventTime}-${record.deviceInfo}`),
  eventCode: record.eventCode || "",
  eventName: record.eventName || "--",
  eventType: normalizeFireEventType(record.eventType),
  hostId: String(record.fireManageDeviceId ?? ""),
  hostName: record.hostName || "--",
  circuit: record.circuit || "--",
  address: record.address || "--",
  code: record.pointCode || record.deviceInfo || "--",
  pointName: record.pointName || "--",
  location: record.location || "--",
  eventTime: record.eventTime || "--",
});

const toTimestamp = (date: string, end = false): number | undefined => {
  if (!date) return undefined;
  const timestamp = new Date(`${date}T${end ? "23:59:59" : "00:00:00"}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

export const EventRecords = defineComponent({
  name: "EventRecords",
  setup: () => {
    const route = useRoute();
    const searchParams = reactive<EventRecordSearch>({
      ...DEFAULT_EVENT_RECORD_FILTERS,
      pageNumber: readPositiveInteger(route.query.pageNumber, 1),
      pageSize: readPositiveInteger(route.query.pageSize, 10),
      total: 0,
    });
    const currentRecords = ref<FireEventRecord[]>([]);
    const hostOptions = ref([{ label: "全部主机", value: "" }]);
    const eventOptions = ref([{ label: "全部类型", value: "" }]);
    onMounted(() => {
      void Promise.allSettled([
        listFireHostOverviews({ pageNumber: 1, pageSize: 100 }).then((page) => {
          hostOptions.value = [
            { label: "全部主机", value: "" },
            ...(page.records || []).map((host) => ({ label: host.deviceName, value: String(host.id) })),
          ];
        }),
        getFirePointEventOptions().then((options) => {
          eventOptions.value = [
            { label: "全部类型", value: "" },
            ...Object.entries(options || {}).map(([value, label]) => ({ label, value })),
          ];
        }),
      ]).then((results) => {
        if (results[0]?.status === "rejected") message.warning("主机筛选列表加载失败，可稍后重试");
        if (results[1]?.status === "rejected") message.warning("事件类型加载失败，可稍后重试");
      });
    });

    const columns: ColumnType<FireEventRecord>[] = [
      {
        title: "类型",
        dataIndex: "eventName",
        key: "eventName",
        align: "center",
        width: 150,
        customRender: ({ text, record }: { text: string; record: FireEventRecord }): JSX.Element => (
          <Tag class={styles.categoryTag} color={FIRE_EVENT_TAG_COLOR[record.eventType]}>
            {text}
          </Tag>
        ),
      },
      { title: "主机名称", dataIndex: "hostName", key: "hostName", align: "center", width: 210, ellipsis: true },
      { title: "回路", dataIndex: "circuit", key: "circuit", align: "center", width: 80 },
      { title: "地址", dataIndex: "address", key: "address", align: "center", width: 90 },
      { title: "编号", dataIndex: "code", key: "code", align: "center", width: 170, ellipsis: true },
      { title: "点位名称", dataIndex: "pointName", key: "pointName", align: "center", width: 210, ellipsis: true },
      { title: "报警时间", dataIndex: "eventTime", key: "eventTime", align: "center", width: 190 },
      {
        title: "位置",
        dataIndex: "location",
        key: "location",
        align: "center",
        width: 260,
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <span class={styles.location}>{text}</span>,
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "FIRE_EVENT_RECORDS",
      rowKey: "id",
      fetchApi: async () => {
        const [startDate, endDate] = searchParams.period;
        const page = await listFirePointEvents({
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          fireManageDeviceId: searchParams.hostId || undefined,
          circuit: searchParams.circuit || undefined,
          address: searchParams.address || undefined,
          eventCodes: searchParams.eventCode ? [searchParams.eventCode] : undefined,
          startTs: toTimestamp(startDate),
          endTs: toTimestamp(endDate, true),
        });
        const records = (page.records || [])
          .map(mapRecord)
          .filter((record) => !searchParams.code || record.code.toLocaleLowerCase().includes(searchParams.code.toLocaleLowerCase()));
        currentRecords.value = records;
        return {
          total: searchParams.code ? records.length : Number(page.total || 0),
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
          fieldName: "eventCode",
          label: "类型",
          defaultValue: "",
          componentProps: { allowClear: true, options: eventOptions },
        },
        {
          component: "Input",
          fieldName: "circuit",
          label: "回路",
          componentProps: { allowClear: true, placeholder: "输入回路" },
        },
        {
          component: "Input",
          fieldName: "address",
          label: "位置",
          componentProps: { allowClear: true, placeholder: "搜索位置" },
        },
        {
          component: "Input",
          fieldName: "code",
          label: "编号",
          componentProps: { allowClear: true, placeholder: "搜索编号" },
        },
        {
          component: "RangePicker",
          fieldName: "period",
          label: "时间",
          defaultValue: DEFAULT_EVENT_RECORD_FILTERS.period,
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
        Object.assign(searchParams, DEFAULT_EVENT_RECORD_FILTERS, { pageNumber: 1 });
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
        const worksheet = workbook.addWorksheet("事件记录");
        worksheet.columns = [
          { header: "类型", key: "eventName", width: 18 },
          { header: "主机名称", key: "hostName", width: 24 },
          { header: "回路", key: "circuit", width: 10 },
          { header: "地址", key: "address", width: 10 },
          { header: "编号", key: "code", width: 20 },
          { header: "点位名称", key: "pointName", width: 26 },
          { header: "报警时间", key: "eventTime", width: 22 },
          { header: "位置", key: "location", width: 30 },
        ];
        records.forEach((record) => worksheet.addRow(record));
        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const [startDate = "", endDate = ""] = searchParams.period;
        anchor.href = url;
        anchor.download = `事件记录-${startDate}-${endDate}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
        message.success(`已导出 ${records.length} 条事件记录`);
      } catch {
        message.error("导出失败，请稍后重试");
      }
    };

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button icon={<DownloadOutlined />} onClick={() => void exportExcel()}>
          导出Excel
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class={styles.page}>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
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

    return (): JSX.Element => <PageLayout title="事件记录" v-slots={slots} />;
  },
});

export default EventRecords;
