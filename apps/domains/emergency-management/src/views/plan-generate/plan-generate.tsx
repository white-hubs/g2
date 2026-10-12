// @ts-nocheck — port from ghcloud legacy planGenerate; sibling modules land in parallel.
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LoadingOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";
import { Progress } from "ant-design-vue";
import { computed, defineComponent, onMounted, reactive, shallowRef } from "vue";
import { useRouter } from "vue-router";

import { GeneratedAttachmentUpload } from "../plan-documents/generated-attachment-upload";
import { sanitizeRichText } from "../plan-documents/rich-text";
import { getEmergencyManagementClient } from "@/domain-context";
import { Button, DatePicker, Form, FormItem, Input, Modal, Select, Step, Steps, Textarea, message } from "@/pc-ui-runtime";

import styles from "./plan-generate.module.css";

type PlanForm = {
  name: string;
  fileType: string;
  level: string;
  expirationDate: string;
  eventCategory: string;
  remark: string;
};

type GeneratedPlan = {
  title: string;
  metadata: string;
  contentHtml: string;
  wordCount: number;
  missingInfo: string[];
};

type ComplianceIssue = {
  type: "severe" | "warning" | "pass";
  title: string;
  desc: string;
  section?: string;
};

type ComplianceRule = {
  ruleName?: string;
  severity?: string;
  passed?: boolean;
  finding?: string;
  suggestion?: string;
};

type ComplianceDimension = {
  code: string;
  name: string;
  score: number;
};

type ComplianceResult = {
  totalScore: number;
  status: string;
  summary: string;
  dimensions: ComplianceDimension[];
  issues: ComplianceIssue[];
};

type RichTextCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

type MenuItem = {
  id?: string | number;
  code?: string | number;
  value?: string | number;
  name?: string;
  label?: string;
};

type SelectOption = {
  label: string;
  value: string;
};

const levelOptions = [
  { label: "普通", value: "ORDINARY" },
  { label: "重要", value: "IMPORTANT" },
];

const generationSteps = ["信息录入", "生成预案", "编辑修改", "合规检查", "保存提交"];
const generateStages = ["模板匹配", "内容生成", "知识增强", "格式整理"];
const aiFlowDictionaryItemCode = "BUSINESS_AI_FLOW";
const planGenerateFlowDictionaryCode = "PLAN_GEN_AI_FLOW";
const planDocumentsPath = "/d/emergency-management/plan-documents";

const scoreClass = (score: number) => {
  if (score >= 85) return styles.scorePass;
  if (score >= 70) return styles.scoreWarning;
  return styles.scoreSevere;
};

const barClass = (score: number) => {
  if (score >= 85) return styles.dimensionBarPass;
  if (score >= 70) return styles.dimensionBarWarning;
  return styles.dimensionBarSevere;
};

const issueItemClass = (type: ComplianceIssue["type"]) => {
  if (type === "severe") return styles.issueItemSevere;
  if (type === "warning") return styles.issueItemWarning;
  return styles.issueItemPass;
};

const complianceStatusClass = (level: ComplianceIssue["type"]) => {
  if (level === "pass") return styles.complianceStatusPass;
  if (level === "warning") return styles.complianceStatusWarning;
  return styles.complianceStatusSevere;
};

export const PlanGenerate = defineComponent({
  name: "PlanGenerate",
  setup() {
    const router = useRouter();
    const client = getEmergencyManagementClient();

    const form = reactive<PlanForm>({
      name: "",
      fileType: "",
      level: "",
      expirationDate: "",
      eventCategory: "",
      remark: "",
    });

    const touched = reactive({
      name: false,
      fileType: false,
      level: false,
      eventCategory: false,
    });

    const currentStep = shallowRef(1);
    const generating = shallowRef(false);
    const stageIndex = shallowRef(0);
    const editMode = shallowRef(false);
    const planGenerated = shallowRef(false);
    const complianceChecked = shallowRef(false);
    const complianceScore = shallowRef(0);
    const complianceStatus = shallowRef("");
    const complianceSummary = shallowRef("");
    const checking = shallowRef(false);
    const complianceDimensions = shallowRef<ComplianceDimension[]>([]);
    const complianceIssues = shallowRef<ComplianceIssue[]>([]);
    const generatedPlan = shallowRef<GeneratedPlan | null>(null);
    const planContentElement = shallowRef<HTMLElement | null>(null);
    const editorWordCount = shallowRef(0);
    const editorContentDirty = shallowRef(false);
    const contentFileIds = shallowRef("");
    const attachmentUploadKey = shallowRef(0);
    const autoSaveText = shallowRef("已自动保存");
    const saveModalVisible = shallowRef(false);
    const saveLoading = shallowRef(false);
    const severeIssuesExpanded = shallowRef(false);
    const warningIssuesExpanded = shallowRef(false);
    const fileTypeOptions = shallowRef<SelectOption[]>([]);
    const eventCategoryOptions = shallowRef<SelectOption[]>([]);

    const typeLabel = computed(() => fileTypeOptions.value.find((item) => item.value === form.fileType)?.label || "");
    const eventCategoryLabel = computed(() => eventCategoryOptions.value.find((item) => item.value === form.eventCategory)?.label || "");
    const levelLabel = computed(() => levelOptions.find((item) => item.value === form.level)?.label || "");
    const requiredInvalid = computed(() => ({
      name: touched.name && !form.name.trim(),
      fileType: touched.fileType && !form.fileType,
      level: touched.level && !form.level,
      eventCategory: touched.eventCategory && !form.eventCategory,
    }));
    const contentWordCount = computed(() => (editorContentDirty.value ? editorWordCount.value : generatedPlan.value?.wordCount || 0));
    const complianceLevel = computed<ComplianceIssue["type"]>(() => {
      if (complianceScore.value >= 85) return "pass";
      return complianceScore.value >= 70 ? "warning" : "severe";
    });
    const complianceStrokeColor = computed(
      () =>
        (
          ({
            pass: "#22c55e",
            warning: "#f59e0b",
            severe: "#ef4444",
          }) as Record<ComplianceIssue["type"], string>
        )[complianceLevel.value],
    );
    const complianceStatusText = computed(
      () =>
        complianceStatus.value ||
        (
          {
            pass: "已通过",
            warning: "有警告",
            severe: "未通过",
          } as Record<ComplianceIssue["type"], string>
        )[complianceLevel.value],
    );
    const complianceCounts = computed(() => ({
      severe: complianceIssues.value.filter((issue) => issue.type === "severe").length,
      warning: complianceIssues.value.filter((issue) => issue.type === "warning").length,
    }));
    const severeComplianceIssues = computed(() => complianceIssues.value.filter((issue) => issue.type === "severe"));
    const warningComplianceIssues = computed(() => complianceIssues.value.filter((issue) => issue.type === "warning"));

    const normalizeMenuOptions = (value: unknown, valueKeys: Array<keyof MenuItem>): SelectOption[] => {
      if (!Array.isArray(value)) return [];
      return value.flatMap((entry) => {
        const item = entry as MenuItem;
        const itemValue = valueKeys.map((key) => item[key]).find((field) => field !== undefined && field !== null);
        const label = item.name || item.label;
        return label && itemValue !== undefined ? [{ label, value: String(itemValue) }] : [];
      });
    };

    const loadMenuOptions = async () => {
      try {
        const [fileTypes, eventCategories] = await Promise.all([client.getFileTypes(), client.getEventTypes()]);
        fileTypeOptions.value = normalizeMenuOptions(fileTypes, ["id", "value", "code"]);
        eventCategoryOptions.value = normalizeMenuOptions(eventCategories, ["code", "value", "id"]);
      } catch {
        message.error("菜单配置加载失败");
      }
    };

    const resetForm = () => {
      Object.assign(form, {
        name: "",
        fileType: "",
        level: "",
        expirationDate: "",
        eventCategory: "",
        remark: "",
      });
      Object.assign(touched, {
        name: false,
        fileType: false,
        level: false,
        eventCategory: false,
      });
      generatedPlan.value = null;
      editorWordCount.value = 0;
      editorContentDirty.value = false;
      planGenerated.value = false;
      complianceChecked.value = false;
      complianceScore.value = 0;
      complianceStatus.value = "";
      complianceSummary.value = "";
      complianceDimensions.value = [];
      complianceIssues.value = [];
      editMode.value = false;
      saveModalVisible.value = false;
      saveLoading.value = false;
      currentStep.value = 1;
      contentFileIds.value = "";
      attachmentUploadKey.value += 1;
    };

    const handleBack = () => {
      void router.push(planDocumentsPath);
    };

    const validateForm = () => {
      touched.name = true;
      touched.fileType = true;
      touched.level = true;
      touched.eventCategory = true;
      return Boolean(form.name.trim() && form.fileType && form.level && form.eventCategory);
    };

    const formatPromptDate = (value: string) => (value ? value.replaceAll("-", "/") : "未设置");
    const currentPromptDate = () => {
      const currentDate = new Date();
      const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60 * 1000);
      return formatPromptDate(localDate.toISOString().slice(0, 10));
    };

    const buildWorkflowInput = () =>
      [
        `文件名称：${form.name.trim()}`,
        `文件类型：${typeLabel.value.replace(/类$/, "")}`,
        `文件级别：${levelLabel.value}`,
        `事件分类：${eventCategoryLabel.value}`,
        `到期日期：${formatPromptDate(form.expirationDate)}`,
        `文件描述：${form.remark.trim() || "无"}`,
        `编制日期：${currentPromptDate()}`,
      ].join(" ");

    const buildComplianceInput = () => {
      const plan = generatedPlan.value;
      return [
        "请对以下应急预案进行合规性检查，并依据知识库中的《应急预案合规检查标准》输出检查结果。",
        "【文件名称】",
        form.name.trim(),
        "【预案标题】",
        plan?.title || form.name.trim(),
        "【预案类型】",
        "专项应急预案",
        "【事件类别】",
        `${typeLabel.value.replace(/类$/, "")}-${eventCategoryLabel.value}`,
        "【预案正文】",
        plan?.contentHtml || "",
      ].join("\n");
    };

    const getPlanWorkflowId = async (key: "gen" | "check", actionName: string) => {
      const dictionary = (await client.getFlowDictionary({
        itemCode: aiFlowDictionaryItemCode,
        code: planGenerateFlowDictionaryCode,
      })) as { variable?: string } | null;
      if (!dictionary?.variable) {
        throw new Error(`未配置${actionName}工作流`);
      }
      try {
        const exactFlowIdConfig = dictionary.variable.replace(/("(?:gen|check)"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"');
        const flowConfig = JSON.parse(exactFlowIdConfig) as { gen?: unknown; check?: unknown };
        const flowId = typeof flowConfig[key] === "string" ? flowConfig[key].trim() : "";
        if (!/^\d+$/.test(flowId)) {
          throw new Error(`未配置${actionName}工作流`);
        }
        return flowId;
      } catch (error) {
        if (error instanceof Error && error.message === `未配置${actionName}工作流`) {
          throw error;
        }
        throw new Error(`${actionName}工作流配置格式错误`, { cause: error });
      }
    };

    const extractGeneratedPlan = (value: unknown): GeneratedPlan | null => {
      if (typeof value === "string") {
        try {
          return extractGeneratedPlan(JSON.parse(value.replace(/^```json\s*|\s*```$/g, "")));
        } catch {
          return null;
        }
      }
      if (!value || typeof value !== "object") return null;
      const item = value as Record<string, unknown>;
      if (typeof item.contentHtml === "string") {
        return {
          title: typeof item.title === "string" ? item.title : form.name.trim(),
          metadata: typeof item.metadata === "string" ? item.metadata : "",
          contentHtml: item.contentHtml,
          wordCount: typeof item.wordCount === "number" ? item.wordCount : item.contentHtml.replace(/<[^>]*>/g, "").length,
          missingInfo: Array.isArray(item.missingInfo)
            ? item.missingInfo.filter((entry): entry is string => typeof entry === "string")
            : [],
        };
      }
      for (const candidate of Object.values(item)) {
        const result = extractGeneratedPlan(candidate);
        if (result) return result;
      }
      return null;
    };

    const extractComplianceResult = (value: unknown): ComplianceResult | null => {
      if (typeof value === "string") {
        try {
          return extractComplianceResult(JSON.parse(value.replace(/^```json\s*|\s*```$/g, "")));
        } catch {
          return null;
        }
      }
      if (Array.isArray(value)) {
        return value.map(extractComplianceResult).find(Boolean) || null;
      }
      if (!value || typeof value !== "object") return null;
      const item = value as Record<string, unknown>;
      const checkResult = item.checkResult as Record<string, unknown> | undefined;
      const dimensions = item.dimensions;
      if (checkResult && typeof checkResult.totalScore === "number" && Array.isArray(dimensions)) {
        const mappedDimensions = dimensions.map((dimension) => {
          const entry = dimension as Record<string, unknown>;
          return {
            code: typeof entry.dimensionCode === "string" ? entry.dimensionCode : "",
            name: typeof entry.dimensionName === "string" ? entry.dimensionName : "未命名维度",
            score: typeof entry.score === "number" ? Math.max(0, Math.min(100, Number(entry.score.toFixed(2)))) : 0,
          };
        });
        const failedRules = dimensions.flatMap((dimension) => {
          const entry = dimension as { dimensionName?: string; rules?: unknown[] };
          const rules = Array.isArray(entry.rules) ? entry.rules : [];
          return rules
            .filter((rule) => (rule as ComplianceRule).passed === false)
            .map((rule) => ({ rule: rule as ComplianceRule, section: entry.dimensionName || "" }));
        });
        const summary = typeof checkResult.summary === "string" ? checkResult.summary : "";
        return {
          totalScore: Math.max(0, Math.min(100, Number(checkResult.totalScore.toFixed(2)))),
          status: typeof checkResult.status === "string" ? checkResult.status : "",
          summary,
          dimensions: mappedDimensions,
          issues: failedRules.length
            ? failedRules.map(({ rule, section }) => ({
                type: rule.severity === "严重" ? "severe" : "warning",
                title: rule.ruleName || "未通过检查项",
                desc: rule.suggestion ? `${rule.finding || ""} 建议：${rule.suggestion}`.trim() : rule.finding || "",
                section,
              }))
            : [{ type: "pass", title: "所有检查项均已通过", desc: summary }],
        };
      }
      for (const candidate of Object.values(item)) {
        const result = extractComplianceResult(candidate);
        if (result) return result;
      }
      return null;
    };

    const isRequestTimeout = (error: unknown) => {
      if (!error || typeof error !== "object") return false;
      const requestError = error as { code?: string; message?: string };
      return requestError.code === "ECONNABORTED" || Boolean(requestError.message?.toLowerCase().includes("timeout"));
    };

    const readWorkflowConfigError = (error: unknown, actionName: string) => {
      if (!(error instanceof Error)) return "";
      const configMessages = [`未配置${actionName}工作流`, `${actionName}工作流配置格式错误`];
      return configMessages.includes(error.message) ? error.message : "";
    };

    const syncContentFromEditor = () => {
      if (!editorContentDirty.value || !generatedPlan.value || !planContentElement.value) return;
      generatedPlan.value = {
        ...generatedPlan.value,
        contentHtml: sanitizeRichText(planContentElement.value.innerHTML),
        wordCount: editorWordCount.value,
      };
      editorContentDirty.value = false;
    };

    const markContentEdited = (element: HTMLElement) => {
      planContentElement.value = element;
      editorWordCount.value = (element.textContent || "").replace(/\s/g, "").length;
      editorContentDirty.value = true;
      complianceChecked.value = false;
      complianceScore.value = 0;
      complianceStatus.value = "";
      complianceSummary.value = "";
      complianceDimensions.value = [];
      complianceIssues.value = [];
      autoSaveText.value = "已自动保存";
    };

    const handleContentEdit = (event: Event) => {
      if (!generatedPlan.value) return;
      markContentEdited(event.target as HTMLElement);
    };

    const applyEditorCommand = (command: RichTextCommand) => {
      if (!editMode.value || !planContentElement.value) return;
      planContentElement.value.focus();
      document.execCommand(command, false);
      markContentEdited(planContentElement.value);
    };

    const insertEditorTable = () => {
      if (!editMode.value || !planContentElement.value) return;
      planContentElement.value.focus();
      document.execCommand(
        "insertHTML",
        false,
        "<table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>示例</td><td>示例内容</td></tr></tbody></table><p><br></p>",
      );
      markContentEdited(planContentElement.value);
    };

    const generatePlan = async () => {
      if (generating.value) return;
      if (!validateForm()) {
        message.error("请填写所有必填项后再生成预案");
        return;
      }
      generating.value = true;
      stageIndex.value = 0;
      currentStep.value = 2;
      const stageTimer = window.setInterval(() => {
        stageIndex.value = Math.min(stageIndex.value + 1, generateStages.length - 1);
      }, 700);
      try {
        const planFlowId = await getPlanWorkflowId("gen", "预案生成");
        const response = await client.runWorkflow(planFlowId, {
          input: buildWorkflowInput(),
          inputType: "chat",
          outputType: "chat",
        });
        const result = extractGeneratedPlan(response);
        if (!result) {
          message.error("工作流返回格式不正确");
          return;
        }
        generatedPlan.value = {
          ...result,
          contentHtml: sanitizeRichText(result.contentHtml),
        };
        editorWordCount.value = result.wordCount;
        editorContentDirty.value = false;
        planGenerated.value = true;
        complianceChecked.value = false;
        complianceScore.value = 0;
        complianceStatus.value = "";
        complianceSummary.value = "";
        complianceDimensions.value = [];
        complianceIssues.value = [];
        editMode.value = false;
        autoSaveText.value = "已自动保存";
        currentStep.value = 3;
        message.success("预案生成完成");
      } catch (error) {
        const configMessage = readWorkflowConfigError(error, "预案生成");
        const timeoutMessage = isRequestTimeout(error) ? "预案生成超时，请稍后重试" : "";
        message.error(configMessage || timeoutMessage || "预案生成失败，请稍后重试");
      } finally {
        window.clearInterval(stageTimer);
        generating.value = false;
      }
    };

    const runCompliance = async () => {
      if (!planGenerated.value || !generatedPlan.value) {
        message.warning("请先生成预案");
        return;
      }
      if (checking.value) return;
      syncContentFromEditor();
      checking.value = true;
      currentStep.value = 4;
      try {
        const checkFlowId = await getPlanWorkflowId("check", "合规检查");
        const response = await client.runWorkflow(checkFlowId, {
          input: buildComplianceInput(),
          inputType: "chat",
          outputType: "chat",
        });
        const result = extractComplianceResult(response);
        if (!result) {
          message.error("合规检查工作流返回格式不正确");
          return;
        }
        complianceScore.value = result.totalScore;
        complianceStatus.value = result.status;
        complianceSummary.value = result.summary;
        complianceDimensions.value = result.dimensions;
        complianceIssues.value = result.issues;
        complianceChecked.value = true;
        message.success(`合规检查完成，综合评分 ${result.totalScore} 分`);
      } catch (error) {
        const configMessage = readWorkflowConfigError(error, "合规检查");
        const timeoutMessage = isRequestTimeout(error) ? "合规检查超时，请稍后重试" : "";
        message.error(configMessage || timeoutMessage || "合规检查失败，请稍后重试");
      } finally {
        checking.value = false;
      }
    };

    const toggleEditMode = () => {
      if (editMode.value) syncContentFromEditor();
      editMode.value = !editMode.value;
      currentStep.value = editMode.value ? 3 : currentStep.value;
      autoSaveText.value = editMode.value ? "编辑中" : "已自动保存";
    };

    const editComplianceIssue = () => {
      if (!editMode.value) toggleEditMode();
      planContentElement.value?.focus();
      message.info("请修改对应内容后重新进行合规检查");
    };

    const openSaveModal = () => {
      if (!planGenerated.value) {
        message.warning("请先生成预案");
        return;
      }
      if (!complianceChecked.value) {
        message.warning("请先完成合规检查");
        return;
      }
      syncContentFromEditor();
      severeIssuesExpanded.value = false;
      warningIssuesExpanded.value = false;
      saveModalVisible.value = true;
    };

    const closeSaveModal = () => {
      if (saveLoading.value) return;
      saveModalVisible.value = false;
    };

    const buildComplianceCheckResultJson = () => {
      if (!complianceChecked.value) return null;
      return JSON.stringify({
        totalScore: complianceScore.value,
        status: complianceStatus.value,
        summary: complianceSummary.value,
        dimensions: complianceDimensions.value,
        issues: complianceIssues.value,
      });
    };

    const buildSavePayload = () => ({
      name: form.name.trim(),
      emergencyFileTypeId: form.fileType,
      levelCode: form.level,
      expirationDate: form.expirationDate || null,
      emergencyEventTypeCode: form.eventCategory,
      remark: form.remark.trim(),
      contentHtml: sanitizeRichText(generatedPlan.value?.contentHtml || ""),
      contentFileIds: contentFileIds.value || null,
      generated: true,
      complianceCheckResultJson: buildComplianceCheckResultJson(),
    });

    const confirmSavePlan = async () => {
      if (!generatedPlan.value || saveLoading.value) return;
      if (!complianceChecked.value) {
        message.warning("请先完成合规检查");
        return;
      }
      syncContentFromEditor();
      try {
        saveLoading.value = true;
        await client.createPlanDocument(buildSavePayload());
        saveModalVisible.value = false;
        currentStep.value = 5;
        message.success({
          content: `预案'${form.name.trim()}'已保存`,
          duration: 1.5,
          onClose: () => {
            void router.push(planDocumentsPath);
          },
        });
      } catch {
        message.error("保存预案失败，请稍后重试");
      } finally {
        saveLoading.value = false;
      }
    };

    onMounted(() => {
      void loadMenuOptions();
    });

    return () => (
      <div class={styles.page}>
        <div class={styles.stepCard}>
          <Button class={styles.backButton} type="link" onClick={handleBack}>
            <ArrowLeftOutlined />
            返回
          </Button>
          <div class={styles.stepContent}>
            <Steps current={currentStep.value - 1} size="small">
              {generationSteps.map((step) => (
                <Step key={step} title={step} />
              ))}
            </Steps>
          </div>
        </div>

        <div class={[styles.contentGrid, planGenerated.value ? styles.contentGridReady : undefined]}>
          <section class={[styles.panel, styles.formPanel]}>
            {generating.value ? (
              <div class={styles.generateMask}>
                <LoadingOutlined class={styles.generateSpin} />
                <div class={styles.generateTitle}>{generateStages[stageIndex.value]}中...</div>
                <div class={styles.generateDesc}>正在根据文件信息组织预案内容</div>
                <div class={styles.generateStageList}>
                  {generateStages.map((stage, index) => (
                    <div
                      key={stage}
                      class={[
                        styles.generateStage,
                        index === stageIndex.value ? styles.generateStageActive : undefined,
                        index < stageIndex.value ? styles.generateStageCompleted : undefined,
                      ]}
                    >
                      <span>{index + 1}</span>
                      {stage}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div class={styles.panelHeader}>
              <span class={styles.panelTitle}>
                <EditOutlined />
                文件信息
              </span>
            </div>
            <div class={styles.panelBody}>
              <Form layout="vertical">
                <FormItem
                  label="文件名称"
                  required
                  validateStatus={requiredInvalid.value.name ? "error" : ""}
                  help={requiredInvalid.value.name ? "请输入文件名称" : ""}
                >
                  <Input
                    value={form.name}
                    maxlength={20}
                    showCount
                    placeholder="请输入文件名称"
                    onBlur={() => {
                      touched.name = true;
                    }}
                    onUpdate:value={(value: string) => {
                      form.name = value;
                    }}
                  />
                </FormItem>
                <FormItem
                  label="文件类型"
                  required
                  validateStatus={requiredInvalid.value.fileType ? "error" : ""}
                  help={requiredInvalid.value.fileType ? "请选择文件类型" : ""}
                >
                  <Select
                    value={form.fileType || undefined}
                    placeholder="请选择文件类型"
                    options={fileTypeOptions.value}
                    onBlur={() => {
                      touched.fileType = true;
                    }}
                    onUpdate:value={(value: string) => {
                      form.fileType = value || "";
                    }}
                  />
                </FormItem>
                <FormItem
                  label="文件级别"
                  required
                  validateStatus={requiredInvalid.value.level ? "error" : ""}
                  help={requiredInvalid.value.level ? "请选择文件级别" : ""}
                >
                  <Select
                    value={form.level || undefined}
                    placeholder="请选择文件级别"
                    options={levelOptions}
                    onBlur={() => {
                      touched.level = true;
                    }}
                    onUpdate:value={(value: string) => {
                      form.level = value || "";
                    }}
                  />
                </FormItem>
                <FormItem label="到期日期">
                  <DatePicker
                    value={form.expirationDate || undefined}
                    valueFormat="YYYY-MM-DD"
                    class={styles.fullControl}
                    placeholder="不设置则默认3年有效期"
                    onUpdate:value={(value: string | null) => {
                      form.expirationDate = value || "";
                    }}
                  />
                </FormItem>
                <FormItem
                  label="事件分类"
                  required
                  validateStatus={requiredInvalid.value.eventCategory ? "error" : ""}
                  help={requiredInvalid.value.eventCategory ? "请选择事件分类" : ""}
                >
                  <Select
                    value={form.eventCategory || undefined}
                    placeholder="请选择事件分类"
                    options={eventCategoryOptions.value}
                    onBlur={() => {
                      touched.eventCategory = true;
                    }}
                    onUpdate:value={(value: string) => {
                      form.eventCategory = value || "";
                    }}
                  />
                </FormItem>
                <FormItem label="文件描述">
                  <Textarea
                    value={form.remark}
                    maxlength={200}
                    showCount
                    placeholder="请填写备注信息，最多输入200个字符"
                    onUpdate:value={(value: string) => {
                      form.remark = value;
                    }}
                  />
                </FormItem>
              </Form>
            </div>
            <div class={styles.panelFooter}>
              <Button class={styles.footerAction} size="large" onClick={resetForm}>
                重置
              </Button>
              <Button
                class={styles.footerAction}
                type="primary"
                size="large"
                loading={generating.value}
                onClick={() => {
                  void generatePlan();
                }}
              >
                <ThunderboltOutlined />
                生成预案
              </Button>
            </div>
          </section>

          <section class={[styles.panel, styles.previewPanel]}>
            <div class={styles.panelHeader}>
              <span class={styles.panelTitle}>
                <FileTextOutlined />
                预案内容
              </span>
              <div class={styles.toolbar}>
                {planGenerated.value ? (
                  <Button
                    size="small"
                    loading={checking.value}
                    onClick={() => {
                      void runCompliance();
                    }}
                  >
                    <CheckCircleOutlined />
                    合规检查
                  </Button>
                ) : null}
                {planGenerated.value ? (
                  <Button size="small" type={editMode.value ? "primary" : "default"} onClick={toggleEditMode}>
                    <EditOutlined />
                    {editMode.value ? "完成编辑" : "编辑"}
                  </Button>
                ) : null}
              </div>
            </div>

            {planGenerated.value && editMode.value ? (
              <div class={styles.editorToolbar}>
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="加粗"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    applyEditorCommand("bold");
                  }}
                >
                  <strong>B</strong>
                </button>
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="斜体"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    applyEditorCommand("italic");
                  }}
                >
                  <em>I</em>
                </button>
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="下划线"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    applyEditorCommand("underline");
                  }}
                >
                  <u>U</u>
                </button>
                <i class={styles.editorToolDivider} />
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="无序列表"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    applyEditorCommand("insertUnorderedList");
                  }}
                >
                  •≡
                </button>
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="有序列表"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    applyEditorCommand("insertOrderedList");
                  }}
                >
                  1.
                </button>
                <i class={styles.editorToolDivider} />
                <button
                  class={styles.editorToolButton}
                  type="button"
                  title="插入表格"
                  onMousedown={(event: MouseEvent) => {
                    event.preventDefault();
                    insertEditorTable();
                  }}
                >
                  ⊞
                </button>
              </div>
            ) : null}

            {!planGenerated.value ? (
              <div class={styles.emptyState}>
                <FileDoneOutlined />
                <div class={styles.emptyTitle}>暂无预案内容</div>
                <div class={styles.emptyDesc}>请在左侧填写文件信息后点击“生成预案”</div>
              </div>
            ) : (
              <div class={styles.planDocument}>
                <div class={styles.planDocHeader}>
                  <div>{generatedPlan.value?.metadata}</div>
                </div>
                <div
                  ref={(el: HTMLElement | null) => {
                    planContentElement.value = el;
                  }}
                  class={styles.planSections}
                  contenteditable={editMode.value}
                  v-html={generatedPlan.value?.contentHtml}
                  onInput={handleContentEdit}
                />
                <div class={styles.planAttachment}>
                  <GeneratedAttachmentUpload
                    key={attachmentUploadKey.value}
                    modelValue={contentFileIds.value}
                    onUpdate:modelValue={(value: string) => {
                      contentFileIds.value = value;
                    }}
                  />
                </div>
                <div class={styles.statusBar}>
                  <span>
                    <i />
                    {autoSaveText.value}
                  </span>
                  <span>共 {contentWordCount.value} 字</span>
                </div>
              </div>
            )}
          </section>

          <aside class={styles.sideColumn}>
            <div class={styles.sideCardContainer}>
              {planGenerated.value && generatedPlan.value?.missingInfo.length ? (
                <section class={styles.panel}>
                  <div class={styles.panelHeader}>
                    <span class={styles.panelTitle}>
                      <FileTextOutlined />
                      待补充信息
                    </span>
                  </div>
                  <ul class={styles.missingInfoList}>
                    {generatedPlan.value.missingInfo.map((info) => (
                      <li key={info}>{info}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {complianceChecked.value ? (
                <section class={styles.panel}>
                  <div class={styles.panelHeader}>
                    <span class={styles.panelTitle}>
                      <CheckCircleOutlined />
                      合规性检查
                    </span>
                    <Button
                      size="small"
                      loading={checking.value}
                      onClick={() => {
                        void runCompliance();
                      }}
                    >
                      重新检查
                    </Button>
                  </div>
                  <div class={styles.scoreBox}>
                    <Progress
                      type="circle"
                      percent={complianceScore.value}
                      width={92}
                      strokeColor={complianceStrokeColor.value}
                      format={() => `${complianceScore.value}`}
                    />
                    <div class={styles.scoreLabel}>合规评分</div>
                  </div>
                  {complianceDimensions.value.length ? (
                    <div class={styles.complianceDimensions}>
                      {complianceDimensions.value.map((dimension) => (
                        <div key={dimension.code || dimension.name} class={styles.dimensionRow}>
                          <span class={styles.dimensionLabel}>{dimension.name}</span>
                          <span class={styles.dimensionBar}>
                            <i class={barClass(dimension.score)} style={{ width: `${dimension.score}%` }} />
                          </span>
                          <strong class={scoreClass(dimension.score)}>{dimension.score}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div class={styles.issueList}>
                    {complianceIssues.value.some((issue) => issue.type !== "pass") ? (
                      <div class={styles.issueHeader}>
                        <strong>问题清单</strong>
                        {complianceCounts.value.severe ? (
                          <span class={[styles.issueBadge, styles.issueBadgeSevere]}>严重 {complianceCounts.value.severe}</span>
                        ) : null}
                        {complianceCounts.value.warning ? (
                          <span class={[styles.issueBadge, styles.issueBadgeWarning]}>警告 {complianceCounts.value.warning}</span>
                        ) : null}
                      </div>
                    ) : null}
                    {complianceIssues.value.map((issue) => (
                      <div key={`${issue.section}-${issue.title}`} class={[styles.issueItem, issueItemClass(issue.type)]}>
                        <i class={styles.issueIcon}>{issue.type === "severe" ? "!" : issue.type === "warning" ? "?" : "✓"}</i>
                        <div class={styles.issueText}>
                          <strong>{issue.title}</strong>
                          <span>{issue.desc}</span>
                          {issue.section ? <small>{issue.section}</small> : null}
                        </div>
                        {issue.type === "severe" ? (
                          <Button size="small" danger onClick={editComplianceIssue}>
                            去修复
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {planGenerated.value ? (
                <section class={styles.panel}>
                  <div class={styles.panelHeader}>
                    <span class={styles.panelTitle}>
                      <SaveOutlined />
                      保存操作
                    </span>
                  </div>
                  <div class={styles.saveSummary}>
                    <label>预案名称</label>
                    <span>{form.name}</span>
                    <label>合规状态</label>
                    {complianceChecked.value ? (
                      <span>
                        <b class={[styles.complianceStatus, complianceStatusClass(complianceLevel.value)]}>{complianceStatusText.value}</b>
                        {" · 综合评分 "}
                        {complianceScore.value} 分
                      </span>
                    ) : (
                      <span class={[styles.complianceStatus, styles.complianceStatusUnchecked]}>未检查</span>
                    )}
                  </div>
                  <div class={styles.saveActions}>
                    <Button block type="primary" onClick={openSaveModal}>
                      <SaveOutlined />
                      保存为预案
                    </Button>
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>

        <Modal open={saveModalVisible.value} title="保存为预案" width={520} footer={null} centered onCancel={closeSaveModal}>
          <div class={styles.saveModalContent}>
            <div class={styles.saveScoreRow}>
              <span>综合评分</span>
              <strong>{complianceChecked.value ? complianceScore.value : "--"}</strong>
            </div>

            {severeComplianceIssues.value.length ? (
              <section class={[styles.saveIssueCard, styles.saveIssueCardSevere]}>
                <button
                  type="button"
                  class={styles.saveIssueHeader}
                  onClick={() => {
                    severeIssuesExpanded.value = !severeIssuesExpanded.value;
                  }}
                >
                  <span>
                    <ExclamationCircleOutlined />
                    严重问题 <b>{severeComplianceIssues.value.length}</b>
                  </span>
                  <DownOutlined class={[styles.expandArrow, severeIssuesExpanded.value ? styles.expandArrowExpanded : undefined]} />
                </button>
                {severeIssuesExpanded.value ? (
                  <div class={styles.saveIssueDetails}>
                    {severeComplianceIssues.value.map((issue) => (
                      <div key={`${issue.section}-${issue.title}`} class={[styles.saveIssueItem, styles.saveIssueItemSevere]}>
                        <ExclamationCircleOutlined />
                        <div>
                          <strong>{issue.title}</strong>
                          <p>{issue.desc}</p>
                          <small>{issue.section || "综合检查"}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {warningComplianceIssues.value.length ? (
              <section class={[styles.saveIssueCard, styles.saveIssueCardWarning]}>
                <button
                  type="button"
                  class={styles.saveIssueHeader}
                  onClick={() => {
                    warningIssuesExpanded.value = !warningIssuesExpanded.value;
                  }}
                >
                  <span>
                    <ExclamationCircleOutlined />
                    警告提示 <b>{warningComplianceIssues.value.length}</b>
                  </span>
                  <DownOutlined class={[styles.expandArrow, warningIssuesExpanded.value ? styles.expandArrowExpanded : undefined]} />
                </button>
                {warningIssuesExpanded.value ? (
                  <div class={styles.saveIssueDetails}>
                    {warningComplianceIssues.value.map((issue) => (
                      <div key={`${issue.section}-${issue.title}`} class={[styles.saveIssueItem, styles.saveIssueItemWarning]}>
                        <ExclamationCircleOutlined />
                        <div>
                          <strong>{issue.title}</strong>
                          <p>{issue.desc}</p>
                          <small>{issue.section || "综合检查"}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {severeComplianceIssues.value.length ? (
              <div class={styles.saveSevereNotice}>仍有严重问题未修复，请返回修改后再提交。</div>
            ) : null}
          </div>
          <div class={styles.saveModalFooter}>
            <Button onClick={closeSaveModal}>取消</Button>
            <Button
              type="primary"
              loading={saveLoading.value}
              onClick={() => {
                void confirmSavePlan();
              }}
            >
              确认保存
            </Button>
          </div>
        </Modal>
      </div>
    );
  },
});
