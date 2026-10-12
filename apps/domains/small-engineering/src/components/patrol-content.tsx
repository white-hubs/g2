import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { Button, Input, Modal, Page, type PcTableColumn, PopConfirm, Select, TabPane, Tabs, message, usePcTable } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, ref, watch } from "vue";

import { getPatrolClient, getSmallEngineeringClient } from "@/domain-context";

export interface Standard extends InspectionRecord {
  standardItems: InspectionRecord[];
}
export interface Target extends InspectionRecord {
  targetId: string;
  targetName: string;
  targetCode: string;
  targetType: string;
  targetTypeName: string;
  standardDTOList: Standard[];
}
export const record = (value: unknown): InspectionRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as InspectionRecord) : {};
export const records = (value: unknown): InspectionRecord[] => (Array.isArray(value) ? value.map(record) : []);
export const standards = (value: unknown): Standard[] =>
  records(value).map((item) => ({ ...item, standardItems: records(item.standardItems) }));
export const normalizeTargets = (value: unknown): Target[] =>
  (Array.isArray(value) ? value.flat() : [])
    .map((raw) => {
      const item = record(raw);
      return {
        ...item,
        targetId: String(item.targetId ?? item.id ?? ""),
        targetName: String(item.targetName ?? item.name ?? ""),
        targetCode: String(item.targetCode ?? ""),
        targetType: String(item.targetType ?? ""),
        targetTypeName: String(item.targetTypeName ?? ""),
        standardDTOList: standards(item.standardDTOList),
      };
    })
    .filter((item) => item.targetId);
export const targetRelations = (targets: Target[]): InspectionRecord[] =>
  targets.flatMap((target) =>
    target.standardDTOList.flatMap((standard) =>
      standard.standardItems.map((item) => ({
        targetCategory: "SMALL_ENGINEERING",
        targetId: target.targetId,
        targetType: target.targetTypeName,
        targetName: target.targetName,
        standardId: standard.id,
        targetParentId: "",
        targetAddress: "",
        itemId: item.id,
        resultCode: item.resultId,
        latAndLon: "",
        targetCode: target.targetCode,
        location: "",
        isRawItem: item.isRawItem ?? 0,
        targetAreaId: "",
        targetAreaName: "",
      })),
    ),
  );
const BUSINESS_TYPE = "SMALL_ENGINEERING";
export const PatrolContent = defineComponent({
  props: {
    modelValue: { type: Array as PropType<Target[]>, required: true },
    readonly: Boolean,
    departments: { type: Array as PropType<{ label: string; value: string }[]>, default: () => [] },
  },
  emits: { "update:modelValue": (_value: Target[]) => true },
  setup(props, { emit }) {
    const patrol = getPatrolClient();
    const small = getSmallEngineeringClient();
    const search = ref("");
    const objectOpen = ref(false);
    const adding = ref(false);
    const keyword = ref("");
    const department = ref<string>();
    const objectPage = ref(1);
    const objectTotal = ref(0);
    const contentOpen = ref(false);
    const contentIds = ref<string[]>([]);
    const contentTab = ref("standard");
    const contentKeyword = ref("");
    const contentPage = ref(1);
    const contentTotal = ref(0);
    const contentSaving = ref(false);
    let objectVersion = 0;
    let contentVersion = 0;
    const change = (rows: Target[]) => emit("update:modelValue", rows);
    const openContent = (ids: string[]) => {
      contentIds.value = ids;
      contentTab.value = "standard";
      contentPage.value = 1;
      contentKeyword.value = "";
      const selected = props.modelValue.find((item) => item.targetId === ids[0]);
      const initial = ids.length === 1 ? (selected?.standardDTOList ?? []) : [];
      standardApi.setSelectedRowKeys(initial.map((item) => String(item.id)));
      standardApi.setSelectedRows(initial);
      const extra = initial.flatMap((item) => item.standardItems.filter((part) => part.isRawItem === 0));
      itemApi.setSelectedRowKeys(extra.map((item) => String(item.id)));
      itemApi.setSelectedRows(extra);
      contentOpen.value = true;
      void loadContent();
    };
    const targetColumns: PcTableColumn[] = [
      { title: "巡检对象", dataIndex: "targetName" },
      {
        title: "巡检内容",
        dataIndex: "standardDTOList",
        customRender: ({ record: raw }) => (raw as Target).standardDTOList.map((item) => item.name).join("、") || "--",
      },
      ...(!props.readonly
        ? [
            {
              title: "操作",
              dataIndex: "action",
              width: 230,
              customRender: ({ record: raw }: { record: unknown }) => {
                const row = raw as Target;
                return (
                  <>
                    <Button type="link" onClick={() => openContent([row.targetId])}>
                      添加巡检内容
                    </Button>
                    <PopConfirm
                      title="确定移除该巡检对象？"
                      okText="确定"
                      cancelText="取消"
                      onConfirm={() => change(props.modelValue.filter((item) => item.targetId !== row.targetId))}
                    >
                      <Button type="link" danger>
                        删除
                      </Button>
                    </PopConfirm>
                  </>
                );
              },
            },
          ]
        : []),
    ];
    const [TargetTable, targetApi] = usePcTable({
      columns: targetColumns,
      rowKey: "targetId",
      tableCode: "SMALL_ENGINEERING_PATROL_CONTENT",
      autoFetch: false,
      autoScrollY: false,
      ...(!props.readonly ? { rowSelection: "checkbox" } : {}),
    });
    watch(
      () => [props.modelValue, search.value],
      () => targetApi.setDataSource(props.modelValue.filter((item) => item.targetName.includes(search.value))),
      { immediate: true, deep: true },
    );
    const [ObjectTable, objectApi] = usePcTable({
      columns: [
        { title: "工程名称", dataIndex: "projectName" },
        { title: "工程编号", dataIndex: "projectNum" },
        { title: "工程类型", dataIndex: "projectTypeName" },
        { title: "监管部门", dataIndex: "depName" },
      ],
      tableCode: "SMALL_ENGINEERING_PATROL_OBJECT_SELECT",
      rowKey: "id",
      rowSelection: "checkbox",
      autoFetch: false,
      scrollY: 300,
    });
    const [StandardTable, standardApi] = usePcTable({
      columns: [
        { title: "巡检标准", dataIndex: "name" },
        { title: "描述", dataIndex: "remark" },
      ],
      tableCode: "SMALL_ENGINEERING_SELECT_STANDARD",
      rowKey: "id",
      rowSelection: "checkbox",
      autoFetch: false,
      scrollY: 300,
    });
    const [ItemTable, itemApi] = usePcTable({
      columns: [
        { title: "巡检项名称", dataIndex: "alias" },
        { title: "巡检内容", dataIndex: "name" },
        { title: "结果项", dataIndex: "resultNames" },
      ],
      tableCode: "SMALL_ENGINEERING_SELECT_ITEM",
      rowKey: "id",
      rowSelection: "checkbox",
      autoFetch: false,
      scrollY: 300,
    });
    const loadObjects = async () => {
      const current = ++objectVersion;
      objectApi.loading.value = true;
      try {
        const result = await small.listSchedules({
          pageNumber: objectPage.value,
          pageSize: 10,
          status: "UNDERWAY",
          keyword: keyword.value || undefined,
          depId: department.value,
        });
        if (current !== objectVersion || !objectOpen.value) {
          return;
        }
        objectApi.setDataSource(result.records);
        objectTotal.value = result.total;
      } catch (error) {
        if (current === objectVersion) {
          message.error(error instanceof Error ? error.message : "巡检对象加载失败");
        }
      } finally {
        if (current === objectVersion) {
          objectApi.loading.value = false;
        }
      }
    };
    const addObjects = async () => {
      if (adding.value || objectApi.loading.value) {
        return;
      }
      const chosen = objectApi.getSelectedRows().map(record);
      if (chosen.length === 0) {
        message.warning("请选择巡检对象");
        return;
      }
      adding.value = true;
      try {
        const added = await Promise.all(
          chosen.map(async (item): Promise<Target | undefined> => {
            const defaults = standards(await patrol.getStandardsByTarget(BUSINESS_TYPE, String(item.projectType ?? ""), BUSINESS_TYPE));
            if (defaults.length === 0) {
              message.warning(`${String(item.projectName)}暂无巡检标准`);
              return;
            }
            return {
              targetId: String(item.id),
              targetName: String(item.projectName ?? ""),
              targetCode: String(item.projectNum ?? ""),
              targetType: String(item.projectType ?? ""),
              targetTypeName: String(item.projectTypeName ?? ""),
              standardDTOList: defaults.map((standard) => ({
                ...standard,
                standardItems: standard.standardItems.map((part) => ({ ...part, isRawItem: 1 })),
              })),
            };
          }),
        );
        const merged = new Map(props.modelValue.map((item) => [item.targetId, item]));
        added.forEach((item) => {
          if (item && !merged.has(item.targetId)) {
            merged.set(item.targetId, item);
          }
        });
        change([...merged.values()]);
        objectOpen.value = false;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "添加巡检对象失败");
      } finally {
        adding.value = false;
      }
    };
    const loadContent = async () => {
      const current = ++contentVersion;
      const api = contentTab.value === "standard" ? standardApi : itemApi;
      api.loading.value = true;
      try {
        const params = {
          pageNumber: contentPage.value,
          pageSize: 10,
          keyword: contentKeyword.value || undefined,
          businessType: BUSINESS_TYPE,
        };
        const result = contentTab.value === "standard" ? await patrol.listStandardPage(params) : await patrol.listItemPage(params);
        if (current !== contentVersion || !contentOpen.value) {
          return;
        }
        api.setDataSource(result.records);
        contentTotal.value = result.total;
      } catch (error) {
        if (current === contentVersion) {
          message.error(error instanceof Error ? error.message : "巡检内容加载失败");
        }
      } finally {
        api.loading.value = false;
      }
    };
    const saveContent = async () => {
      if (contentSaving.value) {
        return;
      }
      const selected = standardApi.getSelectedRows().map(record);
      if (selected.length === 0) {
        message.warning("请选择巡检标准");
        return;
      }
      contentSaving.value = true;
      try {
        const values = await Promise.all(
          selected.map(async (item): Promise<Standard> => {
            const detail = Array.isArray(item.standardItems) ? item : await patrol.getConfig("standard", String(item.id), BUSINESS_TYPE);
            return {
              ...detail,
              standardItems: records(detail.standardItems)
                .filter((part) => part.isRawItem !== 0)
                .map((part) => ({ ...part, isRawItem: 1 })),
            };
          }),
        );
        values[0]?.standardItems.push(...itemApi.getSelectedRows().map((item) => ({ ...record(item), isRawItem: 0 })));
        change(
          props.modelValue.map((item) =>
            contentIds.value.includes(item.targetId)
              ? {
                  ...item,
                  standardDTOList: values.map((standard) => ({
                    ...standard,
                    standardItems: standard.standardItems.map((part) => ({ ...part })),
                  })),
                }
              : item,
          ),
        );
        contentOpen.value = false;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "巡检内容保存失败");
      } finally {
        contentSaving.value = false;
      }
    };
    return () => (
      <>
        <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
          <Input
            value={search.value}
            onUpdate:value={(value) => {
              search.value = value;
            }}
            placeholder="巡检对象名称"
            style={{ width: "230px" }}
          />
          <Button
            onClick={() => {
              search.value = "";
            }}
          >
            重置
          </Button>
          {!props.readonly && (
            <>
              <Button
                type="primary"
                onClick={() => {
                  objectApi.setSelectedRowKeys([]);
                  objectApi.setSelectedRows([]);
                  objectOpen.value = true;
                  objectPage.value = 1;
                  void loadObjects();
                }}
              >
                添加对象
              </Button>
              <Button
                disabled={targetApi.getSelectedRowKeys().length === 0}
                onClick={() => openContent(targetApi.getSelectedRowKeys().map(String))}
              >
                批量修改
              </Button>
              <PopConfirm
                title="确定移除选中的巡检对象？"
                okText="确定"
                cancelText="取消"
                onConfirm={() => {
                  change(props.modelValue.filter((item) => !targetApi.getSelectedRowKeys().includes(item.targetId)));
                  targetApi.setSelectedRowKeys([]);
                }}
              >
                <Button danger disabled={targetApi.getSelectedRowKeys().length === 0}>
                  批量移除
                </Button>
              </PopConfirm>
            </>
          )}
        </div>
        <TargetTable />
        <Modal
          open={objectOpen.value}
          title="添加巡检对象"
          width={1000}
          okText="确定"
          cancelText="取消"
          confirmLoading={adding.value}
          onOk={() => {
            void addObjects();
          }}
          onCancel={() => {
            ++objectVersion;
            objectOpen.value = false;
          }}
        >
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <Select
              v-model:value={department.value}
              options={props.departments}
              allowClear
              placeholder="监管部门"
              style={{ width: "180px" }}
            />
            <Input
              v-model:value={keyword.value}
              placeholder="名称"
              onPressEnter={() => {
                objectPage.value = 1;
                void loadObjects();
              }}
            />
            <Button
              loading={objectApi.loading.value}
              onClick={() => {
                objectPage.value = 1;
                void loadObjects();
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                keyword.value = "";
                department.value = undefined;
                objectPage.value = 1;
                void loadObjects();
              }}
            >
              重置
            </Button>
          </div>
          <ObjectTable />
          <Page
            current={objectPage.value}
            pageSize={10}
            total={objectTotal.value}
            cachePageQuery={false}
            onPageChange={(page: number) => {
              objectPage.value = page;
              void loadObjects();
            }}
          />
        </Modal>
        <Modal
          open={contentOpen.value}
          title="添加巡检内容"
          width={950}
          okText="确定"
          cancelText="取消"
          confirmLoading={contentSaving.value}
          onOk={() => {
            void saveContent();
          }}
          onCancel={() => {
            ++contentVersion;
            contentOpen.value = false;
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <Input v-model:value={contentKeyword.value} placeholder="名称" />
            <Button
              onClick={() => {
                contentPage.value = 1;
                void loadContent();
              }}
            >
              查询
            </Button>
          </div>
          <Tabs
            activeKey={contentTab.value}
            onChange={(key) => {
              contentTab.value = String(key);
              contentPage.value = 1;
              contentKeyword.value = "";
              void loadContent();
            }}
          >
            <TabPane key="standard" tab="巡检标准">
              <StandardTable />
            </TabPane>
            <TabPane key="item" tab="巡检项">
              <ItemTable />
            </TabPane>
          </Tabs>
          <Page
            current={contentPage.value}
            pageSize={10}
            total={contentTotal.value}
            cachePageQuery={false}
            onPageChange={(page: number) => {
              contentPage.value = page;
              void loadContent();
            }}
          />
        </Modal>
      </>
    );
  },
});
