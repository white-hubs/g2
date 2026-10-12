import type {
  CreditGrade,
  SafetyCreditBenefitRuleCommand,
  SafetyCreditBenefitRulePageQuery,
  SafetyCreditBenefitRuleVO,
  SafetyCreditBenefitType,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Select,
  Space,
  Tag,
  Textarea,
  message,
  usePcForm,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import {
  benefitTypeLabel,
  benefitTypeOptions,
  cleanText,
  creditGradeColor,
  creditGradeLabel,
  displayText,
  gradeOptions,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s6.less";

type OptionalGrade = CreditGrade | "";
type OptionalEnabled = boolean | "";
type OptionalBenefitType = SafetyCreditBenefitType | "";

interface BenefitRuleQueryForm {
  pageNumber: number;
  pageSize: number;
  ruleName: string;
  parkName: string;
  creditGrade: OptionalGrade;
  benefitType: OptionalBenefitType;
  enabled: OptionalEnabled;
}

interface BenefitRuleForm {
  id?: string | number;
  ruleName: string;
  parkName: string;
  creditGrade: CreditGrade;
  benefitType: OptionalBenefitType;
  benefitContent: string;
  effectiveCondition: string;
  enabled: boolean;
}

function createForm(): BenefitRuleForm {
  return {
    id: undefined,
    ruleName: "",
    parkName: "",
    creditGrade: "A",
    benefitType: "",
    benefitContent: "",
    effectiveCondition: "",
    enabled: true,
  };
}

export const BenefitRuleList = defineComponent({
  name: "BenefitRuleList",
  setup: () => {
    const loading = ref(false);
    const saving = ref(false);
    const rows = ref<SafetyCreditBenefitRuleVO[]>([]);
    const total = ref(0);
    const formVisible = ref(false);
    const form = reactive<BenefitRuleForm>(createForm());

    const query = reactive<BenefitRuleQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      ruleName: "",
      parkName: "",
      creditGrade: "",
      benefitType: "",
      enabled: "",
    });

    function buildQuery(): SafetyCreditBenefitRulePageQuery {
      const payload: SafetyCreditBenefitRulePageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const ruleName = cleanText(query.ruleName);
      const parkName = cleanText(query.parkName);
      if (ruleName !== undefined) {
        payload.ruleName = ruleName;
      }
      if (parkName !== undefined) {
        payload.parkName = parkName;
      }
      if (query.creditGrade !== "") {
        payload.creditGrade = query.creditGrade;
      }
      if (query.benefitType !== "") {
        payload.benefitType = query.benefitType;
      }
      if (query.enabled !== "") {
        payload.enabled = query.enabled;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageBenefitRules(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function readEnabled(value: unknown): OptionalEnabled {
      if (value === true || value === "true") {
        return true;
      }
      if (value === false || value === "false") {
        return false;
      }
      return "";
    }

    function resetQueryState(): void {
      query.pageNumber = 1;
      query.ruleName = "";
      query.parkName = "";
      query.creditGrade = "";
      query.benefitType = "";
      query.enabled = "";
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    function openCreate(): void {
      Object.assign(form, createForm());
      formVisible.value = true;
    }

    function openEdit(record: SafetyCreditBenefitRuleVO): void {
      Object.assign(form, {
        id: record.id,
        ruleName: record.ruleName,
        parkName: record.parkName ?? "",
        creditGrade: record.creditGrade,
        benefitType: record.benefitType ?? "",
        benefitContent: record.benefitContent,
        effectiveCondition: record.effectiveCondition ?? "",
        enabled: record.enabled ?? true,
      });
      formVisible.value = true;
    }

    function buildPayload(): SafetyCreditBenefitRuleCommand | undefined {
      const ruleName = cleanText(form.ruleName);
      const benefitContent = cleanText(form.benefitContent);
      if (ruleName === undefined) {
        message.warning("请输入规则名称");
        return undefined;
      }
      if (form.benefitType === "") {
        message.warning("请选择权益类型");
        return undefined;
      }
      if (benefitContent === undefined) {
        message.warning("请输入权益内容");
        return undefined;
      }
      const payload: SafetyCreditBenefitRuleCommand = {
        ruleName,
        creditGrade: form.creditGrade,
        benefitType: form.benefitType,
        benefitContent,
        enabled: form.enabled,
      };
      const parkName = cleanText(form.parkName);
      const effectiveCondition = cleanText(form.effectiveCondition);
      if (parkName !== undefined) {
        payload.parkName = parkName;
      }
      if (effectiveCondition !== undefined) {
        payload.effectiveCondition = effectiveCondition;
      }
      return payload;
    }

    async function save(): Promise<void> {
      const payload = buildPayload();
      if (payload === undefined) {
        return;
      }
      saving.value = true;
      try {
        if (form.id === undefined) {
          await getSafetyCreditClient().createBenefitRule(payload);
          message.success("规则已新增");
        } else {
          await getSafetyCreditClient().updateBenefitRule(form.id, payload);
          message.success("规则已保存");
        }
        formVisible.value = false;
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function toggleEnabled(record: SafetyCreditBenefitRuleVO): Promise<void> {
      saving.value = true;
      try {
        await getSafetyCreditClient().updateBenefitRuleEnabled(record.id, { enabled: !(record.enabled ?? false) });
        message.success(record.enabled ? "规则已停用" : "规则已启用");
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: SafetyCreditBenefitRuleVO): Promise<void> {
      saving.value = true;
      try {
        await getSafetyCreditClient().deleteBenefitRule(record.id);
        message.success("规则已删除");
        await load();
      } finally {
        saving.value = false;
      }
    }

    const columns: PcTableColumn[] = [
      {
        title: "规则名称",
        dataIndex: "ruleName",
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
        title: "适用等级",
        dataIndex: "creditGrade",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: CreditGrade }): JSX.Element => <Tag color={creditGradeColor(text)}>{creditGradeLabel(text)}</Tag>,
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
        title: "生效条件",
        dataIndex: "effectiveCondition",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "状态",
        dataIndex: "enabled",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: boolean }): JSX.Element => <Tag color={text ? "green" : "red"}>{text ? "启用" : "停用"}</Tag>,
      },
      {
        title: "操作",
        align: "center" as const,
        fixed: "right" as const,
        width: 220,
        customRender: ({ record }: { record: SafetyCreditBenefitRuleVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button type="link" size="small" loading={saving.value} onClick={() => void toggleEnabled(record)}>
              {record.enabled ? "停用" : "启用"}
            </Button>
            <PopConfirm
              okText="确定"
              cancelText="取消"
              title={`确认删除规则「${record.ruleName}」？`}
              onConfirm={() => void remove(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_benefit-rule-list", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    const [CubeForm] = usePcForm({
      syncStateRef: query,
      layout: "horizontal",
      handleSubmit: (data) => {
        query.pageNumber = 1;
        query.ruleName = String(data.ruleName ?? "").trim();
        query.parkName = String(data.parkName ?? "").trim();
        query.creditGrade = (data.creditGrade ?? "") as OptionalGrade;
        query.benefitType = (data.benefitType ?? "") as OptionalBenefitType;
        query.enabled = readEnabled(data.enabled);
        void load();
      },
      handleReset: () => {
        resetQueryState();
        void load();
      },
      schema: [
        {
          component: "Input",
          label: "规则名称",
          fieldName: "ruleName",
          componentProps: {
            placeholder: "请输入规则名称",
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
          label: "适用等级",
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
          label: "权益类型",
          fieldName: "benefitType",
          defaultValue: undefined,
          componentProps: {
            allowClear: true,
            placeholder: "全部",
            options: [...benefitTypeOptions],
          },
        },
        {
          component: "Select",
          label: "状态",
          fieldName: "enabled",
          defaultValue: undefined,
          componentProps: {
            allowClear: true,
            placeholder: "全部",
            options: [
              { label: "启用", value: true },
              { label: "停用", value: false },
            ],
          },
        },
      ],
      showCollapseButton: true,
    });

    onMounted(() => {
      void load();
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openCreate}>
          新增规则
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
            v-model:open={formVisible.value}
            title={form.id === undefined ? "新增权益规则" : "编辑权益规则"}
            width={720}
            confirmLoading={saving.value}
            onOk={() => void save()}
            onCancel={() => {
              formVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" model={form} layout="vertical">
              <FormItem class="form-item" label="规则名称" required>
                <Input
                  value={form.ruleName}
                  placeholder="请输入规则名称"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (form.ruleName = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="园区">
                <Input
                  value={form.parkName}
                  placeholder="请输入园区"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (form.parkName = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="适用等级" required>
                <Select
                  value={form.creditGrade}
                  options={gradeOptions}
                  onChange={(inputValue) => {
                    const value = inputValue as CreditGrade;
                    return (form.creditGrade = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="权益类型" required>
                <Select
                  value={form.benefitType}
                  placeholder="请选择权益类型"
                  options={benefitTypeOptions}
                  onChange={(inputValue) => {
                    const value = inputValue as SafetyCreditBenefitType;
                    return (form.benefitType = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item wide" label="权益内容" required>
                <Textarea
                  value={form.benefitContent}
                  placeholder="请输入权益内容"
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (form.benefitContent = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item wide" label="生效条件">
                <Textarea
                  value={form.effectiveCondition}
                  placeholder="请输入生效条件"
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (form.effectiveCondition = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="状态">
                <Select
                  value={String(form.enabled)}
                  options={[
                    { label: "启用", value: "true" },
                    { label: "停用", value: "false" },
                  ]}
                  onChange={(inputValue) => {
                    const value = inputValue as string;
                    form.enabled = value === "true";
                  }}
                />
              </FormItem>
            </Form>
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="权益规则配置" v-slots={layoutSlots} />;
  },
});
