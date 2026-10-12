import type { FlowBusinessConfig, OptionItem } from "@g2-contract/government-management";
import { Button, PageLayout, type PcTableColumn, Select, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getGovernmentClient } from "../domain-context";
import { can, display, errorText } from "./shared";

import styles from "./page.module.css";

interface FieldRow {
  controlId: string;
  title: string;
  businessField: string | null;
}
interface FormControl {
  id?: string;
  title?: string;
  name?: string;
  props?: { items?: FormControl[] };
}

function parseControls(value: unknown): FormControl[] {
  if (Array.isArray(value)) {
    return value as FormControl[];
  }
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FormControl[]) : [];
  } catch {
    return [];
  }
}

export const FlowConfigPage = defineComponent({
  name: "GovernmentFlowConfigPage",
  setup() {
    const types = ref<OptionItem[]>([]);
    const selected = ref("");
    const flows = ref<OptionItem[]>([]);
    const currentFlow = ref("");
    const businessFields = ref<OptionItem[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const saved = reactive({ formDefinitionId: "", id: "" });
    const rows = ref<FieldRow[]>([]);
    const columns: PcTableColumn[] = [
      { title: "表单字段", dataIndex: "title", width: 380, customRender: ({ text }) => display(text) },
      {
        title: "业务流程",
        dataIndex: "businessField",
        customRender: ({ record }) => {
          const row = record as FieldRow;
          return (
            <Select
              value={row.businessField ?? undefined}
              style={{ width: "218px" }}
              placeholder="请选择"
              allowClear
              options={businessFields.value.map((field) => ({ label: field.name, value: field.id }))}
              onChange={(value) => {
                row.businessField = typeof value === "string" ? value : null;
              }}
            />
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "GOVERNMENT_FLOW_CONFIG",
      rowKey: "controlId",
      autoFetch: false,
      pagination: false,
    });
    const selectFlow = async (id: string) => {
      currentFlow.value = id;
      rows.value = [];
      tableApi.setDataSource([]);
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        const data = await getGovernmentClient().getFormFlow(id);
        saved.formDefinitionId = String(data.formDefinitionId ?? "");
        saved.id = String(data.id ?? id);
        const mapped = Array.isArray(data.formBizFieldMapList)
          ? (data.formBizFieldMapList as { controlId?: string; businessField?: string }[])
          : [];
        const controls = parseControls(data.formJson);
        const addControl = (control: FormControl, group = "") => {
          if (!control.id) {
            return;
          }
          const oldField = mapped.find((item) => item.controlId === control.id)?.businessField;
          const known = businessFields.value.some((item) => item.id === oldField);
          rows.value.push({
            controlId: control.id,
            title: `${group ? `${group}-` : ""}${control.title ?? ""}`,
            businessField: known ? (oldField ?? null) : null,
          });
        };
        for (const control of controls) {
          if (control.name === "GroupList" && control.props?.items?.length) {
            control.props.items.forEach((item) => addControl(item, control.title));
          } else {
            addControl(control);
          }
        }
        tableApi.setDataSource(rows.value);
      } catch (error) {
        message.error(errorText(error, "表单字段加载失败"));
      } finally {
        loading.value = false;
      }
    };
    const selectType = async (code: string) => {
      selected.value = code;
      currentFlow.value = "";
      rows.value = [];
      tableApi.setDataSource([]);
      loading.value = true;
      try {
        const client = getGovernmentClient();
        const [fields, assigned, options] = await Promise.all([
          client.listFormFields(code),
          client.getBusinessFlow(code),
          client.listFormFlows({ enable: true, application: "OFFICIAL_MANAGEMENT" }),
        ]);
        businessFields.value = fields;
        flows.value = options;
        if (assigned) {
          await selectFlow(assigned);
        }
      } catch (error) {
        message.error(errorText(error, "流程配置加载失败"));
      } finally {
        loading.value = false;
      }
    };
    const save = async () => {
      if (!selected.value || !currentFlow.value) {
        message.warning("请选择表单流程");
        return;
      }
      saving.value = true;
      try {
        const business = types.value.find((item) => item.code === selected.value);
        const body: FlowBusinessConfig = {
          formDefinitionId: saved.formDefinitionId,
          businessType: selected.value,
          businessTypeName: business?.name,
          formFlowId: saved.id || currentFlow.value,
          fieldMapList: rows.value.map((row) => ({ controlId: row.controlId, title: row.title, businessField: row.businessField })),
        };
        await getGovernmentClient().saveFlowBusiness(body);
        message.success("保存成功");
      } catch (error) {
        message.error(errorText(error, "保存失败"));
      } finally {
        saving.value = false;
      }
    };
    onMounted(async () => {
      loading.value = true;
      try {
        types.value = await getGovernmentClient().listApprovalTypes();
        if (types.value[0]?.code) {
          await selectType(types.value[0].code);
        }
      } catch (error) {
        message.error(errorText(error, "审批类型加载失败"));
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <PageLayout
        title="流程配置"
        v-slots={{
          "layout-content": () => (
            <div class={styles.split}>
              <div class={styles.side}>
                {types.value.map((type) => (
                  <Button
                    key={type.code}
                    class={styles.sideItem}
                    type={selected.value === type.code ? "primary" : "text"}
                    onClick={() => {
                      if (type.code) {
                        void selectType(type.code);
                      }
                    }}
                  >
                    {type.name}
                  </Button>
                ))}
              </div>
              <div class={styles.main}>
                <div style="display:flex;align-items:center;gap:12px;padding-top:12px">
                  <span>表单流程：</span>
                  <Select
                    value={currentFlow.value || undefined}
                    style={{ width: "250px" }}
                    placeholder="请选择表单流程"
                    options={flows.value.map((flow) => ({ label: flow.name, value: flow.id }))}
                    onChange={(value) => void selectFlow(String(value ?? ""))}
                  />
                </div>
                <PcTable />
              </div>
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footer}>
              {can("official:flowSetting:save") && (
                <Button type="primary" loading={saving.value || loading.value} onClick={() => void save()}>
                  保存
                </Button>
              )}
            </div>
          ),
        }}
      />
    );
  },
});
