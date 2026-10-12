import type {
  LongId,
  ProductCategoryTree,
  ProductPropertyReference,
  ProductReference,
  RemoteInspectionColumnType,
  RemoteInspectionTemplateDetail,
  RemoteInspectionTemplateSaveRequest,
} from "@g2-contract/electrical-safety";
import {
  Button,
  Form,
  type FormExpose,
  FormItem,
  Input,
  Modal,
  PcIcon,
  Select,
  Spin,
  Switch,
  TreeSelect,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent, reactive, ref, shallowRef, toRaw, watch } from "vue";

import { listProductCategoryTree, listProductProperties, listProductsByCategory } from "@/api/electrical-safety";
import type { FacilityReference } from "@/composables/use-facility-references";

type RemoteInspectionColumnDraft = RemoteInspectionTemplateSaveRequest["columns"][number] & {
  id: string;
  columnType: RemoteInspectionColumnType;
  secondHeader: string;
  propertyCode: string;
  propertyName: string;
  unit: string;
  productCategoryCode: string;
  productCategoryName: string;
  productId: string;
  productName: string;
};

interface TemplateDraft extends Omit<RemoteInspectionTemplateSaveRequest, "columns"> {
  id?: LongId;
  columns: RemoteInspectionColumnDraft[];
}

interface HeaderPreviewGroup {
  firstHeader: string;
  columns: RemoteInspectionColumnDraft[];
}

let columnSequence = 1;

const createColumn = (sort: number): RemoteInspectionColumnDraft => ({
  id: `draft-column-${Date.now()}-${columnSequence++}`,
  columnType: "REMOTE_PARAMETER",
  firstHeader: "",
  secondHeader: "",
  propertyCode: "",
  propertyName: "",
  unit: "",
  productCategoryCode: "",
  productCategoryName: "",
  productId: "",
  productName: "",
  sort,
});

const emptyDraft = (): TemplateDraft => ({
  templateName: "",
  facilityId: "",
  frequencyHours: 0,
  showRealtimeData: true,
  enabled: true,
  remark: "",
  columns: [createColumn(1)],
});

const templateFormRules = {
  templateName: [{ required: true, whitespace: true, message: "请输入模板名称", validateTrigger: ["blur", "change"] }],
  facilityId: [{ required: true, message: "请选择设施", validateTrigger: "change" as const }],
  frequencyHours: [{ required: true, type: "number" as const, min: 1, message: "请选择巡检频率", validateTrigger: "change" as const }],
};

const toDraft = (template: RemoteInspectionTemplateDetail | null): TemplateDraft => {
  if (!template) {
    return emptyDraft();
  }
  return {
    id: template.id,
    templateName: template.templateName,
    facilityId: template.facilityId,
    frequencyHours: template.frequencyHours,
    showRealtimeData: template.showRealtimeData,
    enabled: template.enabled,
    remark: template.remark,
    columns: [...template.columns]
      .toSorted((left, right) => left.sort - right.sort)
      .map((column) => ({
        ...column,
        id: String(column.id),
        columnType: column.columnType ?? "REMOTE_PARAMETER",
        secondHeader: column.secondHeader ?? "",
        propertyCode: column.propertyCode ?? "",
        unit: column.unit ?? "",
        propertyName: column.propertyName ?? "",
        productCategoryCode: column.productCategoryCode ?? "",
        productCategoryName: column.productCategoryName ?? "",
        productId: column.productId == null ? "" : String(column.productId),
        productName: column.productName ?? "",
      })),
  };
};

export const TemplateEditorModal = defineComponent({
  name: "TemplateEditorModal",
  props: {
    open: { type: Boolean, required: true },
    template: { type: Object as PropType<RemoteInspectionTemplateDetail | null>, default: null },
    facilities: { type: Array as PropType<FacilityReference[]>, required: true },
    facilitiesLoading: { type: Boolean, default: false },
    loadMoreFacilities: { type: Function as PropType<() => Promise<void>>, required: true },
    ensureFacilityReference: { type: Function as PropType<(facility: FacilityReference) => void>, required: true },
    loadingTemplate: { type: Boolean, default: false },
  },
  emits: {
    close: (): boolean => true,
    save: (_payload: TemplateDraft): boolean => true,
  },
  setup: (props, { emit }) => {
    const formRef = ref<FormExpose>();
    const draft = reactive<TemplateDraft>(emptyDraft());
    const draggedIndex = shallowRef<number | null>(null);
    const categoryTree = shallowRef<ProductCategoryTree[]>([]);
    const productOptions = shallowRef<Record<string, ProductReference[]>>({});
    const propertyOptions = shallowRef<Record<string, ProductPropertyReference[]>>({});
    const referenceLoading = shallowRef(false);
    const productRequests = new Map<string, Promise<void>>();
    const propertyRequests = new Map<string, Promise<void>>();

    const normalizeOrder = (): void => {
      draft.columns.forEach((column, index) => {
        column.sort = index + 1;
      });
    };
    const resetDraft = (): void => {
      const nextDraft = toDraft(props.template);
      Object.assign(draft, nextDraft);
      if (nextDraft.id === undefined) {
        delete draft.id;
      }
      if (props.template) {
        props.ensureFacilityReference({ id: String(props.template.facilityId), name: props.template.facilityName });
      }
    };

    watch(
      () => [props.open, props.template] as const,
      () => {
        if (!props.open) {
          return;
        }
        resetDraft();
      },
      { immediate: true },
    );

    const loadCategoryTree = async (): Promise<void> => {
      if (categoryTree.value.length > 0) {
        return;
      }
      referenceLoading.value = true;
      try {
        categoryTree.value = await listProductCategoryTree();
        console.log(categoryTree.value, 1111);
      } catch {
        // 网关已展示失败提示；保留加载状态收尾。
      } finally {
        referenceLoading.value = false;
      }
    };

    const loadProducts = (categoryCode: string): Promise<void> => {
      if (!categoryCode || productOptions.value[categoryCode]) {
        return Promise.resolve();
      }
      const request = productRequests.get(categoryCode);
      if (request) {
        return request;
      }
      referenceLoading.value = true;
      const nextRequest = listProductsByCategory(categoryCode)
        .then((products) => {
          productOptions.value = { ...productOptions.value, [categoryCode]: products };
        })
        .catch(() => {
          // 网关已展示失败提示；保留 finally 中的请求状态清理。
        })
        .finally(() => {
          productRequests.delete(categoryCode);
          referenceLoading.value = false;
        });
      productRequests.set(categoryCode, nextRequest);
      return nextRequest;
    };
    const loadProperties = (productCode: string): Promise<void> => {
      if (!productCode || propertyOptions.value[productCode]) {
        return Promise.resolve();
      }
      const request = propertyRequests.get(productCode);
      if (request) {
        return request;
      }
      referenceLoading.value = true;
      const nextRequest = listProductProperties(productCode)
        .then((properties) => {
          propertyOptions.value = { ...propertyOptions.value, [productCode]: properties };
        })
        .catch(() => {
          // 网关已展示失败提示；保留 finally 中的请求状态清理。
        })
        .finally(() => {
          propertyRequests.delete(productCode);
          referenceLoading.value = false;
        });
      propertyRequests.set(productCode, nextRequest);
      return nextRequest;
    };

    const categories = computed(() => {
      const seen = new Set<string>();
      const flatten = (nodes: ProductCategoryTree[]): ProductCategoryTree[] =>
        nodes.flatMap((node) => [node, ...(node.children?.length ? flatten(node.children) : [])]);
      return flatten(categoryTree.value).filter((item) => {
        if (seen.has(item.categoryCode)) {
          return false;
        }
        seen.add(item.categoryCode);
        return true;
      });
    });
    const products = (column: RemoteInspectionColumnDraft): ProductReference[] => productOptions.value[column.productCategoryCode] ?? [];
    const properties = (column: RemoteInspectionColumnDraft): ProductPropertyReference[] => propertyOptions.value[column.productId] ?? [];
    const previewGroups = computed<HeaderPreviewGroup[]>(() => {
      const groups = new Map<string, HeaderPreviewGroup>();
      draft.columns
        .filter((column) => column.firstHeader.trim())
        .toSorted((left, right) => left.sort - right.sort)
        .forEach((column) => {
          const firstHeader = column.firstHeader.trim();
          const group = groups.get(firstHeader) ?? { firstHeader, columns: [] };
          group.columns.push(column);
          groups.set(firstHeader, group);
        });
      return [...groups.values()];
    });
    const isSingleLevelPreviewGroup = (group: HeaderPreviewGroup): boolean =>
      group.columns.length === 1 && !group.columns[0].secondHeader.trim();
    const hasTwoLevelPreviewGroup = computed(() => previewGroups.value.some((group) => !isSingleLevelPreviewGroup(group)));
    const clearProperty = (column: RemoteInspectionColumnDraft): void => {
      column.propertyCode = "";
      column.propertyName = "";
      column.unit = "";
    };
    const selectCategory = (column: RemoteInspectionColumnDraft, value: string): void => {
      const option = categories.value.find((item) => item.categoryCode === value);
      column.productCategoryCode = value;
      column.productCategoryName = option?.categoryName ?? "";
      column.productId = "";
      column.productName = "";
      clearProperty(column);
      void loadProducts(value);
    };
    const selectProduct = (column: RemoteInspectionColumnDraft, value: string): void => {
      const option = products(column).find((item) => item.productCode === value);
      column.productId = value;
      column.productName = option?.productName ?? "";
      clearProperty(column);
      void loadProperties(value);
    };
    const selectProperty = (column: RemoteInspectionColumnDraft, value: string): void => {
      const option = properties(column).find((item) => item.propertyCode === value);
      column.propertyCode = value;
      column.propertyName = option?.propertyName ?? "";
      column.unit = option?.unit ?? "";
    };
    const isRemoteParameter = (column: RemoteInspectionColumnDraft): boolean => column.columnType === "REMOTE_PARAMETER";
    const selectColumnType = (column: RemoteInspectionColumnDraft, value: RemoteInspectionColumnType): void => {
      column.columnType = value;
      if (value !== "REMOTE_PARAMETER") {
        column.productCategoryCode = "";
        column.productCategoryName = "";
        column.productId = "";
        column.productName = "";
        clearProperty(column);
      }
    };
    watch(
      () => [props.open, ...draft.columns.map((column) => `${column.productCategoryCode}:${column.productId}`)] as const,
      ([open]) => {
        if (!open) {
          return;
        }
        void loadCategoryTree();
        draft.columns.forEach((column) => {
          if (isRemoteParameter(column)) {
            void loadProducts(column.productCategoryCode);
            void loadProperties(column.productId);
          }
        });
      },
      { immediate: true },
    );
    const loadMoreFacilities = (): void => {
      void props.loadMoreFacilities().catch(() => {
        // 网关已展示失败提示；此处仅阻止未处理的 Promise rejection。
      });
    };
    const handleFacilitiesScroll = (event: UIEvent): void => {
      const { target } = event;
      if (!(target instanceof HTMLElement) || props.facilitiesLoading) {
        return;
      }
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
        loadMoreFacilities();
      }
    };
    const moveColumn = (from: number, to: number): void => {
      if (to < 0 || to >= draft.columns.length || from === to) {
        return;
      }
      const [column] = draft.columns.splice(from, 1);
      draft.columns.splice(to, 0, column);
      normalizeOrder();
    };
    const submit = async (): Promise<void> => {
      try {
        await formRef.value?.validate();
      } catch {
        message.warning("请完整填写模板基本信息");
        return;
      }
      if (draft.columns.length === 0) {
        message.warning("请至少配置一列采集属性");
        return;
      }
      const incompleteColumn = draft.columns.some(
        (column) =>
          !column.firstHeader.trim() ||
          (isRemoteParameter(column) && (!column.productCategoryCode || !column.productId || !column.propertyCode)),
      );
      if (incompleteColumn) {
        message.warning("请填写一级表头；远传参数还需关联采集属性");
        return;
      }
      emit("save", structuredClone(toRaw(draft)));
    };

    const configColumns = [
      {
        title: "排序",
        key: "sort",
        width: 64,
        customRender: ({ index }: { index: number }): JSX.Element => (
          <span
            class="drag-handle"
            draggable
            title="拖拽排序"
            onDragstart={(event: DragEvent) => {
              draggedIndex.value = index;
              event.dataTransfer?.setData("text/plain", String(index));
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
              }
            }}
            onDragover={(event: DragEvent) => event.preventDefault()}
            onDrop={() => {
              if (draggedIndex.value !== null) {
                moveColumn(draggedIndex.value, index);
              }
              draggedIndex.value = null;
            }}
            onDragend={() => (draggedIndex.value = null)}
          >
            <PcIcon iconClass="icon-tuozhuai" size={16} />
          </span>
        ),
      },
      {
        title: "一级表头",
        dataIndex: "firstHeader",
        width: 150,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <Input
            value={record.firstHeader}
            maxlength={128}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              record.firstHeader = value;
              if (!value.trim()) {
                record.secondHeader = "";
              }
            }}
          />
        ),
      },
      {
        title: "二级表头",
        dataIndex: "secondHeader",
        width: 150,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <Input
            value={record.secondHeader}
            maxlength={128}
            disabled={!record.firstHeader.trim()}
            placeholder={record.firstHeader.trim() ? "请输入二级表头" : "请先填写一级表头"}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return (record.secondHeader = value);
            }}
          />
        ),
      },
      {
        title: "列类型",
        dataIndex: "columnType",
        width: 130,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <Select
            value={record.columnType}
            options={[
              { label: "远传参数", value: "REMOTE_PARAMETER" },
              { label: "日期时间", value: "DATE_TIME" },
              { label: "手填内容", value: "MANUAL_CONTENT" },
            ]}
            onUpdate:value={(inputValue) => {
              const value = inputValue as RemoteInspectionColumnType;
              return selectColumnType(record, value);
            }}
          />
        ),
      },
      {
        title: "产品分类",
        dataIndex: "productCategoryCode",
        width: 160,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <TreeSelect
            showSearch
            value={record.productCategoryCode || undefined}
            disabled={!isRemoteParameter(record)}
            placeholder="请选择产品分类"
            treeData={categoryTree.value}
            fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
            treeDefaultExpandAll
            treeNodeFilterProp="categoryName"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return selectCategory(record, value);
            }}
          />
        ),
      },
      {
        title: "产品",
        dataIndex: "productId",
        width: 170,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <Select
            showSearch
            value={record.productId || undefined}
            disabled={!isRemoteParameter(record) || !record.productCategoryCode}
            placeholder={isRemoteParameter(record) ? (record.productCategoryCode ? "请选择产品" : "请先选择产品分类") : "仅远传参数需配置"}
            loading={referenceLoading.value}
            options={products(record).map((item) => ({ label: item.productName, value: item.productCode }))}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return selectProduct(record, value);
            }}
          />
        ),
      },
      {
        title: "关联点位",
        dataIndex: "propertyCode",
        width: 170,
        customRender: ({ record }: { record: RemoteInspectionColumnDraft }) => (
          <Select
            showSearch
            value={record.propertyCode || undefined}
            disabled={!isRemoteParameter(record) || !record.productId}
            placeholder={isRemoteParameter(record) ? (record.productId ? "请选择关联点位" : "请先选择产品") : "仅远传参数需配置"}
            options={properties(record).map((item) => ({
              label: `${item.propertyName}${item.unit ? ` (${item.unit})` : ""}`,
              value: item.propertyCode,
            }))}
            onUpdate:value={(inputValue) => {
              const value = inputValue as string;
              return selectProperty(record, value);
            }}
          />
        ),
      },
      {
        title: "操作",
        key: "action",
        width: 80,
        fixed: "right" as const,
        customRender: ({ index }: { index: number }) => (
          <Button
            type="link"
            danger
            onClick={() => {
              draft.columns.splice(index, 1);
              normalizeOrder();
            }}
          >
            删除
          </Button>
        ),
      },
    ];
    const [CubeTable, tableApi] = usePcTable({
      tableCode: "electrical-safety-template-editor-modal",
      rowKey: "id",
      columns: configColumns,
      dataSource: [],
      pagination: false,
    });
    watch(
      () => draft.columns,
      (records) => {
        tableApi.setDataSource(records);
      },
      { immediate: true, deep: true },
    );

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={props.template || props.loadingTemplate ? "编辑远检模板" : "新增远检模板"}
        width="1180px"
        confirmLoading={props.loadingTemplate}
        wrapClassName="electrical-viewport-modal electrical-table-modal template-editor-modal"
        destroyOnClose
        onCancel={() => emit("close")}
        onOk={() => void submit()}
      >
        <Spin spinning={props.loadingTemplate}>
          <Form ref={formRef} model={draft} layout="vertical" rules={templateFormRules} validateOnRuleChange={false}>
            <div class="template-basic-grid">
              <FormItem label="模板名称" name="templateName">
                <Input
                  value={draft.templateName}
                  maxlength={128}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.templateName = value);
                  }}
                />
              </FormItem>
              <FormItem label="巡检频率" name="frequencyHours">
                <Select
                  showSearch
                  value={draft.frequencyHours || undefined}
                  placeholder="请选择巡检频率"
                  options={[1, 2, 4, 6, 12, 24].map((value) => ({ label: `${value}小时`, value }))}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as number;
                    return (draft.frequencyHours = value);
                  }}
                />
              </FormItem>
              <FormItem label="关联设施" name="facilityId">
                <Select
                  showSearch
                  value={draft.facilityId || undefined}
                  placeholder="请选择关联设施"
                  loading={props.facilitiesLoading}
                  options={props.facilities.map((item) => ({ label: item.name, value: item.id }))}
                  onPopupScroll={handleFacilitiesScroll}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.facilityId = value);
                  }}
                />
              </FormItem>
              <FormItem label="展示实时数据">
                <div class="switch-field">
                  <Switch
                    checked={draft.showRealtimeData ?? true}
                    onUpdate:checked={(inputValue) => {
                      const value = inputValue as boolean;
                      return (draft.showRealtimeData = value);
                    }}
                  />
                  <span class="muted">控制远检查看页是否展示实时采集数据</span>
                </div>
              </FormItem>
            </div>
          </Form>
          <div class="column-config-header">
            <div>
              <strong>列配置</strong>
              <span class="muted">　拖拽图标调整列顺序；相同一级表头会自动合并</span>
            </div>
            <Button type="dashed" onClick={() => draft.columns.push(createColumn(draft.columns.length + 1))}>
              新增列
            </Button>
          </div>
          <div class="template-column-table">
            <CubeTable />
          </div>
          <div class="header-preview">
            <strong>表头预览</strong>
            <span class="muted">随一级表头、二级表头和排序实时更新</span>
            {previewGroups.value.length > 0 ? (
              <table class="header-preview-table">
                <thead>
                  <tr>
                    {previewGroups.value.map((group) => (
                      <th
                        key={group.firstHeader}
                        class={`preview-header ${
                          isSingleLevelPreviewGroup(group)
                            ? `preview-header-single preview-column-${group.columns[0].columnType.toLowerCase()}`
                            : "preview-header-parent"
                        }`}
                        colspan={isSingleLevelPreviewGroup(group) ? undefined : group.columns.length}
                        rowspan={hasTwoLevelPreviewGroup.value && isSingleLevelPreviewGroup(group) ? 2 : undefined}
                      >
                        {group.firstHeader}
                      </th>
                    ))}
                  </tr>
                  {hasTwoLevelPreviewGroup.value ? (
                    <tr>
                      {previewGroups.value.flatMap((group) =>
                        isSingleLevelPreviewGroup(group)
                          ? []
                          : group.columns.map((column) => (
                              <th
                                key={column.id}
                                class={`preview-header preview-header-child preview-column-${column.columnType.toLowerCase()}`}
                              >
                                {column.secondHeader.trim() || " "}
                              </th>
                            )),
                      )}
                    </tr>
                  ) : null}
                </thead>
              </table>
            ) : (
              <span class="muted header-preview-empty">填写一级表头后在此预览</span>
            )}
          </div>
        </Spin>
      </Modal>
    );
  },
});

export type { TemplateDraft };
