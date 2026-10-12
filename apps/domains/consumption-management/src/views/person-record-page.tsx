import type { ConsumeAccountInfo, ConsumeRecordRow } from "@g2-contract/consumption-management";
import { Page, PageLayout, type PcTableColumn, Popover, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import dayjs, { type Dayjs } from "dayjs";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getConsumptionManagementClient } from "../domain-context";

import styles from "./person-record-page.module.css";

type TableRow = ConsumeRecordRow & { __rowKey: string };

const initialDates = (): [string, string] => [dayjs().subtract(30, "day").format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")];

function userId(): string | undefined {
  try {
    const raw = sessionStorage.getItem("GH-UserInfo");
    if (!raw) {
      return undefined;
    }
    const user = JSON.parse(raw) as { id?: string | number; userId?: string | number };
    const id = user.id ?? user.userId;
    return id === undefined || id === null ? undefined : String(id);
  } catch {
    return undefined;
  }
}

function display(value: unknown): string {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function dateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const parsed = dayjs(value as string | number);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : "--";
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 保留旧页悬浮展示完整单元格内容的交互。 */
export function recordCell(value: unknown) {
  const content = display(value);
  return (
    <Popover content={content}>
      <span class={styles.cellText}>{content}</span>
    </Popover>
  );
}

/** 账户概况与列表各自请求，概况失败不影响列表翻页和重置。 */
export function refreshAccountAndRecords(loadAccount: () => Promise<void>, loadRecords: () => Promise<void>): void {
  void loadAccount();
  void loadRecords();
}

const columns: PcTableColumn[] = [
  {
    title: "交易时间",
    dataIndex: "tradeTime",
    align: "center",
    width: 180,
    ellipsis: true,
    customRender: ({ text }) => recordCell(dateTime(text)),
  },
  {
    title: "现金金额（元）",
    dataIndex: "tradeAmount",
    align: "center",
    width: 180,
    ellipsis: true,
    customRender: ({ text }) => recordCell(text),
  },
  {
    title: "补贴金额（元）",
    dataIndex: "subsidyAmount",
    align: "center",
    width: 180,
    ellipsis: true,
    customRender: ({ text }) => recordCell(text),
  },
  { title: "交易类型", dataIndex: "recordType", align: "center", width: 180, ellipsis: true, customRender: ({ text }) => recordCell(text) },
  { title: "账户类型", dataIndex: "type", align: "center", width: 180, ellipsis: true, customRender: ({ text }) => recordCell(text) },
  { title: "交易次数", dataIndex: "times", align: "center", width: 180, ellipsis: true, customRender: ({ text }) => recordCell(text) },
  { title: "交易设备", dataIndex: "device", align: "center", width: 180, ellipsis: true, customRender: ({ text }) => recordCell(text) },
  { title: "消费类型", dataIndex: "mode", align: "center", width: 180, ellipsis: true, customRender: ({ text }) => recordCell(text) },
];

export const PersonRecordPage = defineComponent({
  name: "PersonRecordPage",
  setup() {
    const currentUserId = userId();
    const query = reactive<{ dates: string[]; interfaceEnum?: number | string }>({ dates: initialDates(), interfaceEnum: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const info = ref<ConsumeAccountInfo>();
    const recordTypes = ref<{ label: string; value: number | string }[]>([]);
    let requestVersion = 0;
    let infoRequestVersion = 0;

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "CONSUMPTION_PERSON_RECORD",
      rowKey: "__rowKey",
      autoFetch: false,
      pagination: false,
    });

    const load = async (): Promise<void> => {
      if (!currentUserId) {
        tableApi.setDataSource([]);
        page.total = 0;
        message.warning("未获取到当前用户信息");
        return;
      }
      const version = ++requestVersion;
      tableApi.loading.value = true;
      try {
        const result = await getConsumptionManagementClient().pageConsumeRecords({
          accountId: currentUserId,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          interfaceEnum: query.interfaceEnum,
          period: `${query.dates[0]} 00:00:00,${query.dates[1]} 23:59:59`,
        });
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource(
          result.records.map((record, index): TableRow => ({ ...record, __rowKey: String(record.id ?? `${page.pageNumber}-${index}`) })),
        );
        page.total = result.total;
      } catch (error) {
        if (version !== requestVersion) {
          return;
        }
        tableApi.setDataSource([]);
        page.total = 0;
        message.error(errorText(error, "消费记录加载失败"));
      } finally {
        if (version === requestVersion) {
          tableApi.loading.value = false;
        }
      }
    };

    const typeField = () => ({
      component: "Select" as const,
      fieldName: "interfaceEnum",
      label: "交易类型",
      componentProps: { allowClear: true, placeholder: "请选择交易类型", options: recordTypes.value, onChange: () => undefined },
    });
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      cache: false,
      showCollapseButton: false,
      syncStateRef: query,
      schema: [
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
        typeField(),
      ],
      handleSubmit(values) {
        query.interfaceEnum =
          typeof values.interfaceEnum === "string" || typeof values.interfaceEnum === "number" ? values.interfaceEnum : undefined;
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
        query.interfaceEnum = undefined;
        query.dates = initialDates();
        formApi.setFormValues({ dates: query.dates, interfaceEnum: undefined });
        page.pageNumber = 1;
        refreshAccountAndRecords(loadDetails, load);
      },
    });

    const loadDetails = async (): Promise<void> => {
      if (!currentUserId) {
        return;
      }
      const version = ++infoRequestVersion;
      try {
        const result = await getConsumptionManagementClient().getConsumeAccountInfo(currentUserId);
        if (version === infoRequestVersion) {
          info.value = result;
        }
      } catch (error) {
        if (version === infoRequestVersion) {
          message.error(errorText(error, "账户信息加载失败"));
        }
      }
    };

    const loadTypes = async (): Promise<void> => {
      try {
        recordTypes.value = (await getConsumptionManagementClient().listConsumeRecordTypes()).map((item) => ({
          label: item.name,
          value: item.value,
        }));
        formApi.updateFieldSchema(typeField());
      } catch (error) {
        message.error(errorText(error, "交易类型加载失败"));
      }
    };

    onMounted(() => {
      void loadTypes();
      refreshAccountAndRecords(loadDetails, load);
    });

    const infoItems = [
      { label: "姓名", key: "userName" },
      { label: "消费卡号", key: "userCard" },
      { label: "现金余额(元)", key: "cashBalance" },
      { label: "补贴余额(元)", key: "subsidyBalance" },
      { label: "理发券余额(元)", key: "haircutCount" },
      { label: "洗衣次数", key: "laundryCount" },
    ] as const;

    return () => (
      <PageLayout
        title="我的消费记录"
        v-slots={{
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <div class={styles.accountInfo}>
                {infoItems.map((item) => (
                  <div key={item.key} class={styles.infoItem}>
                    <span class={styles.infoLabel}>{item.label}：</span>
                    <span class={styles.infoValue}>{display(info.value?.[item.key])}</span>
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
                refreshAccountAndRecords(loadDetails, load);
              }}
            />
          ),
        }}
      />
    );
  },
});
