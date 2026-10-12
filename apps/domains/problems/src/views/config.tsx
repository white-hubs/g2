import type { ProblemConfig } from "@g2-client/problems/client";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  Select,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getProblemsClient } from "../domain-context";

type ConfigKind = "degree" | "category" | "type";
const names: Record<ConfigKind, string> = {
  degree: "隐患程度",
  category: "隐患分类",
  type: "隐患类型",
};

function createConfigPage(type: "degree" | "type") {
  return defineComponent({
    name: type === "degree" ? "ProblemsDegree" : "ProblemsType",
    setup() {
      const client = getProblemsClient();
      const modalOpen = ref(false);
      const saving = ref(false);
      const deleting = ref(false);
      const categories = ref<ProblemConfig[]>([]);
      const selectedCategoryId = ref<string | undefined>();
      const currentKind = ref<ConfigKind>("degree");
      const draft = reactive<{
        id?: string | number;
        name: string;
        hiddenDangerCategoryId?: string;
      }>({ name: "" });
      let requestVersion = 0;
      const open = (kind: ConfigKind, item?: ProblemConfig): void => {
        currentKind.value = kind;
        draft.id = item?.id;
        draft.name = item?.name ?? "";
        const categoryId = item?.hiddenDangerCategoryId;
        draft.hiddenDangerCategoryId =
          categoryId === undefined || categoryId === null ? (kind === "type" ? selectedCategoryId.value : undefined) : String(categoryId);
        modalOpen.value = true;
      };
      const columns: PcTableColumn[] =
        type === "degree"
          ? [
              { title: "隐患程度", dataIndex: "name", ellipsis: true },
              {
                title: "操作",
                dataIndex: "action",
                width: 150,
                fixed: "right",
                customRender: ({ record }) => actions(record as ProblemConfig, "degree"),
              },
            ]
          : [
              { title: "隐患类型", dataIndex: "name", ellipsis: true },
              {
                title: "隐患分类",
                dataIndex: "hiddenDangerCategoryName",
                ellipsis: true,
              },
              {
                title: "操作",
                dataIndex: "action",
                width: 150,
                fixed: "right",
                customRender: ({ record }) => actions(record as ProblemConfig, "type"),
              },
            ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: type === "degree" ? "PROBLEM_DEGREE" : "HIDDEN_DANGER_TYPE_LIST",
        rowKey: "id",
        autoFetch: false,
      });
      async function load(): Promise<void> {
        const version = ++requestVersion;
        tableApi.loading.value = true;
        try {
          const result =
            type === "degree"
              ? await client.listDegrees()
              : await client.listTypes({
                  hiddenDangerCategoryId: selectedCategoryId.value,
                });
          if (version === requestVersion) {
            tableApi.setDataSource(result);
          }
        } catch (error) {
          if (version === requestVersion) {
            message.error(error instanceof Error ? error.message : "配置加载失败");
          }
        } finally {
          if (version === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      }
      async function loadCategories(): Promise<void> {
        try {
          categories.value = await client.listCategories();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "隐患分类加载失败");
        }
      }
      async function save(): Promise<void> {
        if (saving.value) {
          return;
        }
        if (!draft.name.trim()) {
          message.warning(`请输入${names[currentKind.value]}`);
          return;
        }
        if (draft.name.length > 20) {
          message.warning(`${names[currentKind.value]}最多20字`);
          return;
        }
        if (currentKind.value === "type" && !draft.hiddenDangerCategoryId) {
          message.warning("请选择隐患分类");
          return;
        }
        saving.value = true;
        try {
          const payload = {
            name: draft.name.trim(),
            ...(currentKind.value === "type"
              ? {
                  hiddenDangerCategoryId: draft.hiddenDangerCategoryId,
                  hiddenDangerCategoryName: categories.value.find((item) => String(item.id) === draft.hiddenDangerCategoryId)?.name,
                }
              : {}),
          };
          if (currentKind.value === "degree") {
            if (draft.id) {
              await client.updateDegree({ id: draft.id, ...payload });
            } else {
              await client.createDegree(payload);
            }
          } else if (currentKind.value === "category") {
            if (draft.id) {
              await client.updateCategory({ id: draft.id, ...payload });
            } else {
              await client.createCategory(payload);
            }
            await loadCategories();
          } else {
            if (draft.id) {
              await client.updateType({ id: draft.id, ...payload });
            } else {
              await client.createType(payload);
            }
          }
          modalOpen.value = false;
          message.success("保存成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      }
      async function remove(kind: ConfigKind, item: ProblemConfig): Promise<void> {
        if (deleting.value || !item.id) {
          return;
        }
        deleting.value = true;
        try {
          if (kind === "degree") {
            await client.deleteDegree(item.id);
          } else if (kind === "category") {
            await client.deleteCategory(item.id);
            await loadCategories();
          } else {
            await client.deleteType(item.id);
          }
          message.success("删除成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        } finally {
          deleting.value = false;
        }
      }
      function actions(item: ProblemConfig, kind: ConfigKind) {
        return (
          <>
            <Button type="link" onClick={() => open(kind, item)}>
              编辑
            </Button>
            <PopConfirm title={`确认删除${names[kind]}？`} okText="确定" cancelText="取消" onConfirm={() => void remove(kind, item)}>
              <Button type="link" danger disabled={deleting.value}>
                删除
              </Button>
            </PopConfirm>
          </>
        );
      }
      void load();
      if (type === "type") {
        void loadCategories();
      }
      const slots = {
        "layout-header": () =>
          type === "degree" ? (
            <Button type="primary" onClick={() => open("degree")}>
              新增
            </Button>
          ) : null,
        // 无查询表单：在 layout-header 横线下方补 16px，避免表格贴边。
        "layout-content": () => (
          <div
            style={{
              display: "flex",
              height: "100%",
              minHeight: 0,
              paddingTop: "16px",
            }}
          >
            {type === "type" && (
              <aside
                style={{
                  width: "240px",
                  borderRight: "1px solid #f0f0f0",
                  paddingRight: "16px",
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>隐患分类</strong>
                  <Button type="primary" size="small" onClick={() => open("category")}>
                    新增
                  </Button>
                </div>
                {categories.value.map((item) => (
                  <div
                    key={String(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: selectedCategoryId.value === String(item.id) ? "#e6f4ff" : undefined,
                    }}
                  >
                    <span
                      style={{ flex: 1, padding: "8px", cursor: "pointer" }}
                      onClick={() => {
                        selectedCategoryId.value = selectedCategoryId.value === String(item.id) ? undefined : String(item.id);
                        void load();
                      }}
                    >
                      {item.name}
                    </span>
                    <Button type="link" size="small" onClick={() => open("category", item)}>
                      编辑
                    </Button>
                    <PopConfirm title="删除当前分类？" okText="确定" cancelText="取消" onConfirm={() => void remove("category", item)}>
                      <Button type="link" size="small" danger disabled={deleting.value}>
                        删除
                      </Button>
                    </PopConfirm>
                  </div>
                ))}
              </aside>
            )}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                paddingLeft: type === "type" ? "16px" : undefined,
              }}
            >
              {type === "type" && (
                <div style={{ textAlign: "right", marginBottom: "12px" }}>
                  <Button type="primary" onClick={() => open("type")}>
                    新增隐患类型
                  </Button>
                </div>
              )}
              <PcTable />
            </div>
          </div>
        ),
      };
      return () => (
        <>
          <PageLayout title={type === "degree" ? "隐患程度" : "隐患类型"} showFooter={false} v-slots={slots} />
          <Modal
            open={modalOpen.value}
            title={`${draft.id ? "编辑" : "新增"}${names[currentKind.value]}`}
            okText="确定"
            cancelText="取消"
            confirmLoading={saving.value}
            onOk={() => void save()}
            onCancel={() => {
              modalOpen.value = false;
            }}
          >
            <Form layout="vertical">
              <FormItem label={currentKind.value === "type" ? "类型名称" : names[currentKind.value]} required>
                <Input
                  value={draft.name}
                  maxlength={20}
                  placeholder={currentKind.value === "type" ? "请输入类型名称" : `请输入${names[currentKind.value]}`}
                  onUpdate:value={(value: string) => {
                    draft.name = value;
                  }}
                />
              </FormItem>
              {currentKind.value === "type" && (
                <FormItem label="隐患分类" required>
                  <Select
                    value={draft.hiddenDangerCategoryId}
                    placeholder="请选择隐患分类"
                    options={categories.value.map((item) => ({
                      label: item.name,
                      value: String(item.id),
                    }))}
                    onUpdate:value={(value) => {
                      draft.hiddenDangerCategoryId = typeof value === "string" ? value : undefined;
                    }}
                  />
                </FormItem>
              )}
            </Form>
          </Modal>
        </>
      );
    },
  });
}
export const ProblemsDegree = createConfigPage("degree");
export const ProblemsType = createConfigPage("type");
