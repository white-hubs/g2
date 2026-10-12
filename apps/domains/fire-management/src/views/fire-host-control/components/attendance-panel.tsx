import { defineComponent, watch, type PropType } from "vue";

import type { AttendanceRecord, AttendanceType } from "../models";
import { usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, Page, SafetyCertificateOutlined, Tag } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

const typeColor = (type: AttendanceType): "red" | "gold" | "default" =>
  type.includes("火") ? "red" : type.includes("故障") ? "gold" : "default";

export const AttendancePanel = defineComponent({
  name: "AttendancePanel",
  props: {
    records: { type: Array as PropType<AttendanceRecord[]>, required: true },
    pageNumber: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: {
    detail: (_record: AttendanceRecord) => true,
    push: (_record: AttendanceRecord) => true,
    search: (_values: { keyword?: unknown; alarmEventName?: unknown; alarmDate?: unknown }) => true,
    pageChange: (_pageNumber: number, _pageSize: number) => true,
  },
  setup(props, { emit }) {
    const [SearchForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          fieldName: "alarmEventName",
          label: "异常类型",
          componentProps: {
            allowClear: true,
            placeholder: "全部异常",
            options: [
              { label: "离岗", value: "离岗" },
              { label: "睡岗", value: "睡岗" },
              { label: "缺卡", value: "缺卡" },
            ],
          },
        },
        {
          component: "RangePicker",
          fieldName: "alarmDate",
          label: "报警日期",
          componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "区域/位置",
          componentProps: { allowClear: true, placeholder: "搜索区域/位置" },
        },
      ],
      handleSubmit: (values) => emit("search", values),
      handleReset: () => emit("search", {}),
    });
    const columns = [
      {
        title: "异常类型",
        dataIndex: "type",
        key: "type",
        width: 90,
        customRender: ({ text }: { text: AttendanceType }) => <Tag color={typeColor(text)}>{text}</Tag>,
      },
      { title: "报警级别", dataIndex: "level", key: "level", width: 90 },
      { title: "报警区域", dataIndex: "area", key: "area", width: 120 },
      { title: "详细位置", dataIndex: "location", key: "location" },
      { title: "报警时间", dataIndex: "time", key: "time", width: 170 },
      { title: "处理时限", dataIndex: "deadline", key: "deadline", width: 90 },
      {
        title: "超时状态",
        dataIndex: "timeout",
        key: "timeout",
        width: 90,
        customRender: ({ text }: { text: string }) => <Tag color={text === "超时" ? "red" : "green"}>{text}</Tag>,
      },
      { title: "处理状态", dataIndex: "status", key: "status", width: 90 },
      { title: "处理人", dataIndex: "handler", key: "handler", width: 90 },
      {
        title: "操作",
        key: "operation",
        width: 120,
        customRender: ({ record }: { record: AttendanceRecord }) => (
          <div class={styles.tableActions}>
            <Button type="link" size="small" onClick={() => emit("detail", record)}>
              详情
            </Button>
            <Button type="link" size="small" onClick={() => emit("push", record)}>
              推送
            </Button>
          </div>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      pagination: false,
      autoFetch: false,
    });
    watch(
      () => props.records,
      (records) => tableApi.setDataSource(records),
      { immediate: true },
    );
    watch(
      () => props.loading,
      (loading) => (tableApi.loading.value = loading),
      { immediate: true },
    );
    return () => (
      <section class={styles.attendancePanel}>
        <div class={styles.attendanceSummary}>
          <div>
            <span class={styles.attendanceIcon}>
              <SafetyCertificateOutlined />
            </span>
            <div>
              <strong>消控室值班远程监管记录</strong>
              <span>展示当前消防主机关联设备的报警中心记录</span>
            </div>
          </div>
          <b>
            {props.total}
            <span> 条报警</span>
          </b>
        </div>
        <div class={styles.attendanceFilters}>
          <SearchForm />
        </div>
        <div class={styles.attendanceTable}>
          <PcTable />
          <div class={styles.attendancePager}>
            <Page
              current={props.pageNumber}
              pageSize={props.pageSize}
              total={props.total}
              syncToUrl={false}
              showTotal={(total: number): string => `共 ${total} 条`}
              onPageChange={(pageNumber: number, pageSize: number) => emit("pageChange", pageNumber, pageSize)}
              onShowSizeChange={(pageNumber: number, pageSize: number) => emit("pageChange", pageNumber, pageSize)}
            />
          </div>
        </div>
      </section>
    );
  },
});
