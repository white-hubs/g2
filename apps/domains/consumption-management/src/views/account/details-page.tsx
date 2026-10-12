import type { AccountDetail, TransactionOption } from "@g2-contract/consumption-management";
import { Button, PageLayout, type PcTableColumn, Spin, message, usePcTable } from "@g2-platform/pc-ui";
import dayjs from "dayjs";
import { defineComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getConsumptionManagementClient } from "../../domain-context";

import styles from "./account.module.css";

const BASE = "/d/consumption-management";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "--" : String(value);
}

function dateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const date = dayjs(value as string | number);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : display(value);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function statusText(value: unknown): string {
  if (String(value) === "1") {
    return "成功";
  }
  if (String(value) === "0") {
    return "失败";
  }
  return "--";
}

export const AccountDetailsPage = defineComponent({
  name: "ConsumptionAccountDetailsPage",
  setup() {
    const client = getConsumptionManagementClient();
    const route = useRoute();
    const router = useRouter();
    const detail = ref<AccountDetail | null>(null);
    const transactionTypes = ref<TransactionOption[]>([]);
    const loading = ref(false);
    let requestVersion = 0;

    const typeText = (value: unknown): string =>
      transactionTypes.value.find((item) => String(item.value) === String(value))?.name ?? display(value);

    const amountColumns: PcTableColumn[] = [
      { title: "交易时间", dataIndex: "transactionTime", align: "center", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "交易金额(元)", dataIndex: "transactionMoney", align: "center", width: 140, customRender: ({ text }) => display(text) },
      { title: "账户余额(元)", dataIndex: "balance", align: "center", width: 140, customRender: ({ text }) => display(text) },
      { title: "交易类型", dataIndex: "transactionType", align: "center", width: 120, customRender: ({ text }) => typeText(text) },
      { title: "补贴有效日期", dataIndex: "subsidyBeginDate", align: "center", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "补贴有效截止日期", dataIndex: "subsidyEndDate", align: "center", width: 190, customRender: ({ text }) => dateTime(text) },
      { title: "交易场所", dataIndex: "depName", align: "center", width: 170, ellipsis: true, customRender: ({ text }) => display(text) },
      { title: "交易渠道", dataIndex: "transactionChannel", align: "center", width: 120, customRender: ({ text }) => display(text) },
      { title: "交易状态", dataIndex: "transactionStatus", align: "center", width: 110, customRender: ({ text }) => statusText(text) },
      { title: "订单号", dataIndex: "orderId", align: "center", width: 190, ellipsis: true, customRender: ({ text }) => display(text) },
    ];
    const copiesColumns: PcTableColumn[] = [
      { title: "交易时间", dataIndex: "transactionTime", align: "center", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "交易数量(份)", dataIndex: "transactionCount", align: "center", width: 145, customRender: ({ text }) => display(text) },
      { title: "交易类型", dataIndex: "transactionType", align: "center", width: 130, customRender: ({ text }) => typeText(text) },
      { title: "交易场所", dataIndex: "depName", align: "center", width: 170, ellipsis: true, customRender: ({ text }) => display(text) },
      { title: "补贴有效日期", dataIndex: "subsidyBeginDate", align: "center", width: 180, customRender: ({ text }) => dateTime(text) },
      { title: "补贴有效截止日期", dataIndex: "subsidyEndDate", align: "center", width: 190, customRender: ({ text }) => dateTime(text) },
      { title: "交易状态", dataIndex: "transactionStatus", align: "center", width: 110, customRender: ({ text }) => statusText(text) },
    ];
    const [AmountTable, amountTableApi] = usePcTable({
      columns: amountColumns,
      rowKey: "key",
      tableCode: "CONSUMPTION_ACCOUNT_AMOUNT_RECORD",
      pagination: false,
      autoFetch: false,
      autoScrollY: false,
      scrollY: 170,
    });
    const [CopiesTable, copiesTableApi] = usePcTable({
      columns: copiesColumns,
      rowKey: "key",
      tableCode: "CONSUMPTION_ACCOUNT_COPIES_RECORD",
      pagination: false,
      autoFetch: false,
      autoScrollY: false,
      scrollY: 170,
    });

    const load = async (id: string): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const result = await client.getAccountDetail(id);
        if (version !== requestVersion) {
          return;
        }
        detail.value = result;
        const amountRows = [];
        for (const [index, row] of (result.amountRecord ?? []).entries()) {
          amountRows.push({ ...row, key: `amount-${index}` });
        }
        const copiesRows = [];
        for (const [index, row] of (result.copiesRecord ?? []).entries()) {
          copiesRows.push({ ...row, key: `copies-${index}` });
        }
        amountTableApi.setDataSource(amountRows);
        copiesTableApi.setDataSource(copiesRows);
      } catch (error) {
        if (version !== requestVersion) {
          return;
        }
        detail.value = null;
        amountTableApi.setDataSource([]);
        copiesTableApi.setDataSource([]);
        message.error(errorText(error, "账户详情加载失败"));
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    const more = (path: "moneychange" | "partchange"): void => {
      void router.push({ path: `${BASE}/${path}`, query: { userCard: detail.value?.userCard ?? "" } });
    };

    const back = (): void => {
      const returnPath = route.query.returnPath;
      if (typeof returnPath === "string" && returnPath.startsWith(`${BASE}/accountmanagement`)) {
        router.back();
      } else {
        void router.push(`${BASE}/accountmanagement`);
      }
    };

    watch(
      () => route.query.id,
      (id) => {
        if (typeof id === "string" && id) {
          void load(id);
        } else {
          detail.value = null;
          amountTableApi.setDataSource([]);
          copiesTableApi.setDataSource([]);
          message.error("缺少账户 ID");
        }
      },
      { immediate: true },
    );
    onMounted(() => {
      void client
        .listTransactionTypes()
        .then((items) => {
          transactionTypes.value = items;
        })
        .catch((error: unknown) => message.error(errorText(error, "交易类型加载失败")));
    });

    const info = (label: string, value: unknown) => (
      <div class={styles.infoItem}>
        <span class={styles.infoLabel}>{label}</span>
        <span class={styles.infoValue}>{display(value)}</span>
      </div>
    );

    return () => (
      <PageLayout
        title="基础信息"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class={styles.detailContent}>
                <section class={styles.infoCard} aria-label="基础信息">
                  <div class={styles.infoGrid}>
                    {info("卡号", detail.value?.userCard)}
                    {info("人员序号", detail.value?.userSerial)}
                    {info("姓名", detail.value?.userName)}
                    {info("工号", detail.value?.userNo)}
                    {info("账户余额(元)", detail.value?.accountBalance)}
                    {info("补贴余额(元)", detail.value?.subsidyBalance)}
                    {info("现金余额(元)", detail.value?.cashBalance)}
                  </div>
                </section>

                <section class={styles.recordSection}>
                  <div class={styles.sectionHeader}>
                    <h2>金额变更记录</h2>
                    <Button type="link" disabled={!detail.value?.userCard} onClick={() => more("moneychange")}>
                      查看更多
                    </Button>
                  </div>
                  <AmountTable />
                </section>

                <section class={styles.recordSection}>
                  <div class={styles.sectionHeader}>
                    <h2>份变更记录</h2>
                    <Button type="link" disabled={!detail.value?.userCard} onClick={() => more("partchange")}>
                      查看更多
                    </Button>
                  </div>
                  <CopiesTable />
                </section>
              </div>
            </Spin>
          ),
          "footer-page": () => <Button onClick={back}>返回</Button>,
        }}
      />
    );
  },
});
