import type {
  CreditGrade,
  CreditStatus,
  SafetyCreditArchivePageQuery,
  SafetyCreditArchiveSummaryVO,
  SafetyCreditArchiveVO,
  SafetyCreditIndustryType,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import { Button, Form, FormItem, Modal, Page, PageLayout, PopOver, Space, Tag, Textarea, message, usePcForm } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";

import {
  cleanText,
  creditGradeColor,
  creditGradeLabel,
  creditStatusColor,
  creditStatusLabel,
  creditStatusOptions,
  displayText,
  formatDateTime,
  gradeOptions,
  industryTypeLabel,
  industryTypeOptions,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s4.less";

type OptionalGrade = CreditGrade | "";
type OptionalStatus = CreditStatus | "";
type OptionalIndustryType = SafetyCreditIndustryType | "";
type ArchiveOperationType = "suspend" | "recover";

interface ArchiveQueryForm {
  pageNumber: number;
  pageSize: number;
  merchantCode: string;
  merchantName: string;
  parkName: string;
  industryType: OptionalIndustryType;
  creditGrade: OptionalGrade;
  creditStatus: OptionalStatus;
}

function formatPercent(value?: number): string {
  if (value === undefined || value === null) {
    return "--";
  }
  return `${value}%`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export const ArchiveList = defineComponent({
  name: "ArchiveList",
  setup: () => {
    const router = useRouter();
    const loading = ref(false);
    const operating = ref(false);
    const exporting = ref(false);
    const rows = ref<SafetyCreditArchiveVO[]>([]);
    const total = ref(0);
    const summary = ref<SafetyCreditArchiveSummaryVO>({});
    const operationVisible = ref(false);
    const operationType = ref<ArchiveOperationType>("suspend");
    const operationReason = ref("");
    const operationTarget = ref<SafetyCreditArchiveVO | null>(null);

    const query = reactive<ArchiveQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      merchantCode: "",
      merchantName: "",
      parkName: "",
      industryType: "",
      creditGrade: "",
      creditStatus: "",
    });

    function buildQuery(): SafetyCreditArchivePageQuery {
      const payload: SafetyCreditArchivePageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const merchantCode = cleanText(query.merchantCode);
      const merchantName = cleanText(query.merchantName);
      const parkName = cleanText(query.parkName);
      if (merchantCode !== undefined) {
        payload.merchantCode = merchantCode;
      }
      if (merchantName !== undefined) {
        payload.merchantName = merchantName;
      }
      if (parkName !== undefined) {
        payload.parkName = parkName;
      }
      if (query.industryType !== "") {
        payload.industryType = query.industryType;
      }
      if (query.creditGrade !== "") {
        payload.creditGrade = query.creditGrade;
      }
      if (query.creditStatus !== "") {
        payload.creditStatus = query.creditStatus;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageArchives(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    async function loadSummary(): Promise<void> {
      summary.value = await getSafetyCreditClient().getArchiveSummary();
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.merchantCode = "";
      query.merchantName = "";
      query.parkName = "";
      query.industryType = "";
      query.creditGrade = "";
      query.creditStatus = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    function openDetail(record: SafetyCreditArchiveVO): void {
      void router.push(`/d/safety-credit/archives/${record.merchantId}`);
    }

    function openOperation(record: SafetyCreditArchiveVO, type: ArchiveOperationType): void {
      operationTarget.value = record;
      operationType.value = type;
      operationReason.value = "";
      operationVisible.value = true;
    }

    async function submitOperation(): Promise<void> {
      const reason = cleanText(operationReason.value);
      if (reason === undefined) {
        message.warning(operationType.value === "suspend" ? "请输入停用原因" : "请输入恢复原因");
        return;
      }
      if (operationTarget.value === null) {
        return;
      }
      operating.value = true;
      try {
        if (operationType.value === "suspend") {
          await getSafetyCreditClient().suspendArchive(operationTarget.value.merchantId, { reason });
          message.success("商户信用已停用");
        } else {
          await getSafetyCreditClient().recoverArchive(operationTarget.value.merchantId, { reason });
          message.success("商户信用已恢复");
        }
        operationVisible.value = false;
        await loadSummary();
        await load();
      } finally {
        operating.value = false;
      }
    }

    async function exportArchives(): Promise<void> {
      exporting.value = true;
      try {
        const blob = await getSafetyCreditClient().downloadArchives(buildQuery());
        downloadBlob(blob, "安全信用档案.xlsx");
      } finally {
        exporting.value = false;
      }
    }

    const columns: PcTableColumn[] = [
      {
        title: "商户编码",
        dataIndex: "merchantCode",
        align: "center" as const,
        width: 140,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "商户名称",
        dataIndex: "merchantName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "园区",
        dataIndex: "parkName",
        align: "center" as const,
        width: 140,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "行业",
        dataIndex: "industryType",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => industryTypeLabel(text),
      },
      {
        title: "区域",
        dataIndex: "areaName",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "铺位",
        dataIndex: "stallNo",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "负责人",
        dataIndex: "principalName",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "信用分",
        dataIndex: "currentScore",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
      {
        title: "等级",
        dataIndex: "creditGrade",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: CreditGrade }): JSX.Element => <Tag color={creditGradeColor(text)}>{creditGradeLabel(text)}</Tag>,
      },
      {
        title: "状态",
        dataIndex: "creditStatus",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: CreditStatus }): JSX.Element => (
          <Tag color={creditStatusColor(text)}>{creditStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "近期待整改",
        dataIndex: "recentViolationCount",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
      {
        title: "自查完成率",
        dataIndex: "checkCompletionRate",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: number }): string => formatPercent(text),
      },
      {
        title: "入档时间",
        dataIndex: "joinTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: unknown }): string => formatDateTime(text),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 160,
        fixed: "right" as const,
        customRender: ({ record }: { record: SafetyCreditArchiveVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => void openDetail(record)}>
              详情
            </Button>
            {record.creditStatus === "SUSPENDED" ? (
              <Button type="link" size="small" onClick={() => openOperation(record, "recover")}>
                恢复
              </Button>
            ) : (
              <Button type="link" size="small" danger onClick={() => openOperation(record, "suspend")}>
                停用
              </Button>
            )}
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({
      rowKey: "merchantId",
      tableCode: "SAFETY_CREDIT_archive-list",
      columns,
      dataSource: [],
    });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
      void loadSummary();
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "商户编码",
        fieldName: "merchantCode",
        componentProps: {
          placeholder: "请输入商户编码",
        },
      },
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
        label: "园区",
        fieldName: "parkName",
        componentProps: {
          placeholder: "请输入园区",
        },
      },
      {
        component: "Select",
        label: "行业",
        fieldName: "industryType",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...industryTypeOptions],
        },
      },
      {
        component: "Select",
        label: "信用等级",
        fieldName: "creditGrade",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...gradeOptions],
        },
      },
      {
        component: "Select",
        label: "信用状态",
        fieldName: "creditStatus",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...creditStatusOptions],
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
        query.merchantCode = String(data.merchantCode ?? "").trim();
        query.merchantName = String(data.merchantName ?? "").trim();
        query.parkName = String(data.parkName ?? "").trim();
        query.industryType = (data.industryType ?? "") as OptionalIndustryType;
        query.creditGrade = (data.creditGrade ?? "") as OptionalGrade;
        query.creditStatus = (data.creditStatus ?? "") as OptionalStatus;
        void load();
      },
      handleReset: resetQuery,
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button loading={exporting.value} onClick={() => void exportArchives()}>
          导出
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <section class="s4-archive-summary">
            <div class="s4-archive-summary-card normal">
              <div>
                <span>正常经营</span>
                <strong>{summary.value.normalCount ?? 0}</strong>
              </div>
              <span class="archive-summary-icon normal" />
            </div>
            <div class="s4-archive-summary-card suspended">
              <div>
                <span>信用停用</span>
                <strong>{summary.value.suspendedCount ?? 0}</strong>
              </div>
              <span class="archive-summary-icon suspended" />
            </div>
            <div class="s4-archive-summary-card warning">
              <div>
                <span>本月违规最多</span>
                <strong>{displayText(summary.value.monthViolationTopMerchantName)}</strong>
                <em>{summary.value.monthViolationTopCount ?? 0}次</em>
              </div>
              <span class="archive-summary-icon warning" />
            </div>
          </section>

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
            v-model:open={operationVisible.value}
            title={operationType.value === "suspend" ? "停用信用" : "恢复信用"}
            width={560}
            confirmLoading={operating.value}
            onOk={() => void submitOperation()}
            onCancel={() => {
              operationVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" layout="vertical">
              <div class="form-item wide">
                <span>商户</span>
                <strong>
                  {operationTarget.value === null
                    ? "--"
                    : `${displayText(operationTarget.value.merchantName)} / ${displayText(operationTarget.value.merchantCode)}`}
                </strong>
              </div>
              <FormItem class="form-item wide" label={operationType.value === "suspend" ? "停用原因" : "恢复原因"} required>
                <Textarea
                  value={operationReason.value}
                  placeholder={operationType.value === "suspend" ? "请输入停用原因" : "请输入恢复原因"}
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (operationReason.value = value);
                  }}
                />
              </FormItem>
            </Form>
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="信用档案" v-slots={layoutSlots} />;
  },
});
