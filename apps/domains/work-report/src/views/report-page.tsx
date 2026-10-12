import type { FlowRow, OptionItem, ReportQuery } from "@g2-contract/work-report";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  Radio,
  RadioGroup,
  TreeSelect,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient } from "../domain-context";
import { BASE } from "../menu-data";
import { recordFilters } from "../model";
import { FLOW_STATUSES, FLOW_VIEWS, STATUS_VIEWS, dateTime, departmentTree, display, errorText, flowStatus, positiveInt } from "../shared";

import styles from "../styles.module.css";
function createReportPage(mode: "list" | "center" | "records") {
  return defineComponent({
    name: `WorkReport${mode}Page`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const isList = mode === "list";
      const isRecords = mode === "records";
      const title = isList ? "工作汇报" : "汇报中心";
      const owner = `${BASE}/${isList ? "report-list" : isRecords ? "report-statistics" : "report-center"}`;
      const filter = reactive<{
        type: string;
        status?: string;
        submitTime: string[];
        reportTypeId?: string;
        organizationId?: string;
        username: string;
      }>({
        type: FLOW_VIEWS.some((item) => item.value === route.query.type) ? String(route.query.type) : "ALL",
        status: undefined,
        submitTime: [],
        reportTypeId: undefined,
        organizationId: undefined,
        username: "",
      });
      const pager = reactive({
        pageNumber: positiveInt(route.query.pageNumber, 1),
        pageSize: positiveInt(route.query.pageSize, 10),
        total: 0,
      });
      const departments = ref<OptionItem[]>([]);
      const types = ref<OptionItem[]>([]);
      let version = 0;
      const navigate = (type: "add" | "detail", row?: FlowRow) =>
        void router.push({
          path: `${owner}/flow-render`,
          query: {
            type,
            businessType: "REPORT",
            appName: "work-report",
            title: "工作汇报",
            returnPath: route.fullPath,
            ...(row ? { processInstanceId: row.processInstanceId, currentTaskId: row.currentTaskId ?? "", status: row.status ?? "" } : {}),
          },
        });
      const columns: PcTableColumn[] = [
        {
          title: "编号",
          dataIndex: "formNo",
          ...(isList ? {} : { width: 120, fixed: "left" as const }),
          ellipsis: true,
          customRender: ({ text }) => display(text),
        },
        ...(!isList ? [{ title: "申请名称", dataIndex: "instanceName", width: 120, ellipsis: true }] : []),
        { title: "发起人", dataIndex: "startUserName", ...(!isList ? { width: 120 } : {}) },
        ...(!isList
          ? [
              {
                title: "发起部门",
                dataIndex: "startUserInfo",
                width: 120,
                customRender: ({ record }: { record: unknown }) => display((record as FlowRow).startUserInfo?.organizationName),
              },
            ]
          : []),
        { title: "发起时间", dataIndex: "submitedTime", ...(!isList ? { width: 120 } : {}), customRender: ({ text }) => dateTime(text) },
        { title: "处理状态", dataIndex: "status", ...(!isList ? { width: 120 } : {}), customRender: ({ text }) => flowStatus(text) },
        { title: "处理进度", dataIndex: "activeNodeName", ...(!isList ? { width: 120 } : {}) },
        {
          title: "操作",
          dataIndex: "action",
          ...(!isList ? { width: 120 } : {}),
          customRender: ({ record }) => (
            <Button type="link" size="small" onClick={() => navigate("detail", record as FlowRow)}>
              详情
            </Button>
          ),
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        rowKey: "processInstanceId",
        tableCode: isList ? "FLOW_TABLE_LIST_REPORT" : "WORK_REPORT_CENTER",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const query: ReportQuery = {
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
            ...(isRecords
              ? recordFilters(route.query.searchValue)
              : {
                  reportTypeId: filter.reportTypeId,
                  organizationId: filter.organizationId,
                  username: filter.username,
                  status: filter.status,
                  submitTime: filter.submitTime.join(","),
                }),
          };
          const result = isList
            ? await getClient().pageFlows({
                pageNumber: pager.pageNumber,
                pageSize: pager.pageSize,
                businessType: "REPORT",
                type: filter.type,
                status: STATUS_VIEWS.has(filter.type) ? filter.status : undefined,
                submitTime: filter.submitTime.join(","),
              })
            : await getClient().pageReports(query);
          if (current === version) {
            tableApi.setDataSource(result.records);
            pager.total = result.total;
          }
        } catch (error) {
          if (current === version) {
            message.error(errorText(error, "汇报记录加载失败"));
          }
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const schema = (): PcFormSchemaProp[] => [
        ...(!isList
          ? [
              {
                component: "Select",
                fieldName: "reportTypeId",
                label: "汇报类型",
                componentProps: {
                  options: types.value.map((item) => ({ label: item.name, value: item.id })),
                  allowClear: true,
                  placeholder: "请选择汇报类型",
                },
              },
              {
                component: markRaw(TreeSelect),
                fieldName: "organizationId",
                label: "部门",
                componentProps: {
                  treeData: departmentTree(departments.value),
                  allowClear: true,
                  showSearch: true,
                  treeNodeFilterProp: "title",
                  placeholder: "请选择部门",
                },
              },
            ]
          : []),
        ...(isList && STATUS_VIEWS.has(filter.type)
          ? [
              {
                component: "Select",
                fieldName: "status",
                label: "状态",
                componentProps: { options: FLOW_STATUSES, allowClear: true, placeholder: "请选择" },
              },
            ]
          : []),
        {
          component: "RangePicker",
          fieldName: "submitTime",
          label: isList ? "发起时间" : "汇报时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        ...(!isList
          ? [
              {
                component: "Select",
                fieldName: "status",
                label: "状态",
                componentProps: { options: FLOW_STATUSES, allowClear: true, placeholder: "请选择状态" },
              },
              {
                component: "Input",
                fieldName: "username",
                label: "汇报人",
                defaultValue: "",
                componentProps: { placeholder: "请输入汇报人名称", maxlength: 200, allowClear: true },
              },
            ]
          : []),
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        schema: schema(),
        syncStateRef: filter,
        actionsInline: true,
        cache: !isRecords,
        cacheFields: isList ? ["status", "submitTime"] : undefined,
        showCollapseButton: false,
        handleSubmit() {
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          Object.assign(filter, {
            type: "ALL",
            status: undefined,
            submitTime: [],
            reportTypeId: undefined,
            organizationId: undefined,
            username: "",
          });
          pager.pageNumber = 1;
          formApi.updateSchema(schema());
          formApi.setFormValues({ status: undefined, submitTime: [], reportTypeId: undefined, organizationId: undefined, username: "" });
          if (isList) {
            void router.replace({ path: route.path, query: { type: "ALL", pageNumber: "1", pageSize: String(pager.pageSize) } });
          }
          void load();
        },
      });
      onMounted(() => {
        void load();
        if (mode === "center") {
          void Promise.all([getClient().listOrganizations(), getClient().pageTypes("report", { pageNumber: 1, pageSize: 1000 })])
            .then(([orgs, result]) => {
              departments.value = orgs;
              types.value = result.records;
              formApi.updateSchema(schema());
            })
            .catch((error: unknown) => message.error(errorText(error, "汇报筛选选项加载失败")));
        }
      });
      onUnmounted(() => {
        version += 1;
      });
      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () =>
              isList ? (
                <Button type="primary" onClick={() => navigate("add")}>
                  新增
                </Button>
              ) : null,
            "layout-content": () => (
              <div class={styles.content}>
                {!isRecords ? (
                  <div class={styles.filters}>
                    {isList ? (
                      <RadioGroup
                        value={filter.type}
                        buttonStyle="solid"
                        onChange={(event) => {
                          filter.type = String(event.target.value);
                          filter.status = undefined;
                          pager.pageNumber = 1;
                          formApi.setFieldValue("status", undefined);
                          formApi.updateSchema(schema());
                          void router.replace({
                            path: route.path,
                            query: { ...route.query, status: undefined, type: filter.type, pageNumber: "1" },
                          });
                          void load();
                        }}
                      >
                        {FLOW_VIEWS.map((item) => (
                          <Radio.Button key={item.value} value={item.value}>
                            {item.label}
                          </Radio.Button>
                        ))}
                      </RadioGroup>
                    ) : null}
                    <PcForm />
                  </div>
                ) : null}
                <PcTable />
              </div>
            ),
            "footer-page": () => (
              <div class={styles.footer}>
                <Page
                  current={pager.pageNumber}
                  pageSize={pager.pageSize}
                  total={pager.total}
                  cachePageQuery={true}
                  onPageChange={(page, size) => {
                    pager.pageNumber = page;
                    pager.pageSize = size;
                    void load();
                  }}
                />
                {isRecords ? <Button onClick={() => void router.push(owner)}>返回</Button> : null}
              </div>
            ),
          }}
        />
      );
    },
  });
}
export const ReportListPage = createReportPage("list");
export const ReportCenterPage = createReportPage("center");
export const ReportRecordsPage = createReportPage("records");
