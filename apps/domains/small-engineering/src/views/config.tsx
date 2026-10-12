import type { InspectionConfigKind, InspectionRecord } from "@g2-contract/daily-inspection";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  type PcTableColumn,
  PopConfirm,
  PopOver,
  Spin,
  Switch,
  Textarea,
  Tree,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getPatrolClient, getSmallEngineeringClient } from "@/domain-context";

type Kind = "engineering" | InspectionConfigKind;
const BASE = "/d/small-engineering";
const BUSINESS_TYPE = "SMALL_ENGINEERING";
const details: Record<Kind, { title: string; placeholder: string; columns: { title: string; field: string }[]; formPath?: string }> = {
  engineering: { title: "工程类型", placeholder: "类型名称", columns: [{ title: "类型名称", field: "name" }] },
  type: { title: "巡检类型", placeholder: "类型名称", columns: [{ title: "类型名称", field: "name" }] },
  cron: {
    title: "巡检周期",
    placeholder: "周期名称",
    columns: [
      { title: "周期名称", field: "name" },
      { title: "表达式", field: "cron" },
      { title: "描述", field: "description" },
    ],
  },
  result: {
    title: "巡检结果",
    placeholder: "结果名称",
    columns: [
      { title: "结果名称", field: "name" },
      { title: "结果项", field: "itemNames" },
    ],
  },
  item: {
    title: "巡检项",
    placeholder: "巡检项名称",
    columns: [
      { title: "巡检项名称", field: "alias" },
      { title: "巡检项内容", field: "name" },
      { title: "巡检结果项", field: "resultNames" },
      { title: "适用对象", field: "referTypeNames" },
    ],
    formPath: "inspect-items-form",
  },
  standard: {
    title: "巡检标准",
    placeholder: "巡检标准",
    columns: [{ title: "巡检标准", field: "name" }],
    formPath: "inspect-standard-form",
  },
};
const display = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
const cell = (value: unknown): JSX.Element => <PopOver content={display(value)}>{display(value)}</PopOver>;

function createConfigPage(kind: Kind) {
  const spec = details[kind];
  return defineComponent({
    name: `SmallEngineeringConfig${kind}`,
    setup() {
      const router = useRouter();
      const small = getSmallEngineeringClient();
      const patrol = getPatrolClient();
      const query = reactive({ keyword: "", targetType: undefined as string | undefined });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const selectedKeys = ref<string[]>([]);
      const mutating = ref(false);
      const options = ref<{ label: string; value: string }[]>([]);
      const treeKeyword = ref("");
      const relationOpen = ref(false);
      const relationSaving = ref(false);
      const relationLoading = ref(false);
      const relationKeyword = ref("");
      const relationOptions = ref<InspectionRecord[]>([]);
      const relationSelected = ref<string[]>([]);
      const relationPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const modalOpen = ref(false);
      const modalLoading = ref(false);
      const saveLoading = ref(false);
      const form = reactive<{
        id?: string;
        name: string;
        cron: string;
        description: string;
        enable: boolean;
        options: { key: string; itemName: string; itemValue: string; errorFlag: boolean }[];
      }>({
        id: undefined,
        name: "",
        cron: "",
        description: "",
        enable: true,
        options: [],
      });
      let requestVersion = 0;
      let modalVersion = 0;
      let relationVersion = 0;

      const formRoute = (type: "add" | "edit" | "detail", id?: string): void => {
        if (!spec.formPath) {
          return;
        }
        void router.push({ path: `${BASE}/${spec.formPath}`, query: { type, ...(id ? { id } : {}) } });
      };
      const resetModal = (): void => {
        Object.assign(form, { id: undefined, name: "", cron: "", description: "", enable: true, options: [] });
      };
      const openModal = async (record?: InspectionRecord): Promise<void> => {
        const current = ++modalVersion;
        resetModal();
        modalOpen.value = true;
        if (!record) {
          return;
        }
        form.id = String(record.id ?? "");
        modalLoading.value = true;
        try {
          const detail = kind === "result" ? await patrol.getConfig("result", form.id, BUSINESS_TYPE) : record;
          if (current !== modalVersion || !modalOpen.value) {
            return;
          }
          Object.assign(form, {
            id: String(detail.id ?? ""),
            name: String(detail.name ?? ""),
            cron: String(detail.cron ?? ""),
            description: String(detail.description ?? ""),
            enable: Boolean(detail.enable ?? true),
            options: Array.isArray(detail.options) ? detail.options : [],
          });
        } catch (error) {
          if (current === modalVersion) {
            message.error(error instanceof Error ? error.message : "详情加载失败");
          }
        } finally {
          if (current === modalVersion) {
            modalLoading.value = false;
          }
        }
      };
      const closeModal = (): void => {
        ++modalVersion;
        modalOpen.value = false;
        modalLoading.value = false;
      };

      const save = async (): Promise<void> => {
        if (saveLoading.value || modalLoading.value) {
          return;
        }
        if (!form.name.trim()) {
          message.warning(`请输入${kind === "cron" ? "周期" : kind === "result" ? "结果" : "类型"}名称`);
          return;
        }
        if (kind === "cron" && !form.cron.trim()) {
          message.warning("请输入表达式");
          return;
        }
        if (
          kind === "result" &&
          (form.options.length === 0 || form.options.some((item) => !item.itemName.trim() || !String(item.itemValue).trim()))
        ) {
          message.warning("请添加结果项");
          return;
        }
        saveLoading.value = true;
        try {
          if (kind === "engineering") {
            await small.saveProjectType({ ...(form.id ? { id: form.id } : {}), name: form.name.trim() });
          } else {
            const payload: InspectionRecord =
              kind === "cron"
                ? { name: form.name.trim(), cron: form.cron.trim(), description: form.description, businessType: BUSINESS_TYPE }
                : kind === "result"
                  ? { name: form.name.trim(), enable: form.enable, options: form.options, businessType: BUSINESS_TYPE }
                  : { name: form.name.trim(), businessType: BUSINESS_TYPE };
            if (form.id) {
              await patrol.updateConfig(kind, form.id, payload);
            } else {
              await patrol.createConfig(kind, payload);
            }
          }
          message.success("操作成功");
          closeModal();
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saveLoading.value = false;
        }
      };
      const remove = async (id: string): Promise<void> => {
        if (mutating.value) {
          return;
        }
        mutating.value = true;
        try {
          if (kind === "engineering") {
            await small.deleteProjectType(id);
          } else {
            await patrol.deleteConfig(kind, id, BUSINESS_TYPE);
          }
          message.success("操作成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        } finally {
          mutating.value = false;
        }
      };
      const setDefault = async (row: InspectionRecord, enabled: boolean): Promise<void> => {
        if (mutating.value) {
          return;
        }
        if (!query.targetType) {
          message.warning("请选择关联标准");
          return;
        }
        mutating.value = true;
        try {
          await patrol.setDefaultStandard(String(row.id ?? ""), {
            businessType: BUSINESS_TYPE,
            defaultStandard: Number(enabled),
            targetType: query.targetType,
            targetCategory: BUSINESS_TYPE,
          });
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "设置默认标准失败");
        } finally {
          mutating.value = false;
        }
      };
      const columns: PcTableColumn[] = [
        ...spec.columns.map(({ title, field }) => ({
          title,
          dataIndex: field,
          ellipsis: true,
          align: "center" as const,
          customRender: ({ text }: { text: unknown }) => cell(text),
        })),
        ...(kind === "standard"
          ? [
              {
                title: "设为默认巡检标准",
                dataIndex: "defaultStandard",
                width: 190,
                customRender: ({ record }: { record: unknown }) => {
                  const row = record as InspectionRecord;
                  return (
                    <Switch
                      loading={mutating.value}
                      checked={Boolean(row.defaultStandard)}
                      checkedChildren="启用"
                      unCheckedChildren="停用"
                      onChange={(enabled) => {
                        void setDefault(row, enabled === true);
                      }}
                    />
                  );
                },
              } as PcTableColumn,
            ]
          : []),
        {
          title: "操作",
          dataIndex: "action",
          width: 190,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as InspectionRecord;
            const id = String(row.id ?? "");
            return (
              <>
                {spec.formPath && (
                  <Button type="link" onClick={() => formRoute("detail", id)}>
                    详情
                  </Button>
                )}
                <Button type="link" onClick={() => (spec.formPath ? formRoute("edit", id) : void openModal(row))}>
                  编辑
                </Button>
                <PopConfirm
                  title="确认删除该项？"
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => {
                    void remove(id);
                  }}
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </PopConfirm>
              </>
            );
          },
        },
      ];
      const [PcTable, tableApi] = usePcTable({
        columns,
        tableCode: `SMALL_ENGINEERING_${kind.toUpperCase()}`,
        rowKey: "id",
        autoFetch: false,
        ...(kind === "cron"
          ? {
              rowSelection: "checkbox" as const,
              rowSelectionChange: (keys: (string | number)[]) => {
                selectedKeys.value = keys.map(String);
              },
            }
          : {}),
      });
      const load = async (): Promise<void> => {
        const current = ++requestVersion;
        tableApi.loading.value = true;
        try {
          const params = {
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword || undefined,
            businessType: BUSINESS_TYPE,
            ...(kind === "standard" ? { targetTypeEq: true, targetType: query.targetType } : {}),
          };
          const result = kind === "engineering" ? await small.pageProjectTypes(params) : await patrol.listConfig(kind, params);
          if (current !== requestVersion) {
            return;
          }
          tableApi.setDataSource(result.records);
          page.total = result.total;
        } catch (error) {
          if (current === requestVersion) {
            message.error(error instanceof Error ? error.message : `${spec.title}加载失败`);
          }
        } finally {
          if (current === requestVersion) {
            tableApi.loading.value = false;
          }
        }
      };
      const [PcForm] = usePcForm({
        layout: "horizontal",
        cache: true,
        cacheFields: ["keyword"],
        syncStateRef: query,
        schema: [
          {
            component: "Input",
            label: "",
            fieldName: "keyword",
            defaultValue: "",
            componentProps: { placeholder: spec.placeholder, style: { width: "240px" } },
          },
        ],
        handleSubmit(values) {
          query.keyword = String(values.keyword ?? "");
          page.pageNumber = 1;
          void load();
        },
        handleReset() {
          query.keyword = "";
          page.pageNumber = 1;
          void load();
        },
      });
      const removeSelected = async (): Promise<void> => {
        if (selectedKeys.value.length === 0) {
          message.warning("请选择要删除的巡检周期");
          return;
        }
        try {
          await patrol.deleteCronBatch(selectedKeys.value);
          selectedKeys.value = [];
          message.success("操作成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "批量删除失败");
        }
      };
      const [RelationTable, relationApi] = usePcTable({
        columns: [
          { title: "巡检标准", dataIndex: "name" },
          { title: "标准说明", dataIndex: "remark" },
        ],
        rowKey: "id",
        tableCode: "SMALL_ENGINEERING_RELATE_STANDARD",
        rowSelection: "checkbox",
        autoFetch: false,
        scrollY: 300,
      });
      const loadRelation = async (): Promise<void> => {
        const current = ++relationVersion;
        relationLoading.value = true;
        relationApi.loading.value = true;
        try {
          const result = await patrol.listStandardPage({
            pageNumber: relationPage.pageNumber,
            pageSize: relationPage.pageSize,
            keyword: relationKeyword.value || undefined,
            businessType: BUSINESS_TYPE,
          });
          if (current !== relationVersion || !relationOpen.value) {
            return;
          }
          relationOptions.value = result.records;
          relationApi.setDataSource(result.records);
          relationPage.total = result.total;
        } catch (error) {
          message.error(error instanceof Error ? error.message : "巡检标准加载失败");
        } finally {
          if (current === relationVersion) {
            relationLoading.value = false;
            relationApi.loading.value = false;
          }
        }
      };
      const openRelation = (): void => {
        if (!query.targetType) {
          message.warning("请先选择工程类型");
          return;
        }
        relationSelected.value = [];
        relationApi.setSelectedRowKeys([]);
        relationApi.setSelectedRows([]);
        relationKeyword.value = "";
        relationPage.pageNumber = 1;
        relationOpen.value = true;
        void loadRelation();
      };
      const saveRelation = async (): Promise<void> => {
        if (relationSaving.value || relationLoading.value) {
          return;
        }
        relationSelected.value = relationApi.getSelectedRowKeys().map(String);
        if (relationSelected.value.length === 0) {
          message.warning("请选择巡检标准");
          return;
        }
        relationSaving.value = true;
        try {
          await patrol.relatedInspectStandard({
            standardIds: relationSelected.value,
            targetType: query.targetType,
            targetCategory: BUSINESS_TYPE,
            businessType: BUSINESS_TYPE,
          });
          message.success("关联成功");
          relationOpen.value = false;
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "关联失败");
        } finally {
          relationSaving.value = false;
        }
      };
      if (kind === "standard") {
        void small
          .listProjectTypes()
          .then((items) => {
            options.value = items.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
          })
          .catch((error: unknown) => {
            message.error(error instanceof Error ? error.message : "工程类型加载失败");
          });
      }
      void load();
      const slots = {
        "layout-header": () => (
          <>
            <Button type="primary" onClick={() => (spec.formPath ? formRoute("add") : void openModal())}>
              新增
            </Button>
            {kind === "cron" && (
              <PopConfirm
                title="确定批量删除选中的巡检周期？"
                okText="确定"
                cancelText="取消"
                onConfirm={() => {
                  void removeSelected();
                }}
              >
                <Button danger disabled={selectedKeys.value.length === 0}>
                  批量删除
                </Button>
              </PopConfirm>
            )}
          </>
        ),
        "layout-content": () =>
          kind === "standard" ? (
            <>
              <PcForm />
              <div style={{ display: "flex", gap: "16px", minHeight: "400px" }}>
                <aside style={{ width: "210px", flex: "none", borderRight: "1px solid #eee", paddingRight: "12px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                    <Input v-model:value={treeKeyword.value} placeholder="搜索工程类型" />
                    <Button type="link" onClick={openRelation}>
                      关联标准
                    </Button>
                  </div>
                  <Tree
                    treeData={options.value
                      .filter((item) => item.label.includes(treeKeyword.value))
                      .map((item) => ({ title: item.label, key: item.value }))}
                    selectedKeys={query.targetType ? [query.targetType] : []}
                    onSelect={(keys) => {
                      query.targetType = keys.length > 0 ? String(keys[0]) : undefined;
                      page.pageNumber = 1;
                      void load();
                    }}
                  />
                </aside>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PcTable />
                </div>
              </div>
            </>
          ) : (
            <>
              <PcForm />
              <PcTable />
            </>
          ),
        "footer-page": () => (
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            cachePageQuery={true}
            onPageChange={(number: number, size: number) => {
              page.pageNumber = number;
              page.pageSize = size;
              void load();
            }}
          />
        ),
      };
      return () => (
        <>
          <PageLayout title={spec.title} v-slots={slots} />
          <Modal
            open={modalOpen.value}
            title={`${form.id ? "编辑" : "新增"}${spec.title}`}
            confirmLoading={saveLoading.value}
            okText="确定"
            cancelText="取消"
            onOk={() => {
              void save();
            }}
            onCancel={closeModal}
          >
            <div style={{ minHeight: "180px" }}>
              {modalLoading.value ? (
                <Spin spinning />
              ) : (
                <Form model={form} labelCol={{ style: { width: "95px" } }}>
                  <FormItem label={kind === "cron" ? "周期名称" : kind === "result" ? "结果名称" : "类型名称"} required>
                    <Input
                      v-model:value={form.name}
                      maxlength={50}
                      placeholder={`请输入${kind === "cron" ? "周期" : kind === "result" ? "结果" : "类型"}名称`}
                    />
                  </FormItem>
                  {kind === "cron" && (
                    <>
                      <FormItem label="表达式" required>
                        <Input v-model:value={form.cron} placeholder="请输入表达式" />
                      </FormItem>
                      <FormItem label="描述">
                        <Textarea v-model:value={form.description} maxlength={500} />
                      </FormItem>
                    </>
                  )}
                  {kind === "result" && (
                    <>
                      <FormItem label="状态">
                        <Switch v-model:checked={form.enable} />
                      </FormItem>
                      <FormItem label="结果项" required>
                        {form.options.map((item, index) => (
                          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }} key={item.key}>
                            <Input v-model:value={item.itemName} placeholder="结果项名称" />
                            <Input v-model:value={item.itemValue} placeholder="结果项值" />
                            <Switch v-model:checked={item.errorFlag} checkedChildren="异常" unCheckedChildren="正常" />
                            <Button danger onClick={() => form.options.splice(index, 1)}>
                              删除
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => form.options.push({ key: `item-${Date.now()}`, itemName: "", itemValue: "", errorFlag: false })}
                        >
                          新增结果项
                        </Button>
                      </FormItem>
                    </>
                  )}
                </Form>
              )}
            </div>
          </Modal>
          {kind === "standard" && (
            <Modal
              open={relationOpen.value}
              title="关联巡检标准"
              width={800}
              confirmLoading={relationSaving.value}
              okText="确定"
              cancelText="取消"
              onOk={() => {
                void saveRelation();
              }}
              onCancel={() => {
                ++relationVersion;
                relationOpen.value = false;
              }}
            >
              <div style={{ minHeight: "300px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <Input
                    v-model:value={relationKeyword.value}
                    placeholder="巡检标准名称"
                    onPressEnter={() => {
                      relationPage.pageNumber = 1;
                      void loadRelation();
                    }}
                  />
                  <Button
                    onClick={() => {
                      relationPage.pageNumber = 1;
                      void loadRelation();
                    }}
                  >
                    查询
                  </Button>
                </div>
                <RelationTable />
                <div style={{ marginTop: "12px" }}>{`共 ${relationPage.total} 条`}</div>
                <Page
                  current={relationPage.pageNumber}
                  pageSize={relationPage.pageSize}
                  total={relationPage.total}
                  cachePageQuery={false}
                  onPageChange={(number: number, size: number) => {
                    relationPage.pageNumber = number;
                    relationPage.pageSize = size;
                    void loadRelation();
                  }}
                />
              </div>
            </Modal>
          )}
        </>
      );
    },
  });
}

export const EngineeringType = createConfigPage("engineering");
export const PatrolType = createConfigPage("type");
export const InspectCycle = createConfigPage("cron");
export const InspectResult = createConfigPage("result");
export const InspectItems = createConfigPage("item");
export const InspectStandard = createConfigPage("standard");
