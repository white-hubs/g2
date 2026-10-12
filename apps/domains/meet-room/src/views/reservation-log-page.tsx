import type { AppointmentRecord } from "@g2-contract/meet-room";
import { Button, Page, PageLayout, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getMeetRoomClient } from "../domain-context";
import { downloadBlob, errorMessage, formatDateTime, text } from "../shared";

import styles from "../styles.module.css";

const statusOptions = [
  { value: "APPOINTMENT", label: "已预约" },
  { value: "APPOINTMENT_IN", label: "预约中" },
  { value: "CANCEL_RESERVATION", label: "已取消" },
];

const csvCell = (value: unknown): string => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const ReservationLogPage = defineComponent({
  name: "ReservationLogPage",
  setup() {
    const query = reactive<{ keyword: string; status?: string; date?: string[] }>({ keyword: "", status: undefined, date: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const exporting = ref(false);
    const request = () => ({
      keyword: query.keyword || undefined,
      status: query.status,
      date: query.date?.length === 2 ? query.date.join(",") : undefined,
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
    });
    const goDetail = (record: AppointmentRecord): void => {
      if (!record.processInstanceId && !record.currentTaskId) {
        return;
      }
      const params = new URLSearchParams({
        businessType: "MEETING_ROOM_RESERVATION",
        processInstanceId: record.processInstanceId ?? "",
        currentTaskId: record.currentTaskId ?? "",
        status: record.status ?? "",
        type: "detail",
        title: "预约记录",
      });
      history.pushState({ current: location.pathname + location.search }, "", `/portal/stream-engine-render/index?${params}`);
      globalThis.dispatchEvent(new PopStateEvent("popstate"));
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_RESERVATION_LOG",
      rowKey: "id",
      columns: [
        {
          title: "序号",
          dataIndex: "index",
          width: 70,
          fixed: "left",
          customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1,
        },
        { title: "姓名", dataIndex: "userName", width: 150, fixed: "left", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "部门", dataIndex: "departmentName", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "操作时间", dataIndex: "createTime", width: 180, customRender: ({ text: value }) => formatDateTime(value) },
        {
          title: "预约状态",
          dataIndex: "operate",
          width: 130,
          customRender: ({ text: value }) => statusOptions.find((item) => item.value === value)?.label ?? text(value),
        },
        { title: "会议室名称", dataIndex: "conferenceName", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "会议时间", dataIndex: "timeInterval", width: 220, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "会议物品登记", dataIndex: "goodsNames", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "会议取消理由", dataIndex: "cancelReason", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          fixed: "right",
          customRender: ({ record }: { record: AppointmentRecord }) =>
            record.processInstanceId || record.currentTaskId ? (
              <Button type="link" size="small" onClick={() => goDetail(record)}>
                详情
              </Button>
            ) : (
              "--"
            ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await getMeetRoomClient().pageAppointmentRecords(request());
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "预约记录加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "status",
          label: "预约状态",
          defaultValue: undefined,
          componentProps: { options: statusOptions, allowClear: true, placeholder: "请选择预约状态" },
        },
        {
          component: "RangePicker",
          fieldName: "date",
          label: "选择日期",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入会议室名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.status = typeof values.status === "string" ? values.status : undefined;
        query.date = Array.isArray(values.date) ? values.date.map(String) : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.keyword = "";
        query.status = undefined;
        query.date = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
    });
    const download = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      exporting.value = true;
      try {
        const result = await getMeetRoomClient().pageAppointmentRecords({
          ...request(),
          pageNumber: 1,
          pageSize: Math.max(page.total, 1),
        });
        const headers = ["序号", "姓名", "部门", "操作时间", "预约状态", "会议室名称", "会议时间", "会议物品登记", "会议取消理由"];
        const lines = result.records.map((record, index) =>
          [
            index + 1,
            record.userName,
            record.departmentName,
            formatDateTime(record.createTime),
            statusOptions.find((item) => item.value === record.operate)?.label ?? record.operate,
            record.conferenceName,
            record.timeInterval,
            record.goodsNames,
            record.cancelReason,
          ]
            .map((value) => csvCell(value))
            .join(","),
        );
        const csv = [headers.map((value) => csvCell(value)).join(","), ...lines].join("\r\n");
        downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), "会议预约记录.csv");
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };
    return () => (
      <PageLayout
        title="预约记录"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void download()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber, pageSize) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
