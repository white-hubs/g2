import type { AssetRow } from "@g2-contract/asset-management";
import type { PcFormSchemaProp } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { CategorySide } from "./category-side";
import { ConfigEditor } from "./config-editor";
import { ConsumableCheckEditor } from "./consumable-check-editor";
import { getClient, getContext } from "./domain-context";
import { LIST_CONFIG } from "./list-config";
import { BASE } from "./menu-data";
import { allowDelete, assetPayload, cleanQuery, download, errorText, money, positiveInt, text } from "./model";
import { useOptions } from "./options";
import { loadPcUi } from "./runtime-modules";
import { columnsFor } from "./table-columns";

import styles from "./styles.module.css";
const { Button, Input, Modal, Page, PageLayout, PopConfirm, Space, TreeSelect, Upload, message, usePcForm, usePcTable } = await loadPcUi();
export function createListPage(slug: string) {
  const config = LIST_CONFIG[slug];
  return defineComponent({
    name: `Asset${slug}Page`,
    setup() {
      const route = useRoute();
      const router = useRouter();
      const choices = useOptions();
      const owner = `${BASE}/${slug}`;
      const filter = reactive<Record<string, unknown>>(
        Object.fromEntries(config.filters.map((item) => [item.field, item.kind === "text" ? "" : item.kind === "date" ? [] : undefined])),
      );
      const pager = reactive({
        pageNumber: positiveInt(route.query.pageNumber, 1),
        pageSize: positiveInt(route.query.pageSize, 10),
        total: 0,
      });
      const category = ref("");
      const editing = ref<AssetRow>();
      const editorOpen = ref(false);
      const checkOpen = ref(false);
      const busy = reactive({ template: false, import: false, qrcodes: false, export: false });
      const amount = ref(0);
      let version = 0;
      const codeOpen = ref(false);
      const codeSaving = ref(false);
      const codeRow = ref<AssetRow>();
      const codeField = ref("serialNumber");
      const codeValue = ref("");
      const navigate = (row?: AssetRow, action = "detail") => {
        if (config.flow) {
          void router.push({
            path: `${owner}/flow-render`,
            query: {
              type: row ? "detail" : "add",
              processInstanceId: text(row ?? { id: "" }, "processInstanceId"),
              currentTaskId: text(row ?? { id: "" }, "currentTaskId"),
              status: text(row ?? { id: "" }, "status"),
              returnPath: route.fullPath,
            },
          });
        } else if (config.check) {
          void router.push({
            path: `${BASE}/${config.check === "asset" ? "asset-check-detail" : "consumable-check-detail"}`,
            query: { id: row?.id, returnPath: route.fullPath },
          });
        } else if (config.resource === "inventory") {
          void router.push({ path: `${BASE}/inventoryDetail`, query: { id: row?.id, action, returnPath: route.fullPath } });
        } else if (config.editable) {
          editing.value = row;
          editorOpen.value = true;
        }
      };
      const remove = async (row: AssetRow) => {
        try {
          await getClient().remove(config.resource, row.id);
          message.success("删除成功");
          if (pager.total % pager.pageSize === 1 && pager.pageNumber > 1) {
            pager.pageNumber -= 1;
          }
          await load();
        } catch (error) {
          message.error(errorText(error));
        }
      };
      const submitCheck = async (row: AssetRow) => {
        if (config.check === "consumable" && ["UNDONE", "WEB_FINISH"].includes(String(row.status))) {
          message.warning(row.status === "UNDONE" ? "请确认APP任务已提交" : "当前状态不支持该操作");
          return;
        }
        try {
          if (config.check === "asset") {
            Modal.confirm({
              title: "确认提交盘点结果？",
              okText: "确定",
              cancelText: "取消",
              onOk: async () => {
                const hasWin = await getClient().submitAssetCheck(row.id);
                if (hasWin) {
                  Modal.confirm({
                    title: "盘点存在盘盈资产，是否同步到资产清单？",
                    okText: "同步",
                    cancelText: "不同步",
                    onOk: async () => {
                      await getClient().syncAssetCheck(row.id);
                      await load();
                    },
                  });
                }
                message.success("提交成功");
                await load();
              },
            });
          } else {
            const hasDifference = await getClient().hasConsumableCheckDifference(row.id);
            Modal.confirm({
              title: hasDifference ? "盘点存在差异，是否同步库存？" : "确认提交盘点结果？",
              okText: hasDifference ? "同步并提交" : "确定",
              cancelText: "取消",
              content: hasDifference ? (
                <Button
                  onClick={() => {
                    Modal.destroyAll();
                    void finish(false);
                  }}
                >
                  不同步，直接提交
                </Button>
              ) : undefined,
              onOk: () => finish(hasDifference),
            });
          }
        } catch (error) {
          message.error(errorText(error));
        }
        async function finish(sync: boolean) {
          try {
            await getClient().submitConsumableCheck(row.id, sync);
            message.success("提交成功");
            await load();
          } catch (error) {
            message.error(errorText(error));
            throw error;
          }
        }
      };
      const columns = columnsFor(slug, () => (pager.pageNumber - 1) * pager.pageSize);
      if (config.resource === "inventory") {
        for (const field of ["serialNumber", "financeNumber"]) {
          const column = columns.find((item) => item.dataIndex === field);
          if (column) {
            column.customRender = ({ record }) => (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  codeRow.value = record as AssetRow;
                  codeField.value = field;
                  codeValue.value = text(record as AssetRow, field);
                  codeOpen.value = true;
                }}
              >
                {text(record as AssetRow, field) || "设置编码"}
              </Button>
            );
          }
        }
      }
      if (config.flow || config.check || config.editable || config.resource === "inventory") {
        columns.push({
          title: "操作",
          dataIndex: "action",
          width: config.check || config.resource === "inventory" ? 230 : 160,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as AssetRow;
            return (
              <Space size={4}>
                <Button size="small" type="link" onClick={() => navigate(row)}>
                  {config.editable ? "编辑" : "详情"}
                </Button>
                {config.resource === "inventory" && (
                  <Button size="small" type="link" onClick={() => navigate(row, "edit")}>
                    编辑
                  </Button>
                )}
                {config.check && (
                  <Button
                    size="small"
                    type="link"
                    disabled={config.check === "asset" ? row.status === "FINISH" : row.status === "WEB_FINISH"}
                    onClick={() => void submitCheck(row)}
                  >
                    提交
                  </Button>
                )}
                <PopConfirm title="确定删除该项？" okText="确定" cancelText="取消" onConfirm={() => remove(row)}>
                  <Button size="small" type="link" danger disabled={!allowDelete(config.resource, row)}>
                    删除
                  </Button>
                </PopConfirm>
              </Space>
            );
          },
        });
      }
      const [PcTable, table] = usePcTable({
        rowKey: "id",
        tableCode: config.tableCode,
        columns,
        autoFetch: false,
        pagination: false,
        rowSelection: config.selectedExport || config.resource === "inventory" ? "checkbox" : undefined,
        getCheckboxProps: config.check
          ? (row) => ({ disabled: config.check === "asset" ? row.status !== "FINISH" : row.status !== "WEB_FINISH" })
          : undefined,
      });
      const query = () => ({ ...cleanQuery(filter), ...(slug === "consumablesFile" ? { categoryId: category.value } : {}) });
      const load = async () => {
        const current = ++version;
        table.loading.value = true;
        try {
          const page = await getClient().page(config.resource, { ...query(), pageNumber: pager.pageNumber, pageSize: pager.pageSize });
          if (current === version) {
            table.setDataSource(page.records);
            pager.total = page.total;
          }
          if (["maintenance", "overage"].includes(config.resource)) {
            const summary = await getClient().overdueAmount({
              ...query(),
              queryType: config.resource === "maintenance" ? "maintenance" : "usage",
            });
            if (current === version) {
              amount.value = summary.totalPrice;
            }
          }
        } catch (error) {
          if (current === version) {
            message.error(errorText(error));
          }
        } finally {
          if (current === version) {
            table.loading.value = false;
          }
        }
      };
      const schema = (): PcFormSchemaProp[] =>
        config.filters.map((item) => {
          if (item.kind === "text") {
            return {
              component: "Input",
              fieldName: item.field,
              label: item.label,
              defaultValue: "",
              componentProps: { placeholder: item.placeholder, allowClear: true },
            };
          }
          if (item.kind === "date") {
            return {
              component: "RangePicker",
              fieldName: item.field,
              label: item.label,
              defaultValue: [],
              componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true, style: { width: "260px" } },
            };
          }
          if (item.kind === "day") {
            return {
              component: "DatePicker",
              fieldName: item.field,
              label: item.label,
              componentProps: {
                valueFormat: "YYYY-MM-DD",
                allowClear: true,
                placeholder: `请选择${item.label}`,
                style: { width: "180px" },
              },
            };
          }
          const isTree = item.kind === "category" || item.options === "departments";
          return {
            component: isTree ? markRaw(TreeSelect) : "Select",
            fieldName: item.field,
            label: item.label,
            componentProps: isTree
              ? {
                  treeData: item.kind === "category" ? choices.data.categories : choices.data.departments,
                  fieldNames: { label: "name", value: "id", children: "children" },
                  treeNodeFilterProp: "name",
                  showSearch: true,
                  allowClear: true,
                  placeholder: `请选择${item.label}`,
                }
              : {
                  options: choices.select(item.options ?? ""),
                  allowClear: true,
                  showSearch: true,
                  optionFilterProp: "label",
                  placeholder: `请选择${item.label}`,
                },
          };
        });
      const [PcForm, form] = usePcForm({
        layout: "horizontal",
        syncStateRef: filter,
        actionsInline: true,
        showCollapseButton: false,
        schema: schema(),
        handleSubmit: () => {
          pager.pageNumber = 1;
          void load();
        },
        handleReset: () => {
          pager.pageNumber = 1;
          void load();
        },
      });
      const task = async (key: keyof typeof busy, action: () => Promise<void>) => {
        if (busy[key]) {
          return;
        }
        busy[key] = true;
        try {
          await action();
        } catch (error) {
          message.error(errorText(error));
        } finally {
          busy[key] = false;
        }
      };
      const exportRows = () =>
        task("export", async () => {
          if (!config.export) {
            return;
          }
          const keys = table.getSelectedRowKeys();
          if (config.selectedExport && keys.length === 0) {
            message.warning("请先选择要导出的数据");
            return;
          }
          download(
            await getClient().export(config.export, { ...query(), ...(config.selectedExport ? { ids: keys.map(String).join(",") } : {}) }),
            `${config.title}.xlsx`,
          );
        });
      const saveCode = async () => {
        if (!codeRow.value || codeSaving.value) {
          return;
        }
        const value = codeValue.value.trim();
        if (!value) {
          message.warning("请输入编码");
          return;
        }
        codeSaving.value = true;
        try {
          if (codeField.value === "serialNumber" && value !== text(codeRow.value, codeField.value)) {
            const duplicate = await getClient().checkAssetCodes(codeRow.value.id, value);
            if (duplicate.length > 0) {
              message.warning("资产编码已存在");
              return;
            }
          }
          await getClient().updateAssetCode(assetPayload({ ...codeRow.value, [codeField.value]: value }));
          codeOpen.value = false;
          message.success("保存成功");
          await load();
        } catch (error) {
          message.error(errorText(error));
        } finally {
          codeSaving.value = false;
        }
      };
      const canImport = config.template !== "stock" || getContext().getFunctionCodes().has("riskSource:consumables:upload");
      const canTemplate = config.template !== "stock" || getContext().getFunctionCodes().has("riskSource:consumables:download");
      onMounted(() => {
        void load();
        void choices
          .load(config.filters.map((item) => (item.kind === "category" ? "categories" : (item.options ?? ""))).filter(Boolean))
          .then(() => form.updateSchema(schema()))
          .catch((error: unknown) => message.error(errorText(error)));
      });
      onUnmounted(() => {
        version += 1;
      });
      return () => (
        <PageLayout
          title={config.title}
          class={styles.page}
          v-slots={{
            "layout-header": () => (
              <Space wrap>
                {config.template && canTemplate && (
                  <Button
                    loading={busy.template}
                    onClick={() =>
                      void task("template", async () => {
                        download(await getClient().template(config.template!), `${config.title}导入模板.xlsx`);
                      })
                    }
                  >
                    下载模板
                  </Button>
                )}
                {config.template && canImport && (
                  <Upload
                    accept=".xlsx,.xls,.csv"
                    maxCount={1}
                    disabled={busy.import}
                    showUploadList={false}
                    beforeUpload={(file) => {
                      void task("import", async () => {
                        await getClient().import(config.template!, file);
                        message.success("导入成功");
                        table.setSelectedRowKeys([]);
                        table.setSelectedRows([]);
                        if (config.resource === "inventory") {
                          form.handleReset();
                        } else {
                          pager.pageNumber = 1;
                          await load();
                        }
                      });
                      return false;
                    }}
                  >
                    <Button loading={busy.import}>{config.resource === "inventory" ? "导入" : "批量导入"}</Button>
                  </Upload>
                )}
                {config.resource === "inventory" && (
                  <Button
                    loading={busy.qrcodes}
                    onClick={() =>
                      void task("qrcodes", async () => {
                        const rows = table.getSelectedRows() as AssetRow[];
                        if (rows.length === 0) {
                          message.warning("请先选择资产");
                          return;
                        }
                        download(
                          await getClient().qrcodes(
                            rows.map((row) => ({
                              entityId: row.id,
                              entityName: text(row, "name"),
                              serialNumber: text(row, "serialNumber"),
                            })),
                          ),
                          "资产二维码.zip",
                        );
                      })
                    }
                  >
                    下载二维码
                  </Button>
                )}
                {config.export && (
                  <Button loading={busy.export} onClick={() => void exportRows()}>
                    导出
                  </Button>
                )}
                {(config.flow || config.editable || config.check) && (
                  <Button
                    type="primary"
                    onClick={() => {
                      if (config.check === "asset") {
                        void router.push(`${BASE}/asset-check-add`);
                      } else if (config.check === "consumable") {
                        checkOpen.value = true;
                      } else if (config.editable) {
                        editing.value = undefined;
                        editorOpen.value = true;
                      } else {
                        navigate();
                      }
                    }}
                  >
                    新增
                  </Button>
                )}
              </Space>
            ),
            "layout-content": () => (
              <div class={styles.split}>
                {slug === "consumablesFile" && (
                  <CategorySide
                    selected={category.value}
                    onSelect={(id) => {
                      category.value = id;
                      pager.pageNumber = 1;
                      void load();
                    }}
                  />
                )}
                <div class={styles.main}>
                  <PcForm />
                  {["maintenance", "overage"].includes(config.resource) && (
                    <div class={styles.summary}>
                      <span>
                        资产数量<strong>{pager.total}</strong>
                      </span>
                      <span>
                        资产总金额（元）<strong>{money(amount.value)}</strong>
                      </span>
                    </div>
                  )}
                  <PcTable />
                </div>
              </div>
            ),
            "footer-page": () => (
              <Page
                cachePageQuery
                current={pager.pageNumber}
                pageSize={pager.pageSize}
                total={pager.total}
                onPageChange={(number: number, size: number) => {
                  pager.pageNumber = number;
                  pager.pageSize = size;
                  void load();
                }}
              />
            ),
            default: () => (
              <>
                {config.editable && (
                  <ConfigEditor
                    resource={config.editable}
                    open={editorOpen.value}
                    row={editing.value}
                    onClose={() => {
                      editorOpen.value = false;
                    }}
                    onSaved={() => void load()}
                  />
                )}
                <ConsumableCheckEditor
                  open={checkOpen.value}
                  onClose={() => {
                    checkOpen.value = false;
                  }}
                  onSaved={() => void load()}
                />
                <Modal
                  okText="确定"
                  cancelText="取消"
                  open={codeOpen.value}
                  title={codeField.value === "serialNumber" ? "修改资产编码" : "修改财务编码"}
                  confirmLoading={codeSaving.value}
                  onOk={() => void saveCode()}
                  onCancel={() => {
                    codeOpen.value = false;
                  }}
                >
                  <Input
                    value={codeValue.value}
                    maxlength={200}
                    onChange={(event) => {
                      codeValue.value = event.target.value ?? "";
                    }}
                  />
                </Modal>
              </>
            ),
          }}
        />
      );
    },
  });
}
