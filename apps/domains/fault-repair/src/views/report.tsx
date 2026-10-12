import type { FaultRecord } from "@g2-client/fault-repair/client";
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  Select,
  Spin,
  Table,
  downloadPDF,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFaultMaintainRuntime, getFaultRepairClient } from "../domain-context";
import { formatDateTime } from "./date";

import styles from "./report.module.css";

export const FaultReportList = defineComponent({
  name: "FaultReportList",
  setup() {
    const { basePath, applicationCode } = getFaultMaintainRuntime();
    const client = getFaultRepairClient();
    const router = useRouter();
    const query = reactive({ keyword: "", type: undefined as string | undefined });
    const draft = reactive({ type: undefined as string | undefined, reportTime: undefined as string | undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const types = ref<{ label: string; value: string }[]>([]);
    const open = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    let version = 0;
    const remove = async (row: FaultRecord) => {
      if (deleting.value || !row.id) {
        return;
      }
      deleting.value = true;
      try {
        await client.deleteReport(row.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        deleting.value = false;
      }
    };
    const columns: PcTableColumn[] = [
      { title: "分析报告名称", dataIndex: "name", ellipsis: true },
      { title: "报告类型", dataIndex: "typeName", ellipsis: true },
      { title: "生成时间", dataIndex: "createTime", customRender: ({ text }) => formatDateTime(text as string | number | undefined) },
      {
        title: "操作",
        dataIndex: "action",
        width: 150,
        customRender: ({ record }) => (
          <>
            <Button
              type="link"
              onClick={() => {
                void router.push({ path: `${basePath}/fault-report-detail`, query: { id: String((record as FaultRecord).id) } });
              }}
            >
              详情
            </Button>
            <PopConfirm title="确认删除故障报告？" okText="确定" cancelText="取消" onConfirm={() => void remove(record as FaultRecord)}>
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "FAULT_REPORT", rowKey: "id", autoFetch: false });
    async function load() {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pageReports({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: query.keyword,
          type: query.type,
          applicationCode,
        });
        if (current === version) {
          tableApi.setDataSource(result.records);
          page.total = result.total;
        }
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "报告加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    }
    const save = async () => {
      if (saving.value) {
        return;
      }
      if (!draft.type || !draft.reportTime) {
        message.warning("请选择报告类型和时间");
        return;
      }
      saving.value = true;
      try {
        await client.createReport({ type: draft.type, reportTime: draft.reportTime, applicationCode });
        open.value = false;
        message.success("创建成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "创建失败");
      } finally {
        saving.value = false;
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          componentProps: { placeholder: "报告名称", allowClear: true },
          defaultValue: "",
        },
        {
          component: "Select",
          fieldName: "type",
          label: "报告类型",
          componentProps: { options: types, placeholder: "请选择", allowClear: true },
          defaultValue: undefined,
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.type = typeof values.type === "string" ? values.type : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.keyword = "";
        query.type = undefined;
        page.pageNumber = 1;
        void load();
      },
    });
    void client
      .reportTypes()
      .then((rows) => {
        types.value = rows;
      })
      .catch((error) => message.error(String(error)));
    void load();
    const slots = {
      "layout-header": () => (
        <Button
          type="primary"
          onClick={() => {
            draft.type = undefined;
            draft.reportTime = undefined;
            open.value = true;
          }}
        >
          新增
        </Button>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(number: number, size: number) => {
            page.pageNumber = number;
            page.pageSize = size;
            void load();
          }}
        />
      ),
    };
    return () => (
      <>
        <PageLayout title="故障报告" v-slots={slots} />
        <Modal
          open={open.value}
          width={440}
          title="新增故障报告"
          okText="确定"
          cancelText="取消"
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            open.value = false;
          }}
        >
          <Form layout="vertical" class={styles.reportForm}>
            <FormItem label="报告类型" required>
              <Select
                value={draft.type}
                options={types.value}
                placeholder="请选择报告类型"
                onChange={(value) => {
                  draft.type = typeof value === "string" ? value : undefined;
                  draft.reportTime = undefined;
                }}
              />
            </FormItem>
            <FormItem label="时间选择" required>
              {draft.type === "REPORT_MONTH" ? (
                <DatePicker
                  picker="month"
                  valueFormat="YYYY-MM"
                  value={draft.reportTime}
                  placeholder="请选择时间"
                  onChange={(_date, value) => {
                    draft.reportTime = String(value);
                  }}
                />
              ) : (
                <DatePicker
                  valueFormat="YYYY-MM-DD"
                  value={draft.reportTime}
                  placeholder="请选择时间"
                  onChange={(_date, value) => {
                    draft.reportTime = String(value);
                  }}
                />
              )}
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});

export const FaultReportDetail = defineComponent({
  name: "FaultReportDetail",
  setup() {
    const { basePath } = getFaultMaintainRuntime();
    const client = getFaultRepairClient();
    const route = useRoute();
    const router = useRouter();
    const report = ref<FaultRecord>();
    const loading = ref(false);
    const downloading = ref(false);
    const pdf = ref<HTMLElement>();
    const load = async () => {
      if (!route.query.id) {
        return;
      }
      loading.value = true;
      try {
        report.value = await client.reportOverview(String(route.query.id));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "报告详情加载失败");
      } finally {
        loading.value = false;
      }
    };
    void load();
    const download = async () => {
      if (downloading.value || !pdf.value || !report.value) {
        return;
      }
      downloading.value = true;
      try {
        await downloadPDF(pdf.value, `${String(report.value.title ?? "故障报告")}${String(report.value.titleTime ?? "")}`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "下载失败");
      } finally {
        downloading.value = false;
      }
    };
    const section = (title: string, rows: unknown, columns: { title: string; dataIndex: string }[]) => (
      <section class={styles.section}>
        <h3>{title}</h3>
        {Array.isArray(rows) && rows.length > 0 ? (
          <Table
            dataSource={rows}
            columns={columns}
            pagination={false}
            rowKey={(row: FaultRecord, index?: number) => String(row.id ?? index ?? 0)}
          />
        ) : (
          <p>当前时间段统计未发生异常，请保持良好的运维工作</p>
        )}
      </section>
    );
    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.reportScroll}>
            <div ref={pdf} class={styles.reportDocument}>
              {report.value ? (
                <>
                  <h2 style={{ textAlign: "center" }}>{String(report.value.title ?? "故障报告")}</h2>
                  <p style={{ textAlign: "center" }}>{String(report.value.titleTime ?? "")}</p>
                  <h3>信息总览</h3>
                  <p>
                    当前时间段统计共发生总数【{String(report.value.total ?? 0)}】条；待确认【{String(report.value.waitingForConfirm ?? 0)}
                    】条，待处理【{String(report.value.waitingForHandle ?? 0)}】条，待关闭【{String(report.value.toBeClosed ?? 0)}
                    】条，已结束【{String(report.value.finished ?? 0)}】条。
                  </p>
                  {section("故障明细", report.value.reportOverviewList, [
                    { title: "提交时间", dataIndex: "submitTime" },
                    { title: "故障单名称", dataIndex: "name" },
                    { title: "设备", dataIndex: "objName" },
                    { title: "提交人", dataIndex: "submitter" },
                    { title: "状态", dataIndex: "faultStatus" },
                    { title: "处理结果", dataIndex: "faultResult" },
                  ])}
                  <p>
                    当前时间段统计设备类型【{String(report.value.analysisTotal ?? 0)}】个，请特别关注【
                    {String(report.value.analysisFirstName ?? "--")}】的安全维护工作。
                  </p>
                  {section("设备分析", report.value.analysisList, [
                    { title: "设备类型", dataIndex: "objTypeName" },
                    { title: "个数", dataIndex: "objTypeTotal" },
                    { title: "待确认", dataIndex: "objTypeConfirm" },
                    { title: "待处理", dataIndex: "objTypeHandle" },
                    { title: "待关闭", dataIndex: "objTypeClosed" },
                    { title: "已结束", dataIndex: "objTypeFinished" },
                  ])}
                  <p>
                    当前时间段统计分布区域【{String(report.value.analysisAreaTotal ?? 0)}】个，请特别关注【
                    {String(report.value.analysisAreaFirstName ?? "--")}】的安全维护工作。
                  </p>
                  {section("区域分析", report.value.analysisAreaList, [
                    { title: "区域名称", dataIndex: "areaName" },
                    { title: "个数", dataIndex: "objAreaTotal" },
                    { title: "待确认", dataIndex: "objAreaConfirm" },
                    { title: "待处理", dataIndex: "objAreaHandle" },
                    { title: "待关闭", dataIndex: "objAreaClosed" },
                    { title: "已结束", dataIndex: "objAreaFinished" },
                  ])}
                </>
              ) : null}
            </div>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <>
          <Button
            onClick={() => {
              void router.push(`${basePath}/fault-report`);
            }}
          >
            返回
          </Button>
          <Button type="primary" disabled={!report.value} loading={downloading.value} onClick={() => void download()}>
            下载
          </Button>
        </>
      ),
    };
    return () => <PageLayout title="报告详情" v-slots={slots} />;
  },
});
