import type {
  BehaviorType,
  CreditGrade,
  CreditWeightSuggestionItem,
  CreditWeightSuggestionOutput,
  SafetyCreditChecklistBaseItem,
  SafetyCreditDataSourceVO,
  SafetyCreditEventMappingVO,
  SafetyCreditGradeThreshold,
  SafetyCreditId,
  SafetyCreditIndustryType,
  SafetyCreditScoreModelCommand,
  SafetyCreditScoreModelPageQuery,
  SafetyCreditScoreModelVO,
  SafetyCreditScoreWeightRule,
  ScoreModelStatus,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import {
  Button,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Select,
  Space,
  Table,
  Tag,
  message,
  usePcForm,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";

import {
  checkCategoryOptions,
  cleanText,
  createDefaultGradeThresholds,
  defaultAiSuggestionSummary,
  displayText,
  formatDateTime,
  gradeOptions,
  industryTypeLabel,
  industryTypeOptions,
  parseJsonArray,
  scoreModelStatusColor,
  scoreModelStatusLabel,
  scoreModelStatusOptions,
  toNumber,
} from "./shared";
import { getSafetyCreditClient } from "@/domain-context";

import "./s2.less";

interface ModelBaseForm {
  modelName: string;
  industryType: OptionalIndustryType;
}

type OptionalIndustryType = SafetyCreditIndustryType | "";

interface ScoreModelQueryForm {
  pageNumber: number;
  pageSize: number;
  modelName: string;
  industryType: OptionalIndustryType;
  status: "" | ScoreModelStatus;
}

interface WeightFormRow {
  key: string;
  applicationCode: string;
  applicationName: string;
  eventId: string;
  eventName: string;
  behaviorType: BehaviorType;
  defaultScore: string;
  scoreChange: string;
}

interface ThresholdFormRow {
  key: string;
  grade: CreditGrade;
  minScore: string;
  maxScore: string;
  remark: string;
}

interface ChecklistFormRow {
  key: string;
  itemCode: string;
  itemName: string;
  category: string;
  required: boolean;
  remark: string;
}

let modelRowSeed = 0;

function createRowKey(prefix: string): string {
  modelRowSeed += 1;
  return `${prefix}-${Date.now()}-${modelRowSeed}`;
}

function weightRowKey(applicationCode: string, eventId: string): string {
  return `${applicationCode}::${eventId}`;
}

function buildExistingWeightMap(rules: SafetyCreditScoreWeightRule[]): Map<string, SafetyCreditScoreWeightRule> {
  const result = new Map<string, SafetyCreditScoreWeightRule>();
  rules.forEach((rule) => {
    const eventId = cleanText(rule.eventId);
    if (eventId === undefined) {
      return;
    }
    const applicationCode = cleanText(rule.applicationCode);
    if (applicationCode !== undefined) {
      result.set(weightRowKey(applicationCode, eventId), rule);
    }
    if (!result.has(eventId)) {
      result.set(eventId, rule);
    }
  });
  return result;
}

function createWeightRow(
  source: SafetyCreditDataSourceVO,
  event: SafetyCreditEventMappingVO,
  rule?: SafetyCreditScoreWeightRule,
): WeightFormRow {
  const applicationCode = source.applicationCode ?? "";
  const eventId = event.eventId ?? "";
  const defaultScore = event.defaultScore ?? source.defaultScore ?? 0;
  return {
    key: weightRowKey(applicationCode, eventId),
    applicationCode,
    applicationName: source.applicationName ?? "",
    eventId,
    eventName: event.eventName ?? "",
    behaviorType: rule?.behaviorType ?? "PENALTY",
    defaultScore: String(defaultScore),
    scoreChange: String(rule?.scoreChange ?? defaultScore),
  };
}

function createThresholdRow(threshold: SafetyCreditGradeThreshold): ThresholdFormRow {
  return {
    key: createRowKey("threshold"),
    grade: threshold.grade,
    minScore: String(threshold.minScore),
    maxScore: String(threshold.maxScore),
    remark: threshold.remark ?? "",
  };
}

function createChecklistRow(item?: SafetyCreditChecklistBaseItem): ChecklistFormRow {
  return {
    key: createRowKey("checklist"),
    itemCode: item?.itemCode ?? "",
    itemName: item?.itemName ?? "",
    category: item === undefined ? "消防" : (item.category ?? ""),
    required: item?.required ?? true,
    remark: item?.remark ?? "",
  };
}

function extractWeights(record: SafetyCreditScoreModelVO): SafetyCreditScoreWeightRule[] {
  return parseJsonArray<SafetyCreditScoreWeightRule>(record.weightJson);
}

function extractThresholds(record: SafetyCreditScoreModelVO): SafetyCreditGradeThreshold[] {
  const thresholds = parseJsonArray<SafetyCreditGradeThreshold>(record.gradeThresholdJson);
  return thresholds.length > 0 ? thresholds : createDefaultGradeThresholds();
}

function extractChecklistItems(record: SafetyCreditScoreModelVO): SafetyCreditChecklistBaseItem[] {
  return parseJsonArray<SafetyCreditChecklistBaseItem>(record.baseCheckItemJson);
}

function toInputNumberValue(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInputNumberText(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

type WeightSuggestionDisplayItem = CreditWeightSuggestionItem | string;

function renderWeightSuggestionRows(items: CreditWeightSuggestionItem[]) {
  return (items as WeightSuggestionDisplayItem[]).map((item, index) => {
    if (typeof item === "string") {
      return (
        <tr key={`suggestion-${index}`}>
          <td colspan={5}>{displayText(item)}</td>
        </tr>
      );
    }

    return (
      <tr key={`${item.sourceApplication ?? "app"}-${item.eventType ?? "event"}-${index}`}>
        <td>{displayText(item.sourceApplication)}</td>
        <td>{displayText(item.eventType)}</td>
        <td>{displayText(item.defaultScore)}</td>
        <td>{displayText(item.recommendedScore)}</td>
        <td>{displayText(item.confidence)}</td>
      </tr>
    );
  });
}

function normalizeSuggestionText(value?: number | string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export const ScoreModelList = defineComponent({
  name: "ScoreModelList",
  setup: () => {
    const router = useRouter();
    const loading = ref(false);
    const saving = ref(false);
    const suggestionLoading = ref(false);
    const weightLoading = ref(false);
    const publishingId = ref<SafetyCreditId>();
    const rows = ref<SafetyCreditScoreModelVO[]>([]);
    const total = ref(0);
    const formVisible = ref(false);
    const editingId = ref<SafetyCreditId>();
    const weightRows = ref<WeightFormRow[]>([]);
    const thresholdRows = ref<ThresholdFormRow[]>([]);
    const checklistRows = ref<ChecklistFormRow[]>([]);
    const usedIndustryTypes = ref<Set<SafetyCreditIndustryType>>(new Set());
    const suggestion = ref<CreditWeightSuggestionOutput>({
      suggestions: [],
      summary: defaultAiSuggestionSummary,
    });

    const query = reactive<ScoreModelQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      modelName: "",
      industryType: "",
      status: "",
    });

    const form = reactive<ModelBaseForm>({
      modelName: "",
      industryType: "",
    });

    function buildQuery(): SafetyCreditScoreModelPageQuery {
      const payload: SafetyCreditScoreModelPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const modelName = cleanText(query.modelName);
      if (modelName !== undefined) {
        payload.modelName = modelName;
      }
      if (query.industryType !== "") {
        payload.industryType = query.industryType;
      }
      if (query.status !== "") {
        payload.status = query.status;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageScoreModels(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function resetSuggestion(): void {
      suggestion.value = {
        suggestions: [],
        summary: defaultAiSuggestionSummary,
      };
    }

    function resetForm(): void {
      editingId.value = undefined;
      form.modelName = "";
      form.industryType = "";
      weightRows.value = [];
      thresholdRows.value = createDefaultGradeThresholds().map(createThresholdRow);
      checklistRows.value = [];
      usedIndustryTypes.value = new Set();
      resetSuggestion();
    }

    function openCreate(): void {
      resetForm();
      formVisible.value = true;
      void loadUsedIndustryTypes();
      void loadDefaultWeightRows();
    }

    function openEdit(record: SafetyCreditScoreModelVO): void {
      editingId.value = record.id;
      form.modelName = record.modelName ?? "";
      form.industryType = record.industryType ?? "";
      weightRows.value = [];
      thresholdRows.value = extractThresholds(record).map(createThresholdRow);
      checklistRows.value = extractChecklistItems(record).map(createChecklistRow);
      resetSuggestion();
      formVisible.value = true;
      void loadUsedIndustryTypes(record.id);
      void loadDefaultWeightRows(extractWeights(record));
    }

    function isSameId(left?: SafetyCreditId, right?: SafetyCreditId): boolean {
      return left !== undefined && right !== undefined && String(left) === String(right);
    }

    async function loadUsedIndustryTypes(excludeId?: SafetyCreditId): Promise<void> {
      const result = await getSafetyCreditClient().pageScoreModels({
        pageNumber: 1,
        pageSize: 200,
      });
      usedIndustryTypes.value = new Set(
        (result.records ?? [])
          .filter((record) => !isSameId(record.id, excludeId))
          .map((record) => record.industryType)
          .filter((industryType): industryType is SafetyCreditIndustryType => industryType !== undefined),
      );
    }

    function isIndustryUsed(industryType: SafetyCreditIndustryType): boolean {
      return usedIndustryTypes.value.has(industryType);
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.modelName = "";
      query.industryType = "";
      query.status = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    function addChecklistRow(): void {
      checklistRows.value = [...checklistRows.value, createChecklistRow()];
    }

    function removeChecklistRow(row: ChecklistFormRow): void {
      checklistRows.value = checklistRows.value.filter((item) => item.key !== row.key);
    }

    async function listConfiguredDataSources(): Promise<SafetyCreditDataSourceVO[]> {
      const pageSize = 200;
      const first = await getSafetyCreditClient().pageDataSources({
        pageNumber: 1,
        pageSize,
      });
      const records = [...(first.records ?? [])];
      const pages = first.pages ?? Math.ceil((first.total ?? records.length) / pageSize);
      for (let pageNumber = 2; pageNumber <= pages; pageNumber += 1) {
        const next = await getSafetyCreditClient().pageDataSources({
          pageNumber,
          pageSize,
        });
        records.push(...(next.records ?? []));
      }
      return records;
    }

    async function loadDefaultWeightRows(existingRules: SafetyCreditScoreWeightRule[] = []): Promise<void> {
      weightLoading.value = true;
      try {
        const existingMap = buildExistingWeightMap(existingRules);
        const dataSources = await listConfiguredDataSources();
        const defaultRows: WeightFormRow[] = [];
        const rowKeys = new Set<string>();
        dataSources.forEach((source) => {
          (source.eventMappings ?? []).forEach((event) => {
            const applicationCode = cleanText(source.applicationCode);
            const eventId = cleanText(event.eventId);
            if (applicationCode === undefined || eventId === undefined) {
              return;
            }
            const key = weightRowKey(applicationCode, eventId);
            if (rowKeys.has(key)) {
              return;
            }
            rowKeys.add(key);
            defaultRows.push(createWeightRow(source, event, existingMap.get(key) ?? existingMap.get(eventId)));
          });
        });
        weightRows.value = defaultRows;
      } finally {
        weightLoading.value = false;
      }
    }

    function buildWeights(): SafetyCreditScoreWeightRule[] | undefined {
      if (weightRows.value.length === 0) {
        message.warning("请先在数据源配置中配置事件");
        return undefined;
      }
      const eventIds = new Set<string>();
      const weights: SafetyCreditScoreWeightRule[] = [];
      for (const row of weightRows.value) {
        const eventId = cleanText(row.eventId);
        if (eventId === undefined) {
          message.warning("请输入事件ID");
          return undefined;
        }
        if (eventIds.has(eventId)) {
          message.warning(`事件ID ${eventId} 重复`);
          return undefined;
        }
        eventIds.add(eventId);

        const scoreChange = toNumber(row.scoreChange, Number.NaN);
        if (!Number.isFinite(scoreChange)) {
          message.warning(`事件 ${eventId} 的分值无效`);
          return undefined;
        }

        const rule: SafetyCreditScoreWeightRule = {
          eventId,
          behaviorType: row.behaviorType,
          scoreChange,
        };
        const applicationCode = cleanText(row.applicationCode);
        const eventName = cleanText(row.eventName);
        if (applicationCode !== undefined) {
          rule.applicationCode = applicationCode;
        }
        if (eventName !== undefined) {
          rule.eventName = eventName;
        }
        weights.push(rule);
      }
      return weights;
    }

    function buildThresholds(): SafetyCreditGradeThreshold[] | undefined {
      const thresholds: SafetyCreditGradeThreshold[] = [];
      for (const row of thresholdRows.value) {
        const minScore = toNumber(row.minScore, Number.NaN);
        const maxScore = toNumber(row.maxScore, Number.NaN);
        if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
          message.warning(`${row.grade}级阈值无效`);
          return undefined;
        }
        if (minScore < 0 || maxScore > 100 || minScore > maxScore) {
          message.warning(`${row.grade}级阈值范围应在 0-100 内`);
          return undefined;
        }
        const threshold: SafetyCreditGradeThreshold = {
          grade: row.grade,
          minScore,
          maxScore,
        };
        const remark = cleanText(row.remark);
        if (remark !== undefined) {
          threshold.remark = remark;
        }
        thresholds.push(threshold);
      }
      return thresholds;
    }

    function buildChecklistItems(): SafetyCreditChecklistBaseItem[] | undefined {
      const items: SafetyCreditChecklistBaseItem[] = [];
      for (const row of checklistRows.value) {
        const itemName = cleanText(row.itemName);
        const itemCode = cleanText(row.itemCode);
        if (itemName === undefined && itemCode === undefined) {
          continue;
        }
        if (itemName === undefined) {
          message.warning("请输入检查项名称");
          return undefined;
        }
        const item: SafetyCreditChecklistBaseItem = {
          itemName,
          required: row.required,
        };
        const category = cleanText(row.category);
        const remark = cleanText(row.remark);
        if (itemCode !== undefined) {
          item.itemCode = itemCode;
        }
        if (category !== undefined) {
          item.category = category;
        }
        if (form.industryType !== "") {
          item.industryType = form.industryType;
        }
        if (remark !== undefined) {
          item.remark = remark;
        }
        items.push(item);
      }
      return items;
    }

    function buildPayload(): SafetyCreditScoreModelCommand | undefined {
      const modelName = cleanText(form.modelName);
      if (modelName === undefined) {
        message.warning("请输入模型名称");
        return undefined;
      }
      if (form.industryType === "") {
        message.warning("请选择行业");
        return undefined;
      }
      if (isIndustryUsed(form.industryType)) {
        message.warning(`${industryTypeLabel(form.industryType)}已配置评分模型`);
        return undefined;
      }
      const weights = buildWeights();
      const gradeThresholds = buildThresholds();
      const checklistItems = buildChecklistItems();
      if (weights === undefined || gradeThresholds === undefined || checklistItems === undefined) {
        return undefined;
      }
      const payload: SafetyCreditScoreModelCommand = {
        modelName,
        industryType: form.industryType,
        weightJson: JSON.stringify(weights),
        gradeThresholdJson: JSON.stringify(gradeThresholds),
        baseCheckItemJson: JSON.stringify(checklistItems),
      };
      return payload;
    }

    async function save(): Promise<void> {
      const payload = buildPayload();
      if (payload === undefined) {
        return;
      }
      saving.value = true;
      try {
        if (editingId.value !== undefined) {
          await getSafetyCreditClient().updateScoreModel(editingId.value, payload);
          message.success("评分模型已更新");
        } else {
          await getSafetyCreditClient().createScoreModel(payload);
          message.success("评分模型已新增");
        }
        formVisible.value = false;
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function publishModel(record: SafetyCreditScoreModelVO): Promise<void> {
      publishingId.value = record.id;
      try {
        await getSafetyCreditClient().publishScoreModel(record.id);
        message.success("评分模型已发布");
        await load();
      } finally {
        publishingId.value = undefined;
      }
    }

    async function requestSuggestion(): Promise<void> {
      const currentWeightsJson = JSON.stringify(
        weightRows.value.map((row) => ({
          applicationCode: cleanText(row.applicationCode),
          applicationName: cleanText(row.applicationName),
          eventId: cleanText(row.eventId) ?? "",
          eventName: cleanText(row.eventName),
          defaultScore: toNumber(row.defaultScore, 0),
          behaviorType: row.behaviorType,
          scoreChange: toNumber(row.scoreChange, 0),
        })),
      );
      suggestionLoading.value = true;
      try {
        const payload = {
          currentWeightsJson,
          behaviorSummary: "",
          violationSummary: "",
        };
        const modelId = editingId.value;
        if (modelId !== undefined) {
          Object.assign(payload, { modelId });
        }
        if (form.industryType !== "") {
          Object.assign(payload, { industryType: form.industryType });
        }
        suggestion.value = await getSafetyCreditClient().getScoreModelWeightSuggestion(payload);
      } finally {
        suggestionLoading.value = false;
      }
    }

    function applySuggestion(): void {
      const suggestions = (suggestion.value.suggestions as WeightSuggestionDisplayItem[]).filter(
        (item): item is CreditWeightSuggestionItem =>
          typeof item !== "string" && Number.isFinite(item.recommendedScore) && normalizeSuggestionText(item.eventType) !== "",
      );
      if (suggestions.length === 0) {
        message.warning("暂无可应用的AI建议");
        return;
      }

      let appliedCount = 0;
      weightRows.value = weightRows.value.map((row) => {
        const rowSources = [row.applicationCode, row.applicationName].map(normalizeSuggestionText).filter((item) => item !== "");
        const rowEvents = [row.eventId, row.eventName].map(normalizeSuggestionText).filter((item) => item !== "");
        const rowDefaultScore = toNumber(row.defaultScore, 0);

        const exactMatched = suggestions.find((item) => {
          const source = normalizeSuggestionText(item.sourceApplication);
          const event = normalizeSuggestionText(item.eventType);
          return rowSources.includes(source) && rowEvents.includes(event);
        });
        const fallbackMatches = suggestions.filter((item) => {
          const event = normalizeSuggestionText(item.eventType);
          return rowEvents.includes(event) && item.defaultScore === rowDefaultScore;
        });
        const fallbackMatched = exactMatched ?? (fallbackMatches.length === 1 ? fallbackMatches[0] : undefined);

        if (fallbackMatched?.recommendedScore === undefined) {
          return row;
        }

        appliedCount += 1;
        return {
          ...row,
          scoreChange: toInputNumberText(fallbackMatched.recommendedScore),
        };
      });

      if (appliedCount > 0) {
        message.success(`已应用${appliedCount}条AI建议`);
      } else {
        message.warning("未匹配到可应用的AI建议");
      }
    }

    function openVersions(record: SafetyCreditScoreModelVO): void {
      void router.push({
        path: "/d/safety-credit/score-models/versions",
        query: {
          modelId: String(record.id),
          modelName: record.modelName,
        },
      });
    }

    function renderWeightSection(): JSX.Element {
      const weightColumns = [
        {
          title: "源应用",
          dataIndex: "applicationName",
          align: "center" as const,
          width: 180,
          customRender: ({ record }: { record: WeightFormRow }): JSX.Element => (
            <div class="readonly-cell">
              <strong>{displayText(record.applicationName)}</strong>
            </div>
          ),
        },
        {
          title: "事件类型",
          dataIndex: "eventName",
          align: "center" as const,
          width: 180,
          customRender: ({ text }: { text?: string }): JSX.Element => <div class="event-id-readonly">{displayText(text)}</div>,
        },
        {
          title: "默认分值",
          dataIndex: "defaultScore",
          align: "center" as const,
          width: 110,
          customRender: ({ text }: { text?: string }): JSX.Element => <div class="event-id-readonly">{displayText(text)}</div>,
        },
        {
          title: "分值",
          dataIndex: "scoreChange",
          align: "center" as const,
          width: 130,
          customRender: ({ record }: { record: WeightFormRow }): JSX.Element => (
            <InputNumber
              value={toInputNumberValue(record.scoreChange)}
              onUpdate:value={(inputValue) => {
                const value = inputValue as number | null | undefined;
                return (record.scoreChange = toInputNumberText(value));
              }}
            />
          ),
        },
      ];

      return (
        <div class="s2-section">
          <div class="section-header">
            <h3>数据源事件权重</h3>
          </div>
          {weightLoading.value ? (
            <div class="empty-tip">正在加载数据源事件...</div>
          ) : weightRows.value.length > 0 ? (
            <Table
              class="s2-editable-table"
              rowKey="key"
              dataSource={weightRows.value}
              columns={weightColumns}
              pagination={false}
              size="small"
            />
          ) : (
            <div class="empty-tip">暂无数据源事件，请先在数据源配置中维护事件映射。</div>
          )}
        </div>
      );
    }

    const columns: PcTableColumn[] = [
      {
        title: "模型名称",
        dataIndex: "modelName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "行业",
        dataIndex: "industryType",
        align: "center" as const,
        width: 140,
        customRender: ({ text }: { text?: string }): string => industryTypeLabel(text),
      },
      {
        title: "状态",
        dataIndex: "status",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: ScoreModelStatus }): JSX.Element => (
          <Tag color={scoreModelStatusColor(text)}>{scoreModelStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "当前版本",
        align: "center" as const,
        width: 110,
        customRender: ({ record }: { record: SafetyCreditScoreModelVO }): string => displayText(record.currentVersion),
      },
      {
        title: "发布时间",
        dataIndex: "publishedTime",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): string => formatDateTime(text),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 260,
        fixed: "right" as const,
        customRender: ({ record }: { record: SafetyCreditScoreModelVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑权重
            </Button>
            <Button type="link" size="small" onClick={() => openVersions(record)}>
              历史版本
            </Button>
            <PopConfirm okText="确定" cancelText="取消" title="确认发布该评分模型？" onConfirm={() => void publishModel(record)}>
              <Button type="link" size="small" loading={publishingId.value === record.id}>
                发布
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_score-model-list", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    const thresholdColumns = [
      {
        title: "等级",
        dataIndex: "grade",
        align: "center" as const,
        width: 110,
        customRender: ({ record }: { record: ThresholdFormRow }): JSX.Element => (
          <Select
            value={record.grade}
            options={gradeOptions}
            onChange={(inputValue) => {
              const value = inputValue as CreditGrade;
              return (record.grade = value);
            }}
          />
        ),
      },
      {
        title: "最低分",
        dataIndex: "minScore",
        align: "center" as const,
        width: 120,
        customRender: ({ record }: { record: ThresholdFormRow }): JSX.Element => (
          <InputNumber
            value={toInputNumberValue(record.minScore)}
            onUpdate:value={(inputValue) => {
              const value = inputValue as number | null | undefined;
              return (record.minScore = toInputNumberText(value));
            }}
          />
        ),
      },
      {
        title: "最高分",
        dataIndex: "maxScore",
        align: "center" as const,
        width: 120,
        customRender: ({ record }: { record: ThresholdFormRow }): JSX.Element => (
          <InputNumber
            value={toInputNumberValue(record.maxScore)}
            onUpdate:value={(inputValue) => {
              const value = inputValue as number | null | undefined;
              return (record.maxScore = toInputNumberText(value));
            }}
          />
        ),
      },
      {
        title: "备注",
        dataIndex: "remark",
        align: "center" as const,
        customRender: ({ record }: { record: ThresholdFormRow }): JSX.Element => (
          <Input
            value={record.remark}
            placeholder="请输入备注"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.remark = value);
            }}
          />
        ),
      },
    ];

    const checklistColumns = [
      {
        title: "检查项编码",
        dataIndex: "itemCode",
        align: "center" as const,
        width: 180,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Input
            value={record.itemCode}
            placeholder="请输入检查项编码"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.itemCode = value);
            }}
          />
        ),
      },
      {
        title: "检查项名称",
        dataIndex: "itemName",
        align: "center" as const,
        width: 220,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Input
            value={record.itemName}
            placeholder="请输入检查项名称"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.itemName = value);
            }}
          />
        ),
      },
      {
        title: "检查类别",
        dataIndex: "category",
        align: "center" as const,
        width: 140,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Select
            value={record.category}
            placeholder="请选择检查类别"
            options={checkCategoryOptions}
            onChange={(inputValue) => {
              const value = inputValue as string;
              return (record.category = value);
            }}
          />
        ),
      },
      {
        title: "必查",
        dataIndex: "required",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Checkbox
            checked={record.required}
            onUpdate:checked={(inputValue) => {
              const checked = inputValue as boolean;
              return (record.required = checked);
            }}
          />
        ),
      },
      {
        title: "检查说明",
        dataIndex: "remark",
        align: "center" as const,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Input
            value={record.remark}
            placeholder="请输入检查说明"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.remark = value);
            }}
          />
        ),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: ChecklistFormRow }): JSX.Element => (
          <Button type="link" size="small" danger onClick={() => removeChecklistRow(record)}>
            删除
          </Button>
        ),
      },
    ];

    onMounted(() => {
      void load();
    });

    const searchFormSchema = [
      {
        component: "Input",
        label: "模型名称",
        fieldName: "modelName",
        componentProps: {
          placeholder: "请输入模型名称",
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
        label: "状态",
        fieldName: "status",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...scoreModelStatusOptions],
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
        query.modelName = String(data.modelName ?? "").trim();
        query.industryType = (data.industryType ?? "") as OptionalIndustryType;
        query.status = (data.status ?? "") as "" | ScoreModelStatus;
        void load();
      },
      handleReset: resetQuery,
    });

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openCreate}>
          新增模型
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
        <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
      ),
    };

    return (): JSX.Element => (
      <PageLayout title="评分权重配置" v-slots={slots}>
        <Modal
          okText="确定"
          cancelText="取消"
          v-model:open={formVisible.value}
          title={editingId.value === undefined ? "新增评分模型" : "编辑评分模型"}
          width={1080}
          confirmLoading={saving.value}
          onOk={() => void save()}
          onCancel={() => {
            formVisible.value = false;
          }}
        >
          <div class="s2-modal-body">
            <Form class="s2-form-grid" model={form} layout="vertical">
              <FormItem class="form-item" label="模型名称" required>
                <Input
                  value={form.modelName}
                  placeholder="请输入模型名称"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (form.modelName = value);
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="适用行业" required>
                <Select
                  value={form.industryType}
                  placeholder="请选择行业"
                  options={industryTypeOptions.map((option) => {
                    const disabled = isIndustryUsed(option.value);
                    return {
                      label: disabled ? `${option.label}（已配置）` : option.label,
                      value: option.value,
                      disabled,
                    };
                  })}
                  onChange={(inputValue) => {
                    const value = inputValue as SafetyCreditIndustryType;
                    return (form.industryType = value);
                  }}
                />
              </FormItem>
            </Form>

            <div class="s2-section">
              <div class="section-header">
                <h3>AI 权重建议</h3>
                <Space>
                  <Button size="small" loading={suggestionLoading.value} onClick={() => void requestSuggestion()}>
                    获取AI建议
                  </Button>
                  <PopConfirm okText="确定" cancelText="取消" title="确认将AI推荐分值应用到数据源事件权重？" onConfirm={applySuggestion}>
                    <Button size="small" disabled={suggestion.value.suggestions.length === 0 || suggestionLoading.value}>
                      应用AI建议
                    </Button>
                  </PopConfirm>
                </Space>
              </div>
              <div class="s2-ai-panel">
                <p>{displayText(suggestion.value.summary)}</p>
                {suggestion.value.suggestions.length > 0 ? (
                  <table class="s2-ai-suggestion-table">
                    <thead>
                      <tr>
                        <th>源应用</th>
                        <th>事件类型</th>
                        <th>默认分值</th>
                        <th>推荐分值</th>
                        <th>置信度</th>
                      </tr>
                    </thead>
                    <tbody>{renderWeightSuggestionRows(suggestion.value.suggestions)}</tbody>
                  </table>
                ) : null}
              </div>
            </div>

            {renderWeightSection()}

            <div class="s2-section">
              <div class="section-header">
                <h3>等级阈值</h3>
              </div>
              <Table
                class="s2-editable-table"
                rowKey="key"
                dataSource={thresholdRows.value}
                columns={thresholdColumns}
                pagination={false}
                size="small"
              />
            </div>

            <div class="s2-section">
              <div class="section-header">
                <h3>检查项基础库</h3>
                <Button size="small" onClick={addChecklistRow}>
                  新增检查项
                </Button>
              </div>
              {checklistRows.value.length > 0 ? (
                <Table
                  class="s2-editable-table"
                  rowKey="key"
                  dataSource={checklistRows.value}
                  columns={checklistColumns}
                  pagination={false}
                  size="small"
                />
              ) : (
                <div class="empty-tip">暂无检查项</div>
              )}
            </div>
          </div>
        </Modal>
      </PageLayout>
    );
  },
});
