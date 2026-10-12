import type { AssetRow } from "@g2-contract/asset-management";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";

import { ConfigEditor } from "./config-editor";
import { getClient } from "./domain-context";
import { errorText, protectedClass, treeRows } from "./model";
import { type Person, PersonPicker } from "./person-picker";
import { loadPcUi } from "./runtime-modules";
import { columnsFor } from "./table-columns";

import styles from "./styles.module.css";
const { Button, Modal, PageLayout, PopConfirm, Space, message, usePcForm, usePcTable } = await loadPcUi();
export const AssetClasses = defineComponent({
  setup() {
    const filter = reactive({ name: "" });
    const all = ref<AssetRow[]>([]);
    const open = ref(false);
    const editing = ref<AssetRow>();
    const parentId = ref("");
    let version = 0;
    const edit = (row?: AssetRow, parent?: string) => {
      editing.value = row;
      parentId.value = parent ?? "";
      open.value = true;
    };
    const remove = async (row: AssetRow) => {
      try {
        await getClient().remove("assetType", row.id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(errorText(error));
      }
    };
    const columns = columnsFor("assetClass");
    columns.push({
      title: "操作",
      dataIndex: "action",
      width: 240,
      fixed: "right",
      customRender: ({ record }) => {
        const row = record as AssetRow;
        return (
          <Space size={4}>
            <Button type="link" size="small" disabled={Number(row.level) >= 3} onClick={() => edit(undefined, row.id)}>
              新增下级
            </Button>
            <Button type="link" size="small" disabled={protectedClass(row)} onClick={() => edit(row)}>
              编辑
            </Button>
            <PopConfirm title="确认删除该分类？" okText="确定" cancelText="取消" onConfirm={() => remove(row)}>
              <Button type="link" size="small" danger disabled={protectedClass(row)}>
                删除
              </Button>
            </PopConfirm>
          </Space>
        );
      },
    });
    const [PcTable, table] = usePcTable({
      tableCode: "ASSET_CLASS",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns,
      expandIconColumnIndex: 0,
    });
    const apply = () => {
      const match = (rows: AssetRow[]): AssetRow[] =>
        rows.flatMap((row) => {
          if (!filter.name.trim() || String(row.name).includes(filter.name.trim())) {
            return [row];
          }
          const children = match(row.children ?? []);
          return children.length > 0 ? [{ ...row, children }] : [];
        });
      table.setDataSource(match(all.value));
    };
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const rows = await getClient().classificationTree();
        if (current === version) {
          all.value = treeRows(rows);
          apply();
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: filter,
      actionsInline: true,
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "资产分类名称", allowClear: true },
        },
      ],
      handleSubmit: apply,
      handleReset: apply,
    });
    onMounted(() => void load());
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="资产分类"
        showFooter={false}
        class={styles.page}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => edit()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.main}>
              <PcForm />
              <PcTable />
            </div>
          ),
          default: () => (
            <ConfigEditor
              resource="assetType"
              open={open.value}
              row={editing.value}
              parentId={parentId.value}
              onClose={() => {
                open.value = false;
              }}
              onSaved={() => void load()}
            />
          ),
        }}
      />
    );
  },
});
export const AssetAdministrators = defineComponent({
  setup() {
    const filter = reactive({ name: "" });
    const open = ref(false);
    const editing = ref<AssetRow>();
    const people = ref<Person[]>([]);
    const saving = ref(false);
    let version = 0;
    const columns = columnsFor("assetAdministrators");
    columns.push({
      title: "操作",
      dataIndex: "action",
      width: 150,
      fixed: "right",
      customRender: ({ record }) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            editing.value = record as AssetRow;
            people.value = Array.isArray(editing.value.adminId) ? (editing.value.adminId as Person[]) : [];
            open.value = true;
          }}
        >
          配置管理员
        </Button>
      ),
    });
    const [PcTable, table] = usePcTable({
      tableCode: "ASSET_ADMINISTRATORS",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns,
      expandIconColumnIndex: 1,
    });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const rows = await getClient().administrators(filter);
        if (current === version) {
          table.setDataSource(treeRows(rows));
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: filter,
      actionsInline: true,
      showCollapseButton: false,
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "部门名称", allowClear: true },
        },
      ],
      handleSubmit: () => void load(),
      handleReset: () => void load(),
    });
    const save = async () => {
      if (!editing.value || saving.value) {
        return;
      }
      saving.value = true;
      try {
        await getClient().bindAdministrators(
          editing.value.id,
          people.value.map((person) => person.id),
        );
        open.value = false;
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => void load());
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="资产管理员"
        showFooter={false}
        class={styles.page}
        v-slots={{
          "layout-content": () => (
            <div class={styles.main}>
              <PcForm />
              <PcTable />
            </div>
          ),
          default: () => (
            <Modal
              okText="确定"
              cancelText="取消"
              open={open.value}
              title={`配置管理员 · ${String(editing.value?.name ?? "")}`}
              confirmLoading={saving.value}
              onOk={() => void save()}
              onCancel={() => {
                open.value = false;
              }}
            >
              <p>请选择该部门的资产管理员，可选择多人。</p>
              <PersonPicker
                value={people.value}
                multiple
                onChange={(value) => {
                  people.value = value;
                }}
              />
            </Modal>
          ),
        }}
      />
    );
  },
});
