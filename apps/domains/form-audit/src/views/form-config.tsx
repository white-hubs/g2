import type { FormFlow, FormGroupCount } from "@g2-contract/form-audit";
import {
  Button,
  DeleteOutlined,
  EditOutlined,
  Form,
  FormItem,
  Image,
  Input,
  Modal,
  Page,
  PageLayout,
  PlusOutlined,
  PopConfirm,
  Spin,
  Switch,
  Tooltip,
  Tree,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { APPLICATION_CODE, errorMessage, formatDateTime } from "../shared";

interface GroupNode {
  children?: GroupNode[];
  count: number;
  key: string;
  level: number;
  name: string;
  parentId?: string;
}

interface GroupTreeNode {
  children?: GroupTreeNode[];
  key: string;
  title: JSX.Element;
}

const ALL_GROUP_ID = "0";

function toGroupNodes(groups: FormGroupCount[], level = 1, parentId?: string): GroupNode[] {
  return groups.map((item) => {
    const key = String(item.formGroupId);
    const children = toGroupNodes(item.children ?? [], level + 1, key);
    return {
      children: children.length > 0 ? children : undefined,
      count: Number(item.formGroupCount ?? 0),
      key,
      level,
      name: item.formGroupName,
      parentId,
    };
  });
}

function sumGroupCounts(groups: FormGroupCount[]): number {
  return groups.reduce((total, group) => total + Number(group.formGroupCount ?? 0), 0);
}

function collectGroupKeys(nodes: GroupNode[]): string[] {
  return nodes.flatMap((node) => [node.key, ...collectGroupKeys(node.children ?? [])]);
}

function findGroupNode(nodes: GroupNode[], key: string): GroupNode | undefined {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    const child = findGroupNode(node.children ?? [], key);
    if (child) {
      return child;
    }
  }
  return undefined;
}

function includesGroup(node: GroupNode, key: string): boolean {
  return node.key === key || (node.children ?? []).some((child) => includesGroup(child, key));
}

function createConfigPage(newMode: boolean) {
  return defineComponent({
    name: newMode ? "FormAuditNewConfig" : "FormAuditWorkOrderConfig",
    setup() {
      const router = useRouter();
      const title = newMode ? "表单配置-新" : "表单配置";
      const query = reactive<{ enable?: string; keyword: string }>({ keyword: "" });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const groups = ref<GroupNode[]>([]);
      const selectedGroup = ref<GroupNode>();
      const expandedKeys = ref<string[]>([]);
      const groupLoading = ref(false);
      const groupSaving = ref(false);
      const groupModalOpen = ref(false);
      const groupModalMode = ref<"create" | "edit">("create");
      const groupParentName = ref("顶级分组");
      const groupDraft = reactive<{ id?: string; parentId?: string; name: string }>({ name: "" });
      const shareRecord = ref<FormFlow>();

      const selectedGroupId = computed(() =>
        selectedGroup.value?.key && selectedGroup.value.key !== ALL_GROUP_ID ? selectedGroup.value.key : undefined,
      );
      const canAddForm = computed(() => !newMode || selectedGroup.value?.level === 2);

      const loadGroups = async (): Promise<void> => {
        groupLoading.value = true;
        try {
          const backendGroups = newMode
            ? await getFormAuditClient().listConfigFormGroupTree({ application: APPLICATION_CODE })
            : await getFormAuditClient().listFormGroupCounts({ application: APPLICATION_CODE });
          const children = toGroupNodes(backendGroups);
          groups.value = [
            {
              children: children.length > 0 ? children : undefined,
              count: sumGroupCounts(backendGroups),
              key: ALL_GROUP_ID,
              level: 0,
              name: "全部",
            },
          ];
          expandedKeys.value = collectGroupKeys(groups.value);
          selectedGroup.value = findGroupNode(groups.value, selectedGroup.value?.key ?? ALL_GROUP_ID) ?? groups.value[0];
        } catch (error) {
          groups.value = [];
          selectedGroup.value = undefined;
          message.error(errorMessage(error, "表单分组加载失败"));
        } finally {
          groupLoading.value = false;
        }
      };

      const designPath = newMode ? "/d/form-audit/form-audit-design" : "/d/form-audit/work-order-design";
      const goDesign = (record?: FormFlow, copy = false): void => {
        if (!record && !canAddForm.value) {
          message.warning("请选择二级分组后再新增表单");
          return;
        }
        void router.push({
          path: designPath,
          query: {
            formType: "CUSTOM_FORM",
            id: record?.id,
            isCopy: copy ? "true" : undefined,
            groupId: record ? record.formGroupId : selectedGroupId.value,
          },
        });
      };

      const changeEnabled = async (record: FormFlow, value: boolean): Promise<void> => {
        const previous = record.enable;
        record.enable = value;
        try {
          await getFormAuditClient().updateFormFlowEnabled(record.id, value);
          message.success("操作成功");
        } catch (error) {
          record.enable = previous;
          message.error(errorMessage(error, "状态更新失败"));
        }
      };

      const removeFlow = async (record: FormFlow): Promise<void> => {
        try {
          await getFormAuditClient().deleteFormFlow(record.id);
          message.success("删除成功");
          await loadGroups();
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };

      const [PcTable, tableApi] = usePcTable({
        tableCode: newMode ? "FORM_AUDIT_CONFIG_NEW" : "FORM_AUDIT_CONFIG",
        rowKey: "id",
        columns: [
          { title: "序号", dataIndex: "tableIndex", width: 72 },
          { title: "名称", dataIndex: "name", width: 160, ellipsis: true },
          { title: "分组", dataIndex: "formGroupName", width: 160, ellipsis: true },
          {
            title: "说明",
            dataIndex: "remark",
            width: 180,
            ellipsis: true,
            customRender: ({ text }: { text?: string }) => text || "--",
          },
          {
            title: "最后更新",
            dataIndex: "updateTime",
            width: 170,
            customRender: ({ text }: { text?: string | number }) => formatDateTime(text),
          },
          {
            title: "开关",
            dataIndex: "enable",
            width: 100,
            customRender: ({ record }: { record: FormFlow }) => (
              <Switch
                checked={Boolean(record.enable)}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={(value: boolean | string | number) => void changeEnabled(record, Boolean(value))}
              />
            ),
          },
          {
            title: "操作",
            dataIndex: "action",
            width: 230,
            fixed: "right",
            customRender: ({ record }: { record: FormFlow }) => (
              <div class="form-audit-link-actions">
                <Button type="link" size="small" onClick={() => goDesign(record)}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={() => goDesign(record, true)}>
                  复制
                </Button>
                {record.publicForm === 1 && record.status === "IN_USE" && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      shareRecord.value = record;
                    }}
                  >
                    分享
                  </Button>
                )}
                <PopConfirm title="确认删除该表单？" okText="确定" cancelText="取消" onConfirm={() => void removeFlow(record)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              </div>
            ),
          },
        ],
        fetchApi: async () => {
          const result = await getFormAuditClient().pageFormFlows({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            fromGroupId: selectedGroupId.value,
            keyword: query.keyword || undefined,
            enable: query.enable === "true" ? true : query.enable === "false" ? false : undefined,
            application: APPLICATION_CODE,
          });
          result.records = result.records.map((record, index) => ({
            ...record,
            tableIndex: (page.pageNumber - 1) * page.pageSize + index + 1,
          }));
          return result;
        },
        fetchLoaded(data) {
          page.total = data.total;
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: [
          {
            component: "Select",
            fieldName: "enable",
            label: "启用状态",
            componentProps: {
              allowClear: true,
              options: [
                { label: "已启用", value: "true" },
                { label: "已禁用", value: "false" },
              ],
            },
          },
          { component: "Input", fieldName: "keyword", label: "表单名称", defaultValue: "", componentProps: { allowClear: true } },
        ],
        handleSubmit(values) {
          query.enable = typeof values.enable === "string" ? values.enable : undefined;
          query.keyword = String(values.keyword ?? "").trim();
          page.pageNumber = 1;
          tableApi.query();
        },
        handleReset() {
          query.enable = undefined;
          query.keyword = "";
          page.pageNumber = 1;
          tableApi.query();
        },
      });

      const canCreateChild = (node: GroupNode): boolean => (newMode ? node.level < 2 : node.level === 0);

      const openGroupModal = (mode: "create" | "edit", node: GroupNode): void => {
        groupModalMode.value = mode;
        groupDraft.id = mode === "edit" ? node.key : undefined;
        groupDraft.parentId = mode === "create" && node.key !== ALL_GROUP_ID ? node.key : undefined;
        groupDraft.name = mode === "edit" ? node.name : "";
        groupParentName.value = mode === "create" ? node.name : (findGroupNode(groups.value, node.parentId ?? "")?.name ?? "顶级分组");
        groupModalOpen.value = true;
      };

      const saveGroup = async (): Promise<void> => {
        const name = groupDraft.name.trim();
        if (!name) {
          message.warning("请输入分组名称");
          return;
        }
        groupSaving.value = true;
        try {
          await getFormAuditClient().saveFormGroup({
            id: groupDraft.id,
            parentId: groupDraft.parentId,
            name,
            application: APPLICATION_CODE,
          });
          groupModalOpen.value = false;
          message.success(groupModalMode.value === "create" ? "分组新增成功" : "分组修改成功");
          await loadGroups();
        } catch (error) {
          message.error(errorMessage(error, "分组保存失败"));
        } finally {
          groupSaving.value = false;
        }
      };

      const deleteGroup = async (node: GroupNode): Promise<void> => {
        try {
          await getFormAuditClient().deleteFormGroup(node.key);
          const shouldReset = selectedGroup.value ? includesGroup(node, selectedGroup.value.key) : false;
          if (shouldReset) {
            selectedGroup.value = groups.value[0];
          }
          message.success("分组删除成功");
          await loadGroups();
          if (shouldReset) {
            page.pageNumber = 1;
            tableApi.query();
          }
        } catch (error) {
          message.error(errorMessage(error, "分组删除失败"));
        }
      };

      const buildTreeData = (nodes: GroupNode[]): GroupTreeNode[] =>
        nodes.map((node) => ({
          key: node.key,
          title: (
            <div class="form-audit-group-node">
              <span class="form-audit-group-label" title={node.name}>
                <span class="form-audit-group-name">{node.name}</span>
                <span class="form-audit-group-count">{node.count}</span>
              </span>
              <span class="form-audit-group-actions">
                {canCreateChild(node) && (
                  <Tooltip title={node.level === 0 ? "新增分组" : "新增子分组"}>
                    <Button
                      type="link"
                      size="small"
                      aria-label={node.level === 0 ? "新增分组" : "新增子分组"}
                      onClick={(event: Event) => {
                        event.stopPropagation();
                        openGroupModal("create", node);
                      }}
                    >
                      <PlusOutlined />
                    </Button>
                  </Tooltip>
                )}
                {node.level > 0 && (
                  <Tooltip title="编辑分组">
                    <Button
                      type="link"
                      size="small"
                      aria-label="编辑分组"
                      onClick={(event: Event) => {
                        event.stopPropagation();
                        openGroupModal("edit", node);
                      }}
                    >
                      <EditOutlined />
                    </Button>
                  </Tooltip>
                )}
                {node.level > 0 && (
                  <PopConfirm title="确认删除该分组？" okText="确定" cancelText="取消" onConfirm={() => void deleteGroup(node)}>
                    <Tooltip title="删除分组">
                      <Button type="link" size="small" danger aria-label="删除分组" onClick={(event: Event) => event.stopPropagation()}>
                        <DeleteOutlined />
                      </Button>
                    </Tooltip>
                  </PopConfirm>
                )}
              </span>
            </div>
          ),
          children: node.children?.length ? buildTreeData(node.children) : undefined,
        }));

      const treeData = computed(() => buildTreeData(groups.value));

      void loadGroups();
      return () => (
        <PageLayout
          title={title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" disabled={!canAddForm.value} onClick={() => goDesign()}>
                新增表单
              </Button>
            ),
            "layout-content": () => (
              <div class="form-audit-split">
                <aside class="form-audit-side">
                  <div class="form-audit-side-head">
                    <div>
                      <div class="form-audit-side-title">表单分组</div>
                      <div class="form-audit-side-hint">选择分组查看对应表单</div>
                    </div>
                  </div>
                  <Spin spinning={groupLoading.value}>
                    <div class="form-audit-group-tree">
                      <Tree
                        blockNode
                        autoExpandParent={false}
                        expandedKeys={expandedKeys.value}
                        selectedKeys={selectedGroup.value ? [selectedGroup.value.key] : []}
                        treeData={treeData.value}
                        onExpand={(keys: (string | number)[]) => {
                          expandedKeys.value = keys.map(String);
                        }}
                        onSelect={(keys: (string | number)[]) => {
                          const next = keys.length > 0 ? findGroupNode(groups.value, String(keys[0])) : selectedGroup.value;
                          if (!next || next.key === selectedGroup.value?.key) {
                            return;
                          }
                          selectedGroup.value = next;
                          page.pageNumber = 1;
                          tableApi.query();
                        }}
                      />
                    </div>
                  </Spin>
                </aside>
                <main class="form-audit-main form-audit-table-page">
                  <PcForm />
                  <PcTable />
                </main>
                <Modal
                  v-model:open={groupModalOpen.value}
                  title={groupModalMode.value === "edit" ? "编辑分组" : "新增分组"}
                  okText="保存"
                  cancelText="取消"
                  confirmLoading={groupSaving.value}
                  onOk={() => void saveGroup()}
                >
                  <Form labelCol={{ span: 5 }} wrapperCol={{ span: 17 }}>
                    <FormItem label="上级分组">
                      <Input value={groupParentName.value} disabled />
                    </FormItem>
                    <FormItem label="分组名称" required>
                      <Input v-model:value={groupDraft.name} maxlength={40} placeholder="请输入分组名称" />
                    </FormItem>
                  </Form>
                </Modal>
                <Modal
                  open={Boolean(shareRecord.value)}
                  title="表单分享"
                  footer={null}
                  onCancel={() => {
                    shareRecord.value = undefined;
                  }}
                >
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    {shareRecord.value?.qrImage || shareRecord.value?.qrCodeUrl ? (
                      <Image width={220} src={shareRecord.value.qrImage ?? shareRecord.value.qrCodeUrl} />
                    ) : (
                      <div class="form-audit-empty">该表单暂无分享二维码</div>
                    )}
                    <div style={{ marginTop: "12px", color: "#687386" }}>{shareRecord.value?.name}</div>
                  </div>
                </Modal>
              </div>
            ),
            "footer-page": () => (
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(pageNumber: number, pageSize: number) => {
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

export const WorkOrderConfig = createConfigPage(false);
export const FormAuditConfig = createConfigPage(true);
