import type { FlowRow, OptionItem } from "@g2-contract/government-management";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  Radio,
  RadioGroup,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getGovernmentClient } from "../domain-context";
import { type ApprovalPageConfig, menuPath } from "../menu-data";
import { FLOW_STATUSES, FLOW_VIEWS, STATUS_VIEWS, can, dateTime, display, errorText, flowStatus, positiveInt } from "./shared";

import styles from "./page.module.css";

const PERMISSIONS: Record<string, string> = {
  OFFICIAL_REGULATION: "official:institutionalSolicitation",
  OFFICIAL_SEAL: "official:useSealApproval",
  OFFICIAL_TOPIC: "official:issueApprovalList",
  OFFICIAL_DOCUMENT_CIRCULATION: "official:fileCircularize",
  OFFICIAL_DOCUMENT_RECEIVED: "official:documentReceived",
  OFFICIAL_KEY_WORK: "official:departmentWork",
  OFFICIAL_URGENT_WORK: "official:matterUrge",
};

function organizationOptions(items: OptionItem[]): { label: string; value: string }[] {
  return items.flatMap((item) => [...(item.id ? [{ label: item.name, value: item.id }] : []), ...organizationOptions(item.children ?? [])]);
}

export function createApprovalPage(config: ApprovalPageConfig) {
  return defineComponent({
    name: `GovernmentApproval${config.slug}`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const filter = reactive<{ type: string; status?: string; submitTime: string[]; organizationId?: string; username?: string }>({
        type: FLOW_VIEWS.some((view) => view.value === route.query.type) ? String(route.query.type) : "ALL",
        status: undefined,
        submitTime: [],
        organizationId: undefined,
        username: undefined,
      });
      const departments = ref<OptionItem[]>([]);
      const pager = reactive({
        pageNumber: positiveInt(route.query.pageNumber, 1),
        pageSize: positiveInt(route.query.pageSize, 10),
        total: 0,
      });
      let version = 0;
      const navigate = (type: "add" | "detail", row?: FlowRow) => {
        void router.push({
          path: `${menuPath(config.slug)}/flow-render`,
          query: {
            type,
            businessType: config.businessType,
            appName: "governmentManagement",
            title: config.title,
            returnPath: route.fullPath,
            ...(row ? { processInstanceId: row.processInstanceId, currentTaskId: row.currentTaskId ?? "", status: row.status ?? "" } : {}),
          },
        });
      };
      const permission = PERMISSIONS[config.businessType];
      const columns: PcTableColumn[] = [
        { title: "编号", dataIndex: "formNo", width: 190, ellipsis: true, customRender: ({ text }) => display(text) },
        { title: "申请名称", dataIndex: "instanceName", width: 220, ellipsis: true, customRender: ({ text }) => display(text) },
        { title: "发起人", dataIndex: "startUserName", width: 130, customRender: ({ text }) => display(text) },
        {
          title: "发起部门",
          dataIndex: "startUserInfo",
          width: 170,
          ellipsis: true,
          customRender: ({ record }) => display((record as FlowRow).startUserInfo?.organizationName),
        },
        { title: "发起时间", dataIndex: "submitedTime", width: 180, customRender: ({ text }) => dateTime(text) },
        { title: "处理状态", dataIndex: "status", width: 110, customRender: ({ text }) => flowStatus(text) },
        { title: "处理进度", dataIndex: "activeNodeName", width: 150, ellipsis: true, customRender: ({ text }) => display(text) },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          fixed: "right",
          customRender: ({ record }) =>
            !permission || can(`${permission}:details`) ? (
              <Button type="link" size="small" onClick={() => navigate("detail", record as FlowRow)}>
                详情
              </Button>
            ) : null,
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: config.tableCode,
        rowKey: "processInstanceId",
        autoFetch: false,
        pagination: false,
      });
      const load = async () => {
        const current = ++version;
        tableApi.loading.value = true;
        try {
          const result = await getGovernmentClient().pageFlows({
            pageNumber: pager.pageNumber,
            pageSize: pager.pageSize,
            type: filter.type,
            businessType: config.businessType,
            status: STATUS_VIEWS.has(filter.type) ? (filter.status ?? null) : null,
            submitTime: filter.submitTime.length === 2 ? `${filter.submitTime[0]} 00:00:00,${filter.submitTime[1]} 23:59:59` : "",
            organizationId: config.applicantFilters ? filter.organizationId : undefined,
            username: config.applicantFilters ? filter.username?.trim() : undefined,
          });
          if (current !== version) {
            return;
          }
          tableApi.setDataSource(result.records);
          pager.total = result.total;
        } catch (error) {
          if (current !== version) {
            return;
          }
          message.error(errorText(error, "审批列表加载失败"));
          tableApi.setDataSource([]);
          pager.total = 0;
        } finally {
          if (current === version) {
            tableApi.loading.value = false;
          }
        }
      };
      const schema = (): PcFormSchemaProp[] => [
        ...(STATUS_VIEWS.has(filter.type)
          ? [
              {
                component: "Select" as const,
                fieldName: "status",
                label: "状态",
                componentProps: { allowClear: true, placeholder: "请选择", options: FLOW_STATUSES },
              },
            ]
          : []),
        {
          component: "RangePicker",
          fieldName: "submitTime",
          label: "发起时间",
          defaultValue: [],
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        ...(config.applicantFilters
          ? [
              {
                component: "Select" as const,
                fieldName: "organizationId",
                label: "发起部门",
                componentProps: {
                  options: organizationOptions(departments.value),
                  placeholder: "请选择发起部门",
                  allowClear: true,
                  showSearch: true,
                  optionFilterProp: "label",
                  style: { width: "180px" },
                },
              },
              {
                component: "Input" as const,
                fieldName: "username",
                label: "发起人",
                componentProps: { placeholder: "请输入发起人名称", allowClear: true, style: { width: "180px" } },
              },
            ]
          : []),
      ];
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        schema: schema(),
        syncStateRef: filter,
        showCollapseButton: false,
        actionsInline: true,
        cache: true,
        handleSubmit(values) {
          filter.status = typeof values.status === "string" ? values.status : undefined;
          filter.submitTime = Array.isArray(values.submitTime) ? values.submitTime.map(String) : [];
          filter.organizationId = typeof values.organizationId === "string" ? values.organizationId : undefined;
          filter.username = typeof values.username === "string" ? values.username : undefined;
          pager.pageNumber = 1;
          void load();
        },
        handleReset() {
          filter.type = "ALL";
          filter.status = undefined;
          filter.submitTime = [];
          filter.organizationId = undefined;
          filter.username = undefined;
          pager.pageNumber = 1;
          formApi.updateSchema(schema());
          formApi.setFormValues({ status: undefined, submitTime: [], organizationId: undefined, username: undefined });
          void router.replace({ path: route.path, query: { type: "ALL" } });
          void load();
        },
      });
      onMounted(() => {
        void load();
        if (config.applicantFilters) {
          void getGovernmentClient()
            .listOrganizations()
            .then((items) => {
              departments.value = items;
              formApi.updateSchema(schema());
            })
            .catch((error: unknown) => message.error(errorText(error, "发起部门加载失败")));
        }
      });
      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () =>
              !permission || can(`${permission}:add`) ? (
                <Button type="primary" onClick={() => navigate("add")}>
                  新增
                </Button>
              ) : null,
            "layout-content": () => (
              <div class={styles.content}>
                <div class={styles.filterRow}>
                  <RadioGroup
                    value={filter.type}
                    buttonStyle="solid"
                    onChange={(event) => {
                      const next = event.target.value;
                      if (typeof next !== "string") {
                        return;
                      }
                      filter.type = next;
                      filter.status = undefined;
                      formApi.setFieldValue("status", undefined);
                      formApi.updateSchema(schema());
                      pager.pageNumber = 1;
                      void router.replace({ path: route.path, query: { ...route.query, type: next, pageNumber: "1" } });
                      void load();
                    }}
                  >
                    {FLOW_VIEWS.map((view) => (
                      <Radio.Button key={view.value} value={view.value}>
                        {view.label}
                      </Radio.Button>
                    ))}
                  </RadioGroup>
                  <PcForm />
                </div>
                <PcTable />
              </div>
            ),
            "footer-page": () =>
              pager.total > 0 ? (
                <Page
                  current={pager.pageNumber}
                  pageSize={pager.pageSize}
                  total={pager.total}
                  cachePageQuery={true}
                  onPageChange={(number: number, size: number) => {
                    pager.pageNumber = number;
                    pager.pageSize = size;
                    void load();
                  }}
                />
              ) : null,
          }}
        />
      );
    },
  });
}
