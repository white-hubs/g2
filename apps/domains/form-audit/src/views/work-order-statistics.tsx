import type { WorkOrderStatistics as StatisticsRecord } from "@g2-contract/form-audit";
import { Button, Page, PageLayout, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { formatTimestamp } from "../date-runtime";
import { getFormAuditClient } from "../domain-context";
import { APPLICATION_CODE, downloadBlob, errorMessage, loadCommonOptions, rangePeriod } from "../shared";

function createStatisticsPage(personnel: boolean) {
  return defineComponent({
    name: personnel ? "FormAuditPersonnelStatistics" : "FormAuditWorkOrderStatistics",
    setup() {
      const title = personnel ? "个人工单统计" : "表单统计";
      const today = new Date();
      const currentRange = [
        formatTimestamp(new Date(today.getFullYear(), today.getMonth(), 1), "YYYY-MM-DD"),
        formatTimestamp(today, "YYYY-MM-DD"),
      ];
      const initialPeriod = personnel ? currentRange : undefined;
      const query = reactive<{ keyword: string; organizationId?: string; businessType?: string; formGroupId?: string; period?: unknown[] }>(
        {
          keyword: "",
          period: initialPeriod,
        },
      );
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const businessTypes = ref<{ label: string; value: string }[]>([]);
      const departments = ref<{ label: string; value: string }[]>([]);
      const formGroups = ref<{ label: string; value: string }[]>([]);
      const exporting = ref(false);

      const makeQuery = () => ({
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        applicationCode: APPLICATION_CODE,
        keyword: query.keyword || undefined,
        organizationId: query.organizationId,
        businessType: query.businessType,
        formGroupId: query.formGroupId,
        period: rangePeriod(query.period),
      });

      const [PcTable, tableApi] = usePcTable({
        tableCode: personnel ? "FORM_AUDIT_PERSONNEL_STATISTICS" : "FORM_AUDIT_WORK_ORDER_STATISTICS",
        rowKey: personnel ? "userName" : "tableKey",
        columns: personnel
          ? [
              { title: "序号", dataIndex: "tableIndex", width: 72 },
              { title: "人员", dataIndex: "userName", width: 140, ellipsis: true },
              { title: "所属部门", dataIndex: "organizationName", width: 180, ellipsis: true },
              { title: "工单数", dataIndex: "totalNumber", width: 110 },
              { title: "待处理", dataIndex: "waitNumber", width: 110 },
              { title: "已处理", dataIndex: "dealNumber", width: 110 },
              { title: "处理率", dataIndex: "dealRate", width: 110 },
              { title: "平均处理时长", dataIndex: "avgWaitTime", width: 150 },
            ]
          : [
              { title: "工单类型", dataIndex: "businessTypeName", width: 180, ellipsis: true },
              { title: "表单分组名称", dataIndex: "formGroupName", width: 180, ellipsis: true },
              { title: "工单总数", dataIndex: "totalNumber", width: 110 },
              { title: "处理中工单数", dataIndex: "processNumber", width: 130 },
              { title: "驳回工单数", dataIndex: "rejectNumber", width: 120 },
              { title: "撤销工单数", dataIndex: "undoNumber", width: 120 },
              { title: "完成工单数", dataIndex: "dealNumber", width: 120 },
            ],
        fetchApi: async () => {
          const result = personnel
            ? await getFormAuditClient().pagePersonnelStatistics(makeQuery())
            : await getFormAuditClient().pageWorkOrderStatistics(makeQuery());
          if (personnel) {
            result.records = result.records.map((record: StatisticsRecord, index) => ({
              ...record,
              tableIndex: (page.pageNumber - 1) * page.pageSize + index + 1,
            }));
          } else {
            result.records = result.records.map((record: StatisticsRecord, index) => ({
              ...record,
              tableKey: `${record.businessType ?? "unknown"}-${record.formGroupName ?? "group"}-${index}`,
            }));
          }
          return result;
        },
        fetchLoaded(data) {
          page.total = data.total;
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: personnel
          ? [
              {
                component: "Input",
                fieldName: "keyword",
                label: "人员",
                defaultValue: "",
                componentProps: { allowClear: true, placeholder: "请输入人员名称" },
              },
              {
                component: "Select",
                fieldName: "organizationId",
                label: "部门",
                componentProps: { allowClear: true, options: departments, placeholder: "请选择部门" },
              },
              {
                component: "RangePicker",
                fieldName: "period",
                label: "时间",
                defaultValue: currentRange,
                componentProps: { valueFormat: "YYYY-MM-DD" },
              },
            ]
          : [
              {
                component: "Select",
                fieldName: "businessType",
                label: "工单类型",
                componentProps: { allowClear: true, options: businessTypes, placeholder: "请选择工单类型" },
              },
              {
                component: "Select",
                fieldName: "formGroupId",
                label: "表单分组",
                componentProps: { allowClear: true, options: formGroups, placeholder: "请选择表单分组" },
              },
              { component: "RangePicker", fieldName: "period", label: "发起时间", componentProps: { valueFormat: "YYYY-MM-DD" } },
            ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "").trim();
          query.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
          query.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
          query.formGroupId = typeof values.formGroupId === "string" ? values.formGroupId : undefined;
          query.period = Array.isArray(values.period) ? values.period : undefined;
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          Object.assign(query, {
            keyword: "",
            organizationId: undefined,
            businessType: undefined,
            formGroupId: undefined,
            period: initialPeriod,
          });
          page.pageNumber = 1;
          tableApi.query();
        },
      });

      const exportStatistics = async (): Promise<void> => {
        exporting.value = true;
        try {
          const blob = personnel
            ? await getFormAuditClient().exportPersonnelStatistics(makeQuery())
            : await getFormAuditClient().exportWorkOrderStatistics(makeQuery());
          downloadBlob(blob, `${title}.xlsx`);
        } catch (error) {
          message.error(errorMessage(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };

      void loadCommonOptions()
        .then((options) => {
          businessTypes.value = options.businessTypes;
          departments.value = options.departments;
          formGroups.value = options.formGroups;
        })
        .catch((error: unknown) => message.error(errorMessage(error, "筛选项加载失败")));

      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void exportStatistics()}>
                导出
              </Button>
            ),
            "layout-content": () => (
              <div class="form-audit-table-page">
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
                onPageChange={(pageNumber: number, pageSize: number) => {
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
}

export const WorkOrderStatistics = createStatisticsPage(false);
export const PersonnelStatistics = createStatisticsPage(true);
