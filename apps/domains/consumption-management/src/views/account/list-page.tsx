import type { AccountRow } from "@g2-contract/consumption-management";
import { Button, Page, PageLayout, type PcFormSchemaProp, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getConsumptionManagementClient } from "../../domain-context";

import styles from "./account.module.css";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "--" : String(value);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function accountTypeSchema(options: { label: string; value: string }[]): PcFormSchemaProp {
  return {
    component: "Select",
    fieldName: "accountName",
    label: "账户类型",
    defaultValue: undefined,
    componentProps: {
      options,
      placeholder: "请选择",
      allowClear: true,
      style: { width: "240px" },
      onChange: () => undefined,
    },
  };
}

export const AccountManagementPage = defineComponent({
  name: "ConsumptionAccountManagementPage",
  setup() {
    const client = getConsumptionManagementClient();
    const route = useRoute();
    const router = useRouter();
    const query = reactive<{ enterParam: string; accountName?: string }>({ enterParam: "", accountName: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    let requestVersion = 0;

    const columns: PcTableColumn[] = [
      { title: "卡号", dataIndex: "userCard", align: "center", customRender: ({ text }) => display(text) },
      { title: "人工序号", dataIndex: "userSerial", align: "center", customRender: ({ text }) => display(text) },
      { title: "工号", dataIndex: "userNo", align: "center", customRender: ({ text }) => display(text) },
      { title: "姓名", dataIndex: "userName", align: "center", customRender: ({ text }) => display(text) },
      {
        title: "账户类型",
        dataIndex: "accountName",
        align: "center",
        customRender: ({ record }) => display((record as AccountRow).accountName ?? (record as AccountRow).acName),
      },
      { title: "账户状态", dataIndex: "accountStatus", align: "center", customRender: ({ text }) => display(text) },
      {
        title: "账户余额(元)",
        dataIndex: "accountBalance",
        align: "center",
        customRender: ({ record }) => display((record as AccountRow).accountBalance ?? (record as AccountRow).acMoney),
      },
      {
        title: "操作",
        dataIndex: "action",
        align: "center",
        customRender: ({ record }) => (
          <Button
            type="link"
            size="small"
            onClick={() =>
              void router.push({
                path: "/d/consumption-management/accountmanagement/details",
                query: { id: (record as AccountRow).id, returnPath: route.fullPath },
              })
            }
          >
            查看
          </Button>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "CONSUMPTION_ACCOUNT_MANAGEMENT",
      pagination: false,
      autoFetch: false,
    });

    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      tableApi.loading.value = true;
      try {
        const result = await client.pageAccounts({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          enterParam: query.enterParam.trim() || undefined,
          accountName: query.accountName,
        });
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource([]);
        page.total = 0;
        message.error(errorText(error, "账户列表加载失败"));
      } finally {
        if (version === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      cache: false,
      schema: [
        {
          component: "Input",
          fieldName: "enterParam",
          label: "",
          defaultValue: "",
          componentProps: {
            placeholder: "请输入人工序号、工号、卡号、姓名搜索",
            maxlength: 50,
            allowClear: true,
            style: { width: "360px" },
          },
        },
        accountTypeSchema([]),
      ],
      handleSubmit(values) {
        query.enterParam = String(values.enterParam ?? "").trim();
        query.accountName = typeof values.accountName === "string" ? values.accountName : undefined;
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.enterParam = "";
        query.accountName = undefined;
        page.pageNumber = 1;
        void load();
      },
    });

    onMounted(() => {
      void load();
      void client
        .listAccountStatuses()
        .then((items) => {
          const options = items.filter((item) => item.description).map((item) => ({ label: item.description, value: item.description }));
          formApi.updateFieldSchema(accountTypeSchema(options));
        })
        .catch((error: unknown) => message.error(errorText(error, "账户类型加载失败")));
    });

    return () => (
      <PageLayout
        title="账户管理"
        v-slots={{
          "layout-content": () => (
            <div class={styles.listContent}>
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
              onPageChange={(number: number, size: number) => {
                page.pageNumber = number;
                page.pageSize = size;
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});
