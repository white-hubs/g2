import type { OutsourceQuery, OutsourceRecord } from "@g2-client/outsource-repair/client";
import { Button, Page, PageLayout, type PcTableColumn, PopOver, RadioGroup, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, reactive } from "vue";
import { useRouter } from "vue-router";

import { getOutsourceRepairClient, getOutsourceRepairRuntime } from "@/domain-context";
import { readAuthSession } from "@/utils/auth-session";
import { formatDateTime } from "@/utils/date";

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

const flowTabs = [
  { value: "ALL", label: "全部" },
  { value: "WAITING", label: "待我处理" },
  { value: "SUBMIT", label: "我发起的" },
  { value: "SERVED", label: "抄送给我" },
  { value: "PROCESSED", label: "已处理" },
];

/** 旧页仅在这三个 Tab 下显示状态筛选。 */
const statusFilterTabs = new Set(["ALL", "SUBMIT", "SERVED"]);

/** 旧页对该固定处理人追加「生成审批链接」操作。 */
const APPROVAL_LINK_ASSIGNEE = "381496";

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

export const OutsourceRepairList = defineComponent({
  name: "OutsourceRepairList",
  setup() {
    const { applicationCode, basePath } = getOutsourceRepairRuntime();
    const client = getOutsourceRepairClient();
    const router = useRouter();
    const title = "委外维修单";
    const query = reactive({ type: "ALL", status: undefined as string | undefined, dateRange: undefined as string[] | undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let version = 0;

    const openFlow = (row?: OutsourceRecord): void => {
      const routeQuery: Record<string, string> = { businessType: applicationCode, type: row ? "detail" : "add", title };
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
      void router.push({ path: `${basePath}/flow-render`, query: routeQuery });
    };

    /** 复制 H5 审批链接，与旧页 `copyLink` 的参数一致。 */
    const copyApprovalLink = async (row: OutsourceRecord): Promise<void> => {
      const { token, tenant } = readAuthSession();
      const url = `${globalThis.location.origin}/streamengineH5/dynamic-table?processId=${String(row.processInstanceId ?? "")}&processType=HANDLING&access_token=${token}&tenant=${tenant}`;
      try {
        await navigator.clipboard.writeText(url);
        message.success("链接已复制到剪贴板");
      } catch {
        message.error("复制失败，请手动复制链接");
      }
    };

    const columns: PcTableColumn[] = [
      { title: "编号", dataIndex: "code", width: 150, ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "表单名称", dataIndex: "instanceName", width: 200, ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "委外对象", dataIndex: "objName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "发起时间",
        dataIndex: "submitedTime",
        width: 200,
        customRender: ({ text }) => formatDateTime(text as string | number | undefined),
      },
      { title: "发起人", dataIndex: "startUserName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "处理状态", dataIndex: "status", customRender: ({ text }) => (text ? (STATUS_TEXT[String(text)] ?? "处理中") : "--") },
      { title: "处理进度", dataIndex: "activeNodeName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "处理结果", dataIndex: "handleResult", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 180,
        fixed: "right",
        customRender: ({ record }) => {
          const row = record as OutsourceRecord;
          return (
            <div>
              <Button type="link" onClick={() => openFlow(row)}>
                详情
              </Button>
              {row.activeNodeAssignee === APPROVAL_LINK_ASSIGNEE ? (
                <Button type="link" onClick={() => void copyApprovalLink(row)}>
                  生成审批链接
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({ columns, tableCode: "OUTSOURCE_REPAIR_LIST", rowKey: "processInstanceId", autoFetch: false });

    const makeQuery = (): OutsourceQuery => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      businessType: applicationCode,
      type: query.type,
      ...(query.status ? { status: query.status } : {}),
      // 旧页只按日期（不含时分秒）逗号拼接提交。
      ...(query.dateRange?.length === 2 ? { submitTime: query.dateRange.join(",") } : {}),
    });

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pagePersonal(makeQuery());
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
      componentProps: { buttonStyle: "solid", optionType: "button", options: flowTabs },
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
    const buildSchema = (type: string) => [typeSchema, ...(statusFilterTabs.has(type) ? [statusSchema] : []), dateSchema];

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
      cacheFields: ["type", "status", "dateRange"],
      syncStateRef: query,
      schema: buildSchema(query.type),
      handleValuesChange(_values, _changed, meta) {
        if (meta?.fieldName !== "type") {
          return;
        }
        applyType(String(formApi.formValues.type ?? "ALL"));
        page.pageNumber = 1;
        void load();
      },
      handleSubmit(values) {
        query.type = String(values.type ?? "ALL");
        query.status = typeof values.status === "string" ? values.status : undefined;
        query.dateRange = Array.isArray(values.dateRange) ? values.dateRange.map(String) : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.type = "ALL";
        query.status = undefined;
        query.dateRange = undefined;
        formApi.updateSchema(buildSchema("ALL"));
        page.pageNumber = 1;
        void load();
      },
    });
    // 缓存恢复后按 type 纠正 schema（隐藏不适用的状态项）。
    formApi.updateSchema(buildSchema(String(query.type || "ALL")));

    void load();

    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => openFlow()}>
          新增
        </Button>
      ),
      "layout-content": () => (
        <>
          <div class={styles.filterForm}>
            <PcForm />
          </div>
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            void load();
          }}
        />
      ),
    };

    return () => <PageLayout title={title} v-slots={slots} />;
  },
});
