import type { FieldMapping, OptionItem } from "@g2-contract/work-report";
import { Button, PageLayout, Select, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";

import { getClient } from "../domain-context";
import { fieldMappings } from "../model";
import { errorText } from "../shared";

import styles from "../styles.module.css";
export const FlowConfigPage = defineComponent({
  name: "WorkReportFlowConfigPage",
  setup() {
    const options = ref<OptionItem[]>([]);
    const fields = ref<OptionItem[]>([]);
    const selected = ref<string>();
    const saving = ref(false);
    const initializing = ref(false);
    const saved = reactive({ formDefinitionId: "", id: "" });
    const rows = ref<FieldMapping[]>([]);
    let version = 0;
    const [PcTable, tableApi] = usePcTable({
      rowKey: "controlId",
      tableCode: "WORK_REPORT_FLOW_CONFIG",
      autoFetch: false,
      pagination: false,
      columns: [
        { title: "表单字段", dataIndex: "title", width: 380 },
        {
          title: "业务流程",
          dataIndex: "businessField",
          customRender: ({ record }) => {
            const row = record as FieldMapping;
            return (
              <Select
                value={row.businessField ?? undefined}
                style={{ width: "218px" }}
                allowClear
                placeholder="请选择业务字段"
                options={fields.value.map((item) => ({ label: item.name, value: item.id }))}
                onChange={(value) => {
                  row.businessField = typeof value === "string" ? value : null;
                }}
              />
            );
          },
        },
      ],
    });
    const select = async (id?: string) => {
      const current = ++version;
      selected.value = id;
      rows.value = [];
      tableApi.setDataSource([]);
      Object.assign(saved, { formDefinitionId: "", id: "" });
      if (!id) {
        tableApi.loading.value = false;
        return;
      }
      tableApi.loading.value = true;
      try {
        const data = await getClient().getFormFlow(id);
        if (current !== version) {
          return;
        }
        rows.value = fieldMappings(data, fields.value);
        Object.assign(saved, { formDefinitionId: data.formDefinitionId, id: data.id });
        tableApi.setDataSource(rows.value);
      } catch (error) {
        if (current === version) {
          message.error(errorText(error, "表单字段加载失败"));
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const save = async () => {
      if (saving.value) {
        return;
      }
      if (!selected.value || !saved.id || !saved.formDefinitionId) {
        message.warning("请选择表单流程");
        return;
      }
      saving.value = true;
      try {
        await getClient().saveFlowBusiness({
          formDefinitionId: saved.formDefinitionId,
          businessType: "REPORT",
          businessTypeName: "工作汇报",
          formFlowId: saved.id,
          fieldMapList: rows.value.map((row) => ({ controlId: row.controlId, title: row.title, businessField: row.businessField })),
        });
        message.success("保存成功");
      } catch (error) {
        message.error(errorText(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };
    onMounted(async () => {
      initializing.value = true;
      const initial = version;
      try {
        const [flows, businessFields, assigned] = await Promise.all([
          getClient().listFormFlows(),
          getClient().listReportFields(),
          getClient().getBusinessFlow(),
        ]);
        if (initial !== version) {
          return;
        }
        options.value = flows;
        fields.value = businessFields;
        await select(assigned || undefined);
      } catch (error) {
        message.error(errorText(error, "流程配置加载失败"));
      } finally {
        initializing.value = false;
      }
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="流程配置"
        v-slots={{
          "layout-content": () => (
            <div class={styles.split}>
              <aside class={styles.side}>
                <Button type="primary">工作汇报</Button>
              </aside>
              <div class={styles.main}>
                <div class={styles.flowSelect}>
                  <span>表单流程：</span>
                  <Select
                    value={selected.value}
                    style={{ width: "218px" }}
                    placeholder="请选择表单流程"
                    allowClear
                    loading={initializing.value}
                    disabled={initializing.value}
                    options={options.value.map((item) => ({ label: item.name, value: item.id }))}
                    onChange={(value) => void select(typeof value === "string" ? value : undefined)}
                  />
                </div>
                <PcTable />
              </div>
            </div>
          ),
          "footer-page": () => (
            <Button
              type="primary"
              loading={saving.value}
              disabled={initializing.value || tableApi.loading.value}
              onClick={() => void save()}
            >
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
