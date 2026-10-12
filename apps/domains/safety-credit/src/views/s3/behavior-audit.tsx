import type {
  BehaviorAuditStatus,
  BehaviorType,
  SafetyCreditBehaviorAuditPageQuery,
  SafetyCreditBehaviorVO,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import { Button, Form, FormItem, Modal, Page, PageLayout, PopOver, Space, Tag, Textarea, message, usePcForm } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import {
  auditStatusColor,
  auditStatusLabel,
  behaviorTypeLabel,
  behaviorTypeOptions,
  cleanText,
  displayText,
  formatDateTime,
  inputTypeLabel,
  toQueryPeriod,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";

type AuditFilterStatus = "PENDING" | "APPROVED" | "REJECTED";

interface AuditQueryForm {
  pageNumber: number;
  pageSize: number;
  merchantName: string;
  eventName: string;
  behaviorType: BehaviorType | "";
  auditStatus: AuditFilterStatus;
  period: [string, string];
}

const auditFilterOptions: { label: string; value: AuditFilterStatus }[] = [
  { label: "待审核", value: "PENDING" },
  { label: "已通过", value: "APPROVED" },
  { label: "已驳回", value: "REJECTED" },
];

function scoreChangeClass(value?: number): string {
  if ((value ?? 0) > 0) {
    return "s2-score-positive";
  }
  if ((value ?? 0) < 0) {
    return "s2-score-negative";
  }
  return "";
}

export const BehaviorAudit = defineComponent({
  name: "BehaviorAudit",
  setup: () => {
    const loading = ref(false);
    const operating = ref(false);
    const rows = ref<SafetyCreditBehaviorVO[]>([]);
    const total = ref(0);
    const rejectVisible = ref(false);
    const rejectReason = ref("");
    const rejectTarget = ref<SafetyCreditBehaviorVO | null>(null);
    const detailVisible = ref(false);
    const selectedBehavior = ref<SafetyCreditBehaviorVO | null>(null);

    const query = reactive<AuditQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      merchantName: "",
      eventName: "",
      behaviorType: "",
      auditStatus: "PENDING",
      period: ["", ""],
    });

    function buildQuery(): SafetyCreditBehaviorAuditPageQuery {
      const payload: SafetyCreditBehaviorAuditPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        auditStatus: query.auditStatus,
      };
      const merchantName = cleanText(query.merchantName);
      const eventName = cleanText(query.eventName);
      const period = toQueryPeriod(query.period);
      if (merchantName !== undefined) {
        payload.merchantName = merchantName;
      }
      if (eventName !== undefined) {
        payload.eventName = eventName;
      }
      if (query.behaviorType !== "") {
        payload.behaviorType = query.behaviorType;
      }
      if (period !== undefined) {
        payload.period = period;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageBehaviorAudits(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.merchantName = "";
      query.eventName = "";
      query.behaviorType = "";
      query.auditStatus = "PENDING";
      query.period = ["", ""];
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    async function approve(record: SafetyCreditBehaviorVO): Promise<void> {
      operating.value = true;
      try {
        await getSafetyCreditClient().approveBehavior(record.id);
        message.success("行为已通过");
        await load();
      } finally {
        operating.value = false;
      }
    }

    function openReject(record: SafetyCreditBehaviorVO): void {
      rejectTarget.value = record;
      rejectReason.value = "";
      rejectVisible.value = true;
    }

    async function reject(): Promise<void> {
      const reason = cleanText(rejectReason.value);
      if (reason === undefined) {
        message.warning("请输入驳回原因");
        return;
      }
      if (rejectTarget.value === null) {
        return;
      }
      operating.value = true;
      try {
        await getSafetyCreditClient().rejectBehavior(rejectTarget.value.id, { rejectReason: reason });
        message.success("行为已驳回");
        rejectVisible.value = false;
        await load();
      } finally {
        operating.value = false;
      }
    }

    async function openDetail(record: SafetyCreditBehaviorVO): Promise<void> {
      selectedBehavior.value = record;
      detailVisible.value = true;
      selectedBehavior.value = await getSafetyCreditClient().getBehavior(record.id);
    }

    const columns: PcTableColumn[] = [
      {
        title: "商户",
        dataIndex: "merchantName",
        align: "center" as const,
        width: 170,
        customRender: ({ record }: { record: SafetyCreditBehaviorVO }): JSX.Element => (
          <PopOver content={`${displayText(record.merchantName)} / ${displayText(record.merchantCode)}`}>
            {displayText(record.merchantName)}
          </PopOver>
        ),
      },
      {
        title: "事件",
        dataIndex: "eventName",
        align: "center" as const,
        width: 150,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "应用",
        dataIndex: "applicationName",
        align: "center" as const,
        width: 150,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "行为类型",
        dataIndex: "behaviorType",
        align: "center" as const,
        width: 130,
        customRender: ({ text }: { text?: BehaviorType }): JSX.Element => <Tag color="blue">{behaviorTypeLabel(text)}</Tag>,
      },
      {
        title: "审核状态",
        dataIndex: "auditStatus",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: BehaviorAuditStatus }): JSX.Element => (
          <Tag color={auditStatusColor(text)}>{auditStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "分值变化",
        dataIndex: "scoreChange",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: number }): JSX.Element => <span class={scoreChangeClass(text)}>{displayText(text)}</span>,
      },
      {
        title: "发生时间",
        dataIndex: "occurredTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): string => formatDateTime(text),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 180,
        fixed: "right" as const,
        customRender: ({ record }: { record: SafetyCreditBehaviorVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => void openDetail(record)}>
              详情
            </Button>
            {record.auditStatus === "PENDING" ? (
              <>
                <Button type="link" size="small" loading={operating.value} onClick={() => void approve(record)}>
                  通过
                </Button>
                <Button type="link" size="small" danger onClick={() => openReject(record)}>
                  驳回
                </Button>
              </>
            ) : null}
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_behavior-audit", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "商户名称",
        fieldName: "merchantName",
        componentProps: {
          placeholder: "请输入商户名称",
        },
      },
      {
        component: "Input",
        label: "事件名称",
        fieldName: "eventName",
        componentProps: {
          placeholder: "请输入事件名称",
        },
      },
      {
        component: "Select",
        label: "行为类型",
        fieldName: "behaviorType",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...behaviorTypeOptions],
        },
      },
      {
        component: "Select",
        label: "审核状态",
        fieldName: "auditStatus",
        defaultValue: "PENDING",
        componentProps: {
          options: auditFilterOptions,
        },
      },
      {
        component: "RangePicker",
        label: "发生时间",
        fieldName: "period",
        componentProps: {
          showTime: true,
          valueFormat: "YYYY-MM-DD HH:mm:ss",
          format: "YYYY-MM-DD HH:mm:ss",
          placeholder: ["开始时间", "结束时间"],
        },
      },
    ];

    const [CubeForm] = usePcForm({
      syncStateRef: query,
      layout: "horizontal",
      schema: searchFormSchema,
      showCollapseButton: true,
      handleSubmit: (data) => {
        query.pageNumber = 1;
        query.auditStatus = (data.auditStatus ?? "PENDING") as AuditFilterStatus;
        query.merchantName = String(data.merchantName ?? "").trim();
        query.eventName = String(data.eventName ?? "").trim();
        query.behaviorType = (data.behaviorType ?? "") as BehaviorType | "";
        query.period = (data.period ?? ["", ""]) as [string, string];
        void load();
      },
      handleReset: resetQuery,
    });

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <CubeForm />

          <section class="table-wrap">
            <DataTable />
          </section>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
      ),
      default: (): JSX.Element => (
        <>
          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={rejectVisible.value}
            title="驳回行为"
            width={560}
            confirmLoading={operating.value}
            onOk={() => void reject()}
            onCancel={() => {
              rejectVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" layout="vertical">
              <FormItem class="form-item wide" label="驳回原因" required>
                <Textarea
                  value={rejectReason.value}
                  placeholder="请输入驳回原因"
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (rejectReason.value = value);
                  }}
                />
              </FormItem>
            </Form>
          </Modal>

          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={detailVisible.value}
            title="行为详情"
            width={820}
            footer={null}
            onCancel={() => {
              detailVisible.value = false;
            }}
          >
            {selectedBehavior.value !== null ? (
              <div class="s2-detail-grid">
                <div class="detail-item">
                  <span>商户</span>
                  <strong>{displayText(selectedBehavior.value.merchantName)}</strong>
                </div>
                <div class="detail-item">
                  <span>应用</span>
                  <strong>{displayText(selectedBehavior.value.applicationName)}</strong>
                </div>
                <div class="detail-item">
                  <span>事件</span>
                  <strong>{displayText(selectedBehavior.value.eventName)}</strong>
                </div>
                <div class="detail-item">
                  <span>行为类型</span>
                  <strong>{behaviorTypeLabel(selectedBehavior.value.behaviorType)}</strong>
                </div>
                <div class="detail-item">
                  <span>来源</span>
                  <strong>{inputTypeLabel(selectedBehavior.value.inputType)}</strong>
                </div>
                <div class="detail-item">
                  <span>分值变化</span>
                  <strong class={scoreChangeClass(selectedBehavior.value.scoreChange)}>
                    {displayText(selectedBehavior.value.scoreChange)}
                  </strong>
                </div>
                <div class="detail-item">
                  <span>发生时间</span>
                  <strong>{formatDateTime(selectedBehavior.value.occurredTime)}</strong>
                </div>
                <div class="detail-item">
                  <span>审核状态</span>
                  <strong>{auditStatusLabel(selectedBehavior.value.auditStatus)}</strong>
                </div>
                <div class="detail-item wide">
                  <span>描述</span>
                  <strong>{displayText(selectedBehavior.value.description)}</strong>
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="行为审核" v-slots={layoutSlots} />;
  },
});
