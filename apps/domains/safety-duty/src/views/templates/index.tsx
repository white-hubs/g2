import type {
  DutyId,
  DutyEvidenceSourceOptionVO,
  DutyLegalClauseVO,
  DutyTemplateItemBaseParam,
  DutyTemplateItemStatisticsVO,
  DutyTemplateItemVO,
} from "@g2-contract/safety-personnel";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import {
  createDutyTemplateItem,
  createDutyTemplateItems,
  deleteDutyTemplateItem,
  getDutyTemplateItemStatistics,
  listDutyLegalClauses,
  listDutyEvidenceSourceOptions,
  listDutyRoleAssignments,
  pageDutyTemplateItems,
  updateDutyTemplateItem,
} from "@/api/server";
import { INDUSTRY_OPTIONS, PERIOD_OPTIONS, TABLE_PAGE_SIZE } from "@/constants";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, Form, FormItem, Input, Modal, Page, Select, SelectOption, Space, Switch, Tag, Textarea, message } from "@/pc-ui-runtime";
import { formatText, periodLabel, showApiError } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

type RoleOption = {
  roleId: string;
  roleName: string;
  label: string;
};

type TemplateItemDraft = DutyTemplateItemBaseParam & {
  id?: DutyId;
  lawNameLabel?: string;
  templateId?: DutyId;
};

type DutyLegalClauseRow = DutyLegalClauseVO & {
  __rowKey: string;
};

const emptyItem = (): TemplateItemDraft => ({
  lawNameCode: "",
  clauseNo: "",
  taskDescription: "",
  periodType: "MONTH",
  mandatory: true,
});

const normalizeItem = (item: DutyTemplateItemVO): TemplateItemDraft => ({
  id: item.id,
  templateId: item.templateId,
  clauseNo: item.clauseNo || "",
  lawNameCode: item.lawNameCode || "",
  lawNameLabel: item.lawNameLabel,
  taskDescription: item.taskDescription || "",
  periodType: item.periodType || "MONTH",
  mandatory: item.mandatory,
  evidenceSourceCode: item.evidenceSourceCode,
  evidenceSourceName: item.evidenceSourceName,
  sourceBusinessType: item.sourceBusinessType,
  matchRuleLabel: item.matchRuleLabel,
});

const toPayloadItem = (item: TemplateItemDraft): DutyTemplateItemBaseParam => ({
  clauseNo: item.clauseNo,
  lawNameCode: item.lawNameCode,
  lawNameLabel: item.lawNameLabel,
  taskDescription: item.taskDescription,
  periodType: item.periodType,
  mandatory: item.mandatory,
  evidenceSourceCode: item.evidenceSourceCode,
  evidenceSourceName: item.evidenceSourceName,
  sourceBusinessType: item.sourceBusinessType,
  matchRuleLabel: item.matchRuleLabel,
});

const clauseKey = (item: Pick<TemplateItemDraft, "clauseNo" | "lawNameCode" | "taskDescription">): string =>
  `${item.clauseNo || ""}::${item.lawNameCode || ""}::${item.taskDescription || ""}`;

const clauseToItem = (item: DutyLegalClauseVO): TemplateItemDraft => ({
  clauseNo: item.clauseNo || "",
  lawNameCode: item.lawNameCode || item.lawNameLabel || "",
  lawNameLabel: item.lawNameLabel,
  taskDescription: item.taskDescription || "",
  periodType: item.periodType || "MONTH",
  mandatory: item.mandatory ?? true,
});

const templatePeriodOptions = [
  { value: "DAY", label: periodLabel("DAY") },
  { value: "WEEK", label: periodLabel("WEEK") },
  ...PERIOD_OPTIONS,
];

const evidenceSourceOptionLabel = (source: DutyEvidenceSourceOptionVO): string => {
  const sourceName = source.sourceName || source.sourceCode || "--";
  if (source.sourceBusinessTypeName && source.sourceBusinessType && source.sourceCode !== "NONE") {
    return `${sourceName} - ${source.sourceBusinessTypeName}`;
  }
  return sourceName;
};

export const DutyTemplatesPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const saving = ref(false);
    const templateItems = ref<DutyTemplateItemVO[]>([]);
    const templateStatistics = ref<DutyTemplateItemStatisticsVO>();
    const deletingItemIds = ref<string[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const roleOptions = ref<RoleOption[]>([]);
    const evidenceOptions = ref<DutyEvidenceSourceOptionVO[]>([]);
    const itemEditorOpen = ref(false);
    const editingItemId = ref<DutyId>();
    const clausesLoading = ref(false);
    const loadedClauses = ref<DutyLegalClauseVO[]>([]);
    const selectedClauseKeys = ref<string[]>([]);
    const filters = reactive({
      industryType: "",
      roleId: "",
      keyword: "",
    });
    const loaderScope = reactive({
      industryType: "",
      roleId: "",
    });
    const itemForm = reactive<TemplateItemDraft>(emptyItem());

    const templateFilterSchema = () => [
      {
        component: "Select",
        label: "行业",
        fieldName: "industryType",
        defaultValue: "",
        componentProps: {
          style: { width: "150px" },
          options: [{ value: "", label: "全部" }, ...INDUSTRY_OPTIONS],
        },
      },
      {
        component: "Select",
        label: "角色",
        fieldName: "roleId",
        defaultValue: "",
        componentProps: {
          style: { width: "190px" },
          options: [{ value: "", label: "全部" }, ...roleOptions.value.map((role) => ({ value: role.roleId, label: role.label }))],
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        defaultValue: "",
        componentProps: {
          style: { width: "220px" },
          placeholder: "搜索条款或任务",
        },
      },
    ];

    const templateQueryParams = () => ({
      industryType: filters.industryType || undefined,
      roleId: filters.roleId || undefined,
      keyword: filters.keyword.trim() || undefined,
    });
    const summaryItemCount = computed(() => templateStatistics.value?.itemCount ?? total.value);
    const summaryMandatoryCount = computed(() => templateStatistics.value?.mandatoryCount ?? 0);
    const latestTemplateLastUpdatedTime = computed(() => templateStatistics.value?.lastUpdatedTime);
    const resetItemForm = (item: TemplateItemDraft = emptyItem()): void => {
      itemForm.id = item.id;
      itemForm.clauseNo = item.clauseNo || "";
      itemForm.lawNameCode = item.lawNameCode || "";
      itemForm.lawNameLabel = item.lawNameLabel;
      itemForm.taskDescription = item.taskDescription || "";
      itemForm.periodType = item.periodType || "MONTH";
      itemForm.mandatory = item.mandatory ?? true;
      itemForm.evidenceSourceCode = item.evidenceSourceCode;
      itemForm.evidenceSourceName = item.evidenceSourceName;
      itemForm.sourceBusinessType = item.sourceBusinessType;
      itemForm.matchRuleLabel = item.matchRuleLabel;
    };

    const loadRoles = async (): Promise<void> => {
      try {
        const roles = await useAuthRequest(() => listDutyRoleAssignments());
        roleOptions.value = roles
          .map((item) => {
            const roleName = item.roleName || item.roleDisplayName || "";
            const roleId = item.roleId;
            if (!roleId || !roleName) {
              return undefined;
            }
            return {
              roleId,
              roleName,
              label: item.roleDisplayName || roleName,
            };
          })
          .filter((item): item is RoleOption => Boolean(item));
      } catch {
        roleOptions.value = [];
      }
    };

    const loadEvidenceOptions = async (scope?: { industryType?: string; roleId?: string }): Promise<void> => {
      try {
        evidenceOptions.value = await useAuthRequest(() =>
          listDutyEvidenceSourceOptions({
            industryType: scope ? scope.industryType || undefined : filters.industryType || undefined,
            roleId: scope ? scope.roleId || undefined : filters.roleId || undefined,
          }),
        );
      } catch {
        evidenceOptions.value = [];
      }
    };

    onMounted(async () => {
      await loadRoles();
      void loadTemplateItemStatistics();
    });

    const resetClauseLoader = (): void => {
      loaderScope.industryType = filters.industryType || "";
      loaderScope.roleId = filters.roleId || "";
      loadedClauses.value = [];
      selectedClauseKeys.value = [];
    };

    const openCreateItem = (): void => {
      editingItemId.value = undefined;
      resetItemForm();
      resetClauseLoader();
      void loadEvidenceOptions({ industryType: loaderScope.industryType, roleId: loaderScope.roleId });
      itemEditorOpen.value = true;
    };

    const openEditItem = (row: DutyTemplateItemVO): void => {
      if (!row.id) {
        message.warning("缺少清单项信息，无法编辑");
        return;
      }
      editingItemId.value = row.id;
      resetItemForm(normalizeItem(row));
      resetClauseLoader();
      void loadEvidenceOptions({ industryType: row.industryType, roleId: row.roleId });
      itemEditorOpen.value = true;
    };

    const ensureLoaderScope = (): boolean => {
      if (!loaderScope.industryType || !loaderScope.roleId) {
        message.warning("请选择行业和角色");
        return false;
      }
      return true;
    };

    const loadLegalClauses = async (): Promise<void> => {
      if (!ensureLoaderScope()) {
        return;
      }
      clausesLoading.value = true;
      try {
        loadedClauses.value = await useAuthRequest(() =>
          listDutyLegalClauses({
            industryType: loaderScope.industryType,
            roleId: loaderScope.roleId,
          }),
        );
        selectedClauseKeys.value = [];
        if (loadedClauses.value.length === 0) {
          message.info("未找到匹配条款，可通过下方手动录入补充");
        }
      } catch (e) {
        showApiError(e, "加载法规条款失败");
        loadedClauses.value = [];
        selectedClauseKeys.value = [];
      } finally {
        clausesLoading.value = false;
      }
    };

    const batchAddSelectedClauses = async (): Promise<void> => {
      if (selectedClauseKeys.value.length === 0) {
        message.warning("请选择要添加的条款");
        return;
      }
      const selectedItems = loadedClauses.value
        .filter((clause) => selectedClauseKeys.value.includes(clauseKey(clauseToItem(clause))))
        .map((clause) => clauseToItem(clause))
        .filter((item) => item.lawNameCode && item.taskDescription && item.periodType);
      if (selectedItems.length === 0) {
        message.warning("选中条款缺少必要信息，请通过下方手动录入补充");
        return;
      }
      if (!ensureLoaderScope()) {
        return;
      }
      const existingKeys = new Set(
        templateItems.value
          .filter((item) => item.industryType === loaderScope.industryType && item.roleId === loaderScope.roleId)
          .map((item) => clauseKey(normalizeItem(item))),
      );
      const nextItems = selectedItems.filter((item) => !existingKeys.has(clauseKey(item))).map((item) => toPayloadItem(item));
      if (nextItems.length === 0) {
        message.warning("选中条款已存在");
        return;
      }
      saving.value = true;
      try {
        await useAuthRequest(() =>
          createDutyTemplateItems({
            industryType: loaderScope.industryType,
            roleId: loaderScope.roleId,
            items: nextItems,
          }),
        );
        loadTemplateItems();
        void loadTemplateItemStatistics();
        message.success(`已添加 ${nextItems.length} 条款`);
        selectedClauseKeys.value = [];
        itemEditorOpen.value = false;
      } catch (e) {
        showApiError(e, "批量添加条款失败");
      } finally {
        saving.value = false;
      }
    };

    const selectEvidenceSource = (value?: string): void => {
      const option = evidenceOptions.value.find((source) => `${source.sourceCode}::${source.sourceBusinessType ?? ""}` === value);
      itemForm.evidenceSourceCode = option?.sourceCode;
      itemForm.evidenceSourceName = option?.sourceName;
      itemForm.sourceBusinessType = option?.sourceBusinessType;
      itemForm.matchRuleLabel = option?.matchRuleLabel;
    };

    const setItemDeleting = (id: DutyId, deleting: boolean): void => {
      const key = String(id);
      deletingItemIds.value = deleting
        ? Array.from(new Set([...deletingItemIds.value, key]))
        : deletingItemIds.value.filter((item) => item !== key);
    };

    const isItemDeleting = (id?: DutyId): boolean => id !== undefined && deletingItemIds.value.includes(String(id));

    const removeItem = async (row: DutyTemplateItemVO): Promise<void> => {
      if (!row.id) {
        message.warning("缺少清单项信息，无法删除");
        return;
      }
      setItemDeleting(row.id, true);
      try {
        await useAuthRequest(() => deleteDutyTemplateItem(row.id as DutyId));
        loadTemplateItems();
        void loadTemplateItemStatistics();
        message.success("删除成功");
      } catch (e) {
        showApiError(e, "删除失败");
      } finally {
        setItemDeleting(row.id, false);
      }
    };

    const saveItem = async (): Promise<void> => {
      if (editingItemId.value === undefined && !ensureLoaderScope()) {
        return;
      }
      if (!itemForm.clauseNo || !itemForm.lawNameCode || !itemForm.taskDescription || !itemForm.periodType) {
        message.warning("请填写法规条款编号、法规名称、任务描述和周期");
        return;
      }
      const item = toPayloadItem(itemForm);
      saving.value = true;
      try {
        if (editingItemId.value === undefined) {
          await useAuthRequest(() =>
            createDutyTemplateItem({
              ...item,
              industryType: loaderScope.industryType,
              roleId: loaderScope.roleId,
            }),
          );
        } else {
          await useAuthRequest(() => updateDutyTemplateItem(editingItemId.value as DutyId, item));
        }
        loadTemplateItems();
        void loadTemplateItemStatistics();
        message.success("保存成功");
        itemEditorOpen.value = false;
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const legalClauseColumns = [
      { key: "法规条款编号", title: "法规条款编号", dataIndex: "clauseNo", width: 120, ellipsis: true },
      {
        key: "法规名称",
        title: "法规名称",
        width: 140,
        ellipsis: true,
        customRender: ({ record }: { record: DutyLegalClauseVO }) => formatText(record.lawNameLabel || record.lawNameCode),
      },
      { key: "履职任务描述", title: "履职任务描述", dataIndex: "taskDescription", width: 240, ellipsis: true },
      {
        key: "周期",
        title: "周期",
        dataIndex: "periodType",
        width: 80,
        customRender: ({ text }: { text?: string }) => periodLabel(text),
      },
      {
        key: "强制项",
        title: "强制项",
        dataIndex: "mandatory",
        width: 80,
        customRender: ({ text }: { text?: boolean }) => (text ? <Tag color="red">强制</Tag> : <Tag>推荐</Tag>),
      },
    ];

    const itemColumns = [
      { key: "法规条款编号", title: "法规条款编号", dataIndex: "clauseNo", width: 140, ellipsis: true },
      {
        key: "法规名称",
        title: "法规名称",
        width: 180,
        ellipsis: true,
        customRender: ({ record }: { record: DutyTemplateItemVO }) => formatText(record.lawNameLabel || record.lawNameCode),
      },
      {
        key: "适用角色",
        title: "适用角色",
        width: 180,
        ellipsis: true,
        customRender: ({ record }: { record: DutyTemplateItemVO }) => formatText(record.roleName),
      },
      { key: "履职任务描述", title: "履职任务描述", dataIndex: "taskDescription", width: 300, ellipsis: true },
      {
        key: "周期",
        title: "周期",
        dataIndex: "periodType",
        width: 100,
        customRender: ({ text }: { text?: string }) => periodLabel(text),
      },
      {
        key: "强制项",
        title: "强制项",
        dataIndex: "mandatory",
        width: 100,
        customRender: ({ text }: { text?: boolean }) => (text ? <Tag color="red">强制</Tag> : <Tag>推荐</Tag>),
      },
      {
        key: "关联数据源",
        title: "关联数据源",
        width: 180,
        ellipsis: true,
        customRender: ({ record }: { record: DutyTemplateItemVO }) => formatText(record.evidenceSourceName || record.matchRuleLabel),
      },
      {
        key: "操作",
        title: "操作",
        width: 140,
        fixed: "right" as const,
        customRender: ({ record }: { record: DutyTemplateItemVO }) => (
          <Space>
            <Button type="link" size="small" onClick={() => void openEditItem(record)}>
              编辑
            </Button>
            <Button type="link" danger size="small" loading={isItemDeleting(record.id)} onClick={() => void removeItem(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const loadedClauseRows = computed<DutyLegalClauseRow[]>(() =>
      loadedClauses.value.map((clause) => ({
        ...clause,
        __rowKey: clauseKey(clauseToItem(clause)),
      })),
    );

    const [LegalClauseTable, legalClauseTableApi] = usePcTable({
      tableCode: "safety-duty-templates-1",
      autoScrollY: false,
      autoFetch: false,
      columns: legalClauseColumns,
      dataSource: loadedClauseRows.value,
      rowKey: "__rowKey",
      rowSelection: "checkbox",
      rowSelectionChange: (keys) => {
        selectedClauseKeys.value = keys.map(String);
      },
      scrollY: 180,
    });

    watch(
      loadedClauseRows,
      (rows) => {
        legalClauseTableApi.setDataSource(rows);
      },
      { deep: true },
    );

    watch(
      clausesLoading,
      (loading) => {
        legalClauseTableApi.loading.value = loading;
      },
      { immediate: true },
    );

    watch(
      selectedClauseKeys,
      (keys) => {
        legalClauseTableApi.setSelectedRowKeys(keys);
      },
      { deep: true, immediate: true },
    );

    const [QueryForm, formApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      syncStateRef: filters,
      schema: templateFilterSchema(),
      handleSubmit: (values) => {
        filters.industryType = String(values.industryType ?? "");
        filters.roleId = String(values.roleId ?? "");
        filters.keyword = String(values.keyword ?? "");
        pageNumber.value = 1;
        loadTemplateItems();
        void loadTemplateItemStatistics();
      },
      handleReset: () => {
        filters.industryType = "";
        filters.roleId = "";
        filters.keyword = "";
        pageNumber.value = 1;
        loadTemplateItems();
        void loadTemplateItemStatistics();
      },
    });

    watch(
      roleOptions,
      () => {
        formApi.updateSchema(templateFilterSchema());
      },
      { deep: true },
    );

    const [DutyTable, tableApi] = usePcTable({
      tableCode: "safety-duty-templates-2",
      autoScrollY: false,
      columns: itemColumns,
      rowKey: "id",
      fetchApi: async () =>
        useAuthRequest(() =>
          pageDutyTemplateItems({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            ...templateQueryParams(),
          }),
        ),
      fetchLoaded: (page) => {
        templateItems.value = (page.records ?? []) as DutyTemplateItemVO[];
        total.value = page.total ?? 0;
      },
    });

    const loadTemplateItems = (): void => {
      tableApi.query();
    };

    const loadTemplateItemStatistics = async (): Promise<void> => {
      try {
        templateStatistics.value = await useAuthRequest(() =>
          getDutyTemplateItemStatistics({ ...templateQueryParams(), pageNumber: pageNumber.value, pageSize: pageSize.value }),
        );
      } catch (e) {
        templateStatistics.value = undefined;
        showApiError(e, "查询清单统计失败");
      }
    };

    const handleChange = (page: number, size: number): void => {
      if (pageNumber.value === page && pageSize.value === size) {
        return;
      }
      pageNumber.value = page;
      pageSize.value = size;
      loadTemplateItems();
    };

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Space>
          <Button type="primary" onClick={openCreateItem}>
            新增
          </Button>
        </Space>
      ),
      "layout-content": (): JSX.Element => (
        <>
          <QueryForm />
          <div class={styles.summary}>
            <div class={styles.summaryItem}>
              <span>检查项数</span>
              <strong>{summaryItemCount.value}</strong>
            </div>
            <div class={styles.summaryItem}>
              <span>强制项</span>
              <strong>{summaryMandatoryCount.value}</strong>
            </div>
            <div class={styles.summaryItem}>
              <span>最后更新</span>
              <strong>{formatText(latestTemplateLastUpdatedTime.value)}</strong>
            </div>
          </div>
          <div class="tableWrap">
            <DutyTable />
          </div>
        </>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          current={pageNumber.value}
          pageSize={pageSize.value}
          total={total.value}
          onPageChange={handleChange}
          onShowSizeChange={handleChange}
        />
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} v-slots={layoutSlots} />
        <Modal
          open={itemEditorOpen.value}
          title={editingItemId.value === undefined ? "新增清单项" : "编辑清单项"}
          width={860}
          confirmLoading={saving.value}
          onUpdate:open={(value: boolean) => (itemEditorOpen.value = value)}
          onOk={() => void saveItem()}
        >
          <div class={styles.itemEditor}>
            <p class={styles.editorHelp}>选择行业与角色快速加载法规条款，或通过AI查询补充未收录条款</p>
            {editingItemId.value === undefined ? (
              <div class={styles.clauseLoader}>
                <div class={styles.loaderRow}>
                  <FormItem label="行业" required>
                    <Select
                      value={loaderScope.industryType || undefined}
                      placeholder="请选择行业"
                      onUpdate:value={(value) => {
                        loaderScope.industryType = typeof value === "string" ? value : "";
                        loadedClauses.value = [];
                        selectedClauseKeys.value = [];
                        void loadEvidenceOptions({ industryType: loaderScope.industryType, roleId: loaderScope.roleId });
                      }}
                    >
                      {INDUSTRY_OPTIONS.map((item) => (
                        <SelectOption key={item.value} value={item.value}>
                          {item.label}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <FormItem label="角色" required>
                    <Select
                      value={loaderScope.roleId || undefined}
                      placeholder="请选择角色"
                      onUpdate:value={(value) => {
                        loaderScope.roleId = typeof value === "string" ? value : "";
                        loadedClauses.value = [];
                        selectedClauseKeys.value = [];
                        void loadEvidenceOptions({ industryType: loaderScope.industryType, roleId: loaderScope.roleId });
                      }}
                    >
                      {roleOptions.value.map((role) => (
                        <SelectOption key={role.roleId} value={role.roleId}>
                          {role.label}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <Button type="primary" loading={clausesLoading.value} onClick={() => void loadLegalClauses()}>
                    加载条款
                  </Button>
                </div>
                {loadedClauses.value.length > 0 || clausesLoading.value ? (
                  <div class={styles.loaderResults}>
                    <div class={styles.loaderResultHeader}>
                      <span>匹配条款（勾选后批量添加）</span>
                      <span>已选 {selectedClauseKeys.value.length} 项</span>
                    </div>
                    <div class="safety-duty-table">
                      <LegalClauseTable />
                    </div>
                    <div class={styles.loaderActions}>
                      <Button
                        type="primary"
                        size="small"
                        loading={saving.value}
                        disabled={selectedClauseKeys.value.length === 0}
                        onClick={() => void batchAddSelectedClauses()}
                      >
                        批量添加选中条款
                      </Button>
                      <span>未匹配到的条款可继续手动录入</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Form layout="vertical">
              <div class={styles.manualSection}>
                <p class={styles.editorHelp}>手动录入单个清单项</p>
                <FormItem label="法规条款编号" required>
                  <Input
                    value={itemForm.clauseNo}
                    placeholder="请输入法规条款编号"
                    showCount={false}
                    onUpdate:value={(value: string) => (itemForm.clauseNo = value)}
                  />
                </FormItem>
                <FormItem label="法规名称" required>
                  <Input
                    value={itemForm.lawNameCode}
                    placeholder="请输入法规名称或编码"
                    showCount={false}
                    onUpdate:value={(value: string) => (itemForm.lawNameCode = value)}
                  />
                </FormItem>
                <FormItem label="履职任务描述" required>
                  <Textarea
                    value={itemForm.taskDescription}
                    rows={3}
                    placeholder="请输入履职任务描述"
                    onUpdate:value={(value: string) => (itemForm.taskDescription = value)}
                  />
                </FormItem>
                <div class={styles.formRow}>
                  <FormItem label="周期" required>
                    <Select
                      value={itemForm.periodType}
                      onUpdate:value={(value) => (itemForm.periodType = typeof value === "string" ? value : "MONTH")}
                    >
                      {templatePeriodOptions.map((period) => (
                        <SelectOption key={period.value} value={period.value}>
                          {period.label}
                        </SelectOption>
                      ))}
                    </Select>
                  </FormItem>
                  <FormItem label="强制项">
                    <Switch
                      checked={Boolean(itemForm.mandatory)}
                      checkedChildren="强制"
                      unCheckedChildren="推荐"
                      onUpdate:checked={(value) => (itemForm.mandatory = Boolean(value))}
                    />
                  </FormItem>
                </div>
                <FormItem label="关联数据源">
                  <Select
                    allowClear
                    placeholder="请选择关联数据源"
                    value={itemForm.evidenceSourceCode ? `${itemForm.evidenceSourceCode}::${itemForm.sourceBusinessType ?? ""}` : undefined}
                    onUpdate:value={(value) => selectEvidenceSource(typeof value === "string" ? value : undefined)}
                  >
                    {evidenceOptions.value.map((source) => (
                      <SelectOption
                        key={`${source.sourceCode}::${source.sourceBusinessType}`}
                        value={`${source.sourceCode}::${source.sourceBusinessType ?? ""}`}
                      >
                        {evidenceSourceOptionLabel(source)}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
              </div>
            </Form>
          </div>
        </Modal>
      </>
    );
  },
});
