import type { AssetRow, OptionItem } from "@g2-contract/asset-management";
import { defineComponent, onMounted, ref } from "vue";

import { ConfigEditor } from "./config-editor";
import { getClient } from "./domain-context";
import { errorText } from "./model";
import { loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { Button, Dropdown, Menu, MenuItem, Modal, Spin, Tree, message } = await loadPcUi();
interface CategoryNode extends OptionItem {
  key: string;
  title: string;
  children?: CategoryNode[];
}
function treeData(items: OptionItem[]): CategoryNode[] {
  return items.map((row) => ({
    ...row,
    key: row.id,
    title: row.name,
    children: row.children?.length ? treeData(row.children) : undefined,
  }));
}
export const CategorySide = defineComponent({
  props: { selected: String },
  emits: { select: (_id: string) => true },
  setup(props, { emit }) {
    const rows = ref<OptionItem[]>([]);
    const loading = ref(false);
    const open = ref(false);
    const editing = ref<AssetRow>();
    const parentId = ref("");
    const load = async () => {
      loading.value = true;
      try {
        rows.value = await getClient().categories();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        loading.value = false;
      }
    };
    const edit = (row?: OptionItem, parent?: string) => {
      editing.value = row ? { id: row.id, name: row.name, parentId: row.parentId } : undefined;
      parentId.value = parent ?? "";
      open.value = true;
    };
    const remove = (row: OptionItem) =>
      Modal.confirm({
        okText: "确定",
        cancelText: "取消",
        title: `确定删除“${row.name}”分类？`,
        content: "分类下存在耗材或子分类时不能删除。",
        onOk: async () => {
          try {
            await getClient().remove("category", row.id);
            if (props.selected === row.id) {
              emit("select", "");
            }
            await load();
            message.success("删除成功");
          } catch (error) {
            message.error(errorText(error));
            throw error;
          }
        },
      });
    onMounted(() => void load());
    return () => (
      <aside class={styles.side}>
        <div class={styles.sideTitle}>
          耗材分类
          <Button size="small" type="link" onClick={() => edit()}>
            新增
          </Button>
        </div>
        <Button
          block
          type={!props.selected ? "primary" : "text"}
          style={{ textAlign: "left", marginBottom: "8px" }}
          onClick={() => emit("select", "")}
        >
          全部耗材
        </Button>
        <Spin spinning={loading.value}>
          <Tree
            blockNode
            treeData={treeData(rows.value)}
            fieldNames={{ title: "name", key: "id", children: "children" }}
            selectedKeys={props.selected ? [props.selected] : []}
            onSelect={(keys) => emit("select", keys.length > 0 ? String(keys[0]) : "")}
            v-slots={{
              title: (row: OptionItem) => (
                <span class={styles.treeTitle}>
                  <span>{row.name}</span>
                  <Dropdown
                    trigger={["click"]}
                    v-slots={{
                      overlay: () => (
                        <Menu
                          onClick={({ key }) => {
                            if (key === "add") {
                              edit(undefined, row.id);
                            } else if (key === "edit") {
                              edit(row);
                            } else {
                              remove(row);
                            }
                          }}
                        >
                          <MenuItem key="add">新增下级</MenuItem>
                          <MenuItem key="edit">编辑</MenuItem>
                          <MenuItem key="remove" danger>
                            删除
                          </MenuItem>
                        </Menu>
                      ),
                    }}
                  >
                    <Button size="small" type="text" onClick={(event: MouseEvent) => event.stopPropagation()}>
                      ···
                    </Button>
                  </Dropdown>
                </span>
              ),
            }}
          />
        </Spin>
        <ConfigEditor
          resource="category"
          open={open.value}
          row={editing.value}
          parentId={parentId.value}
          onClose={() => {
            open.value = false;
          }}
          onSaved={() => void load()}
        />
      </aside>
    );
  },
});
