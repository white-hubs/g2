import { Button, Empty, Input, Modal, PopConfirm, PopOver, Space, Table, message } from "@g2-platform/pc-ui";

import layoutStyles from "../../../layout.module.css";
/** @jsxImportSource vue */
import { computed, defineComponent, onMounted, ref, watch } from "vue";

import {
  createOrgNode,
  createOrgNodeChild,
  deleteOrgNode,
  getOrgTree,
  saveOrgNodeMembers,
  updateOrgNode,
} from "../../../api/safety-personnel";
import { PageShell } from "../../../components/page-shell/page-shell";
import { PersonPickerModal } from "../../../components/person-picker-modal/person-picker-modal";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { useLayoutTableScroll } from "../../../hooks/use-layout-table-scroll";
import type { OrgNodeUI, PoolPersonUI } from "../../../types/ui";
import { showApiError } from "../../../utils/api-error";
import { mapOrgTree, orgMemberToPoolPerson } from "../../../utils/mappers";
import { usePageName } from "../../../utils/page-name";

import styles from "./index.module.css";

function getMemberNames(node: OrgNodeUI): string {
  return node.members
    .map((m) => m.userName)
    .filter(Boolean)
    .join("、");
}

function collectNodeIds(nodes: OrgNodeUI[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children.length > 0) {
      ids.push(...collectNodeIds(node.children));
    }
  }
  return ids;
}

function findOrgNode(nodes: OrgNodeUI[], id: string): OrgNodeUI | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findOrgNode(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function filterOrgTree(nodes: OrgNodeUI[], keyword: string): OrgNodeUI[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    return nodes;
  }

  const walk = (list: OrgNodeUI[]): OrgNodeUI[] => {
    const result: OrgNodeUI[] = [];
    for (const node of list) {
      const children = walk(node.children);
      const nameMatch = node.name.toLowerCase().includes(kw);
      const memberMatch = node.members.some((m) => m.userName.toLowerCase().includes(kw));
      if (nameMatch || memberMatch || children.length > 0) {
        result.push({ ...node, children });
      }
    }
    return result;
  };
  return walk(nodes);
}

type ModalMode = "addRoot" | "addChild" | "edit";

export const OrgConfigPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const { scrollY, recalc } = useLayoutTableScroll();
    const rawTree = ref<OrgNodeUI[]>([]);
    const keyword = ref("");
    const loading = ref(false);
    const expandedRowKeys = ref<string[]>([]);
    const showModal = ref(false);
    const modalTitle = ref("");
    const modalMode = ref<ModalMode>("addRoot");
    const formName = ref("");
    const parentNode = ref<OrgNodeUI | null>(null);
    const editingNodeId = ref<string | null>(null);
    const pickerOpen = ref(false);
    const pickerNodeId = ref<string | null>(null);

    const filteredTree = computed(() => filterOrgTree(rawTree.value, keyword.value));

    const pickerInitialSelected = computed((): PoolPersonUI[] => {
      if (!pickerNodeId.value) {
        return [];
      }
      const node = findOrgNode(rawTree.value, pickerNodeId.value);
      return (node?.members ?? []).map(orgMemberToPoolPerson);
    });

    const reload = async (): Promise<void> => {
      loading.value = true;
      try {
        const nodes = await useAuthRequest(() => getOrgTree());
        rawTree.value = mapOrgTree(nodes);
      } catch (e) {
        showApiError(e);
        rawTree.value = [];
      } finally {
        loading.value = false;
        recalc();
      }
    };

    onMounted(() => {
      void reload();
      recalc();
    });

    watch(keyword, (val) => {
      if (val.trim()) {
        expandedRowKeys.value = collectNodeIds(filteredTree.value);
      }
    });

    const handleExpand = (expanded: boolean, record: OrgNodeUI): void => {
      if (expanded) {
        if (!expandedRowKeys.value.includes(record.id)) {
          expandedRowKeys.value = [...expandedRowKeys.value, record.id];
        }
      } else {
        expandedRowKeys.value = expandedRowKeys.value.filter((id) => id !== record.id);
      }
    };

    const openAddRoot = (): void => {
      modalMode.value = "addRoot";
      modalTitle.value = "新增组织";
      formName.value = "";
      parentNode.value = null;
      editingNodeId.value = null;
      showModal.value = true;
    };

    const openAddChild = (record: OrgNodeUI): void => {
      if (!expandedRowKeys.value.includes(record.id)) {
        expandedRowKeys.value = [...expandedRowKeys.value, record.id];
      }
      modalMode.value = "addChild";
      modalTitle.value = `新增下级-${record.name}`;
      formName.value = "";
      parentNode.value = record;
      editingNodeId.value = null;
      showModal.value = true;
    };

    const openEdit = (record: OrgNodeUI): void => {
      modalMode.value = "edit";
      modalTitle.value = "编辑组织";
      formName.value = record.name;
      editingNodeId.value = record.id;
      showModal.value = true;
    };

    const openPickMembers = (record: OrgNodeUI): void => {
      pickerNodeId.value = record.id;
      pickerOpen.value = true;
    };

    const handleModalOk = async (): Promise<void> => {
      const name = formName.value.trim();
      if (!name) {
        message.warning("请输入组织名称");
        return;
      }
      try {
        if (modalMode.value === "addRoot") {
          await useAuthRequest(() => createOrgNode({ name }));
        } else if (modalMode.value === "addChild" && parentNode.value) {
          await useAuthRequest(() => createOrgNodeChild(parentNode.value!.id, { name }));
        } else if (modalMode.value === "edit" && editingNodeId.value) {
          await useAuthRequest(() => updateOrgNode(editingNodeId.value!, { name }));
        }
        showModal.value = false;
        message.success("操作成功");
        await reload();
      } catch (e) {
        showApiError(e, "保存失败");
      }
    };

    const onDelete = async (record: OrgNodeUI): Promise<void> => {
      if (record.children.length > 0) {
        message.warning("请先删除下级组织");
        return;
      }
      try {
        await useAuthRequest(() => deleteOrgNode(record.id));
        message.success("已删除");
        await reload();
      } catch (e) {
        showApiError(e, "删除失败");
      }
    };

    const onPickMembers = async (rows: PoolPersonUI[]): Promise<void> => {
      if (!pickerNodeId.value) {
        return;
      }
      try {
        await useAuthRequest(() =>
          saveOrgNodeMembers(pickerNodeId.value!, {
            userIds: rows.map((r) => r.personId),
          }),
        );
        message.success("成员已保存");
        await reload();
      } catch (e) {
        showApiError(e, "保存成员失败");
      }
    };

    const columns = [
      {
        title: "组织名称",
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
        title: "关联人员",
        dataIndex: "members",
        key: "members",
        ellipsis: true,
        customRender: ({ record }: { record: OrgNodeUI }) => {
          const names = getMemberNames(record);
          const display = names || "--";
          return (
            <PopOver content={display}>
              <span class={styles.memberCell}>{display}</span>
            </PopOver>
          );
        },
      },
      {
        title: "操作",
        key: "action",
        width: 280,
        fixed: "right" as const,
        customRender: ({ record }: { record: OrgNodeUI }) => (
          <Space size={16}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                openPickMembers(record);
              }}
            >
              选人
            </Button>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                openAddChild(record);
              }}
            >
              新增下级
            </Button>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                openEdit(record);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="是否删除当前选中？"
              okText="确定"
              cancelText="取消"
              onConfirm={() => {
                void onDelete(record);
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

    return () => (
      <div class={layoutStyles.route}>
        <PageShell title={pageTitle.value || "组织管理配置"} showFooter={false}>
          {{
            "layout-header": () => (
              <Button type="primary" onClick={openAddRoot}>
                新增
              </Button>
            ),
            "layout-content": () => (
              <>
                <div class={`toolbar ${styles.searchBar}`} data-layout-toolbar>
                  <Input
                    class={styles.searchInput}
                    placeholder="组织名称"
                    showCount={false}
                    value={keyword.value}
                    allowClear
                    onUpdate:value={(value) => {
                      const v = String(value ?? "");
                      keyword.value = v;
                    }}
                    onPressEnter={() => {
                      expandedRowKeys.value = collectNodeIds(filteredTree.value);
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      expandedRowKeys.value = collectNodeIds(filteredTree.value);
                    }}
                  >
                    查询
                  </Button>
                </div>
                <div class={`tableWrap ${styles.tableWrap}`}>
                  <Table
                    class={`safety-personnel-management-table ${styles.orgTable}`}
                    rowKey="id"
                    columns={columns}
                    dataSource={filteredTree.value}
                    loading={loading.value}
                    pagination={false}
                    size="middle"
                    scroll={{ y: scrollY.value, x: 770 }}
                    expandedRowKeys={expandedRowKeys.value}
                    childrenColumnName="children"
                    locale={{ emptyText: <Empty description="暂无组织数据" /> }}
                    onExpand={(expanded: boolean, record: OrgNodeUI) => {
                      handleExpand(expanded, record);
                    }}
                  />
                </div>
              </>
            ),
          }}
        </PageShell>
        <Modal
          open={showModal.value}
          title={modalTitle.value}
          centered
          destroyOnClose
          width={480}
          onCancel={() => {
            showModal.value = false;
          }}
          onOk={() => {
            void handleModalOk();
          }}
        >
          <Input
            placeholder="请输入组织名称"
            value={formName.value}
            onUpdate:value={(value) => {
              const v = String(value ?? "");
              formName.value = v;
            }}
          />
        </Modal>
        <PersonPickerModal
          open={pickerOpen.value}
          source="org-candidates"
          title="选择组织负责人员"
          initialSelected={pickerInitialSelected.value}
          onUpdate:open={(v: boolean) => {
            pickerOpen.value = v;
          }}
          onConfirm={(rows: PoolPersonUI[]) => {
            void onPickMembers(rows);
          }}
        />
      </div>
    );
  },
});
