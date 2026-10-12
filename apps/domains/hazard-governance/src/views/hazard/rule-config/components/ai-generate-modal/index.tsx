import {
  HazardAiCategoryGenerationCallResult,
  HazardLevel as HazardLevelEnum,
  type HazardAiCategoryGenerationVO,
  type HazardCategoryBatchItemCommand,
  type HazardCategoryTreeVO,
} from "@g2-contract/hazard-governance";
import { computed, defineComponent, shallowRef } from "vue";

import { levelText, normalizeHazardLevel, type HazardLevel } from "../../../shared/data";
import { useAuthRequest } from "@/api/request";
import { batchCreateHazardCategories, generateHazardCategoriesByAi } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Alert, Select, Spin, message } from "@/pc-ui-runtime";

type GeneratePhase = "input" | "loading" | "result";

interface GeneratedTypeItem {
  id: string;
  firstName: string;
  secondName: string;
  typeName: string;
  level: HazardLevel;
  approvalTemplateId: string;
  approvalTemplateName: string;
  deadlineHours: number;
  returnThreshold: number;
  enabled: boolean;
  sortNo: number;
}

interface GeneratedSecondCategory {
  id: string;
  name: string;
  types: GeneratedTypeItem[];
}

interface GeneratedFirstCategory {
  id: string;
  name: string;
  children: GeneratedSecondCategory[];
}

const levelClassMap: Record<HazardLevel, string> = {
  [HazardLevelEnum.GENERAL]: "hazard-ai-level-normal",
  [HazardLevelEnum.MAJOR]: "hazard-ai-level-major",
  [HazardLevelEnum.CRITICAL]: "hazard-ai-level-critical",
};

const industryOptions = [
  { label: "农批市场", value: "农批市场" },
  { label: "冷库仓储", value: "冷库仓储" },
  { label: "粮库储备", value: "粮库储备" },
  { label: "化工园区", value: "化工园区" },
  { label: "通用仓储", value: "通用仓储" },
];

const flattenGeneratedTypes = (tree: GeneratedFirstCategory[]): GeneratedTypeItem[] =>
  tree.flatMap((first) => first.children.flatMap((second) => second.types));

const unwrapGenerationResult = (response: unknown): HazardAiCategoryGenerationVO => {
  if (!response || typeof response !== "object") {
    return {};
  }
  const record = response as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    return record.data as HazardAiCategoryGenerationVO;
  }
  if (record.result && typeof record.result === "object") {
    return record.result as HazardAiCategoryGenerationVO;
  }
  return response as HazardAiCategoryGenerationVO;
};

const readNodeId = (node: HazardCategoryTreeVO, fallback: string): string => String(node.id ?? fallback);

const readNodeName = (node: HazardCategoryTreeVO): string => node.name || "未命名分类";

const sortCategoryNodes = (nodes: HazardCategoryTreeVO[]): HazardCategoryTreeVO[] =>
  nodes.toSorted((prev, next) => (prev.sortNo ?? 0) - (next.sortNo ?? 0));

const getGeneratedTypeId = (
  first: HazardCategoryTreeVO,
  second: HazardCategoryTreeVO,
  type: HazardCategoryTreeVO,
  firstIndex: number,
  secondIndex: number,
  typeIndex: number,
): string => {
  const firstId = readNodeId(first, `generated-first-${firstIndex}`);
  const secondId = readNodeId(second, `${firstId}-second-${secondIndex}`);
  return readNodeId(type, `${secondId}-type-${typeIndex}`);
};

const normalizeGeneratedTree = (tree: HazardCategoryTreeVO[]): GeneratedFirstCategory[] =>
  sortCategoryNodes(tree).map((first, firstIndex) => {
    const firstName = readNodeName(first);
    const firstId = readNodeId(first, `generated-first-${firstIndex}`);
    const children = sortCategoryNodes(first.children ?? []).map((second, secondIndex) => {
      const secondName = readNodeName(second);
      const secondId = readNodeId(second, `${firstId}-second-${secondIndex}`);
      const types = sortCategoryNodes(second.children ?? []).map((type, typeIndex) => ({
        id: getGeneratedTypeId(first, second, type, firstIndex, secondIndex, typeIndex),
        firstName,
        secondName,
        typeName: readNodeName(type),
        level: normalizeHazardLevel(type.defaultLevel),
        approvalTemplateId: type.approvalTemplateId ? String(type.approvalTemplateId) : "",
        approvalTemplateName: type.approvalTemplateName ?? "",
        deadlineHours: type.defaultDeadlineHours ?? 0,
        returnThreshold: type.acceptanceRejectThreshold ?? 0,
        enabled: type.enabled !== false,
        sortNo: type.sortNo ?? typeIndex + 1,
      }));
      return {
        id: secondId,
        name: secondName,
        types,
      };
    });
    return {
      id: firstId,
      name: firstName,
      children,
    };
  });

const requestGeneratedTree = async (industry: string): Promise<HazardCategoryTreeVO[]> => {
  const response = await useAuthRequest(() => generateHazardCategoriesByAi({ industryName: industry }));
  const result = unwrapGenerationResult(response);
  if (result.callResult === HazardAiCategoryGenerationCallResult.FAILED) {
    throw new Error(result.failureReason || "AI 生成失败");
  }
  return result.categories ?? [];
};

const omitAiSceneCode = (node: HazardCategoryTreeVO): Omit<HazardCategoryTreeVO, "aiSceneCode"> => {
  const next = { ...node };
  delete next.aiSceneCode;
  return next;
};

const buildBatchCreateTree = (tree: HazardCategoryTreeVO[], selectedTypeIds: string[]): HazardCategoryBatchItemCommand[] => {
  const selectedIdSet = new Set(selectedTypeIds);
  return sortCategoryNodes(tree)
    .map((first, firstIndex) => {
      const children = sortCategoryNodes(first.children ?? [])
        .map((second, secondIndex) => {
          const typeChildren = sortCategoryNodes(second.children ?? [])
            .filter((type, typeIndex) => selectedIdSet.has(getGeneratedTypeId(first, second, type, firstIndex, secondIndex, typeIndex)))
            .map((type, typeIndex) => {
              const typePayload = omitAiSceneCode(type);
              return {
                ...typePayload,
                name: readNodeName(type),
                sortNo: type.sortNo ?? typeIndex + 1,
                defaultLevel: normalizeHazardLevel(type.defaultLevel),
                approvalTemplateId: type.approvalTemplateId ? String(type.approvalTemplateId) : undefined,
                defaultDeadlineHours: Math.max(1, type.defaultDeadlineHours ?? 1),
                acceptanceRejectThreshold: Math.max(1, type.acceptanceRejectThreshold ?? 1),
                enabled: type.enabled !== false,
              };
            });
          const secondPayload = omitAiSceneCode(second);
          return {
            ...secondPayload,
            name: readNodeName(second),
            sortNo: second.sortNo ?? secondIndex + 1,
            children: typeChildren,
          };
        })
        .filter((second) => second.children.length > 0);
      const firstPayload = omitAiSceneCode(first);
      return {
        ...firstPayload,
        name: readNodeName(first),
        sortNo: first.sortNo ?? firstIndex + 1,
        children,
      };
    })
    .filter((first) => first.children.length > 0);
};

export const AiGenerateModal = defineComponent({
  name: "AiGenerateModal",
  emits: ["saved"],
  setup: (_, { expose, emit }) => {
    const phase = shallowRef<GeneratePhase>("input");
    const aiIndustry = shallowRef("农批市场");
    const generatedCategoryTree = shallowRef<HazardCategoryTreeVO[]>([]);
    const generatedTree = shallowRef<GeneratedFirstCategory[]>([]);
    const selectedIds = shallowRef<string[]>([]);

    const generatedTypes = computed(() => flattenGeneratedTypes(generatedTree.value));
    const selectedTypes = computed(() => generatedTypes.value.filter((item) => selectedIds.value.includes(item.id)));
    const selectedAll = computed(() => generatedTypes.value.length > 0 && selectedTypes.value.length === generatedTypes.value.length);

    const reset = (): void => {
      phase.value = "input";
      generatedCategoryTree.value = [];
      generatedTree.value = [];
      selectedIds.value = [];
      modalApi.setState({ confirmText: "开始生成", confirmLoading: false });
    };

    const openModal = (): void => {
      reset();
      modalApi.open();
    };

    const toggleSelect = (id: string, checked: boolean): void => {
      if (checked) {
        selectedIds.value = Array.from(new Set([...selectedIds.value, id]));
        return;
      }
      selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id);
    };

    const toggleSelectAll = (checked: boolean): void => {
      selectedIds.value = checked ? generatedTypes.value.map((item) => item.id) : [];
    };

    const readChecked = (event: Event): boolean => (event.target as HTMLInputElement).checked;

    const generate = async (): Promise<void> => {
      if (!aiIndustry.value) {
        message.warning("请选择所属行业");
        return;
      }
      phase.value = "loading";
      modalApi.setState({ confirmLoading: true, confirmText: "AI 正在生成中" });
      try {
        const nextTree = await requestGeneratedTree(aiIndustry.value);
        generatedCategoryTree.value = nextTree;
        generatedTree.value = normalizeGeneratedTree(nextTree);
        toggleSelectAll(true);
        phase.value = "result";
        modalApi.setState({ confirmLoading: false, confirmText: "确认写入类型配置" });
      } catch (error) {
        phase.value = "input";
        modalApi.setState({ confirmLoading: false, confirmText: "开始生成" });
        message.error(error instanceof Error ? error.message : "AI 生成失败");
      }
    };

    const saveSelectedTypes = async (): Promise<void> => {
      if (selectedTypes.value.length === 0) {
        message.warning("请至少选择一条生成结果");
        return;
      }
      modalApi.setConfirmLoading(true);
      try {
        const categories = buildBatchCreateTree(generatedCategoryTree.value, selectedIds.value);
        await useAuthRequest(() => batchCreateHazardCategories({ categories }));
        message.success("AI 生成结果已写入类型配置");
        emit("saved");
        modalApi.close();
      } catch {
        message.error("写入类型配置失败");
      } finally {
        modalApi.setConfirmLoading(false);
      }
    };

    const handleConfirm = (): void => {
      if (phase.value === "input") {
        void generate();
        return;
      }
      if (phase.value === "result") {
        void saveSelectedTypes();
      }
    };

    const [PcModal, modalApi] = usePcModal({
      title: "AI 智能生成隐患类型",
      width: "900px",
      confirmText: "开始生成",
      onConfirm: handleConfirm,
      onCancel: () => modalApi.close(),
      onClosed: reset,
    });

    expose({ openModal });

    const slots = {
      default: (): JSX.Element => (
        <div class="hazard-ai-generate-modal">
          <p class="hazard-muted">AI 根据行业安全法规和领域知识，一次性生成完整的品类树和隐患类型配置。</p>
          <div class="hazard-ai-field">
            <span>所属行业</span>
            <Select v-model:value={aiIndustry.value} options={industryOptions} disabled={phase.value !== "input"} />
          </div>
          {phase.value === "input" ? (
            <Alert
              type="info"
              showIcon
              message="预览生成结果"
              description="选择所属行业后点击开始生成，AI 将自动推荐品类树和隐患类型规则。"
            />
          ) : null}
          {phase.value === "loading" ? (
            <div class="hazard-ai-loading">
              <Spin />
              <strong>AI 正在生成中</strong>
              <span>正在结合行业安全法规、领域知识和治理规则生成隐患分类体系。</span>
            </div>
          ) : null}
          {phase.value === "result" ? (
            <div class="hazard-ai-result">
              <div class="hazard-ai-result-head">
                <strong>预览生成结果</strong>
                <span>
                  品类树 {generatedTree.value.length} 大类 · 共 {generatedTypes.value.length} 条类型 · 已选 {selectedTypes.value.length} 条
                </span>
              </div>
              <div class="hazard-ai-preview">
                <div class="hazard-ai-tree-preview">
                  <strong>品类树预览</strong>
                  {generatedTree.value.map((first) => (
                    <div class="hazard-ai-tree-first" key={first.id}>
                      <span>{first.name}</span>
                      {first.children.map((second) => (
                        <div class="hazard-ai-tree-second" key={second.id}>
                          {second.name}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div class="hazard-ai-type-list">
                  <div class="hazard-ai-type-row hazard-ai-type-head">
                    <input
                      class="hazard-ai-checkbox"
                      type="checkbox"
                      checked={selectedAll.value}
                      aria-label="全选生成结果"
                      onChange={(event: Event) => toggleSelectAll(readChecked(event))}
                    />
                    <span>类型名称（大类 / 二类 / 小类）</span>
                    <span>等级</span>
                    <span>审批链</span>
                    <span>时限</span>
                  </div>
                  {generatedTypes.value.map((type) => {
                    const checked = selectedIds.value.includes(type.id);
                    return (
                      <div class={["hazard-ai-type-row", checked ? "hazard-ai-type-row-selected" : ""].join(" ")} key={type.id}>
                        <input
                          class="hazard-ai-checkbox"
                          type="checkbox"
                          checked={checked}
                          aria-label={`选择${type.typeName}`}
                          onChange={(event: Event) => toggleSelect(type.id, readChecked(event))}
                        />
                        <span class="hazard-ai-type-name">
                          {type.firstName} / {type.secondName} / <strong>{type.typeName}</strong>
                        </span>
                        <span class={levelClassMap[type.level]}>{levelText[type.level]}</span>
                        <span>T{type.approvalTemplateId}</span>
                        <span>
                          {type.deadlineHours}h({Math.max(1, Math.floor(type.deadlineHours / 24))}天)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div class="hazard-muted">AI 基于《{aiIndustry.value}行业安全规范》自动推荐完整隐患分类体系，可勾选需要写入的类型。</div>
            </div>
          ) : null}
        </div>
      ),
    };

    return (): JSX.Element => <PcModal v-slots={slots} />;
  },
});
