import type { KnowledgeDocumentRow, KnowledgeFile, KnowledgeTypeNode } from "@g2-contract/knowledge-document";
import { type PropType, computed, defineComponent, markRaw, onMounted, onUnmounted, reactive, ref } from "vue";

import { BatchUploadModal } from "../components/batch-upload-modal";
import { DocumentFormModal } from "../components/document-form-modal";
import { getKnowledgeDocumentClient } from "../domain-context";
import {
  Button,
  Image,
  InputSearch,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Space,
  Tree,
  TreeSelect,
  message,
  usePcForm,
  usePcTable,
} from "../pc-ui-runtime";
import {
  type TreeOption,
  errorMessage,
  formatDateTime,
  isImageFile,
  navigationTree,
  previewUrl,
  productOptions,
  referenceTree,
  text,
  typeTree,
} from "../shared";

import styles from "../styles.module.less";

const DepartmentFilter = markRaw(
  defineComponent({
    name: "KnowledgeDocumentDepartmentFilter",
    inheritAttrs: false,
    props: { value: String, treeData: { type: Array as PropType<TreeOption[]>, default: () => [] } },
    emits: ["update:value"],
    setup(props, { attrs, emit }) {
      return () => (
        <TreeSelect
          {...attrs}
          value={props.value || undefined}
          treeData={props.treeData}
          allowClear
          showSearch
          treeNodeFilterProp="label"
          placeholder="请选择所属部门"
          onUpdate:value={(value) => emit("update:value", value === undefined ? undefined : String(value))}
        />
      );
    },
  }),
);

export const KnowledgeDocumentPage = defineComponent({
  name: "KnowledgeDocumentPage",
  setup() {
    const query = reactive<{ keyword: string; productId?: string; deptId?: string; typeId?: string }>({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedIds = ref<string[]>([]);
    const typeKeyword = ref("");
    const typeRows = ref<KnowledgeTypeNode[]>([]);
    const formTypeRows = ref<KnowledgeTypeNode[]>([]);
    const expandedKeys = ref<string[]>([]);
    const products = ref<{ label: string; value: string }[]>([]);
    const departments = ref<TreeOption[]>([]);
    const leftWidth = ref(250);
    const dragging = ref(false);
    const startX = ref(0);
    const startWidth = ref(0);
    const previewFile = ref<KnowledgeFile>();
    const documentModalRef = ref<{ openModal(record?: KnowledgeDocumentRow): void }>();
    const batchModalRef = ref<{ openModal(): void }>();

    const modalTypes = computed(() => typeTree(formTypeRows.value));
    const navigationTypes = computed(() => navigationTree(typeRows.value));

    const clearSelection = (): void => {
      selectedIds.value = [];
      tableApi.setSelectedRowKeys([]);
    };

    const loadReferences = async (): Promise<void> => {
      try {
        const client = getKnowledgeDocumentClient();
        const [allTypes, productRows, departmentRows] = await Promise.all([
          client.listTypeTree(),
          client.listProducts(),
          client.listDepartments({ enabled: true }),
        ]);
        formTypeRows.value = allTypes;
        typeRows.value = allTypes;
        expandedKeys.value = allTypes.map((item) => item.id);
        products.value = productOptions(productRows);
        departments.value = referenceTree(departmentRows);
      } catch (error) {
        message.error(errorMessage(error, "筛选数据加载失败"));
      }
    };

    const searchTypes = async (): Promise<void> => {
      try {
        typeRows.value = await getKnowledgeDocumentClient().listTypeTree({ name: typeKeyword.value.trim() || undefined });
        expandedKeys.value = typeRows.value.map((item) => item.id);
      } catch (error) {
        message.error(errorMessage(error, "文档类型加载失败"));
      }
    };

    const download = (record: KnowledgeDocumentRow): void => {
      const file = record.fileList?.[0];
      if (!file?.path) {
        message.warning("该文档无文件");
        return;
      }
      const link = document.createElement("a");
      link.href = file.path;
      link.download = file.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    };

    const preview = (record: KnowledgeDocumentRow): void => {
      const file = record.fileList?.[0];
      if (!file?.path) {
        message.warning("该文档无文件");
        return;
      }
      if (isImageFile(file)) {
        previewFile.value = file;
        return;
      }
      window.open(previewUrl(file), "_blank", "noopener,noreferrer");
    };

    const remove = async (ids: string[]): Promise<void> => {
      try {
        await getKnowledgeDocumentClient().deleteDocuments(ids);
        message.success("删除成功");
        clearSelection();
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "KNOWLEDGE_DOCUMENT_LIST",
      rowKey: "id",
      rowSelection: "checkbox",
      rowSelectionChange(keys) {
        selectedIds.value = keys.map(String);
      },
      columns: [
        { title: "文档名称", dataIndex: "name", width: 220, fixed: "left", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "文档类型", dataIndex: "typeName", width: 150, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "文档格式", dataIndex: "format", width: 110, align: "center", customRender: ({ text: value }) => text(value) },
        {
          title: "文档大小",
          dataIndex: "size",
          width: 120,
          align: "center",
          customRender: ({ text: value }) => (Number(value) > 0 ? `${(Number(value) / 1024 / 1024).toFixed(2)} MB` : "--"),
        },
        {
          title: "条目数",
          dataIndex: "entryCount",
          width: 100,
          align: "center",
          customRender: ({ text: value }) => Number(value ?? 0),
        },
        { title: "关联产品", dataIndex: "productName", width: 160, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "所属部门", dataIndex: "deptName", width: 160, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "上传人", dataIndex: "createBy", width: 130, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "更新时间",
          dataIndex: "updateTime",
          width: 180,
          customRender: ({ text: value }) => formatDateTime(value),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 250,
          fixed: "right",
          customRender: ({ record }: { record: KnowledgeDocumentRow }) => (
            <Space size={4}>
              <Button type="link" size="small" onClick={() => download(record)}>
                下载
              </Button>
              <Button type="link" size="small" onClick={() => preview(record)}>
                查看
              </Button>
              <Button type="link" size="small" onClick={() => documentModalRef.value?.openModal(record)}>
                编辑
              </Button>
              <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove([record.id])}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await getKnowledgeDocumentClient().pageDocuments({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            name: query.keyword.trim() || undefined,
            typeId: query.typeId,
            deptId: query.deptId,
            productId: query.productId,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "知识文档加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "productId",
          label: "关联产品",
          componentProps: {
            allowClear: true,
            options: products,
            showSearch: true,
            optionFilterProp: "label",
            placeholder: "请选择关联产品",
          },
        },
        {
          component: DepartmentFilter,
          fieldName: "deptId",
          label: "所属部门",
          componentProps: { treeData: departments },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入文档名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.productId = typeof values.productId === "string" ? values.productId : undefined;
        query.deptId = typeof values.deptId === "string" ? values.deptId : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.keyword = "";
        query.productId = undefined;
        query.deptId = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const handleMouseDown = (event: MouseEvent): void => {
      event.preventDefault();
      dragging.value = true;
      startX.value = event.clientX;
      startWidth.value = leftWidth.value;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const handleMouseMove = (event: MouseEvent): void => {
      if (!dragging.value) {
        return;
      }
      leftWidth.value = Math.min(520, Math.max(220, startWidth.value + event.clientX - startX.value));
    };
    const handleMouseUp = (): void => {
      dragging.value = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    onMounted(() => {
      void loadReferences();
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
    onUnmounted(() => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    });

    return () => (
      <PageLayout
        title="知识文档"
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button type="primary" onClick={() => batchModalRef.value?.openModal()}>
                批量上传
              </Button>
              <Button type="primary" onClick={() => documentModalRef.value?.openModal()}>
                新增
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <>
              <div class={styles.documentWorkspace}>
                <aside class={styles.typeSidebar} style={{ width: `${leftWidth.value}px` }}>
                  <div class={styles.sidebarTitle}>文档类型</div>
                  <InputSearch
                    value={typeKeyword.value}
                    allowClear
                    placeholder="请输入文档类型名称"
                    onUpdate:value={(value) => (typeKeyword.value = value)}
                    onSearch={() => void searchTypes()}
                  />
                  <div class={styles.typeTree}>
                    <Tree
                      treeData={navigationTypes.value}
                      expandedKeys={expandedKeys.value}
                      selectedKeys={query.typeId ? [query.typeId] : []}
                      autoExpandParent
                      onSelect={(keys: (string | number)[]) => {
                        query.typeId = keys[0] === undefined ? undefined : String(keys[0]);
                        page.pageNumber = 1;
                        tableApi.query();
                      }}
                      onExpand={(keys: (string | number)[]) => (expandedKeys.value = keys.map(String))}
                    />
                  </div>
                </aside>
                <div class={styles.workspaceDivider} onMousedown={handleMouseDown} />
                <section class={styles.documentTablePane}>
                  <PcForm />
                  <PcTable />
                </section>
              </div>
              <DocumentFormModal
                ref={documentModalRef}
                typeOptions={modalTypes.value}
                productOptions={products.value}
                departmentOptions={departments.value}
                onSaved={() => tableApi.query()}
              />
              <BatchUploadModal
                ref={batchModalRef}
                typeOptions={modalTypes.value}
                productOptions={products.value}
                departmentOptions={departments.value}
                onSaved={() => tableApi.query()}
              />
              <Modal
                open={Boolean(previewFile.value)}
                title={previewFile.value?.name ?? "图片预览"}
                footer={null}
                width="80%"
                onCancel={() => (previewFile.value = undefined)}
              >
                {previewFile.value ? <Image class={styles.previewImage} src={previewFile.value.path} /> : null}
              </Modal>
            </>
          ),
          "footer-btn": () => (
            <Space>
              <span>已选 {selectedIds.value.length} 项</span>
              <Button
                danger
                disabled={selectedIds.value.length === 0}
                onClick={() => {
                  if (selectedIds.value.length === 0) {
                    message.warning("请选择要删除的文件");
                    return;
                  }
                  Modal.confirm({
                    title: "批量删除",
                    content: "确定要删除选中的文件吗？",
                    okText: "确定",
                    cancelText: "取消",
                    okButtonProps: { danger: true },
                    onOk: () => remove(selectedIds.value),
                  });
                }}
              >
                删除
              </Button>
            </Space>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber, pageSize) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
