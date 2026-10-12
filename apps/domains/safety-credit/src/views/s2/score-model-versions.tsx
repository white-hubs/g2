import type {
  SafetyCreditChecklistBaseItem,
  SafetyCreditGradeThreshold,
  SafetyCreditId,
  SafetyCreditScoreModelVO,
  SafetyCreditScoreModelVersionVO,
  SafetyCreditScoreWeightRule,
} from "@g2-contract/safety-credit";
import { Button, Modal, PageLayout, type PcFormSchemaProp, type PcTableColumn, Table, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { behaviorTypeLabel, cleanText, creditGradeLabel, displayText, formatDateTime, industryTypeLabel, parseJsonArray } from "./shared";
import { getSafetyCreditClient } from "@/domain-context";

import "./s2.less";

interface ModelSelectOption {
  id: SafetyCreditId;
  modelName: string;
  industryType?: string;
  currentVersion?: string | number;
}

function extractWeights(record: SafetyCreditScoreModelVersionVO): SafetyCreditScoreWeightRule[] {
  return parseJsonArray<SafetyCreditScoreWeightRule>(record.weightJson);
}

function extractThresholds(record: SafetyCreditScoreModelVersionVO): SafetyCreditGradeThreshold[] {
  return parseJsonArray<SafetyCreditGradeThreshold>(record.gradeThresholdJson);
}

function extractChecklistItems(record: SafetyCreditScoreModelVersionVO): SafetyCreditChecklistBaseItem[] {
  return parseJsonArray<SafetyCreditChecklistBaseItem>(record.baseCheckItemJson);
}

export const ScoreModelVersions = defineComponent({
  name: "ScoreModelVersions",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const rows = ref<SafetyCreditScoreModelVersionVO[]>([]);
    const modelId = ref(typeof route.query.modelId === "string" ? route.query.modelId : "");
    const modelName = ref(typeof route.query.modelName === "string" ? route.query.modelName : "");
    const modelLoading = ref(false);
    const modelSearchText = ref("");
    const modelOptions = ref<ModelSelectOption[]>([]);
    const applicationNameMap = ref<Map<string, string>>(new Map());
    const detailVisible = ref(false);
    const selectedVersion = ref<SafetyCreditScoreModelVersionVO | null>(null);
    let modelSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let modelSearchSeq = 0;

    function modelOptionLabel(model: ModelSelectOption): string {
      const versionText = displayText(model.currentVersion);
      const industryText = industryTypeLabel(model.industryType);
      return `${displayText(model.modelName)} / ${industryText} / ${versionText}`;
    }

    function mergeSelectedModel(options: SafetyCreditScoreModelVO[]): ModelSelectOption[] {
      const result: ModelSelectOption[] = options.map((item) => ({
        id: item.id,
        modelName: item.modelName,
        industryType: item.industryType,
        currentVersion: item.currentVersion,
      }));
      if (modelId.value !== "" && modelName.value !== "" && !result.some((item) => String(item.id) === modelId.value)) {
        result.unshift({
          id: modelId.value,
          modelName: modelName.value,
        });
      }
      return result;
    }

    async function loadModelOptions(keyword = modelSearchText.value): Promise<void> {
      const searchSeq = ++modelSearchSeq;
      modelLoading.value = true;
      refreshModelFieldSchema();
      try {
        const modelNameKeyword = cleanText(keyword);
        const result = await getSafetyCreditClient().pageScoreModels({
          pageNumber: 1,
          pageSize: 50,
          ...(modelNameKeyword === undefined ? {} : { modelName: modelNameKeyword }),
        });
        if (searchSeq !== modelSearchSeq) {
          return;
        }
        modelOptions.value = mergeSelectedModel(result.records ?? []);
        refreshModelFieldSchema();
      } finally {
        if (searchSeq === modelSearchSeq) {
          modelLoading.value = false;
          refreshModelFieldSchema();
        }
      }
    }

    function searchModels(keyword: string): void {
      modelSearchText.value = keyword;
      refreshModelFieldSchema();
      if (modelSearchTimer !== undefined) {
        clearTimeout(modelSearchTimer);
      }
      modelSearchTimer = setTimeout(() => {
        void loadModelOptions(keyword);
      }, 250);
    }

    function selectModel(value?: string | number): void {
      const selectedId = value === undefined ? "" : String(value);
      const selectedModel = modelOptions.value.find((item) => String(item.id) === selectedId);
      modelId.value = selectedId;
      modelName.value = selectedId === "" ? "" : (selectedModel?.modelName ?? modelName.value);
      modelSearchText.value = "";
      refreshModelFieldSchema();
      if (selectedId === "") {
        rows.value = [];
        return;
      }
      void load();
    }

    async function load(): Promise<void> {
      const id = modelId.value.trim();
      if (id === "") {
        rows.value = [];
        return;
      }
      loading.value = true;
      try {
        rows.value = await getSafetyCreditClient().listScoreModelVersions(id);
      } finally {
        loading.value = false;
      }
    }

    async function loadDataSourceNames(): Promise<void> {
      const result = await getSafetyCreditClient().pageDataSources({
        pageNumber: 1,
        pageSize: 200,
      });
      applicationNameMap.value = new Map(
        (result.records ?? [])
          .filter((item) => cleanText(item.applicationCode) !== undefined)
          .map((item) => [item.applicationCode, displayText(item.applicationName)]),
      );
    }

    function sourceApplicationName(applicationCode?: string): string {
      const code = cleanText(applicationCode ?? "");
      if (code === undefined) {
        return "--";
      }
      return applicationNameMap.value.get(code) ?? "--";
    }

    function openDetail(record: SafetyCreditScoreModelVersionVO): void {
      selectedVersion.value = record;
      detailVisible.value = true;
    }

    function backToModels(): void {
      void router.push("/d/safety-credit/score-models");
    }

    const columns: PcTableColumn[] = [
      {
        title: "版本号",
        dataIndex: "versionNo",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: number | string }): string => displayText(text),
      },
      {
        title: "权重数",
        align: "center" as const,
        width: 100,
        customRender: ({ record }: { record: SafetyCreditScoreModelVersionVO }): string => displayText(extractWeights(record).length),
      },
      {
        title: "检查项数",
        align: "center" as const,
        width: 100,
        customRender: ({ record }: { record: SafetyCreditScoreModelVersionVO }): string =>
          displayText(extractChecklistItems(record).length),
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
        width: 100,
        fixed: "right" as const,
        customRender: ({ record }: { record: SafetyCreditScoreModelVersionVO }): JSX.Element => (
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({
      rowKey: "id",
      tableCode: "SAFETY_CREDIT_score-model-versions",
      columns,
      dataSource: [],
    });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    const weightDetailColumns = [
      {
        title: "源应用",
        dataIndex: "applicationCode",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): string => sourceApplicationName(text),
      },
      {
        title: "事件类型",
        dataIndex: "eventName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "行为类型",
        dataIndex: "behaviorType",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: SafetyCreditScoreWeightRule["behaviorType"] }): string => behaviorTypeLabel(text),
      },
      {
        title: "分值",
        dataIndex: "scoreChange",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
    ];

    const thresholdDetailColumns = [
      {
        title: "等级",
        dataIndex: "grade",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: SafetyCreditGradeThreshold["grade"] }): string => creditGradeLabel(text),
      },
      {
        title: "最低分",
        dataIndex: "minScore",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
      {
        title: "最高分",
        dataIndex: "maxScore",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
      {
        title: "备注",
        dataIndex: "remark",
        align: "center" as const,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
    ];

    const checklistDetailColumns = [
      {
        title: "检查项名称",
        dataIndex: "itemName",
        align: "center" as const,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "检查类别",
        dataIndex: "category",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "必查",
        dataIndex: "required",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: boolean }): string => displayText(text ?? true),
      },
      {
        title: "检查说明",
        dataIndex: "remark",
        align: "center" as const,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
    ];

    function renderVersionConfig(record: SafetyCreditScoreModelVersionVO): JSX.Element {
      const weights = extractWeights(record);
      const thresholds = extractThresholds(record);
      const checklistItems = extractChecklistItems(record);

      return (
        <>
          <div class="s2-section">
            <div class="section-header">
              <h3>数据源事件权重</h3>
            </div>
            {weights.length > 0 ? (
              <Table
                class="s2-editable-table"
                rowKey={(row: SafetyCreditScoreWeightRule, index?: number): string =>
                  `${row.applicationCode ?? ""}-${row.eventId}-${index ?? 0}`
                }
                dataSource={weights}
                columns={weightDetailColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <div class="empty-tip">暂无事件权重</div>
            )}
          </div>
          <div class="s2-section">
            <div class="section-header">
              <h3>等级阈值</h3>
            </div>
            {thresholds.length > 0 ? (
              <Table
                class="s2-editable-table"
                rowKey="grade"
                dataSource={thresholds}
                columns={thresholdDetailColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <div class="empty-tip">暂无等级阈值</div>
            )}
          </div>
          <div class="s2-section">
            <div class="section-header">
              <h3>检查项基础库</h3>
            </div>
            {checklistItems.length > 0 ? (
              <Table
                class="s2-editable-table"
                rowKey={(row: SafetyCreditChecklistBaseItem, index?: number): string => `${row.itemName}-${index ?? 0}`}
                dataSource={checklistItems}
                columns={checklistDetailColumns}
                pagination={false}
                size="small"
              />
            ) : (
              <div class="empty-tip">暂无检查项</div>
            )}
          </div>
        </>
      );
    }

    function modelFieldSchema(): PcFormSchemaProp {
      return {
        component: "Select",
        label: "模型",
        fieldName: "modelId",
        componentProps: {
          allowClear: true,
          filterOption: false,
          loading: modelLoading.value,
          optionFilterProp: "label",
          optionLabelProp: "label",
          placeholder: "请输入或选择评分模型",
          searchValue: modelSearchText.value,
          showSearch: true,
          class: "source-application-select",
          options: modelOptions.value.map((item) => ({ label: modelOptionLabel(item), value: String(item.id) })),
          onChange: (value: string | number | undefined) => selectModel(value),
          onSearch: searchModels,
          onClear: () => {
            selectModel(undefined);
            void loadModelOptions("");
          },
        },
      };
    }

    const [CubeForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: [modelFieldSchema()],
      showCollapseButton: true,
      handleSubmit: () => {
        void load();
      },
      handleReset: () => {
        selectModel(undefined);
        void loadModelOptions("");
      },
    });

    function refreshModelFieldSchema(): void {
      formApi.updateFieldSchema(modelFieldSchema());
      formApi.formValues.modelId = modelId.value || undefined;
    }

    onMounted(() => {
      void loadModelOptions();
      void loadDataSourceNames();
      if (modelId.value.trim() !== "") {
        void load();
      }
    });

    const slots = {
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2">
          <CubeForm />

          <section class="table-wrap">
            <DataTable />
          </section>
        </div>
      ),
      "footer-btn": (): JSX.Element => <Button onClick={backToModels}>返回</Button>,
    };

    return (): JSX.Element => (
      <PageLayout title="模型版本管理" v-slots={slots}>
        <Modal
          okText="确定"
          cancelText="取消"
          v-model:open={detailVisible.value}
          title={`版本详情 ${displayText(selectedVersion.value?.versionNo)}`}
          width={820}
          footer={null}
          onCancel={() => {
            detailVisible.value = false;
          }}
        >
          {selectedVersion.value !== null ? (
            <div class="s2-modal-body">
              <div class="s2-detail-grid">
                <div class="detail-item">
                  <span>版本号</span>
                  <strong>{displayText(selectedVersion.value.versionNo)}</strong>
                </div>
                <div class="detail-item">
                  <span>发布时间</span>
                  <strong>{formatDateTime(selectedVersion.value.publishedTime)}</strong>
                </div>
              </div>
              {renderVersionConfig(selectedVersion.value)}
            </div>
          ) : null}
        </Modal>
      </PageLayout>
    );
  },
});
