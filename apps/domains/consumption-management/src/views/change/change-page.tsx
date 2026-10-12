import type { AmountChangeRow, ChangePageQuery, CopiesChangeRow, TransactionOption } from "@g2-contract/consumption-management";
import { Button, Page, PageLayout, type PcTableColumn, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs, { type Dayjs } from "dayjs";
import { defineComponent, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { getConsumptionManagementClient } from "../../domain-context";

import styles from "./change-page.module.css";

type ChangeRow = AmountChangeRow | CopiesChangeRow;
type TableRow = ChangeRow & { __rowKey: string };
type ChangeKind = "amount" | "copies";

/** 列表和统计按各自完成时更新，统计失败不能影响已经成功的列表。 */
export function settleChangeRequests<TList, TStatistics>(
  listRequest: Promise<TList>,
  statisticsRequest: Promise<TStatistics>,
  handlers: {
    listLoaded: (result: TList) => void;
    listFailed: (error: unknown) => void;
    statisticsLoaded: (result: TStatistics) => void;
    statisticsFailed: (error: unknown) => void;
  },
): Promise<void> {
  void statisticsRequest.then(handlers.statisticsLoaded, handlers.statisticsFailed);
  return listRequest.then(handlers.listLoaded, handlers.listFailed);
}

const initialDates = (): [string, string] => [dayjs().subtract(30, "day").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];

function dateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const date = dayjs(value as string | number);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : "--";
}

function display(value: unknown): string {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function period(dates: readonly string[]): string {
  return `${dates[0]} 00:00:00,${dates[1]} 23:59:59`;
}

function initialCard(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
}

const amountColumns: PcTableColumn[] = [
  { title: "交易时间", dataIndex: "transactionTime", width: 170, align: "center", customRender: ({ text }) => dateTime(text) },
  { title: "卡号", dataIndex: "userCard", align: "center", customRender: ({ text }) => display(text) },
  { title: "交易金额（元）", dataIndex: "transactionMoney", align: "center", customRender: ({ text }) => display(text) },
  { title: "交易类型", dataIndex: "transactionType", align: "center", customRender: ({ text }) => display(text) },
  { title: "账户余额（元）", dataIndex: "balance", align: "center", customRender: ({ text }) => display(text) },
  { title: "交易场所", dataIndex: "depName", align: "center", customRender: ({ text }) => display(text) },
  { title: "交易渠道", dataIndex: "transactionChannel", align: "center", customRender: ({ text }) => display(text) },
  { title: "订单号", dataIndex: "orderId", align: "center", customRender: ({ text }) => display(text) },
  { title: "人员序号", dataIndex: "userSerial", align: "center", customRender: ({ text }) => display(text) },
  { title: "工号", dataIndex: "userNo", align: "center", customRender: ({ text }) => display(text) },
  { title: "姓名", dataIndex: "userName", align: "center", customRender: ({ text }) => display(text) },
];

const copiesColumns: PcTableColumn[] = [
  { title: "交易时间", dataIndex: "transactionTime", width: 170, align: "center", customRender: ({ text }) => dateTime(text) },
  { title: "卡号", dataIndex: "userCard", align: "center", customRender: ({ text }) => display(text) },
  { title: "交易份数（数量）", dataIndex: "transactionCount", width: 150, align: "center", customRender: ({ text }) => display(text) },
  { title: "交易类型", dataIndex: "transactionType", align: "center", customRender: ({ text }) => display(text) },
  { title: "补贴有效日期", dataIndex: "subsidyBeginDate", width: 170, align: "center", customRender: ({ text }) => dateTime(text) },
  { title: "补贴有效截止日期", dataIndex: "subsidyEndDate", width: 170, align: "center", customRender: ({ text }) => dateTime(text) },
  { title: "交易场所", dataIndex: "depName", align: "center", customRender: ({ text }) => display(text) },
  {
    title: "交易状态",
    dataIndex: "transactionStatus",
    align: "center",
    customRender: ({ text }) => (text === undefined || text === null || text === "" ? "--" : String(text) === "0" ? "失败" : "成功"),
  },
  { title: "人员序号", dataIndex: "userSerial", align: "center", customRender: ({ text }) => display(text) },
  { title: "工号", dataIndex: "userNo", align: "center", customRender: ({ text }) => display(text) },
  { title: "姓名", dataIndex: "userName", align: "center", customRender: ({ text }) => display(text) },
];

const cards = {
  amount: [
    { label: "消费金额", key: "消费金额", tone: "blue" },
    { label: "消费退款金额", key: "退款金额", tone: "green" },
    { label: "充值金额", key: "充值金额", tone: "cyan" },
    { label: "补贴金额", key: "补贴金额", tone: "orange" },
  ],
  copies: [
    { label: "补贴份数", key: "份补贴", tone: "blue" },
    { label: "消费份数", key: "份消费", tone: "green" },
    { label: "清除份数", key: "份清零", tone: "cyan" },
  ],
} as const;

export function createChangePage(kind: ChangeKind) {
  const title = kind === "amount" ? "金额变更明细" : "份变更明细";
  return defineComponent({
    name: kind === "amount" ? "MoneyChangePage" : "PartChangePage",
    setup() {
      const route = useRoute();
      const query = reactive<{ enterParam: string; dates: string[]; transactionType?: number | string }>({
        enterParam: initialCard(route.query.userCard),
        dates: initialDates(),
        transactionType: undefined,
      });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const transactionOptions = ref<{ label: string; value: number | string }[]>([]);
      const statistics = ref<Record<string, number | string>>({});
      const exporting = ref(false);
      let requestVersion = 0;
      const downloadUrls: string[] = [];

      const [PcTable, tableApi] = usePcTable({
        columns: kind === "amount" ? amountColumns : copiesColumns,
        tableCode: kind === "amount" ? "CONSUMPTION_AMOUNT_CHANGE" : "CONSUMPTION_COPIES_CHANGE",
        rowKey: "__rowKey",
        autoFetch: false,
        pagination: false,
      });

      const load = async (): Promise<void> => {
        const version = ++requestVersion;
        tableApi.loading.value = true;
        const client = getConsumptionManagementClient();
        const pageQuery: ChangePageQuery = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          enterParam: query.enterParam.trim(),
          transactionType: query.transactionType,
          period: period(query.dates),
        };
        try {
          await settleChangeRequests(
            kind === "amount" ? client.pageAmountChanges(pageQuery) : client.pageCopiesChanges(pageQuery),
            kind === "amount"
              ? client.getAmountChangeClassification({ enterParam: pageQuery.enterParam, period: pageQuery.period })
              : client.getShareStatistics({ enterParam: pageQuery.enterParam, period: pageQuery.period }),
            {
              listLoaded(result) {
                if (version !== requestVersion) {
                  return;
                }
                tableApi.setDataSource(
                  result.records.map(
                    (record: ChangeRow, index: number): TableRow => ({
                      ...record,
                      __rowKey: String(record.id ?? `${page.pageNumber}-${index}`),
                    }),
                  ),
                );
                page.total = result.total;
              },
              listFailed(error) {
                if (version !== requestVersion) {
                  return;
                }
                tableApi.setDataSource([]);
                page.total = 0;
                message.error(errorText(error, `${title}列表加载失败`));
              },
              statisticsLoaded(summary) {
                if (version !== requestVersion) {
                  return;
                }
                statistics.value = summary.map ?? {};
              },
              statisticsFailed(error) {
                if (version !== requestVersion) {
                  return;
                }
                statistics.value = {};
                message.error(errorText(error, `${title}统计加载失败`));
              },
            },
          );
        } catch (error) {
          if (version !== requestVersion) {
            return;
          }
          tableApi.setDataSource([]);
          page.total = 0;
          statistics.value = {};
          message.error(errorText(error, `${title}加载失败`));
        } finally {
          if (version === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };

      const transactionField = () => ({
        component: "Select" as const,
        fieldName: "transactionType",
        label: "交易类型",
        componentProps: {
          allowClear: true,
          placeholder: "请选择交易类型",
          options: transactionOptions.value,
          onChange: () => undefined,
        },
      });
      const [PcForm, formApi] = usePcForm({
        layout: "horizontal",
        cache: false,
        showCollapseButton: false,
        syncStateRef: query,
        schema: [
          {
            component: "Input",
            fieldName: "enterParam",
            label: "",
            defaultValue: query.enterParam,
            componentProps: { allowClear: true, maxlength: 50, placeholder: "请输入人工序号、工号、卡号、姓名搜索" },
          },
          {
            component: "RangePicker",
            fieldName: "dates",
            label: "交易时间",
            defaultValue: initialDates(),
            componentProps: {
              valueFormat: "YYYY-MM-DD",
              allowClear: false,
              placeholder: ["开始时间", "结束时间"],
              disabledDate: (current: Dayjs) => current.isAfter(dayjs().endOf("day")) || current.isBefore(dayjs().subtract(1, "year")),
              onChange: () => undefined,
            },
          },
          transactionField(),
        ],
        handleSubmit(values) {
          query.enterParam = String(values.enterParam ?? "");
          query.transactionType =
            typeof values.transactionType === "string" || typeof values.transactionType === "number" ? values.transactionType : undefined;
          if (
            Array.isArray(values.dates) &&
            values.dates.length === 2 &&
            values.dates.every((date) => typeof date === "string" && dayjs(date).isValid())
          ) {
            query.dates = values.dates.map(String);
          }
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.enterParam = "";
          query.transactionType = undefined;
          query.dates = initialDates();
          formApi.setFormValues({ enterParam: "", transactionType: undefined, dates: query.dates });
          page.pageNumber = 1;
          void load();
        },
      });

      const loadOptions = async (): Promise<void> => {
        try {
          const options: TransactionOption[] = await getConsumptionManagementClient().listTransactionTypes();
          transactionOptions.value = options
            .filter((option) => Number(option.value) % 2 === (kind === "amount" ? 1 : 0))
            .map((option) => ({ value: option.value, label: option.name }));
          formApi.updateFieldSchema(transactionField());
        } catch (error) {
          message.error(errorText(error, "交易类型加载失败"));
        }
      };

      const exportData = async (): Promise<void> => {
        if (exporting.value) {
          return;
        }
        exporting.value = true;
        try {
          const values = formApi.formValues;
          const selectedDates =
            Array.isArray(values.dates) &&
            values.dates.length === 2 &&
            values.dates.every((date) => typeof date === "string" && dayjs(date).isValid())
              ? values.dates.map(String)
              : query.dates;
          const exportQuery = {
            enterParam: String(values.enterParam ?? "").trim(),
            transactionType:
              typeof values.transactionType === "string" || typeof values.transactionType === "number" ? values.transactionType : undefined,
            period: period(selectedDates),
          };
          const client = getConsumptionManagementClient();
          const blob = kind === "amount" ? await client.exportAmountChanges(exportQuery) : await client.exportCopiesChanges(exportQuery);
          const url = URL.createObjectURL(blob);
          downloadUrls.push(url);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${title}.xlsx`;
          document.body.append(link);
          link.click();
          link.remove();
        } catch (error) {
          message.error(errorText(error, "导出失败"));
        } finally {
          exporting.value = false;
        }
      };

      watch(
        () => route.query.userCard,
        (value) => {
          query.enterParam = initialCard(value);
          formApi.setFieldValue("enterParam", query.enterParam);
          page.pageNumber = 1;
          void load();
        },
      );
      onMounted(() => {
        void loadOptions();
        void load();
      });
      onUnmounted(() => downloadUrls.forEach((url) => URL.revokeObjectURL(url)));

      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" loading={exporting.value} onClick={() => void exportData()}>
                导出
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.pageContent}>
                <PcForm />
                <div class={[styles.statistics, kind === "copies" ? styles.threeColumns : ""]}>
                  {cards[kind].map((card) => (
                    <div key={card.key} class={[styles.statCard, styles[card.tone]]}>
                      <div class={styles.statLabel}>{card.label}</div>
                      <div class={styles.statValue}>{statistics.value[card.key] ?? 0}</div>
                    </div>
                  ))}
                </div>
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
}
