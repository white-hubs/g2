import type {
  CheckExecutionStatus,
  ChecklistStatus,
  SafetyCreditChecklistGenerateCommand,
  SafetyCreditChecklistPageQuery,
  SafetyCreditChecklistSaveCommand,
  SafetyCreditChecklistVO,
  SafetyCreditId,
  SafetyCreditMerchantVO,
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
import { defineComponent, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";

import { checklistStatusColor, checklistStatusLabel, checklistStatusOptions, cleanText, displayText } from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s5.less";

type OptionalChecklistStatus = ChecklistStatus | "";

interface ChecklistQueryForm {
  pageNumber: number;
  pageSize: number;
  merchantName: string;
  status: OptionalChecklistStatus;
}

interface GenerateForm {
  merchantIds: string[];
  checkName: string;
}

interface EditableItem {
  key: string;
  id?: string | number;
  itemName: string;
  required: boolean;
  photoRequired: boolean;
  sortNo: number;
}

let editableItemSeed = 0;

function createEditableItemKey(id?: string | number): string {
  editableItemSeed += 1;
  return `check-item-${id ?? "new"}-${Date.now()}-${editableItemSeed}`;
}

function createGenerateForm(): GenerateForm {
  return {
    merchantIds: [],
    checkName: "",
  };
}

function normalizeItems(record: SafetyCreditChecklistVO): EditableItem[] {
  return (record.items ?? []).map((item, index) => ({
    key: createEditableItemKey(item.id),
    id: item.id,
    itemName: item.itemName,
    required: item.required ?? true,
    photoRequired: item.photoRequired ?? false,
    sortNo: item.sortNo ?? index + 1,
  }));
}

function executionStatusLabel(value?: CheckExecutionStatus): string {
  if (value === "COMPLETED") {
    return "已完成";
  }
  if (value === "PENDING" || value === "PARTIAL_COMPLETED" || value === "OVERDUE") {
    return "待完成";
  }
  return "-";
}

function executionStatusColor(value?: CheckExecutionStatus): string {
  if (value === "COMPLETED") {
    return "green";
  }
  if (value === "PENDING" || value === "PARTIAL_COMPLETED" || value === "OVERDUE") {
    return "orange";
  }
  return "default";
}

function toInputNumberValue(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function merchantOptionLabel(item: SafetyCreditMerchantVO): string {
  return `${displayText(item.merchantName)} / ${displayText(item.merchantCode)}`;
}

export const ChecklistList = defineComponent({
  name: "ChecklistList",
  setup: () => {
    const loading = ref(false);
    const saving = ref(false);
    const detailLoading = ref(false);
    const merchantLoading = ref(false);
    const rows = ref<SafetyCreditChecklistVO[]>([]);
    const total = ref(0);
    const generateVisible = ref(false);
    const editVisible = ref(false);
    const itemDetailVisible = ref(false);
    const itemDetailLoading = ref(false);
    const selected = ref<SafetyCreditChecklistVO | null>(null);
    const itemDetail = ref<SafetyCreditChecklistVO | null>(null);
    const editCheckName = ref("");
    const editItems = ref<EditableItem[]>([]);
    const itemDetailItems = ref<EditableItem[]>([]);
    const merchantSearchText = ref("");
    const merchantOptions = ref<SafetyCreditMerchantVO[]>([]);
    const selectedMerchants = ref<SafetyCreditMerchantVO[]>([]);
    let merchantSearchTimer: ReturnType<typeof setTimeout> | undefined;
    let merchantSearchSeq = 0;

    const query = reactive<ChecklistQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      merchantName: "",
      status: "",
    });

    const generateForm = reactive<GenerateForm>(createGenerateForm());

    function buildQuery(): SafetyCreditChecklistPageQuery {
      const payload: SafetyCreditChecklistPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      const merchantName = cleanText(query.merchantName);
      if (merchantName !== undefined) {
        payload.merchantName = merchantName;
      }
      if (query.status !== "") {
        payload.status = query.status;
      }
      return payload;
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const result = await getSafetyCreditClient().pageChecklists(buildQuery());
        rows.value = result.records ?? [];
        total.value = result.total ?? 0;
      } finally {
        loading.value = false;
      }
    }

    function resetQuery(): void {
      query.pageNumber = 1;
      query.merchantName = "";
      query.status = "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
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

    function searchMerchants(keyword: string): void {
      merchantSearchText.value = keyword;
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
      merchantSearchTimer = setTimeout(() => {
        void loadMerchants(keyword);
      }, 250);
    }

    function selectGenerateMerchants(values?: SafetyCreditId[]): void {
      const nextIds = (values ?? []).map((value) => String(value));
      generateForm.merchantIds = nextIds;
      const merchantMap = new Map<string, SafetyCreditMerchantVO>();
      selectedMerchants.value.forEach((item) => merchantMap.set(String(item.id), item));
      merchantOptions.value.forEach((item) => merchantMap.set(String(item.id), item));
      selectedMerchants.value = nextIds
        .map((id) => merchantMap.get(id))
        .filter((item): item is SafetyCreditMerchantVO => item !== undefined);
      merchantSearchText.value = "";
    }

    function generateMerchantOptions(): { label: string; value: string }[] {
      const merchantMap = new Map<string, SafetyCreditMerchantVO>();
      selectedMerchants.value.forEach((item) => merchantMap.set(String(item.id), item));
      merchantOptions.value.forEach((item) => merchantMap.set(String(item.id), item));
      return Array.from(merchantMap.values()).map((item) => ({ label: merchantOptionLabel(item), value: String(item.id) }));
    }

    function openGenerate(): void {
      Object.assign(generateForm, createGenerateForm());
      selectedMerchants.value = [];
      merchantSearchText.value = "";
      void loadMerchants("");
      generateVisible.value = true;
    }

    async function submitGenerate(): Promise<void> {
      const merchantIds = Array.from(
        new Set(
          generateForm.merchantIds
            .map((merchantId) => cleanText(merchantId))
            .filter((merchantId): merchantId is string => merchantId !== undefined),
        ),
      );
      if (merchantIds.length === 0) {
        message.warning("请选择商户");
        return;
      }
      const payload: SafetyCreditChecklistGenerateCommand = { merchantIds };
      const checkName = cleanText(generateForm.checkName);
      if (checkName !== undefined) {
        payload.checkName = checkName;
      }
      saving.value = true;
      try {
        await getSafetyCreditClient().generateChecklist(payload);
        message.success(`已生成${merchantIds.length}份清单`);
        generateVisible.value = false;
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function openEdit(record: SafetyCreditChecklistVO): Promise<void> {
      if (record.status !== "DRAFT") {
        message.warning("只有草稿状态的清单可以编辑");
        return;
      }
      selected.value = record;
      editCheckName.value = record.checkName;
      editItems.value = normalizeItems(record);
      editVisible.value = true;
      detailLoading.value = true;
      try {
        const detail = await getSafetyCreditClient().getChecklist(record.id);
        selected.value = detail;
        editCheckName.value = detail.checkName;
        editItems.value = normalizeItems(detail);
      } finally {
        detailLoading.value = false;
      }
    }

    async function openItemDetail(record: SafetyCreditChecklistVO): Promise<void> {
      itemDetail.value = record;
      itemDetailItems.value = normalizeItems(record);
      itemDetailVisible.value = true;
      itemDetailLoading.value = true;
      try {
        const detail = await getSafetyCreditClient().getChecklist(record.id);
        itemDetail.value = detail;
        itemDetailItems.value = normalizeItems(detail);
      } finally {
        itemDetailLoading.value = false;
      }
    }

    function addItem(): void {
      editItems.value = [
        ...editItems.value,
        {
          key: createEditableItemKey(),
          itemName: "",
          required: true,
          photoRequired: false,
          sortNo: editItems.value.length + 1,
        },
      ];
    }

    function removeItem(row: EditableItem): void {
      editItems.value = editItems.value.filter((item) => item.key !== row.key);
    }

    function buildSavePayload(): SafetyCreditChecklistSaveCommand | undefined {
      const checkName = cleanText(editCheckName.value);
      if (checkName === undefined) {
        message.warning("请输入清单名称");
        return undefined;
      }
      const items = editItems.value
        .map((item, index) => ({
          id: item.id,
          itemName: cleanText(item.itemName) ?? "",
          required: item.required,
          photoRequired: item.photoRequired,
          sortNo: item.sortNo || index + 1,
        }))
        .filter((item) => item.itemName !== "");
      if (items.length === 0) {
        message.warning("请至少维护一个检查项");
        return undefined;
      }
      return { checkName, items };
    }

    async function saveChecklist(): Promise<void> {
      if (selected.value === null) {
        return;
      }
      const payload = buildSavePayload();
      if (payload === undefined) {
        return;
      }
      saving.value = true;
      try {
        await getSafetyCreditClient().updateChecklist(selected.value.id, payload);
        message.success("清单已保存");
        editVisible.value = false;
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function publish(record: SafetyCreditChecklistVO): Promise<void> {
      saving.value = true;
      try {
        await getSafetyCreditClient().publishChecklist(record.id);
        message.success("清单已发布");
        await load();
      } finally {
        saving.value = false;
      }
    }

    async function remove(record: SafetyCreditChecklistVO): Promise<void> {
      saving.value = true;
      try {
        await getSafetyCreditClient().deleteChecklist(record.id);
        message.success("清单已删除");
        await load();
      } finally {
        saving.value = false;
      }
    }

    const columns: PcTableColumn[] = [
      {
        title: "商户名称",
        dataIndex: "merchantName",
        align: "center" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "清单名称",
        dataIndex: "checkName",
        align: "center" as const,
        width: 300,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "发布",
        dataIndex: "status",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: ChecklistStatus }): JSX.Element => (
          <Tag color={checklistStatusColor(text)}>{checklistStatusLabel(text)}</Tag>
        ),
      },
      {
        title: "状态",
        dataIndex: "executionStatus",
        align: "center" as const,
        width: 110,
        customRender: ({ text }: { text?: CheckExecutionStatus }): JSX.Element | string =>
          text === undefined ? "-" : <Tag color={executionStatusColor(text)}>{executionStatusLabel(text)}</Tag>,
      },
      {
        title: "检查项",
        dataIndex: "itemCount",
        align: "center" as const,
        width: 100,
        customRender: ({ record }: { record: SafetyCreditChecklistVO }): JSX.Element => (
          <Button type="link" size="small" onClick={() => void openItemDetail(record)}>
            {displayText(record.itemCount ?? (record.items ?? []).length)}
          </Button>
        ),
      },
      {
        title: "操作",
        align: "center" as const,
        fixed: "right" as const,
        width: 160,
        customRender: ({ record }: { record: SafetyCreditChecklistVO }): JSX.Element => (
          <Space>
            <Button type="link" size="small" onClick={() => void openItemDetail(record)}>
              详情
            </Button>
            {record.status === "DRAFT" ? (
              <Button type="link" size="small" onClick={() => void openEdit(record)}>
                编辑
              </Button>
            ) : null}
            {record.status !== "PUBLISHED" ? (
              <Button type="link" size="small" loading={saving.value} onClick={() => void publish(record)}>
                发布
              </Button>
            ) : null}
            {record.status === "DRAFT" ? (
              <PopConfirm
                okText="确定"
                cancelText="取消"
                title={`确认删除清单「${record.checkName}」？`}
                onConfirm={() => void remove(record)}
              >
                <Button type="link" size="small" danger loading={saving.value}>
                  删除
                </Button>
              </PopConfirm>
            ) : null}
          </Space>
        ),
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({ rowKey: "id", tableCode: "SAFETY_CREDIT_checklist-list", columns, dataSource: [] });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    const editItemColumns = [
      {
        title: "检查项",
        dataIndex: "itemName",
        align: "center" as const,
        customRender: ({ record }: { record: EditableItem }): JSX.Element => (
          <Input
            value={record.itemName}
            placeholder="请输入检查项"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.itemName = value);
            }}
          />
        ),
      },
      {
        title: "必填",
        dataIndex: "required",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: EditableItem }): JSX.Element => (
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
        title: "需拍照",
        dataIndex: "photoRequired",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: EditableItem }): JSX.Element => (
          <Checkbox
            checked={record.photoRequired}
            onUpdate:checked={(inputValue) => {
              const checked = inputValue as boolean;
              return (record.photoRequired = checked);
            }}
          />
        ),
      },
      {
        title: "排序",
        dataIndex: "sortNo",
        align: "center" as const,
        width: 120,
        customRender: ({ record, index }: { record: EditableItem; index: number }): JSX.Element => (
          <InputNumber
            min={1}
            precision={0}
            value={toInputNumberValue(record.sortNo)}
            onUpdate:value={(inputValue) => {
              const value = inputValue as number | null | undefined;
              return (record.sortNo = value ?? index + 1);
            }}
          />
        ),
      },
      {
        title: "操作",
        align: "center" as const,
        width: 90,
        customRender: ({ record }: { record: EditableItem }): JSX.Element => (
          <Button type="link" size="small" danger onClick={() => removeItem(record)}>
            删除
          </Button>
        ),
      },
    ];

    const itemDetailColumns = [
      {
        title: "检查项",
        dataIndex: "itemName",
        align: "center" as const,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "必填",
        dataIndex: "required",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: boolean }): string => displayText(text ?? true),
      },
      {
        title: "需拍照",
        dataIndex: "photoRequired",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: boolean }): string => displayText(text ?? false),
      },
      {
        title: "排序",
        dataIndex: "sortNo",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: number }): string => displayText(text),
      },
    ];

    onMounted(() => {
      void load();
    });

    onBeforeUnmount(() => {
      if (merchantSearchTimer !== undefined) {
        clearTimeout(merchantSearchTimer);
      }
    });

    const searchFormSchema = [
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
        label: "状态",
        fieldName: "status",
        defaultValue: undefined,
        componentProps: {
          allowClear: true,
          placeholder: "全部",
          options: [...checklistStatusOptions],
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
        query.merchantName = String(data.merchantName ?? "").trim();
        query.status = (data.status ?? "") as OptionalChecklistStatus;
        void load();
      },
      handleReset: resetQuery,
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={openGenerate}>
          生成清单
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
            v-model:open={generateVisible.value}
            title="生成自查清单"
            width={560}
            confirmLoading={saving.value}
            onOk={() => void submitGenerate()}
            onCancel={() => {
              generateVisible.value = false;
            }}
          >
            <Form class="s2-form-grid" model={generateForm} layout="vertical">
              <FormItem class="form-item" label="商户" required>
                <Select
                  allowClear
                  filterOption={false}
                  loading={merchantLoading.value}
                  mode="multiple"
                  optionFilterProp="label"
                  optionLabelProp="label"
                  placeholder="请输入或选择商户"
                  searchValue={merchantSearchText.value}
                  showSearch
                  class="source-application-select"
                  options={generateMerchantOptions()}
                  value={generateForm.merchantIds}
                  onChange={(inputValue) => {
                    const value = inputValue as SafetyCreditId[] | undefined;
                    return selectGenerateMerchants(value);
                  }}
                  onSearch={searchMerchants}
                  onClear={() => {
                    selectGenerateMerchants([]);
                    void loadMerchants("");
                  }}
                />
              </FormItem>
              <FormItem class="form-item" label="清单名">
                <Input
                  value={generateForm.checkName}
                  placeholder="例如 七月自查"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (generateForm.checkName = value);
                  }}
                />
              </FormItem>
            </Form>
          </Modal>

          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={editVisible.value}
            title="编辑自查清单"
            width={880}
            confirmLoading={saving.value}
            onOk={() => void saveChecklist()}
            onCancel={() => {
              editVisible.value = false;
            }}
          >
            <div class="s2-modal-body">
              <Form class="s2-form-grid" layout="vertical">
                <FormItem class="form-item wide" label="清单名称" required>
                  <Input
                    value={editCheckName.value}
                    placeholder="请输入清单名称"
                    onUpdate:value={(inputValue) => {
                      const value = inputValue as string;
                      return (editCheckName.value = value);
                    }}
                  />
                </FormItem>
              </Form>
              <section class="s2-section">
                <div class="section-header">
                  <h3>检查项</h3>
                  <Button type="primary" size="small" onClick={addItem}>
                    新增检查项
                  </Button>
                </div>
                {detailLoading.value ? (
                  <div class="empty-tip">正在加载...</div>
                ) : (
                  <Table
                    class="s2-editable-table"
                    rowKey="key"
                    dataSource={editItems.value}
                    columns={editItemColumns}
                    pagination={false}
                    size="small"
                  />
                )}
              </section>
            </div>
          </Modal>

          <Modal
            okText="确定"
            cancelText="取消"
            v-model:open={itemDetailVisible.value}
            title="检查项详情"
            width={880}
            footer={null}
            onCancel={() => {
              itemDetailVisible.value = false;
            }}
          >
            <div class="s2-modal-body">
              <Form class="s2-form-grid" layout="vertical">
                <FormItem class="form-item wide" label="清单名称">
                  <Input value={itemDetail.value?.checkName ?? ""} disabled />
                </FormItem>
              </Form>
              <section class="s2-section">
                <div class="section-header">
                  <h3>检查项</h3>
                </div>
                {itemDetailLoading.value ? (
                  <div class="empty-tip">正在加载...</div>
                ) : (
                  <Table
                    class="s2-editable-table"
                    rowKey="key"
                    dataSource={itemDetailItems.value}
                    columns={itemDetailColumns}
                    pagination={false}
                    size="small"
                  />
                )}
              </section>
            </div>
          </Modal>
        </>
      ),
    };

    return (): JSX.Element => <PageLayout title="自查清单" v-slots={layoutSlots} />;
  },
});
