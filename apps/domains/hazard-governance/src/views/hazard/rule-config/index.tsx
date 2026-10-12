import type { HazardCategoryTreeVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { levelText, normalizeHazardLevel, type HazardLevel } from "../shared/data";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { AiGenerateModal } from "./components/ai-generate-modal";
import { CategoryModal, type CategoryModalOpenOptions, type CategoryModalSavedPayload } from "./components/category-modal";
import { TypeRuleModal, type TypeRuleModalOpenOptions, type TypeRuleModalSavedPayload } from "./components/type-rule-modal";
import { useAuthRequest } from "@/api/request";
import { deleteHazardCategory, getHazardCategoryTree, listHazardApprovalTemplates } from "@/api/server";
import { PageLayout as PcLayout, usePcTable } from "@/pc-ui-runtime";
import {
  AntModal,
  Button,
  CaretDownOutlined,
  CaretRightOutlined,
  Card,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  Space,
  Tag,
  message,
} from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";

import "./index.less";

type CategoryLevel = 1 | 2;

interface CategorySelection {
  level: CategoryLevel;
  id: string;
}

interface ThirdTypeRow {
  id: string;
  categoryId: string;
  sortNo: number;
  parent1: string;
  parent2: string;
  name: string;
  level: HazardLevel;
  approvalTemplateId: string;
  limitHours: number;
  returnThreshold: number;
  enabled: boolean;
}

type ThirdCategory = ThirdTypeRow;

interface SecondCategory {
  id: string;
  parentId: string;
  sortNo: number;
  name: string;
  children: ThirdCategory[];
}

interface FirstCategory {
  id: string;
  parentId: string;
  sortNo: number;
  name: string;
  children: SecondCategory[];
}

const categories = reactive<FirstCategory[]>([]);

const unwrapCategoryTree = (response: unknown): HazardCategoryTreeVO[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (!response || typeof response !== "object") {
    return [];
  }
  const record = response as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data as HazardCategoryTreeVO[];
  }
  if (Array.isArray(record.result)) {
    return record.result as HazardCategoryTreeVO[];
  }
  if (Array.isArray(record.records)) {
    return record.records as HazardCategoryTreeVO[];
  }
  return [];
};

const readNodeId = (node: HazardCategoryTreeVO, fallback: string): string => String(node.id ?? fallback);

const readNodeName = (node: HazardCategoryTreeVO): string => node.name || "未命名分类";

const sortCategoryNodes = (nodes: HazardCategoryTreeVO[]): HazardCategoryTreeVO[] =>
  nodes.toSorted((prev, next) => (prev.sortNo ?? 0) - (next.sortNo ?? 0));

const normalizeCategoryTree = (tree: HazardCategoryTreeVO[]): FirstCategory[] => {
  const nextCategories: FirstCategory[] = [];

  sortCategoryNodes(tree).forEach((first, firstIndex) => {
    const firstId = readNodeId(first, `first-${firstIndex}`);
    const secondNodes = sortCategoryNodes(first.children ?? []);
    const secondCategories: SecondCategory[] = secondNodes.map((second, secondIndex) => {
      const secondId = readNodeId(second, `${firstId}-second-${secondIndex}`);
      const thirdCategories: ThirdCategory[] = sortCategoryNodes(second.children ?? []).map((third, thirdIndex) => {
        const thirdId = readNodeId(third, `${secondId}-third-${thirdIndex}`);
        return {
          id: thirdId,
          categoryId: secondId,
          sortNo: third.sortNo ?? thirdIndex + 1,
          parent1: firstId,
          parent2: secondId,
          name: readNodeName(third),
          level: normalizeHazardLevel(third.defaultLevel),
          approvalTemplateId: third.approvalTemplateId ?? "",
          limitHours: third.defaultDeadlineHours ?? 0,
          returnThreshold: third.acceptanceRejectThreshold ?? 0,
          enabled: third.enabled !== false,
        };
      });
      return {
        id: secondId,
        parentId: second.parentId ?? firstId,
        sortNo: second.sortNo ?? secondIndex + 1,
        name: readNodeName(second),
        children: thirdCategories,
      };
    });
    nextCategories.push({
      id: firstId,
      parentId: first.parentId ?? "0",
      sortNo: first.sortNo ?? firstIndex + 1,
      name: readNodeName(first),
      children: secondCategories,
    });
  });

  return nextCategories;
};

export const RuleConfig = defineComponent({
  name: "RuleConfig",
  setup: () => {
    const router = useRouter();
    const selected = reactive<{ level: CategoryLevel; id: string }>({ level: 1, id: "" });
    const categoryModalRef = ref<{ openModal: (options: CategoryModalOpenOptions) => void }>();
    const typeRuleModalRef = ref<{ openModal: (options: TypeRuleModalOpenOptions) => void }>();
    const aiGenerateModalRef = ref<{ openModal: () => void }>();
    const expanded = reactive<Record<string, boolean>>({});
    const templateNames = reactive<Record<string, string>>({});

    const selectedLabel = computed(() => {
      if (selected.level === 1) {
        return categories.find((item) => item.id === selected.id)?.name ?? "";
      }
      return categories.flatMap((item) => item.children).find((item) => item.id === selected.id)?.name ?? "";
    });
    const isExpanded = (id: string): boolean => expanded[id] !== false;

    const toggleExpand = (id: string, event: Event): void => {
      event.stopPropagation();
      expanded[id] = !isExpanded(id);
    };

    const selectedTypeRows = computed(() => {
      if (selected.level === 1) {
        const first = categories.find((item) => item.id === selected.id);
        return first ? first.children.flatMap((child) => child.children).toSorted((prev, next) => prev.sortNo - next.sortNo) : [];
      }
      const second = categories.flatMap((item) => item.children).find((item) => item.id === selected.id);
      return second ? second.children.toSorted((prev, next) => prev.sortNo - next.sortNo) : [];
    });

    const getChildTypes = (parent2: string): ThirdTypeRow[] =>
      (categories.flatMap((item) => item.children).find((item) => item.id === parent2)?.children ?? []).toSorted(
        (prev, next) => prev.sortNo - next.sortNo,
      );

    const applyCategoryTree = (tree: HazardCategoryTreeVO[], nextSelection?: CategorySelection): void => {
      const next = normalizeCategoryTree(tree);
      if (next.length === 0) {
        categories.splice(0, categories.length);
        selected.level = 1;
        selected.id = "";
        tableApi.query();
        return;
      }
      categories.splice(0, categories.length, ...next);
      if (nextSelection?.level === 1 && categories.some((item) => item.id === nextSelection.id)) {
        selectCategory(1, nextSelection.id);
        return;
      }
      if (nextSelection?.level === 2 && categories.some((item) => item.children.some((child) => child.id === nextSelection.id))) {
        selectCategory(2, nextSelection.id);
        return;
      }
      const first = categories[0];
      if (first) {
        selectCategory(1, first.id);
      }
    };

    const fetchTypeRulePage = async () => {
      if (!selected.id) {
        return { total: 0, pages: 0, records: [] };
      }
      const records = selectedTypeRows.value;
      return { total: records.length, pages: 1, records };
    };

    const loadCategoryTree = async (nextSelection?: CategorySelection): Promise<void> => {
      try {
        const response = await useAuthRequest(() => getHazardCategoryTree());
        applyCategoryTree(unwrapCategoryTree(response), nextSelection);
      } catch {
        categories.splice(0, categories.length);
        selected.level = 1;
        selected.id = "";
        tableApi.query();
        message.error("隐患分类树加载失败");
      }
    };

    const loadTemplateNames = async (): Promise<void> => {
      try {
        const templates = await useAuthRequest(() => listHazardApprovalTemplates({ pageNumber: 1, pageSize: 1000 }));
        Object.keys(templateNames).forEach((key) => {
          delete templateNames[key];
        });
        templates.forEach((template) => {
          templateNames[String(template.id)] = template.name;
        });
      } catch {
        Object.keys(templateNames).forEach((key) => {
          delete templateNames[key];
        });
      }
    };

    const selectCategory = (level: CategoryLevel, id: string): void => {
      selected.level = level;
      selected.id = id;
      tableApi.query();
    };

    const openEditCategoryModal = (level: CategoryLevel, id: string): void => {
      const current =
        level === 1
          ? categories.find((item) => item.id === id)
          : categories.flatMap((item) => item.children).find((item) => item.id === id);
      if (!current) {
        return;
      }
      const parent = level === 2 ? categories.find((item) => item.children.some((child) => child.id === id)) : undefined;
      categoryModalRef.value?.openModal({
        mode: "update",
        level,
        id,
        parentId: current.parentId,
        parentName: parent?.name,
        sortNo: current.sortNo,
        name: current.name,
      });
    };

    const addChildCategory = (level: CategoryLevel, id: string): void => {
      if (level === 1) {
        const parent = categories.find((item) => item.id === id);
        if (!parent) {
          return;
        }
        categoryModalRef.value?.openModal({
          mode: "create",
          level: 2,
          parentId: id,
          parentName: parent.name,
          sortNo: parent.children.length + 1,
        });
        return;
      }
      const parent1 = categories.find((item) => item.children.some((child) => child.id === id));
      const parent2 = parent1?.children.find((child) => child.id === id);
      if (!parent1 || !parent2) {
        return;
      }
      typeRuleModalRef.value?.openModal({
        mode: "create",
        categoryId: id,
        categoryName: parent2.name,
        parentName: parent1.name,
        sortNo: getChildTypes(id).length + 1,
      });
    };

    const openRootCategoryModal = (): void => {
      categoryModalRef.value?.openModal({
        mode: "create",
        level: 1,
        parentId: "0",
        sortNo: categories.length + 1,
      });
    };

    const handleCategorySaved = async (payload: CategoryModalSavedPayload): Promise<void> => {
      if (payload.parentId !== "0") {
        expanded[payload.parentId] = true;
      }
      expanded[payload.id] = true;
      await loadCategoryTree({ level: payload.level, id: payload.id });
      message.success(payload.mode === "create" ? (payload.level === 1 ? "一级品类已新增" : "二级品类已新增") : "品类名称已保存");
    };

    const handleTypeRuleSaved = async (payload: TypeRuleModalSavedPayload): Promise<void> => {
      const parent1 = categories.find((item) => item.children.some((child) => child.id === payload.categoryId));
      if (parent1) {
        expanded[parent1.id] = true;
      }
      expanded[payload.categoryId] = true;
      expanded[payload.id] = true;
      await loadCategoryTree({ level: 2, id: payload.categoryId });
      message.success(payload.mode === "create" ? "三级类型已新增" : "三级类型已保存");
    };

    const deleteCategory = (level: CategoryLevel, id: string): void => {
      const label =
        level === 1
          ? categories.find((item) => item.id === id)?.name
          : categories.flatMap((item) => item.children).find((item) => item.id === id)?.name;
      const parentId = level === 2 ? categories.find((item) => item.children.some((child) => child.id === id))?.id : undefined;
      AntModal.confirm({
        title: "确认删除品类",
        content: `删除「${label ?? ""}」会同时删除该层级下的所有子级和第三级类型配置，是否继续？`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteHazardCategory(id));
            await loadCategoryTree(parentId ? { level: 1, id: parentId } : undefined);
            message.success("品类及其子级已删除");
          } catch (error) {
            message.error(error instanceof Error ? error.message : "品类删除失败");
          }
        },
      });
    };

    const openEditTypeRuleModal = (row: ThirdTypeRow): void => {
      const parent1 = categories.find((item) => item.id === row.parent1);
      const parent2 = parent1?.children.find((item) => item.id === row.parent2);
      typeRuleModalRef.value?.openModal({
        mode: "update",
        id: row.id,
        categoryId: row.categoryId,
        categoryName: parent2?.name ?? "",
        parentName: parent1?.name ?? "",
        sortNo: row.sortNo,
        name: row.name,
        level: row.level,
        approvalTemplateId: row.approvalTemplateId,
        limitHours: row.limitHours,
        returnThreshold: row.returnThreshold,
        enabled: row.enabled,
      });
    };

    const deleteTypeRule = (row: ThirdTypeRow): void => {
      AntModal.confirm({
        title: "确认删除类型规则",
        content: `删除「${row.name}」后，该隐患类型规则将不再用于后续隐患治理流程，是否继续？`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteHazardCategory(row.id));
            await loadCategoryTree({ level: 2, id: row.parent2 });
            message.success("类型规则已删除");
          } catch (error) {
            message.error(error instanceof Error ? error.message : "类型规则删除失败");
          }
        },
      });
    };

    const columns: ColumnType[] = [
      {
        title: "隐患类型名称",
        dataIndex: "name",
        width: 220,
        customRender: ({ record }: { record: ThirdTypeRow }) => (
          <div class="hazard-name-editor">
            <span>{record.name}</span>
          </div>
        ),
      },
      {
        title: "默认等级",
        dataIndex: "level",
        width: 130,
        customRender: ({ record }: { record: ThirdTypeRow }) => levelText[record.level],
      },
      {
        title: "审批链模板",
        dataIndex: "approvalTemplateId",
        width: 170,
        customRender: ({ record }: { record: ThirdTypeRow }) =>
          record.approvalTemplateId ? (
            (templateNames[record.approvalTemplateId] ?? record.approvalTemplateId)
          ) : (
            <span class="hazard-muted">-</span>
          ),
      },
      {
        title: "默认时限",
        dataIndex: "limitHours",
        width: 140,
        customRender: ({ record }: { record: ThirdTypeRow }) => `${record.limitHours}h`,
      },
      {
        title: "退回阈值",
        dataIndex: "returnThreshold",
        width: 120,
        customRender: ({ record }: { record: ThirdTypeRow }) => `${record.returnThreshold}次`,
      },
      {
        title: "启用",
        dataIndex: "enabled",
        width: 90,
        customRender: ({ record }: { record: ThirdTypeRow }) => (
          <Tag color={record.enabled ? "green" : "default"}>{record.enabled ? "启用" : "停用"}</Tag>
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 120,
        customRender: ({ record }: { record: ThirdTypeRow }) => (
          <Space size={4}>
            <Button class="hazard-icon-action" type="link" size="small" title="编辑类型规则" onClick={() => openEditTypeRuleModal(record)}>
              <EditOutlined />
            </Button>
            <Button class="hazard-icon-action" type="link" size="small" danger title="删除类型规则" onClick={() => deleteTypeRule(record)}>
              <DeleteOutlined />
            </Button>
          </Space>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "HAZARD_TYPE_RULES",
      rowKey: "id",
      fetchApi: fetchTypeRulePage,
    });

    onMounted(() => {
      void loadCategoryTree();
      void loadTemplateNames();
    });

    const slots = {
      "layout-header": () => (
        <Space>
          <Button type="primary" onClick={() => aiGenerateModalRef.value?.openModal()}>
            AI智能生成
          </Button>
          <Button onClick={() => pushByHistory(router, { name: "approval-template-config" })}>审批链模板管理</Button>
        </Space>
      ),
      "layout-content": () => (
        <div class="hazard-rule-config">
          <Card
            class="hazard-category-tree"
            title={
              <div class="hazard-category-tree-title">
                <span>隐患品类树</span>
                <Button size="small" type="primary" onClick={openRootCategoryModal}>
                  新增
                </Button>
              </div>
            }
          >
            <div class="hazard-tree-note">最多支持 3 个层级；左侧仅选择一、二级，第三级在右侧列表维护。</div>
            <div class="hazard-tree-list">
              {categories.map((group) => (
                <div class="hazard-tree-group" key={group.id}>
                  <div
                    class={["hazard-tree-parent", selected.level === 1 && selected.id === group.id ? "hazard-tree-node-active" : ""].join(
                      " ",
                    )}
                    onClick={() => selectCategory(1, group.id)}
                  >
                    <div class="hazard-tree-title">
                      <Button
                        class="hazard-tree-toggle"
                        size="small"
                        type="link"
                        title={isExpanded(group.id) ? "收起" : "展开"}
                        onClick={(event: Event) => toggleExpand(group.id, event)}
                      >
                        {isExpanded(group.id) ? <CaretDownOutlined /> : <CaretRightOutlined />}
                      </Button>
                      <span>{group.name}</span>
                    </div>
                    <Space size={4}>
                      <Button
                        class="hazard-icon-action"
                        size="small"
                        type="link"
                        title="新增子级"
                        onClick={(event: Event) => {
                          event.stopPropagation();
                          addChildCategory(1, group.id);
                        }}
                      >
                        <PlusOutlined />
                      </Button>
                      <Button
                        class="hazard-icon-action"
                        size="small"
                        type="link"
                        title="修改名称"
                        onClick={(event: Event) => {
                          event.stopPropagation();
                          openEditCategoryModal(1, group.id);
                        }}
                      >
                        <EditOutlined />
                      </Button>
                      <Button
                        class="hazard-icon-action"
                        size="small"
                        type="link"
                        danger
                        title="删除品类"
                        onClick={(event: Event) => {
                          event.stopPropagation();
                          deleteCategory(1, group.id);
                        }}
                      >
                        <DeleteOutlined />
                      </Button>
                    </Space>
                  </div>
                  {isExpanded(group.id) ? (
                    <div class="hazard-tree-child-group">
                      {group.children.map((child) => (
                        <div class="hazard-tree-child-block" key={child.id}>
                          <div
                            class={[
                              "hazard-tree-child",
                              selected.level === 2 && selected.id === child.id ? "hazard-tree-node-active" : "",
                            ].join(" ")}
                            onClick={() => selectCategory(2, child.id)}
                          >
                            <div class="hazard-tree-title">
                              <Button
                                class="hazard-tree-toggle"
                                size="small"
                                type="link"
                                title={isExpanded(child.id) ? "收起" : "展开"}
                                onClick={(event: Event) => toggleExpand(child.id, event)}
                              >
                                {isExpanded(child.id) ? <CaretDownOutlined /> : <CaretRightOutlined />}
                              </Button>
                              <span>{child.name}</span>
                            </div>
                            <Space size={4}>
                              <Button
                                class="hazard-icon-action"
                                size="small"
                                type="link"
                                title="新增子级"
                                onClick={(event: Event) => {
                                  event.stopPropagation();
                                  addChildCategory(2, child.id);
                                }}
                              >
                                <PlusOutlined />
                              </Button>
                              <Button
                                class="hazard-icon-action"
                                size="small"
                                type="link"
                                title="修改名称"
                                onClick={(event: Event) => {
                                  event.stopPropagation();
                                  openEditCategoryModal(2, child.id);
                                }}
                              >
                                <EditOutlined />
                              </Button>
                              <Button
                                class="hazard-icon-action"
                                size="small"
                                type="link"
                                danger
                                title="删除品类"
                                onClick={(event: Event) => {
                                  event.stopPropagation();
                                  deleteCategory(2, child.id);
                                }}
                              >
                                <DeleteOutlined />
                              </Button>
                            </Space>
                          </div>
                          {isExpanded(child.id) ? (
                            <div class="hazard-tree-third-group">
                              {getChildTypes(child.id).length > 0 ? (
                                getChildTypes(child.id).map((type) => (
                                  <div class="hazard-tree-third" key={type.id}>
                                    <span>{type.name}</span>
                                  </div>
                                ))
                              ) : (
                                <div class="hazard-tree-empty">暂无三级类型</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <div class="hazard-type-panel">
            <div class="hazard-type-panel-head">
              <div>
                <strong>类型列表</strong>
                <span>
                  {selected.level === 1 ? "一级品类" : "二级品类"}：{selectedLabel.value}，共 {selectedTypeRows.value.length} 条第三级数据
                </span>
              </div>
            </div>
            <div class="hazard-type-table-body">
              <PcTable />
            </div>
          </div>
          <CategoryModal ref={categoryModalRef} onSaved={(payload: CategoryModalSavedPayload) => void handleCategorySaved(payload)} />
          <TypeRuleModal ref={typeRuleModalRef} onSaved={(payload: TypeRuleModalSavedPayload) => void handleTypeRuleSaved(payload)} />
          <AiGenerateModal ref={aiGenerateModalRef} onSaved={() => void loadCategoryTree()} />
        </div>
      ),
    };

    return () => <PcLayout title={`${useLayoutTitle("类型配置")}`} v-slots={slots} showFooter={false} />;
  },
});
