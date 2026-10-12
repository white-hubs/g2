import type {
  BenefitRecordStatus,
  CreditGrade,
  SafetyCreditBenefitRecordCreateCommand,
  SafetyCreditBenefitRecordOperateCommand,
  SafetyCreditBenefitRecordPageQuery,
  SafetyCreditBenefitRecordVO,
  SafetyCreditBenefitRuleVO,
  SafetyCreditBenefitType,
  SafetyCreditId,
  SafetyCreditMerchantVO,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout,
  PopOver,
  Select,
  Space,
  Tag,
  Textarea,
  message,
  usePcForm,
} from "@g2-platform/pc-ui";
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";

import {
  benefitRecordStatusColor,
  benefitRecordStatusLabel,
  benefitRecordStatusOptions,
  benefitTypeLabel,
  cleanText,
  creditGradeColor,
  creditGradeLabel,
  displayText,
  formatDateTime,
  gradeOptions,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s6.less";

type OptionalGrade = CreditGrade | "";
type OptionalBenefitStatus = BenefitRecordStatus | "";
type BenefitOperation = "confirm" | "cancel";

interface BenefitRecordQueryForm {
  pageNumber: number;
  pageSize: number;
  merchantId: string;
  merchantName: string;
  creditGrade: OptionalGrade;
  status: OptionalBenefitStatus;
}

interface BenefitRecordCreateForm {
  merchantId: string;
  ruleId: string;
  effectiveTime: string;
  operateRemark: string;
}

function createRecordForm(): BenefitRecordCreateForm {
  return {
    merchantId: "",
    ruleId: "",
    effectiveTime: "",
    operateRemark: "",
  };
}

export const BenefitRecordList = defineComponent({
  name: "BenefitRecordList",
  setup: () => {
    const loading = ref(false);
    const operating = ref(false);
    const rows = ref<SafetyCreditBenefitRecordVO[]>([]);
    const total = ref(0);
    const operationVisible = ref(false);
    const operationType = ref<BenefitOperation>("confirm");
    const operationTarget = ref<SafetyCreditBenefitRecordVO | null>(null);
    const operateRemark = ref("");
    const createVisible = ref(false);
    const creating = ref(false);
    const merchantLoading = ref(false);
    const merchantOptions = ref<SafetyCreditMerchantVO[]>([]);
    const merchantSearchText = ref("");
    const ruleLoading = ref(false);
    const ruleOptions = ref<SafetyCreditBenefitRuleVO[]>([]);
    const ruleSearchText = ref("");

    const query = reactive<BenefitRecordQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      merchantId: "",
      merchantName: "",
      creditGrade: "",
      status: "",
    });
    const createForm = reactive<BenefitRecordCreateForm>(createRecordForm());
    let merchantSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let merchantSearchSeq = 0;
    let ruleSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let ruleSearchSeq = 0;

    function buildQuery(): SafetyCreditBenefitRecordPageQuery {
      const payload: SafetyCreditBenefitRecordPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const merchantId = cleanText(query.merchantId);
      const merchantName = cleanText(query.merchantName);
      if (merchantId !== undefined) {
        payload.merchantId = merchantId;
      }
      if (merchantName !== undefined) {
        payload.merchantName = merchantName;
      }
      if (query.creditGrade !== "") {
        payload.creditGrade = query.creditGrade;
      }
      if (query.status !== "") {
        payload.status = query.status;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageBenefitRecords(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.merchantId = "";
      query.merchantName = "";
      query.creditGrade = "";
      query.status = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    function resetCreateForm(): void {
      Object.assign(createForm, createRecordForm());
      merchantSearchText.value = "";
      ruleSearchText.value = "";
    }

    function merchantOptionLabel(item: SafetyCreditMerchantVO): string {
      return `${displayText(item.merchantName)} / ${displayText(item.merchantCode)}`;
    }

    function ruleOptionLabel(item: SafetyCreditBenefitRuleVO): string {
      return `${displayText(item.ruleName)} / ${creditGradeLabel(item.creditGrade)} / ${benefitTypeLabel(item.benefitType)}`;
    }

    async function loadMerchants(keyword = merchantSearchText.value): Promise<void> {
      const searchSeq = ++merchantSearchSeq;
      merchantLoading.value = true;
      try {
        const searchKeyword = cleanText(keyword);
        const result = await getSafetyCreditClient().pageMerchants({
          pageNumber: 1,
          pageSize: 50,
          ...(searchKeyword === undefined ? {} : { keyword: searchKeyword }),
        });
        if (searchSeq !== merchantSearchSeq) {
          return;
        }
        merchantOptions.value = result.records ?? [];
      } finally {
        if (searchSeq === merchantSearchSeq) {
          merchantLoading.value = false;
        }
      }
    }

    async function loadRules(keyword = ruleSearchText.value): Promise<void> {
      const searchSeq = ++ruleSearchSeq;
      ruleLoading.value = true;
      try {
        const searchKeyword = cleanText(keyword);
        const result = await getSafetyCreditClient().pageBenefitRules({
          pageNumber: 1,
          pageSize: 50,
          enabled: true,
          ...(searchKeyword === undefined ? {} : { ruleName: searchKeyword }),
        });
        if (searchSeq !== ruleSearchSeq) {
          return;
        }
        ruleOptions.value = result.records ?? [];
      } finally {
        if (searchSeq === ruleSearchSeq) {
          ruleLoading.value = false;
        }
      }
    }

    function searchMerchants(keyword: string): void {
      merchantSearchText.value = keyword;
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
      merchantSearchTimer = setTimeout(() => {
        void loadMerchants(keyword);
      }, 250);
    }

    function searchRules(keyword: string): void {
      ruleSearchText.value = keyword;
      if (ruleSearchTimer !== undefined) {
        clearTimeout(ruleSearchTimer);
      }
      ruleSearchTimer = setTimeout(() => {
        void loadRules(keyword);
      }, 250);
    }

    function selectMerchant(value?: SafetyCreditId): void {
      createForm.merchantId = value === undefined ? "" : String(value);
      merchantSearchText.value = "";
    }

    function selectRule(value?: SafetyCreditId): void {
      createForm.ruleId = value === undefined ? "" : String(value);
      ruleSearchText.value = "";
    }

    function openCreate(): void {
      resetCreateForm();
      createVisible.value = true;
      void loadMerchants("");
      void loadRules("");
    }

    function buildCreatePayload(): SafetyCreditBenefitRecordCreateCommand | undefined {
      const merchantId = cleanText(createForm.merchantId);
      if (merchantId === undefined) {
        message.warning("请选择商户");
        return undefined;
      }
      const ruleId = cleanText(createForm.ruleId);
      if (ruleId === undefined) {
        message.warning("请选择权益规则");
        return undefined;
      }
      const payload: SafetyCreditBenefitRecordCreateCommand = {
        merchantId,
        ruleId,
      };
      const effectiveTime = cleanText(createForm.effectiveTime);
      if (effectiveTime !== undefined) {
        payload.effectiveTime = effectiveTime;
      }
      const remark = cleanText(createForm.operateRemark);
      if (remark !== undefined) {
        payload.operateRemark = remark;
      }
      return payload;
    }

    async function submitCreate(): Promise<void> {
      const payload = buildCreatePayload();
      if (payload === undefined || creating.value) {
        return;
      }
      creating.value = true;
      try {
        await getSafetyCreditClient().createBenefitRecord(payload);
        message.success("权益生效记录已新增");
        createVisible.value = false;
        query.pageNumber = 1;
        await load();
      } finally {
        creating.value = false;
      }
    }

    function openOperation(record: SafetyCreditBenefitRecordVO, type: BenefitOperation): void {
      operationTarget.value = record;
      operationType.value = type;
      operateRemark.value = "";
      operationVisible.value = true;
    }

    async function submitOperation(): Promise<void> {
      if (operationTarget.value === null) {
        return;
      }
      const payload: SafetyCreditBenefitRecordOperateCommand = {};
      const remark = cleanText(operateRemark.value);
      if (remark !== undefined) {
        payload.operateRemark = remark;
      }
      operating.value = true;
      try {
        if (operationType.value === "confirm") {
          await getSafetyCreditClient().confirmBenefitRecord(operationTarget.value.id, payload);
          message.success("权益已确认生效");
        } else {
          await getSafetyCreditClient().cancelBenefitRecord(operationTarget.value.id, payload);
          message.success("权益已取消");
        }
        operationVisible.value = false;
        await load();
      } finally {
        operating.value = false;
      }
    }

    const columns: PcTableColumn[] = [
      {
        title: "商户ID",
        dataIndex: "merchantId",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string | number }): string => displayText(text),
      },
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
        title: "等级",
        dataIndex: "creditGrade",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: CreditGrade }): JSX.Element => <Tag color={creditGradeColor(text)}>{creditGradeLabel(text)}</Tag>,
      },
      {
        title: "规则名称",
        dataIndex: "ruleName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "权益类型",
        dataIndex: "benefitType",
        align: "center" as const,
        width: 130,
        customRender: ({ text }: { text?: SafetyCreditBenefitType }): string => benefitTypeLabel(text),
      },
      {
        title: "权益内容",
        dataIndex: "benefitContent",
        align: "center" as const,
        width: 240,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "状态",
        dataIndex: "status",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: BenefitRecordStatus }): JSX.Element => (
          <Tag color={benefitRecordStatusColor(text)}>{benefitRecordStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "操作时间",
        dataIndex: "operateTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: unknown }): string => formatDateTime(text),
      },
      {
        title: "备注",
        dataIndex: "operateRemark",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "操作",
        align: "center" as const,
        fixed: "right" as const,
        width: 160,
        customRender: ({ record }: { record: SafetyCreditBenefitRecordVO }): JSX.Element =>
          record.status === "WAIT_CONFIRM" ? (
            <Space>
              <Button type="link" size="small" onClick={() => openOperation(record, "confirm")}>
                生效
              </Button>
              <Button type="link" size="small" danger onClick={() => openOperation(record, "cancel")}>
                取消
              </Button>
            </Space>
          ) : (
            <span class="s6-muted">--</span>
          ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_benefit-record-list", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
    });

    onBeforeUnmount(() => {
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
      if (ruleSearchTimer !== undefined) {
        clearTimeout(ruleSearchTimer);
      }
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "商户ID",
        fieldName: "merchantId",
        componentProps: {
          placeholder: "请输入商户ID",
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
        component: "Select",
        label: "等级",
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
        label: "状态",
        fieldName: "status",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...benefitRecordStatusOptions],
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
        query.merchantId = String(data.merchantId ?? "").trim();
        query.merchantName = String(data.merchantName ?? "").trim();
        query.creditGrade = (data.creditGrade ?? "") as OptionalGrade;
        query.status = (data.status ?? "") as OptionalBenefitStatus;
        void load();
      },
      handleReset: resetQuery,
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openCreate}>
          新增
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <CubeForm />

          <section class="table-wrap">
            <DataTable />
          </section>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <>
          <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
        </>
      ),
      default: (): JSX.Element => (
        <>
          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={createVisible.value}
            title="新增权益生效记录"
            width={720}
            confirmLoading={creating.value}
            onOk={() => void submitCreate()}
            onCancel={() => {
              createVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" model={createForm} layout="vertical">
              <FormItem class="form-item" label="商户" required>
                <Select
                  allowClear
                  filterOption={false}
                  loading={merchantLoading.value}
                  optionFilterProp="label"
                  optionLabelProp="label"
                  placeholder="请输入或选择商户"
                  searchValue={merchantSearchText.value}
                  showSearch
                  class="source-application-select"
                  options={merchantOptions.value.map((item) => ({ label: merchantOptionLabel(item), value: String(item.id) }))}
                  value={createForm.merchantId || undefined}
                  onChange={(inputValue) => {
                    const value = inputValue as SafetyCreditId | undefined;
                    return selectMerchant(value);
                  }}
                  onSearch={searchMerchants}
                  onClear={() => {
                    selectMerchant(undefined);
                    void loadMerchants("");
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="权益规则" required>
                <Select
                  allowClear
                  filterOption={false}
                  loading={ruleLoading.value}
                  optionFilterProp="label"
                  optionLabelProp="label"
                  placeholder="请输入或选择权益规则"
                  searchValue={ruleSearchText.value}
                  showSearch
                  class="source-application-select"
                  options={ruleOptions.value.map((item) => ({ label: ruleOptionLabel(item), value: String(item.id) }))}
                  value={createForm.ruleId || undefined}
                  onChange={(inputValue) => {
                    const value = inputValue as SafetyCreditId | undefined;
                    return selectRule(value);
                  }}
                  onSearch={searchRules}
                  onClear={() => {
                    selectRule(undefined);
                    void loadRules("");
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="生效时间">
                <DatePicker
                  value={createForm.effectiveTime || undefined}
                  showTime={{ format: "YYYY-MM-DD HH:mm:ss" }}
                  valueFormat="YYYY-MM-DD HH:mm:ss"
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="不填则使用当前时间"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string | null | undefined;
                    return (createForm.effectiveTime = value ?? "");
                  }}
                />
              </FormItem>
              <FormItem class="form-item wide" label="备注">
                <Textarea
                  value={createForm.operateRemark}
                  placeholder="请输入备注"
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (createForm.operateRemark = value);
                  }}
                />
              </FormItem>
            </Form>
          </Modal>

          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={operationVisible.value}
            title={operationType.value === "confirm" ? "确认权益生效" : "取消权益"}
            width={560}
            confirmLoading={operating.value}
            onOk={() => void submitOperation()}
            onCancel={() => {
              operationVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" layout="vertical">
              <div class="form-item">
                <span>商户</span>
                <strong>{displayText(operationTarget.value?.merchantName)}</strong>
              </div>
              <div class="form-item">
                <span>权益</span>
                <strong>{displayText(operationTarget.value?.benefitContent)}</strong>
              </div>
              <FormItem class="form-item wide" label="操作备注">
                <Textarea
                  value={operateRemark.value}
                  placeholder="请输入操作备注"
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (operateRemark.value = value);
                  }}
                />
              </FormItem>
            </Form>
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="权益生效记录" v-slots={layoutSlots} />;
  },
});
