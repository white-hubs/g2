import type { FlowProcess } from "@g2-contract/form-audit";
import { Button, Page, PageLayout, PopConfirm, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import {
  APPLICATION_CODE,
  displayText,
  downloadBlob,
  errorMessage,
  flowStatusLabel,
  flowStatusOptions,
  formatDateTime,
  loadCommonOptions,
  rangePeriod,
} from "../shared";

function createWorkOrderList(mine: boolean) {
  return defineComponent({
    name: mine ? "FormAuditWorkOrderMine" : "FormAuditWorkOrderRecord",
    setup() {
      const router = useRouter();
      const title = mine ? "业务表单" : "表单记录";
      const query = reactive<{ businessType?: string; organizationId?: string; status?: string; username: string; submitTime?: unknown[] }>(
        { username: "" },
      );
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const businessTypes = ref<{ label: string; value: string }[]>([]);
      const departments = ref<{ label: string; value: string }[]>([]);
      const selectedIds = ref<string[]>([]);
      const exporting = ref(false);

      const makeQuery = () => ({
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        applicationCode: APPLICATION_CODE,
        businessType: query.businessType,
        organizationId: query.organizationId,
        status: query.status,
        username: query.username || undefined,
        submitTime: rangePeriod(query.submitTime),
        ...(mine ? { type: "ALL" } : {}),
      });

      const goDetail = (record: FlowProcess): void => {
        void router.push({
          path: mine ? "/d/form-audit/mine-flow-render" : "/d/form-audit/record-flow-render",
          query: {
            type: "detail",
            title: `${title}详情`,
            businessType: record.businessType,
            processInstanceId: record.processInstanceId,
            currentTaskId: record.currentTaskId,
            status: record.status,
            ...(!mine ? { notOperates: "true" } : {}),
          },
        });
      };

      const remove = async (ids: string[]): Promise<void> => {
        try {
          await getFormAuditClient().deleteWorkOrders(ids);
          selectedIds.value = [];
          message.success("删除成功");
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };

      const [PcTable, tableApi] = usePcTable({
        tableCode: mine ? "FORM_AUDIT_MINE" : "FORM_AUDIT_RECORD",
        rowKey: "processInstanceId",
        rowSelection: "checkbox",
        rowSelectionChange(keys) {
          selectedIds.value = keys.map(String);
        },
        columns: [
          {
            title: "编号",
            dataIndex: "formNo",
            width: 190,
            ellipsis: true,
            customRender: ({ text }: { text: unknown }) => displayText(text),
          },
          { title: "申请名称", dataIndex: "instanceName", width: 180, ellipsis: true },
          { title: "发起人", dataIndex: "startUserName", width: 120, ellipsis: true },
          { title: "发起部门", dataIndex: "organizationName", width: 160, ellipsis: true },
          {
            title: "发起时间",
            dataIndex: "submitedTime",
            width: 170,
            customRender: ({ text }: { text?: string | number }) => formatDateTime(text),
          },
          {
            title: "处理状态",
            dataIndex: "status",
            width: 110,
            customRender: ({ text }: { text?: string }) => (
              <Tag color={text === "FINISHED" ? "green" : "blue"}>{flowStatusLabel(text)}</Tag>
            ),
          },
          {
            title: "处理进度",
            dataIndex: "activeNodeName",
            width: 140,
            ellipsis: true,
            customRender: ({ text }: { text?: string }) => text || "--",
          },
          {
            title: "操作",
            dataIndex: "action",
            width: 130,
            fixed: "right",
            customRender: ({ record }: { record: FlowProcess }) => (
              <div class="form-audit-link-actions">
                <Button type="link" size="small" onClick={() => goDetail(record)}>
                  详情
                </Button>
                {record.processInstanceId && (
                  <PopConfirm
                    title="确认删除该工单？"
                    okText="确定"
                    cancelText="取消"
                    onConfirm={() => void remove([String(record.processInstanceId)])}
                  >
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </PopConfirm>
                )}
              </div>
            ),
          },
        ],
        fetchApi: () =>
          mine ? getFormAuditClient().pageFlowProcesses(makeQuery()) : getFormAuditClient().pageAllAppraisalProcesses(makeQuery()),
        fetchLoaded(data) {
          page.total = data.total;
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: [
          { component: "RangePicker", fieldName: "submitTime", label: "发起时间", componentProps: { valueFormat: "YYYY-MM-DD" } },
          {
            component: "Select",
            fieldName: "organizationId",
            label: "发起部门",
            componentProps: { allowClear: true, options: departments, placeholder: "请选择部门" },
          },
          {
            component: "Select",
            fieldName: "status",
            label: "处理状态",
            componentProps: { allowClear: true, options: flowStatusOptions, placeholder: "请选择状态" },
          },
          {
            component: "Select",
            fieldName: "businessType",
            label: "工单类型",
            componentProps: { allowClear: true, options: businessTypes, placeholder: "请选择类型" },
          },
          {
            component: "Input",
            fieldName: "username",
            label: "发起人",
            defaultValue: "",
            componentProps: { allowClear: true, placeholder: "请输入发起人" },
          },
        ],
        handleSubmit(values) {
          query.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
          query.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
          query.status = typeof values.status === "string" ? values.status : undefined;
          query.username = String(values.username ?? "").trim();
          query.submitTime = Array.isArray(values.submitTime) ? values.submitTime : undefined;
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          Object.assign(query, {
            businessType: undefined,
            organizationId: undefined,
            status: undefined,
            username: "",
            submitTime: undefined,
          });
          page.pageNumber = 1;
          tableApi.query();
        },
      });

      const exportList = async (): Promise<void> => {
        if (exporting.value) {
          return;
        }
        exporting.value = true;
        try {
          const blob = await getFormAuditClient().exportFlowProcesses(makeQuery(), !mine);
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
        })
        .catch((error: unknown) => message.error(errorMessage(error, "筛选项加载失败")));

      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <div class="form-audit-actions">
                <Button type="primary" loading={exporting.value} onClick={() => void exportList()}>
                  导出
                </Button>
                <PopConfirm
                  title={`确认删除选中的 ${selectedIds.value.length} 项工单？`}
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => void remove(selectedIds.value)}
                >
                  <Button danger disabled={selectedIds.value.length === 0}>
                    批量删除
                  </Button>
                </PopConfirm>
              </div>
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

export const WorkOrderMine = createWorkOrderList(true);
export const WorkOrderRecord = createWorkOrderList(false);
