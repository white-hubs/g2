import type { InspectionRecord } from "@g2-contract/daily-inspection";
import {
  Button,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  Select,
  Spin,
  Switch,
  Textarea,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getPatrolClient, getSmallEngineeringClient } from "@/domain-context";

type Kind = "item" | "standard";
interface ResultOption {
  itemName: string;
  itemValue: string;
  errorFlag?: boolean;
}
interface ContentRow {
  key: string;
  id?: string;
  name: string;
  resultId?: string;
  resultItemValue?: string;
  itemTag?: string;
  imageResult: string[];
  remarkResult: string[];
  isResultItem: boolean;
  editing: boolean;
}
const BUSINESS_TYPE = "SMALL_ENGINEERING";
const BASE = "/d/small-engineering";
const asRecord = (value: unknown): InspectionRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as InspectionRecord) : {};
const toList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? value.split(",") : [];
const makeRow = (source: InspectionRecord = {}): ContentRow => ({
  key: String(source.id ?? crypto.randomUUID()),
  id: source.id ? String(source.id) : undefined,
  name: String(source.name ?? ""),
  resultId: source.resultId ? String(source.resultId) : undefined,
  resultItemValue: source.resultItemValue ? String(source.resultItemValue) : undefined,
  itemTag: source.itemTag ? String(source.itemTag) : undefined,
  imageResult: source.imageResult === true ? ["true"] : toList(source.imageResult),
  remarkResult: source.remarkResult === true ? ["true"] : toList(source.remarkResult),
  isResultItem: ![false, "false", 0, "0"].includes(source.isResultItem as string | number | boolean),
  editing: !source.id,
});

function createConfigForm(kind: Kind) {
  return defineComponent({
    name: kind === "item" ? "SmallEngineeringInspectItemsForm" : "SmallEngineeringInspectStandardForm",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const patrol = getPatrolClient();
      const small = getSmallEngineeringClient();
      const id = computed(() => String(route.query.id ?? ""));
      const mode = computed(() => String(route.query.type ?? "add"));
      const readonly = computed(() => mode.value === "detail");
      const loading = ref(false);
      const saving = ref(false);
      const callOpen = ref(false);
      const callLoading = ref(false);
      const callOptions = ref<InspectionRecord[]>([]);
      const callKeyword = ref("");
      const callPage = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      let callVersion = 0;
      const loadFailed = ref(false);
      const projectTypes = ref<{ label: string; value: string }[]>([]);
      const resultOptions = ref<InspectionRecord[]>([]);
      const rows = ref<ContentRow[]>([makeRow()]);
      const state = reactive({ alias: "", name: "", remark: "", types: [] as string[], enable: true });
      let requestVersion = 0;
      const title = computed(
        () => `${mode.value === "add" ? "新增" : mode.value === "edit" ? "编辑" : "详情"}${kind === "item" ? "巡检项" : "巡检标准"}`,
      );
      const back = (): void => {
        void router.push(`${BASE}/${kind === "item" ? "inspect-items" : "inspect-standard"}`);
      };
      const rowResultOptions = (row: ContentRow): ResultOption[] => {
        const source = resultOptions.value.find((item) => String(item.id ?? "") === row.resultId);
        return Array.isArray(source?.options) ? (source.options as ResultOption[]) : [];
      };
      const resultLabels = (row: ContentRow) => rowResultOptions(row).map((item) => ({ label: item.itemName, value: item.itemValue }));
      const resultList = () => resultOptions.value.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
      const rowValid = (row: ContentRow) =>
        Boolean(row.name.trim()) &&
        (!row.isResultItem || Boolean(row.resultId && row.resultItemValue && row.imageResult.length > 0 && row.remarkResult.length > 0));
      const contentColumns = [
        {
          title: "内容描述",
          dataIndex: "name",
          width: 230,
          fixed: "left" as const,
          customRender: ({ record }: { record: ContentRow }) => (
            <Input disabled={readonly.value || !record.editing} v-model:value={record.name} maxlength={100} placeholder="请输入内容描述" />
          ),
        },
        {
          title: "结果巡检项",
          dataIndex: "isResultItem",
          width: 120,
          customRender: ({ record }: { record: ContentRow }) => (
            <Switch
              disabled={readonly.value || !record.editing}
              v-model:checked={record.isResultItem}
              checkedChildren="开"
              unCheckedChildren="关"
            />
          ),
        },
        {
          title: "巡检结果",
          dataIndex: "resultId",
          width: 170,
          customRender: ({ record }: { record: ContentRow }) =>
            record.isResultItem ? (
              <Select
                disabled={readonly.value || !record.editing}
                v-model:value={record.resultId}
                options={resultList()}
                placeholder="请选择巡检结果"
                onChange={() => {
                  const choices = rowResultOptions(record);
                  record.resultItemValue = choices[0]?.itemValue;
                  const abnormal = choices.find((item) => item.errorFlag)?.itemValue;
                  record.imageResult = abnormal ? [abnormal] : [];
                  record.remarkResult = abnormal ? [abnormal] : [];
                }}
              />
            ) : (
              "--"
            ),
        },
        {
          title: "结果值",
          dataIndex: "resultItemValue",
          width: 170,
          customRender: ({ record }: { record: ContentRow }) =>
            record.isResultItem ? (
              <Select
                disabled={readonly.value || !record.editing}
                v-model:value={record.resultItemValue}
                options={resultLabels(record)}
                placeholder="请选择结果值"
              />
            ) : (
              "--"
            ),
        },
        {
          title: "拍照结果",
          dataIndex: "imageResult",
          width: 200,
          customRender: ({ record }: { record: ContentRow }) =>
            record.isResultItem ? (
              <Select
                mode="multiple"
                disabled={readonly.value || !record.editing}
                v-model:value={record.imageResult}
                options={resultLabels(record)}
                placeholder="请选择拍照结果"
              />
            ) : (
              <Switch
                disabled={readonly.value || !record.editing}
                checked={record.imageResult.includes("true")}
                onChange={(checked) => {
                  record.imageResult = checked === true ? ["true"] : [];
                }}
              />
            ),
        },
        {
          title: "备注结果",
          dataIndex: "remarkResult",
          width: 200,
          customRender: ({ record }: { record: ContentRow }) =>
            record.isResultItem ? (
              <Select
                mode="multiple"
                disabled={readonly.value || !record.editing}
                v-model:value={record.remarkResult}
                options={resultLabels(record)}
                placeholder="请选择备注结果"
              />
            ) : (
              <Switch
                disabled={readonly.value || !record.editing}
                checked={record.remarkResult.includes("true")}
                onChange={(checked) => {
                  record.remarkResult = checked === true ? ["true"] : [];
                }}
              />
            ),
        },
        {
          title: "巡检项标签",
          dataIndex: "itemTag",
          width: 150,
          customRender: ({ record }: { record: ContentRow }) => (
            <Select
              disabled={readonly.value || !record.editing || !record.isResultItem}
              v-model:value={record.itemTag}
              options={[
                { value: "CHARGE", label: "违规充电" },
                { value: "PARKING", label: "违规停放" },
              ]}
              placeholder="请选择标签"
              allowClear
            />
          ),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 160,
          fixed: "right" as const,
          customRender: ({ record }: { record: ContentRow }) =>
            readonly.value ? (
              "--"
            ) : (
              <>
                <Button
                  type="link"
                  onClick={() => {
                    if (record.editing && !rowValid(record)) {
                      message.warning("请完善内容、默认结果、必须拍照和备注条件");
                      return;
                    }
                    record.editing = !record.editing;
                  }}
                >
                  {record.editing ? "保存" : "编辑"}
                </Button>
                <PopConfirm
                  title="确定删除该巡检项？"
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => {
                    rows.value = rows.value.filter((row) => row.key !== record.key);
                  }}
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </PopConfirm>
              </>
            ),
        },
      ];
      const [ContentTable, contentApi] = usePcTable({
        columns: contentColumns,
        rowKey: "key",
        tableCode: `SMALL_ENGINEERING_${kind.toUpperCase()}_CONTENTS`,
        autoFetch: false,
        autoScrollY: false,
      });
      watch(rows, (value) => contentApi.setDataSource(value), { immediate: true });
      const [CallTable, callApi] = usePcTable({
        columns: [
          { title: "巡检项名称", dataIndex: "alias" },
          { title: "巡检项内容", dataIndex: "name" },
          { title: "巡检结果项", dataIndex: "resultNames" },
        ],
        rowKey: "id",
        tableCode: "SMALL_ENGINEERING_CALL_ITEM",
        rowSelection: "checkbox",
        autoFetch: false,
        scrollY: 300,
      });
      const load = async (): Promise<void> => {
        const current = ++requestVersion;
        loading.value = true;
        loadFailed.value = false;
        try {
          const [results, types, detail] = await Promise.all([
            patrol.listResultOptions({ businessType: BUSINESS_TYPE }),
            kind === "standard" ? small.listProjectTypes() : Promise.resolve([]),
            id.value ? patrol.getConfig(kind, id.value, BUSINESS_TYPE) : Promise.resolve(undefined),
          ]);
          if (current !== requestVersion) {
            return;
          }
          resultOptions.value = results;
          projectTypes.value = types.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
          if (!detail) {
            return;
          }
          if (kind === "item") {
            state.alias = String(detail.alias ?? "");
            const contents = Array.isArray(detail.items) && detail.items.length > 0 ? (detail.items as InspectionRecord[]) : [detail];
            rows.value = contents.map(makeRow);
          } else {
            state.name = String(detail.name ?? "");
            state.remark = String(detail.remark ?? "");
            state.enable = detail.enable !== false;
            const refers = Array.isArray(detail.standardTypeRefers) ? asRecord(detail.standardTypeRefers[0]) : {};
            state.types = toList(refers.targetTypes);
            rows.value = Array.isArray(detail.standardItems) ? (detail.standardItems as InspectionRecord[]).map(makeRow) : [];
          }
        } catch (error) {
          loadFailed.value = true;
          if (current === requestVersion) {
            message.error(error instanceof Error ? error.message : "详情加载失败");
          }
        } finally {
          if (current === requestVersion) {
            loading.value = false;
          }
        }
      };
      const addRow = (): void => {
        rows.value = [...rows.value, makeRow()];
      };
      const loadCall = async (): Promise<void> => {
        const current = ++callVersion;
        callApi.loading.value = true;
        try {
          const result = await patrol.listItemPage({
            pageNumber: callPage.pageNumber,
            pageSize: callPage.pageSize,
            keyword: callKeyword.value || undefined,
            businessType: BUSINESS_TYPE,
          });
          if (current !== callVersion || !callOpen.value) {
            return;
          }
          callOptions.value = result.records;
          callApi.setDataSource(result.records);
          callPage.total = result.total;
        } catch (error) {
          if (current === callVersion) {
            message.error(error instanceof Error ? error.message : "巡检项加载失败");
          }
        } finally {
          if (current === callVersion) {
            callApi.loading.value = false;
          }
        }
      };
      const openCall = (): void => {
        callOpen.value = true;
        callPage.pageNumber = 1;
        callKeyword.value = "";
        callApi.setSelectedRowKeys([]);
        callApi.setSelectedRows([]);
        void loadCall();
      };
      const confirmCall = async (): Promise<void> => {
        if (callLoading.value || callApi.loading.value) {
          return;
        }
        const selected = callApi.getSelectedRows().map(asRecord);
        if (selected.length === 0) {
          message.warning("请选择巡检项");
          return;
        }
        callLoading.value = true;
        try {
          const details = await Promise.all(selected.map((item) => patrol.getConfig("item", String(item.id), BUSINESS_TYPE)));
          const existing = new Set(rows.value.map((row) => row.id));
          rows.value = [...rows.value, ...details.filter((item) => !existing.has(String(item.id))).map(makeRow)];
          callOpen.value = false;
        } catch (error) {
          message.error(error instanceof Error ? error.message : "巡检项详情加载失败");
        } finally {
          callLoading.value = false;
        }
      };
      const save = async (): Promise<void> => {
        if (saving.value || loading.value || loadFailed.value) {
          return;
        }
        if (kind === "item" && !state.alias.trim()) {
          message.warning("请输入巡检项名称");
          return;
        }
        if (kind === "standard" && (!state.name.trim() || state.types.length === 0)) {
          message.warning("请输入标准名称并选择关联小散工程");
          return;
        }
        if (rows.value.length === 0 || rows.value.some((row) => !rowValid(row))) {
          message.warning("请完善巡检项内容、巡检结果和结果值");
          return;
        }
        saving.value = true;
        try {
          const items = rows.value.map((row) => ({
            ...(row.id ? { id: row.id } : {}),
            name: row.name.trim(),
            isResultItem: row.isResultItem,
            resultId: row.isResultItem ? row.resultId : null,
            resultItemValue: row.isResultItem ? row.resultItemValue : null,
            itemTag: row.isResultItem ? row.itemTag : null,
            imageResult: row.isResultItem ? row.imageResult.join(",") : row.imageResult.includes("true"),
            remarkResult: row.isResultItem ? row.remarkResult.join(",") : row.remarkResult.includes("true"),
            referType: BUSINESS_TYPE,
            businessType: BUSINESS_TYPE,
          }));
          const payload: InspectionRecord =
            kind === "item"
              ? { alias: state.alias.trim(), items, referType: BUSINESS_TYPE, businessType: BUSINESS_TYPE }
              : {
                  name: state.name.trim(),
                  remark: state.remark,
                  enable: state.enable,
                  standardItems: items,
                  standardTypeRefers: [{ targetCategory: BUSINESS_TYPE, targetTypes: state.types }],
                  businessType: BUSINESS_TYPE,
                };
          if (id.value) {
            await patrol.updateConfig(kind, id.value, payload);
          } else {
            await patrol.createConfig(kind, payload);
          }
          message.success("操作成功");
          back();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      };
      onMounted(() => {
        void load();
      });
      const slots = {
        "layout-content": () => (
          <Spin spinning={loading.value}>
            <div>
              <h3>基础信息</h3>
              <Form model={state} disabled={readonly.value} labelCol={{ style: { width: "115px" } }}>
                {kind === "item" ? (
                  <FormItem label="巡检项名称" required>
                    <Input v-model:value={state.alias} maxlength={50} placeholder="请输入巡检项名称" style={{ width: "360px" }} />
                  </FormItem>
                ) : (
                  <>
                    <FormItem label="标准名称" required>
                      <Input v-model:value={state.name} maxlength={100} placeholder="请输入标准名称" style={{ width: "360px" }} />
                    </FormItem>
                    <FormItem label="关联小散工程" required>
                      <Select
                        mode="multiple"
                        v-model:value={state.types}
                        options={projectTypes.value}
                        placeholder="请选择关联小散工程"
                        style={{ width: "360px" }}
                      />
                    </FormItem>
                    <FormItem label="标准说明">
                      <Textarea v-model:value={state.remark} maxlength={500} style={{ width: "560px" }} />
                    </FormItem>
                  </>
                )}
              </Form>
              <h3>{kind === "item" ? "巡检项内容" : "巡检项"}</h3>
              {!readonly.value && (
                <div style={{ marginBottom: "12px" }}>
                  <Button type="primary" onClick={addRow}>
                    新增巡检项
                  </Button>
                  {kind === "standard" && (
                    <Button
                      onClick={() => {
                        void openCall();
                      }}
                    >
                      调用巡检项
                    </Button>
                  )}
                </div>
              )}
              <ContentTable />
            </div>
          </Spin>
        ),
        "footer-page": () => (
          <>
            <Button onClick={back}>{readonly.value ? "返回" : "取消"}</Button>
            {!readonly.value && (
              <Button
                type="primary"
                loading={saving.value}
                onClick={() => {
                  void save();
                }}
              >
                保存
              </Button>
            )}
          </>
        ),
      };
      return () => (
        <>
          <PageLayout title={title.value} v-slots={slots} />
          <Modal
            open={callOpen.value}
            title="调用巡检项"
            width={900}
            okText="确定"
            cancelText="取消"
            confirmLoading={callLoading.value}
            onOk={() => {
              void confirmCall();
            }}
            onCancel={() => {
              ++callVersion;
              callOpen.value = false;
            }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <Input v-model:value={callKeyword.value} placeholder="巡检项名称" />
              <Button
                onClick={() => {
                  callPage.pageNumber = 1;
                  void loadCall();
                }}
              >
                查询
              </Button>
              <Button
                onClick={() => {
                  callKeyword.value = "";
                  callPage.pageNumber = 1;
                  void loadCall();
                }}
              >
                重置
              </Button>
            </div>
            <CallTable />
            <Page
              current={callPage.pageNumber}
              pageSize={callPage.pageSize}
              total={callPage.total}
              cachePageQuery={false}
              onPageChange={(page: number, size: number) => {
                callPage.pageNumber = page;
                callPage.pageSize = size;
                void loadCall();
              }}
            />
          </Modal>
        </>
      );
    },
  });
}

export const InspectItemsForm = createConfigForm("item");
export const InspectStandardForm = createConfigForm("standard");
