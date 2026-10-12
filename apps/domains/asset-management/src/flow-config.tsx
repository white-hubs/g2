import type { FieldMapping, FormFlow, OptionItem } from "@g2-contract/asset-management";
import { defineComponent, onMounted, onUnmounted, ref } from "vue";

import { getClient } from "./domain-context";
import { errorText, fieldMappings } from "./model";
import { loadPcUi } from "./runtime-modules";

import styles from "./styles.module.css";
const { Button, Empty, PageLayout, Select, message, usePcTable } = await loadPcUi();
export const FlowConfigPage = defineComponent({
  setup() {
    const types = ref<OptionItem[]>([]);
    const flows = ref<OptionItem[]>([]);
    const fields = ref<OptionItem[]>([]);
    const selected = ref("");
    const flowId = ref<string>();
    const flow = ref<FormFlow>();
    const mappings = ref<FieldMapping[]>([]);
    const saving = ref(false);
    let version = 0;
    const [PcTable, table] = usePcTable({
      tableCode: "ASSET_FLOW_CONFIG",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns: [
        { title: "业务字段", dataIndex: "name", width: 280 },
        {
          title: "表单字段",
          dataIndex: "controlId",
          width: 420,
          customRender: ({ record }) => {
            const field = record as OptionItem;
            const assigned = mappings.value.find((entry) => entry.businessField === field.id);
            return (
              <Select
                style={{ width: "100%" }}
                allowClear
                placeholder="请选择对应表单字段"
                value={assigned?.controlId}
                options={mappings.value.map((item) => ({
                  label: item.title,
                  value: item.controlId,
                  disabled: Boolean(item.businessField && item.businessField !== field.id),
                }))}
                onChange={(value) => {
                  for (const item of mappings.value) {
                    if (item.businessField === field.id) {
                      item.businessField = null;
                    }
                  }
                  const item = mappings.value.find((entry) => entry.controlId === value);
                  if (item) {
                    item.businessField = field.id;
                  }
                }}
              />
            );
          },
        },
      ],
    });
    const loadFlow = async (id: string | undefined, current = version) => {
      flowId.value = id;
      if (!id) {
        flow.value = undefined;
        mappings.value = [];
        return;
      }
      table.loading.value = true;
      try {
        const result = await getClient().getFormFlow(id);
        if (current === version) {
          flow.value = result;
          mappings.value = fieldMappings(result, fields.value);
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const selectType = async (code: string) => {
      selected.value = code;
      flowId.value = undefined;
      flow.value = undefined;
      mappings.value = [];
      fields.value = [];
      table.setDataSource([]);
      const current = ++version;
      table.loading.value = true;
      try {
        const [result, assigned] = await Promise.all([getClient().businessFields(code), getClient().businessFlow(code)]);
        if (current === version) {
          fields.value = result;
          table.setDataSource(result);
          await loadFlow(assigned || undefined, current);
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const save = async () => {
      if (!flow.value || !flowId.value) {
        message.warning("请选择表单流程");
        return;
      }
      saving.value = true;
      try {
        await getClient().saveFlow({
          formDefinitionId: flow.value.formDefinitionId ?? "",
          formFlowId: flow.value.id,
          businessType: selected.value,
          businessTypeName: types.value.find((item) => item.code === selected.value)?.name ?? "",
          fieldMapList: mappings.value,
        });
        message.success("保存成功");
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => {
      void Promise.all([getClient().approvalTypes(), getClient().formFlows()])
        .then(([result, forms]) => {
          types.value = result;
          flows.value = forms;
          if (result[0]?.code) {
            void selectType(result[0].code);
          }
        })
        .catch((error: unknown) => message.error(errorText(error)));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="流程配置"
        class={styles.page}
        v-slots={{
          "layout-content": () => (
            <div class={[styles.split, styles.flowContent]}>
              <aside class={styles.side}>
                <div class={styles.sideTitle}>业务流程</div>
                {types.value.map((item) => (
                  <Button
                    class={styles.sideItem}
                    type={selected.value === item.code ? "primary" : "text"}
                    onClick={() => void selectType(item.code ?? "")}
                  >
                    {item.name}
                  </Button>
                ))}
              </aside>
              <div class={styles.main}>
                <div class={styles.toolbar}>
                  <span>表单流程：</span>
                  <Select
                    style={{ width: "320px" }}
                    value={flowId.value}
                    options={flows.value.map((item) => ({ label: item.name, value: item.id }))}
                    placeholder="请选择表单流程"
                    showSearch
                    optionFilterProp="label"
                    onChange={(value) => {
                      version += 1;
                      void loadFlow(value === undefined ? undefined : String(value));
                    }}
                  />
                </div>
                {fields.value.length > 0 ? <PcTable /> : <Empty description="暂无可配置的业务字段" />}
              </div>
            </div>
          ),
          "footer-page": () => (
            <Button type="primary" loading={saving.value} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
