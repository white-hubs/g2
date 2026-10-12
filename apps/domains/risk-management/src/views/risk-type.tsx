import type { RiskType } from "@g2-contract/risk-management";
import { computed, defineComponent, reactive, ref } from "vue";

import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  PageLayout,
  PopConfirm,
  PopOver,
  Space,
  Textarea,
  message,
  usePcTable,
} from "../pc-ui-runtime";
import { buildCreateRiskTypePayload, buildUpdateRiskTypePayload, emptyRiskTypeForm } from "./risk-type-payload";
import { getRiskManagementClient } from "@/domain-context";

function recordsOf(response: unknown): RiskType[] {
  if (Array.isArray(response)) return response as RiskType[];
  if (response && typeof response === "object" && "records" in response) return (response as { records?: RiskType[] }).records ?? [];
  return [];
}

/** 对齐旧页：树形分类、关键字查询和公共表格列设置均由 pc-ui 承载。 */
export const RiskTypePage = defineComponent({
  name: "RiskTypePage",
  setup() {
    const keyword = ref("");
    const typeRows = ref<RiskType[]>([]);
    const expandedIds = ref<string[]>([]);
    const visible = ref(false);
    const saving = ref(false);
    const editing = ref<RiskType>();
    // 与旧仓一致：新增必须带 itemCode；编辑提交整行字典记录，避免脏 superiorsId/level 覆盖。
    const form = reactive(emptyRiskTypeForm());
    const fetchTypes = async () => {
      try {
        const records = recordsOf(
          await getRiskManagementClient().getRiskTypes({
            itemCode: "risk-source-type",
            keyword: keyword.value || undefined,
          }),
        );
        typeRows.value = records;
        return { records, total: records.length, pages: 1 };
      } catch (error) {
        message.error(error instanceof Error ? error.message : "风险源分类加载失败");
        return { records: [], total: 0, pages: 0 };
      }
    };
    const visibleRowMeta = computed(() => {
      const indexes = new Map<string, { index: number; depth: number }>();
      const walk = (rows: RiskType[], depth: number): void => {
        for (const [index, row] of rows.entries()) {
          indexes.set(row.id, { index: index + 1, depth });
          if (expandedIds.value.includes(row.id) && Array.isArray(row.nextList)) {
            walk(row.nextList as RiskType[], depth + 1);
          }
        }
      };
      walk(typeRows.value, 0);
      return indexes;
    });
    const setExpanded = (id: string, expanded: boolean): void => {
      expandedIds.value = expanded ? [...new Set([...expandedIds.value, id])] : expandedIds.value.filter((item) => item !== id);
      tableApi.setState({ expandedRowKeys: expandedIds.value });
    };
    const open = (item?: RiskType, parent?: RiskType): void => {
      editing.value = item;
      if (item) {
        Object.assign(form, emptyRiskTypeForm(), {
          ...item,
          name: item.name ?? "",
          remarks: String(item.remarks ?? ""),
          itemCode: String(item.itemCode ?? "risk-source-type"),
          superiorsId: String(item.superiorsId ?? ""),
          level: Number(item.level ?? 1),
        });
      } else if (parent) {
        Object.assign(form, emptyRiskTypeForm(), {
          superiorsId: parent.id,
          level: Number(parent.level ?? 1) + 1,
        });
      } else {
        Object.assign(form, emptyRiskTypeForm());
      }
      visible.value = true;
    };
    const save = async (): Promise<void> => {
      if (!form.name.trim()) return void message.warning("请输入分类名称");
      saving.value = true;
      try {
        if (editing.value) {
          await getRiskManagementClient().updateRiskType(buildUpdateRiskTypePayload(editing.value, form));
        } else {
          await getRiskManagementClient().createRiskType(buildCreateRiskTypePayload(form));
        }
        visible.value = false;
        message.success("保存成功");
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    const remove = async (item: RiskType): Promise<void> => {
      try {
        await getRiskManagementClient().deleteRiskType(item.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      }
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "RISK_SOURCE_TYPE",
      rowKey: "id",
      pagination: false,
      autoScrollY: false,
      childrenColumnName: "nextList",
      fetchApi: fetchTypes,
      columns: [
        {
          title: "序号",
          dataIndex: "code",
          width: 80,
          align: "center",
          customRender: ({ record }) => String(visibleRowMeta.value.get(String((record as RiskType).id))?.index ?? 0),
        },
        {
          title: "分类名称",
          dataIndex: "name",
          ellipsis: true,
          customRender: ({ text }) => <PopOver content={String(text ?? "--")}>{String(text ?? "--")}</PopOver>,
        },
        {
          title: "备注说明",
          dataIndex: "remarks",
          ellipsis: true,
          customRender: ({ text }) => <PopOver content={String(text ?? "--")}>{String(text ?? "--")}</PopOver>,
        },
        {
          title: "操作",
          key: "action",
          width: 230,
          customRender: ({ record }) => {
            const item = record as RiskType;
            const locked = item.permissionState === "NO_DELETE_AND_UPDATE";
            return (
              <Space size={4}>
                {!locked && (
                  <Button type="link" size="small" onClick={() => open(item)}>
                    编辑
                  </Button>
                )}
                {Number(item.level ?? 1) < 3 && (
                  <Button type="link" size="small" onClick={() => open(undefined, item)}>
                    新增分类
                  </Button>
                )}
                {!locked && (
                  <PopConfirm title="确认删除该项？" okText="确定" cancelText="取消" onConfirm={() => void remove(item)}>
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </PopConfirm>
                )}
              </Space>
            );
          },
        },
      ],
      expandedRowKeys: expandedIds.value,
      onExpand: (expanded, record) => {
        setExpanded(String((record as RiskType).id), expanded);
      },
    });
    const slots = {
      "layout-header": () => (
        <Button type="primary" onClick={() => open()}>
          新增分类
        </Button>
      ),
      "layout-content": () => (
        <div class="risk-page-stack">
          <Form layout="inline" class="risk-query-form" style={{ margin: "16px 0" }}>
            <FormItem label="分类名称">
              <Input
                allowClear
                value={keyword.value}
                placeholder="请输入分类名称"
                onUpdate:value={(value: string) => {
                  keyword.value = value;
                }}
                onPressEnter={() => tableApi.query()}
              />
            </FormItem>
            <FormItem>
              <Space>
                <Button type="primary" onClick={() => tableApi.query()}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    keyword.value = "";
                    tableApi.query();
                  }}
                >
                  重置
                </Button>
              </Space>
            </FormItem>
          </Form>
          <PcTable />
        </div>
      ),
    };
    return () => (
      <>
        <PageLayout title="风险源分类" showFooter={false} v-slots={slots} />
        <Modal
          open={visible.value}
          confirmLoading={saving.value}
          title={editing.value ? "编辑风险源分类" : "新增风险源分类"}
          okText="确定"
          cancelText="取消"
          onOk={() => void save()}
          onCancel={() => {
            visible.value = false;
          }}
        >
          <Form labelCol={{ style: { width: "120px" } }}>
            <FormItem label="分类名称" required>
              <Input
                placeholder="请输入"
                value={form.name}
                onUpdate:value={(value: string) => {
                  form.name = value;
                }}
              />
            </FormItem>
            <FormItem label="备注说明">
              <Textarea
                placeholder="请输入"
                maxlength={500}
                showCount
                value={form.remarks}
                onUpdate:value={(value: string) => {
                  form.remarks = value;
                }}
              />
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
