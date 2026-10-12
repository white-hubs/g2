import type { MaintenanceProjectItem, MaintenanceProjectRecord } from "@g2-client/maintenance/client";
import {
  Button,
  DeleteOutlined,
  Form,
  FormItem,
  Modal,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  PopOver,
  Textarea,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getMaintenanceClient } from "@/domain-context";
import { millennial } from "@/utils/format";
import {
  PRODUCT_CATEGORY_FIELD_NAMES,
  lastCategoryCode,
  loadProductCategoryTree,
  type ProductCategoryNode,
} from "@/utils/product-category";

import styles from "./item-list.module.css";

/** 弹窗内每行维保内容；rowKey 仅用于前端行标识，提交前剔除。 */
interface EditableProjectItem extends MaintenanceProjectItem {
  rowKey: string;
}

let rowKeySeed = 0;
const nextRowKey = (): string => `maintenance-item-${++rowKeySeed}`;

export const MaintenanceItemList = defineComponent({
  name: "MaintenanceItemList",
  setup() {
    const client = getMaintenanceClient();
    const query = reactive<{ categoryCode?: string[] }>({ categoryCode: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const modalOpen = ref(false);
    const modalLoading = ref(false);
    const saving = ref(false);
    const currentCategory = reactive<{ categoryCode?: string; categoryName?: string }>({});
    const editableItems = ref<EditableProjectItem[]>([]);
    let loadedItems: MaintenanceProjectItem[] = [];
    let detailToken = 0;

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const openConfig = (record: MaintenanceProjectRecord): void => {
      // 先同步打开弹窗再拉详情，加载期间保持可关闭。
      currentCategory.categoryCode = record.categoryCode;
      currentCategory.categoryName = record.categoryName;
      editableItems.value = [];
      loadedItems = [];
      modalOpen.value = true;
      modalLoading.value = true;
      const token = ++detailToken;
      client
        .listMaintenanceProjectItems({ categoryCode: record.categoryCode })
        .then((items) => {
          if (token !== detailToken) {
            return;
          }
          loadedItems = items;
          editableItems.value = items.map((item) => ({ ...item, rowKey: nextRowKey() }));
        })
        .catch((error: unknown) => {
          if (token === detailToken) {
            message.error(error instanceof Error ? error.message : "维保内容加载失败");
          }
        })
        .finally(() => {
          if (token === detailToken) {
            modalLoading.value = false;
          }
        });
    };

    const addContent = (): void => {
      editableItems.value = [
        ...editableItems.value,
        {
          rowKey: nextRowKey(),
          categoryCode: currentCategory.categoryCode,
          categoryName: currentCategory.categoryName,
          maintenanceContent: "",
        },
      ];
    };

    const removeContent = (rowKey: string): void => {
      editableItems.value = editableItems.value.filter((item) => item.rowKey !== rowKey);
    };

    const closeModal = (): void => {
      modalOpen.value = false;
      detailToken += 1;
      editableItems.value = [];
      loadedItems = [];
      currentCategory.categoryCode = undefined;
      currentCategory.categoryName = undefined;
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      if (editableItems.value.length === 0) {
        message.warning("请设置维保内容");
        return;
      }
      const keptIds = new Set(editableItems.value.map((item) => item.id).filter((id) => id !== undefined));
      const kept = editableItems.value.map(({ rowKey: _rowKey, ...rest }) => ({ ...rest, deleted: false }));
      // 旧页把被移除的已有内容以 deleted=true 一并提交，后端据此做软删除。
      const removed = loadedItems
        .filter((item) => item.id !== undefined && !keptIds.has(item.id))
        .map((item) => ({ ...item, deleted: true }));
      saving.value = true;
      try {
        await client.saveMaintenanceProjectItems([...kept, ...removed]);
        message.success("操作成功");
        closeModal();
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "产品品类",
        dataIndex: "categoryName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        title: "维保项",
        dataIndex: "maintenanceItemNum",
        ellipsis: true,
        customRender: ({ text }) => {
          const value = text as number | undefined;
          return ellipsisCell(value || value === 0 ? millennial(value, false) : null);
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        fixed: "right",
        width: 100,
        customRender: ({ record }) => (
          <Button type="link" onClick={() => openConfig(record as MaintenanceProjectRecord)}>
            配置
          </Button>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "categoryCode",
      tableCode: "MAINTENANCE_TERM",
      autoFetch: false,
      fetchApi: async () =>
        client.pageMaintenanceProjects({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          categoryCode: lastCategoryCode(query.categoryCode),
        }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const search = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const categorySchema = (options: ProductCategoryNode[]): PcFormSchemaProp => ({
      component: "Cascader",
      fieldName: "categoryCode",
      label: "产品品类",
      defaultValue: undefined,
      componentProps: {
        placeholder: "请选择产品品类",
        options,
        fieldNames: PRODUCT_CATEGORY_FIELD_NAMES,
        changeOnSelect: true,
        allowClear: true,
        style: { width: "220px" },
      },
    });

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [categorySchema([])],
      handleSubmit: () => {
        search();
      },
      handleReset: () => {
        query.categoryCode = undefined;
        search();
      },
    });

    onMounted(() => {
      tableApi.query();
      loadProductCategoryTree()
        .then((tree) => {
          formApi.updateFieldSchema(categorySchema(tree));
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "产品品类加载失败");
        });
    });

    const slots = {
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          cachePageQuery
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => (
      <PageLayout
        title="维保项"
        v-slots={{
          ...slots,
          // 弹窗挂到 default slot，继承 ZhConfigProvider 中文 locale。
          default: () => (
            <Modal
              open={modalOpen.value}
              title="维保内容"
              centered
              okText="确定"
              cancelText="取消"
              confirmLoading={saving.value}
              onOk={() => void save()}
              onCancel={closeModal}
            >
              <Form layout="horizontal" labelCol={{ style: { width: "80px" } }}>
                <FormItem label="产品品类">
                  <span>{currentCategory.categoryName ?? "--"}</span>
                </FormItem>
                <FormItem label="维保内容">
                  <Button type="primary" disabled={modalLoading.value} onClick={addContent}>
                    添加
                  </Button>
                </FormItem>
                <FormItem>
                  <div class={styles.itemContainer}>
                    {editableItems.value.map((item) => (
                      <div class={styles.itemRow} key={item.rowKey}>
                        <div class={styles.itemInput}>
                          <label>维保内容：</label>
                          <Textarea
                            value={item.maintenanceContent}
                            maxlength={128}
                            autoSize={{ minRows: 2, maxRows: 8 }}
                            placeholder="请输入维保内容"
                            onUpdate:value={(value: string) => {
                              item.maintenanceContent = value;
                            }}
                          />
                        </div>
                        <div class={styles.itemAction}>
                          <Button type="link" danger onClick={() => removeContent(item.rowKey)}>
                            <DeleteOutlined />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </FormItem>
              </Form>
            </Modal>
          ),
        }}
      />
    );
  },
});
