import type { CertCategoryTreeVO } from "@g2-contract/safety-personnel";
import {
  Button,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PopConfirm,
  PopOver,
  Radio,
  RadioGroup,
  Select,
  SelectOption,
  Space,
  Spin,
  TabPane,
  Table,
  Tabs,
  Textarea,
  TreeSelect,
  message,
} from "@g2-platform/pc-ui";

import layoutStyles from "../../../layout.module.css";
/** @jsxImportSource vue */
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";

import {
  createCertCategory,
  createCertCategoryChild,
  createCertType,
  deleteCertCategory,
  deleteCertType,
  getCertCategoryTree,
  getCertType,
  pageCertTypes,
  updateCertCategory,
  updateCertType,
} from "../../../api/safety-personnel";
import { PageShell } from "../../../components/page-shell/page-shell";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { useLayoutTableScroll } from "../../../hooks/use-layout-table-scroll";
import type { CertCategoryUI, CertTypeRowUI } from "../../../types/ui";
import { showApiError } from "../../../utils/api-error";
import { buildCategoryNameMap, certCategoryToTreeSelectData, mapCertCategoryTree, mapCertTypeRow } from "../../../utils/mappers";

import styles from "./index.module.css";

function formatSortNo(value?: number): string | number {
  if (value == null) {
    return "--";
  }
  return value + 1;
}

const unitToApi = (u: string): string => (u === "month" ? "MONTH" : "YEAR");
const unitFromApi = (u?: string): string => (u === "MONTH" ? "month" : "year");

function collectCategoryNodeIds(nodes: CertCategoryUI[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children.length > 0) {
      ids.push(...collectCategoryNodeIds(node.children));
    }
  }
  return ids;
}

function filterCertCategoryTree(nodes: CertCategoryUI[], keyword: string): CertCategoryUI[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    return nodes;
  }

  const walk = (list: CertCategoryUI[]): CertCategoryUI[] => {
    const result: CertCategoryUI[] = [];
    for (const node of list) {
      const children = walk(node.children);
      const nameMatch = node.name.toLowerCase().includes(kw);
      if (nameMatch || children.length > 0) {
        result.push({ ...node, children });
      }
    }
    return result;
  };
  return walk(nodes);
}

type CategoryModalMode = "addRoot" | "addChild" | "edit";
type TypeDrawerMode = "add" | "edit";

interface CategoryTreeOption {
  value: string;
  title: string;
  children?: CategoryTreeOption[];
}

export const CertConfigPage = defineComponent({
  setup() {
    const { scrollY, recalc } = useLayoutTableScroll();
    const activeTab = ref("type");
    const categoryTreeRaw = ref<CertCategoryTreeVO[]>([]);
    const categoryTree = ref<CertCategoryUI[]>([]);
    const categoryTreeSelectData = ref<{ value: string; title: string; children?: CategoryTreeOption[] }[]>([]);
    const categoryLoading = ref(false);
    const categoryExpandedRowKeys = ref<string[]>([]);
    const categoryKeyword = ref("");
    const categoryModalOpen = ref(false);
    const categoryModalTitle = ref("");
    const categoryModalMode = ref<CategoryModalMode>("addRoot");
    const categoryFormName = ref("");
    const categoryParent = ref<CertCategoryUI | null>(null);
    const categoryEditingId = ref<string | null>(null);
    const categorySaving = ref(false);
    const typeRecords = ref<CertTypeRowUI[]>([]);
    const typeLoading = ref(false);
    const typeDrawerOpen = ref(false);
    const typeDrawerMode = ref<TypeDrawerMode>("add");
    const typeEditingId = ref<string | null>(null);
    const typeDrawerLoading = ref(false);
    const typeSaving = ref(false);
    const typeFilters = reactive({
      categoryId: undefined as string | undefined,
      keyword: "",
    });
    const form = reactive({
      typeName: "",
      categoryId: undefined as string | undefined,
      validPeriod: undefined as number | undefined,
      validPeriodUnit: "year",
      warnDays: undefined as number | undefined,
      needReview: true,
      reviewPeriod: undefined as number | undefined,
      reviewPeriodUnit: "year",
      definition: "",
    });

    const filteredCategoryTree = computed(() => filterCertCategoryTree(categoryTree.value, categoryKeyword.value));

    watch(categoryKeyword, (val) => {
      if (val.trim()) {
        categoryExpandedRowKeys.value = collectCategoryNodeIds(filteredCategoryTree.value);
      }
    });

    const loadCategories = async (): Promise<void> => {
      categoryLoading.value = true;
      try {
        categoryTreeRaw.value = await useAuthRequest(() => getCertCategoryTree());
        categoryTree.value = mapCertCategoryTree(categoryTreeRaw.value);
        categoryTreeSelectData.value = certCategoryToTreeSelectData(categoryTreeRaw.value);
      } catch (e) {
        showApiError(e);
        categoryTreeRaw.value = [];
        categoryTree.value = [];
        categoryTreeSelectData.value = [];
      } finally {
        categoryLoading.value = false;
        recalc();
      }
    };

    const loadTypes = async (): Promise<void> => {
      typeLoading.value = true;
      try {
        const page = await useAuthRequest(() =>
          pageCertTypes({
            pageNumber: 1,
            pageSize: 200,
            categoryId: typeFilters.categoryId || undefined,
            keyword: typeFilters.keyword.trim() || undefined,
          }),
        );
        const catMap = buildCategoryNameMap(categoryTreeRaw.value);
        typeRecords.value = page.records.map((r) => mapCertTypeRow(r, catMap.get(String(r.categoryId ?? "")) ?? ""));
      } catch (e) {
        showApiError(e);
        typeRecords.value = [];
      } finally {
        typeLoading.value = false;
        recalc();
      }
    };

    const onSearchTypes = (): void => {
      void loadTypes();
    };

    const onResetTypeFilters = (): void => {
      typeFilters.categoryId = undefined;
      typeFilters.keyword = "";
      void loadTypes();
    };

    const onSearchCategories = (): void => {
      categoryExpandedRowKeys.value = collectCategoryNodeIds(filteredCategoryTree.value);
    };

    const onResetCategoryKeyword = (): void => {
      categoryKeyword.value = "";
      categoryExpandedRowKeys.value = [];
    };

    const reload = async (): Promise<void> => {
      await loadCategories();
      await loadTypes();
    };

    onMounted(() => {
      void reload();
      recalc();
    });

    const saveDisabled = computed(
      () =>
        !form.typeName.trim() ||
        !form.categoryId ||
        form.validPeriod == null ||
        form.warnDays == null ||
        (form.needReview && form.reviewPeriod == null),
    );

    const typeDrawerTitle = computed(() => (typeDrawerMode.value === "add" ? "新增证书类型" : "编辑证书类型"));

    const resetTypeForm = (): void => {
      form.typeName = "";
      form.categoryId = undefined;
      form.validPeriod = undefined;
      form.validPeriodUnit = "year";
      form.warnDays = undefined;
      form.needReview = true;
      form.reviewPeriod = undefined;
      form.reviewPeriodUnit = "year";
      form.definition = "";
    };

    const fillTypeForm = (data: {
      typeName?: string;
      categoryId?: string;
      validPeriod?: number;
      validPeriodUnit?: string;
      warnDays?: number;
      needReview?: boolean;
      reviewPeriod?: number;
      reviewPeriodUnit?: string;
      definition?: string;
    }): void => {
      form.typeName = data.typeName ?? "";
      form.categoryId = data.categoryId != null ? String(data.categoryId) : undefined;
      form.validPeriod = data.validPeriod;
      form.validPeriodUnit = unitFromApi(data.validPeriodUnit);
      form.warnDays = data.warnDays;
      form.needReview = data.needReview ?? true;
      form.reviewPeriod = data.reviewPeriod;
      form.reviewPeriodUnit = unitFromApi(data.reviewPeriodUnit);
      form.definition = data.definition ?? "";
    };

    const openTypeAdd = (): void => {
      typeDrawerMode.value = "add";
      typeEditingId.value = null;
      resetTypeForm();
      typeDrawerOpen.value = true;
    };

    const openTypeEdit = async (typeId: string): Promise<void> => {
      typeDrawerMode.value = "edit";
      typeEditingId.value = typeId;
      resetTypeForm();
      typeDrawerOpen.value = true;
      typeDrawerLoading.value = true;
      try {
        const data = await useAuthRequest(() => getCertType(typeId));
        fillTypeForm(data);
      } catch (e) {
        showApiError(e);
        typeDrawerOpen.value = false;
      } finally {
        typeDrawerLoading.value = false;
      }
    };

    const onSaveType = async (): Promise<void> => {
      if (saveDisabled.value || !form.categoryId) {
        return;
      }
      typeSaving.value = true;
      try {
        const payload = {
          categoryId: form.categoryId,
          typeName: form.typeName.trim(),
          definition: form.definition.trim() || undefined,
          validPeriod: form.validPeriod!,
          validPeriodUnit: unitToApi(form.validPeriodUnit),
          warnDays: form.warnDays!,
          needReview: form.needReview,
          reviewPeriod: form.needReview ? form.reviewPeriod : undefined,
          reviewPeriodUnit: form.needReview ? unitToApi(form.reviewPeriodUnit) : undefined,
        };
        if (typeDrawerMode.value === "add") {
          await useAuthRequest(() => createCertType(payload));
        } else if (typeEditingId.value) {
          await useAuthRequest(() => updateCertType(typeEditingId.value!, payload));
        }
        message.success("保存成功");
        typeDrawerOpen.value = false;
        await loadTypes();
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        typeSaving.value = false;
      }
    };

    const openCategoryAddRoot = (): void => {
      categoryModalMode.value = "addRoot";
      categoryModalTitle.value = "新增证书分类";
      categoryFormName.value = "";
      categoryParent.value = null;
      categoryEditingId.value = null;
      categoryModalOpen.value = true;
    };

    const openCategoryAddChild = (record: CertCategoryUI): void => {
      if (!categoryExpandedRowKeys.value.includes(record.id)) {
        categoryExpandedRowKeys.value = [...categoryExpandedRowKeys.value, record.id];
      }
      categoryModalMode.value = "addChild";
      categoryModalTitle.value = `新增下级-${record.name}`;
      categoryFormName.value = "";
      categoryParent.value = record;
      categoryEditingId.value = null;
      categoryModalOpen.value = true;
    };

    const openCategoryEdit = (record: CertCategoryUI): void => {
      categoryModalMode.value = "edit";
      categoryModalTitle.value = "编辑证书分类";
      categoryFormName.value = record.name;
      categoryEditingId.value = record.id;
      categoryParent.value = null;
      categoryModalOpen.value = true;
    };

    const handleCategoryModalOk = async (): Promise<void> => {
      const name = categoryFormName.value.trim();
      if (!name) {
        message.warning("请输入分类名称");
        return;
      }
      categorySaving.value = true;
      try {
        if (categoryModalMode.value === "addRoot") {
          await useAuthRequest(() => createCertCategory({ name }));
        } else if (categoryModalMode.value === "addChild" && categoryParent.value) {
          await useAuthRequest(() => createCertCategoryChild(categoryParent.value!.id, { name }));
        } else if (categoryModalMode.value === "edit" && categoryEditingId.value) {
          await useAuthRequest(() => updateCertCategory(categoryEditingId.value!, { name }));
        }
        categoryModalOpen.value = false;
        message.success("操作成功");
        await reload();
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        categorySaving.value = false;
      }
    };

    const deleteCategory = async (record: CertCategoryUI): Promise<void> => {
      if (record.children.length > 0) {
        message.warning("请先删除下级分类");
        return;
      }
      try {
        await useAuthRequest(() => deleteCertCategory(record.id));
        message.success("已删除");
        await reload();
      } catch (e) {
        showApiError(e, "删除失败");
      }
    };

    const handleCategoryExpand = (expanded: boolean, record: CertCategoryUI): void => {
      if (expanded) {
        if (!categoryExpandedRowKeys.value.includes(record.id)) {
          categoryExpandedRowKeys.value = [...categoryExpandedRowKeys.value, record.id];
        }
      } else {
        categoryExpandedRowKeys.value = categoryExpandedRowKeys.value.filter((id) => id !== record.id);
      }
    };

    const deleteType = async (typeId: string): Promise<void> => {
      try {
        await useAuthRequest(() => deleteCertType(typeId));
        message.success("已删除");
        await loadTypes();
      } catch (e) {
        showApiError(e, "删除失败");
      }
    };

    const categoryColumns = [
      {
        title: "分类名称",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        customRender: ({ text }: { text: string }) => (
          <PopOver content={text || "--"}>
            <span>{text || "--"}</span>
          </PopOver>
        ),
      },
      {
        title: "排序",
        dataIndex: "sortNo",
        key: "sortNo",
        width: 88,
        customRender: ({ text }: { text?: number }) => formatSortNo(text),
      },
      {
        title: "操作",
        key: "action",
        width: 220,
        fixed: "right" as const,
        customRender: ({ record }: { record: CertCategoryUI }) => (
          <Space size={16}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                openCategoryAddChild(record);
              }}
            >
              新增下级
            </Button>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                openCategoryEdit(record);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="是否删除当前选中？"
              okText="确定"
              cancelText="取消"
              onConfirm={() => {
                void deleteCategory(record);
              }}
            >
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: 0 }}
                onClick={(e: Event) => {
                  e.stopPropagation();
                }}
              >
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    const typeColumns = [
      { title: "证书分类", dataIndex: "categoryName", width: 120 },
      { title: "证书类型", dataIndex: "typeName", width: 140 },
      { title: "证书定义", dataIndex: "definition", width: 200, ellipsis: true },
      { title: "有效周期(年)", dataIndex: "validPeriod", width: 120 },
      {
        title: "是否需要复审",
        dataIndex: "needReview",
        width: 128,
        customRender: ({ record }: { record: CertTypeRowUI }) => (record.needReview ? "是" : "否"),
      },
      { title: "预警天数", dataIndex: "warnDays", width: 100 },
      { title: "复审周期", dataIndex: "reviewPeriod", width: 100 },
      {
        title: "操作",
        width: 120,
        fixed: "right" as const,
        customRender: ({ record }: { record: CertTypeRowUI }) => (
          <Space size={16}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                void openTypeEdit(record.typeId);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="确定删除该证书类型？"
              onConfirm={() => {
                void deleteType(record.typeId);
              }}
            >
              <Button type="link" size="small" danger style={{ padding: 0 }}>
                删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    return () => (
      <div class={layoutStyles.route}>
        <PageShell title="参数配置 / 证书配置" showFooter={false}>
          {{
            "layout-content": () => (
              <div class={styles.wrap}>
                <Tabs v-model:activeKey={activeTab.value}>
                  <TabPane key="category" tab="证书分类">
                    <div class={styles.tabToolbar} data-layout-toolbar>
                      <div class={styles.tabToolbarFilters}>
                        <Input
                          class={styles.searchInput}
                          placeholder="分类名称"
                          showCount={false}
                          allowClear
                          maxlength={100}
                          value={categoryKeyword.value}
                          onUpdate:value={(value) => {
                            const v = String(value ?? "");
                            categoryKeyword.value = v;
                          }}
                          onPressEnter={onSearchCategories}
                        />
                        <Button type="primary" onClick={onSearchCategories}>
                          查询
                        </Button>
                        <Button onClick={onResetCategoryKeyword}>重置</Button>
                      </div>
                      <div class={styles.tabToolbarActions}>
                        <Button type="primary" onClick={openCategoryAddRoot}>
                          新增
                        </Button>
                      </div>
                    </div>
                    <div class="tableWrap">
                      <Table
                        class={styles.configTable}
                        rowKey="id"
                        columns={categoryColumns}
                        dataSource={filteredCategoryTree.value}
                        loading={categoryLoading.value}
                        pagination={false}
                        size="middle"
                        scroll={{ y: scrollY.value, x: 560 }}
                        expandedRowKeys={categoryExpandedRowKeys.value}
                        childrenColumnName="children"
                        locale={{ emptyText: <Empty description="暂无证书分类" /> }}
                        onExpand={(expanded: boolean, record: CertCategoryUI) => {
                          handleCategoryExpand(expanded, record);
                        }}
                      />
                    </div>
                  </TabPane>
                  <TabPane key="type" tab="证书类型">
                    <div class={styles.tabToolbar} data-layout-toolbar>
                      <Form layout="inline" class={styles.searchForm}>
                        <FormItem label="证书分类" class={styles.searchItem}>
                          <TreeSelect
                            showSearch
                            treeDefaultExpandAll
                            allowClear
                            placeholder="请选择"
                            style={{ width: "200px" }}
                            treeData={categoryTreeSelectData.value}
                            treeNodeFilterProp="title"
                            value={typeFilters.categoryId}
                            onUpdate:value={(value) => {
                              const v = typeof value === "string" ? value : undefined;
                              typeFilters.categoryId = v;
                            }}
                          />
                        </FormItem>
                        <FormItem class={styles.searchItem}>
                          <Input
                            placeholder="证书类型名称"
                            style={{ width: "200px" }}
                            showCount={false}
                            allowClear
                            maxlength={100}
                            value={typeFilters.keyword}
                            onUpdate:value={(value) => {
                              const v = String(value ?? "");
                              typeFilters.keyword = v;
                            }}
                            onPressEnter={onSearchTypes}
                          />
                        </FormItem>
                        <FormItem class={styles.searchItem}>
                          <Button type="primary" onClick={onSearchTypes}>
                            查询
                          </Button>
                          <Button style={{ marginLeft: "10px" }} onClick={onResetTypeFilters}>
                            重置
                          </Button>
                        </FormItem>
                      </Form>
                      <div class={styles.tabToolbarActions}>
                        <Button type="primary" onClick={openTypeAdd}>
                          新增
                        </Button>
                      </div>
                    </div>
                    <div class="tableWrap">
                      <Table
                        class={styles.configTable}
                        rowKey="typeId"
                        columns={typeColumns}
                        dataSource={typeRecords.value}
                        loading={typeLoading.value}
                        pagination={false}
                        size="middle"
                        scroll={{ y: scrollY.value, x: 996 }}
                        locale={{ emptyText: <Empty description="暂无证书类型" /> }}
                      />
                    </div>
                  </TabPane>
                </Tabs>
              </div>
            ),
          }}
        </PageShell>
        <Modal
          open={categoryModalOpen.value}
          title={categoryModalTitle.value}
          centered
          destroyOnClose
          width={480}
          confirmLoading={categorySaving.value}
          onCancel={() => {
            categoryModalOpen.value = false;
          }}
          onOk={() => {
            void handleCategoryModalOk();
          }}
        >
          <Input
            placeholder="请输入分类名称"
            value={categoryFormName.value}
            onUpdate:value={(value) => {
              const v = String(value ?? "");
              categoryFormName.value = v;
            }}
          />
        </Modal>
        <Drawer
          open={typeDrawerOpen.value}
          title={typeDrawerTitle.value}
          width={480}
          destroyOnClose
          onClose={() => {
            typeDrawerOpen.value = false;
          }}
          v-slots={{
            footer: () =>
              !typeDrawerLoading.value && (
                <div class={styles.drawerFooter}>
                  <Button
                    class={styles.cancelBtn}
                    onClick={() => {
                      typeDrawerOpen.value = false;
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    disabled={saveDisabled.value}
                    loading={typeSaving.value}
                    onClick={() => {
                      void onSaveType();
                    }}
                  >
                    保存
                  </Button>
                </div>
              ),
          }}
        >
          {typeDrawerLoading.value ? (
            <div class={styles.drawerLoading}>
              <Spin />
            </div>
          ) : (
            <Form layout="vertical">
              <FormItem label="证书类型" required>
                <Input
                  maxlength={20}
                  showCount
                  placeholder="请输入证书类型名称"
                  value={form.typeName}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.typeName = v;
                  }}
                />
              </FormItem>
              <FormItem label="证书分类" required>
                <TreeSelect
                  showSearch
                  treeDefaultExpandAll
                  allowClear
                  placeholder="请选择"
                  style={{ width: "100%" }}
                  treeData={categoryTreeSelectData.value}
                  treeNodeFilterProp="title"
                  value={form.categoryId}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.categoryId = v;
                  }}
                />
              </FormItem>
              <FormItem label="证书有效周期" required>
                <div class={styles.periodRow}>
                  <div class={styles.periodInputWrap}>
                    <InputNumber
                      min={1}
                      placeholder="请输入"
                      style={{ width: "100%" }}
                      value={form.validPeriod}
                      onUpdate:value={(value) => {
                        const v = value == null ? null : Number(value);
                        form.validPeriod = v ?? undefined;
                      }}
                    />
                  </div>
                  <div class={styles.periodUnitWrap}>
                    <Select
                      style={{ width: "72px" }}
                      value={form.validPeriodUnit}
                      onUpdate:value={(value) => {
                        const v = String(value ?? "");
                        form.validPeriodUnit = v;
                      }}
                    >
                      <SelectOption value="year">年</SelectOption>
                      <SelectOption value="month">月</SelectOption>
                    </Select>
                  </div>
                </div>
              </FormItem>
              <FormItem label="到期提前预警天数" required>
                <InputNumber
                  min={1}
                  placeholder="请输入预警天数"
                  value={form.warnDays}
                  onUpdate:value={(value) => {
                    const v = value == null ? null : Number(value);
                    form.warnDays = v ?? undefined;
                  }}
                />
              </FormItem>
              <FormItem label="是否需要复审" required>
                <RadioGroup
                  value={form.needReview}
                  onUpdate:value={(v: boolean) => {
                    form.needReview = v;
                  }}
                >
                  <Radio value={true}>是</Radio>
                  <Radio value={false}>否</Radio>
                </RadioGroup>
              </FormItem>
              <FormItem label="复审周期" required={form.needReview}>
                <div class={styles.periodRow}>
                  <div class={styles.periodInputWrap}>
                    <InputNumber
                      min={1}
                      disabled={!form.needReview}
                      style={{ width: "100%" }}
                      value={form.reviewPeriod}
                      onUpdate:value={(value) => {
                        const v = value == null ? null : Number(value);
                        form.reviewPeriod = v ?? undefined;
                      }}
                    />
                  </div>
                  <div class={styles.periodUnitWrap}>
                    <Select
                      style={{ width: "72px" }}
                      disabled={!form.needReview}
                      value={form.reviewPeriodUnit}
                      onUpdate:value={(value) => {
                        const v = String(value ?? "");
                        form.reviewPeriodUnit = v;
                      }}
                    >
                      <SelectOption value="year">年</SelectOption>
                    </Select>
                  </div>
                </div>
              </FormItem>
              <FormItem label="备注">
                <Textarea
                  maxlength={200}
                  showCount
                  rows={4}
                  placeholder="请输入证书定义"
                  value={form.definition}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.definition = v;
                  }}
                />
              </FormItem>
            </Form>
          )}
        </Drawer>
      </div>
    );
  },
});
