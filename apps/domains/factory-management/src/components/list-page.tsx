import type { PageResult } from "@g2-contract/factory-management";
import {
  Button,
  Modal,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  PopConfirm,
  Space,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { type VNodeChild, defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { errorMessage } from "../shared";

export interface ParkListRow {
  id: string;
  [key: string]: unknown;
}

interface PageState {
  pageNumber: number;
  pageSize: number;
  total: number;
}

export interface ParkListConfig<Row extends ParkListRow> {
  title: string;
  tableCode: string;
  initialQuery: Record<string, unknown>;
  schema: () => PcFormSchemaProp[];
  columns: PcTableColumn[];
  fetch(query: Record<string, unknown>): Promise<PageResult<Row>>;
  loadReferences?: () => Promise<void>;
  transformQuery?: (query: Record<string, unknown>) => Record<string, unknown>;
  formPath?: string;
  allowDetail?: boolean;
  remove?: (id: string) => Promise<unknown>;
  removeBatch?: (ids: string[]) => Promise<unknown>;
  headerExtra?: () => VNodeChild;
}

export function createParkListPage<Row extends ParkListRow>(factory: () => ParkListConfig<Row>) {
  return defineComponent({
    name: "FactoryManagementListPage",
    setup() {
      const config = factory();
      const router = useRouter();
      const query = reactive<Record<string, unknown>>({ ...config.initialQuery });
      const page = reactive<PageState>({ pageNumber: 1, pageSize: 10, total: 0 });
      const selectedIds = ref<string[]>([]);

      const navigate = (type: "add" | "edit" | "detail", record?: Row): void => {
        if (!config.formPath) {
          return;
        }
        void router.push({ path: config.formPath, query: { type, ...(record ? { id: record.id } : {}) } });
      };

      const removeRows = async (ids: string[]): Promise<void> => {
        if (ids.length === 0) {
          return;
        }
        try {
          if (ids.length === 1 && config.remove) {
            await config.remove(ids[0] ?? "");
          } else if (config.removeBatch) {
            await config.removeBatch(ids);
          } else if (config.remove) {
            await Promise.all(ids.map((id) => config.remove?.(id)));
          }
          message.success("删除成功");
          selectedIds.value = [];
          tableApi.setSelectedRowKeys([]);
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };

      const actionColumn =
        config.formPath || config.remove
          ? {
              title: "操作",
              dataIndex: "action",
              width: config.allowDetail ? 210 : 150,
              fixed: "right" as const,
              customRender: ({ record }: { record: Row }) => (
                <Space size={4}>
                  {config.allowDetail ? (
                    <Button type="link" size="small" onClick={() => navigate("detail", record)}>
                      详情
                    </Button>
                  ) : null}
                  {config.formPath ? (
                    <Button type="link" size="small" onClick={() => navigate("edit", record)}>
                      编辑
                    </Button>
                  ) : null}
                  {config.remove ? (
                    <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void removeRows([record.id])}>
                      <Button type="link" size="small" danger>
                        删除
                      </Button>
                    </PopConfirm>
                  ) : null}
                </Space>
              ),
            }
          : undefined;

      const [PcTable, tableApi] = usePcTable({
        tableCode: config.tableCode,
        rowKey: "id",
        ...(config.removeBatch
          ? {
              rowSelection: "checkbox" as const,
              rowSelectionChange(keys: (string | number)[]) {
                selectedIds.value = keys.map(String);
              },
            }
          : {}),
        columns: [...config.columns, ...(actionColumn ? [actionColumn] : [])],
        fetchApi: async () => {
          try {
            const request = { ...query, pageNumber: page.pageNumber, pageSize: page.pageSize };
            const result = await config.fetch(config.transformQuery ? config.transformQuery(request) : request);
            page.total = result.total;
            return result;
          } catch (error) {
            message.error(errorMessage(error, `${config.title}加载失败`));
            return { records: [], total: 0, pages: 0 };
          }
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: config.schema(),
        cache: true,
        handleSubmit(values) {
          Object.assign(query, values);
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          for (const key of Object.keys(query)) {
            delete query[key];
          }
          Object.assign(query, config.initialQuery);
          page.pageNumber = 1;
          tableApi.query();
        },
      });

      onMounted(() => {
        if (config.loadReferences) {
          void config.loadReferences().catch((error: unknown) => message.error(errorMessage(error, "筛选数据加载失败")));
        }
      });

      return () => (
        <PageLayout
          title={config.title}
          v-slots={{
            "layout-header": () => (
              <Space>
                {config.formPath ? (
                  <Button type="primary" onClick={() => navigate("add")}>
                    新增
                  </Button>
                ) : null}
                {config.headerExtra?.()}
              </Space>
            ),
            "layout-content": () => (
              <>
                <PcForm />
                <PcTable />
              </>
            ),
            "footer-btn": config.removeBatch
              ? () => (
                  <Space>
                    <span>已选 {selectedIds.value.length} 项</span>
                    <Button
                      danger
                      disabled={selectedIds.value.length === 0}
                      onClick={() =>
                        Modal.confirm({
                          title: "批量删除",
                          content: `确认删除选中的 ${selectedIds.value.length} 项数据？`,
                          okText: "确定",
                          cancelText: "取消",
                          okButtonProps: { danger: true },
                          onOk: () => removeRows(selectedIds.value),
                        })
                      }
                    >
                      批量删除
                    </Button>
                  </Space>
                )
              : undefined,
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
}
