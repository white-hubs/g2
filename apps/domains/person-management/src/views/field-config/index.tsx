import type { DictionaryRecord } from "@g2-contract/person-management";
import { Button, Input, PageLayout, type PcTableColumn, Space, Switch, TabPane, Tabs, message, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";

import { getPersonManagementClient } from "../../domain-context";
import { ITEM_CODE, ROSTER_CONFIG, type RosterField, type RosterFieldVariable } from "./fields";
import { loadFieldConfig } from "./load-field-config";

import styles from "./field-config.module.css";

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const FieldConfigPage = defineComponent({
  name: "PersonnelFieldConfigPage",
  setup() {
    const dictionary = ref<DictionaryRecord>();
    const variable = ref<RosterFieldVariable>(structuredClone(ROSTER_CONFIG.variable));
    const rows = ref<RosterField[]>([]);
    const savingKey = ref("");
    const editingKey = ref("");
    const aliasDraft = ref("");

    const persist = async (nextFields: RosterField[], key: string): Promise<boolean> => {
      const current = dictionary.value;
      if (!current || savingKey.value) {
        return false;
      }
      savingKey.value = key;
      try {
        const nextVariable = { ...variable.value, fields: nextFields };
        await getPersonManagementClient().updateDataDictionary({
          id: current.id,
          itemCode: current.itemCode || ITEM_CODE,
          name: current.name || ROSTER_CONFIG.name,
          code: current.code || ROSTER_CONFIG.code,
          remarks: current.remarks,
          version: current.version,
          variable: JSON.stringify(nextVariable),
        });
        variable.value = nextVariable;
        rows.value = nextFields;
        tableApi.setDataSource(nextFields);
        message.success("操作成功");
        return true;
      } catch (error) {
        message.error(errorText(error, "操作失败"));
        return false;
      } finally {
        savingKey.value = "";
      }
    };

    const changeBoolean = (record: RosterField, field: "show" | "required"): void => {
      const nextFields = rows.value.map((item) => (item.key === record.key ? { ...item, [field]: !item[field] } : item));
      void persist(nextFields, record.key);
    };

    const editAlias = (record: RosterField): void => {
      editingKey.value = record.key;
      aliasDraft.value = record.alias;
    };

    const saveAlias = (record: RosterField): void => {
      if (!editingKey.value || savingKey.value) {
        return;
      }
      const nextFields = rows.value.map((item) => (item.key === record.key ? { ...item, alias: aliasDraft.value.trim() } : item));
      void persist(nextFields, record.key).then((saved) => {
        if (saved) {
          editingKey.value = "";
        }
      });
    };

    const columns: PcTableColumn[] = [
      { title: "字段名", dataIndex: "fieldName", width: 220, align: "center", ellipsis: true },
      {
        title: "是否显示",
        dataIndex: "show",
        width: 130,
        align: "center",
        customRender: ({ record }) => {
          const field = record as RosterField;
          return (
            <Switch
              checked={field.show}
              loading={savingKey.value === field.key}
              disabled={Boolean(savingKey.value)}
              onChange={() => changeBoolean(field, "show")}
            />
          );
        },
      },
      {
        title: "是否必填",
        dataIndex: "required",
        width: 130,
        align: "center",
        customRender: ({ record }) => {
          const field = record as RosterField;
          return (
            <Switch
              checked={field.required}
              loading={savingKey.value === field.key}
              disabled={Boolean(savingKey.value)}
              onChange={() => changeBoolean(field, "required")}
            />
          );
        },
      },
      {
        title: "别名",
        dataIndex: "alias",
        align: "center",
        customRender: ({ record }) => {
          const field = record as RosterField;
          return editingKey.value === field.key ? (
            <Space class={styles.aliasEditor} size={8}>
              <Input
                value={aliasDraft.value}
                maxlength={50}
                placeholder="请输入别名"
                onUpdate:value={(value: string) => {
                  aliasDraft.value = value;
                }}
                onPressEnter={() => saveAlias(field)}
              />
              <Button type="link" size="small" loading={savingKey.value === field.key} onClick={() => saveAlias(field)}>
                保存
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  editingKey.value = "";
                }}
              >
                取消
              </Button>
            </Space>
          ) : (
            <Space class={styles.aliasValue} size={8}>
              <span>{field.alias || "--"}</span>
              <Button type="link" size="small" onClick={() => editAlias(field)}>
                编辑
              </Button>
            </Space>
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "key",
      tableCode: "PERSONNELMANAGEMENT_FIELD_CONFIG",
      pagination: false,
      autoFetch: false,
    });

    const load = async (): Promise<void> => {
      tableApi.loading.value = true;
      try {
        const loaded = await loadFieldConfig(getPersonManagementClient());
        dictionary.value = loaded.dictionary;
        variable.value = loaded.variable;
        rows.value = loaded.variable.fields;
        tableApi.setDataSource(loaded.variable.fields);
      } catch (error) {
        message.error(errorText(error, "字段配置加载失败"));
      } finally {
        tableApi.loading.value = false;
      }
    };

    onMounted(() => {
      void load();
    });

    return () => (
      <PageLayout
        title="字段配置"
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content}>
              <Tabs activeKey="1">
                <TabPane key="1" tab="表单字段配置">
                  <PcTable />
                </TabPane>
              </Tabs>
            </div>
          ),
        }}
      />
    );
  },
});
