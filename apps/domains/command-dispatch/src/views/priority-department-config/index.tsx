import type { DataDictionary } from "@g2-contract/dictionary";
import type { DepartmentNode } from "@g2-contract/ouaa";
import { defineComponent, onBeforeUnmount, onMounted, reactive } from "vue";

import { PageFrame } from "../../components/page-frame";
import { getDictionaryClient, getOuaaClient } from "../../domain-context";
import { Alert, Button, message, Spin, TreeSelect } from "../../pc-ui-runtime";
import { configurationError, loadConfiguration, saveConfiguration } from "../dispatch-map-config/config";
import { departmentName, PRIORITY_CONFIG_CODE, priorityRecord } from "./config";

import styles from "./index.module.css";

export const PriorityDepartmentConfig = defineComponent({
  name: "PriorityDepartmentConfig",
  setup() {
    const state = reactive({
      departments: [] as DepartmentNode[],
      records: [] as DataDictionary[],
      selectedId: undefined as string | undefined,
      loading: true,
      loaded: false,
      saving: false,
      error: "",
    });
    let disposed = false;
    onBeforeUnmount(() => {
      disposed = true;
    });

    const load = async (): Promise<void> => {
      state.loading = true;
      state.loaded = false;
      state.error = "";
      try {
        const [dictionary, ouaa] = await Promise.all([getDictionaryClient(), getOuaaClient()]);
        const [records, departments] = await Promise.all([
          loadConfiguration(dictionary, PRIORITY_CONFIG_CODE),
          ouaa.getDepartments({ enabled: true }),
        ]);
        if (disposed) return;
        state.departments = departments;
        state.records = records;
        state.selectedId = records.find((record) => record.code === "departmentId")?.variable || undefined;
        state.loaded = true;
      } catch (error) {
        if (!disposed) state.error = configurationError(error, "部门配置加载失败，请重试");
      } finally {
        if (!disposed) state.loading = false;
      }
    };

    const save = async (): Promise<void> => {
      if (!state.selectedId) {
        message.warning("请选择优先部门");
        return;
      }
      if (!state.loaded || state.saving) return;
      state.saving = true;
      state.error = "";
      try {
        const client = await getDictionaryClient();
        state.records = [priorityRecord(state.records, state.selectedId)];
        await saveConfiguration(client, state.records, "调度中心优先选择部门");
        state.records = await client.getDataDictionaryByItem({ itemCode: PRIORITY_CONFIG_CODE });
        if (!disposed) message.success("保存成功");
      } catch (error) {
        if (!disposed) state.error = configurationError(error, "保存失败，请重试");
      } finally {
        if (!disposed) state.saving = false;
      }
    };

    onMounted(() => {
      void load();
    });
    return () => (
      <PageFrame
        title="优先排序部门"
        v-slots={{
          search: () => (
            <div class={styles.toolbar}>
              <label for="command-priority-department">优先选择部门：</label>
              <TreeSelect
                id="command-priority-department"
                class={styles.select}
                value={state.selectedId}
                onUpdate:value={(value: string | undefined) => {
                  state.selectedId = value;
                }}
                treeData={state.departments}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                placeholder="请选择部门"
                allowClear
                showSearch
                treeNodeFilterProp="name"
                disabled={!state.loaded || state.saving}
              />
            </div>
          ),
          default: () => (
            <div class={styles.body}>
              {state.error && (
                <Alert
                  type="error"
                  showIcon
                  message={state.error}
                  v-slots={{
                    action: () => (
                      <Button size="small" onClick={() => void load()} disabled={state.saving}>
                        重新加载
                      </Button>
                    ),
                  }}
                />
              )}
              <div class={styles.selection}>
                {state.loading ? (
                  <Spin />
                ) : state.loaded ? (
                  state.selectedId ? (
                    `当前已选部门：${departmentName(state.departments, state.selectedId)}`
                  ) : (
                    "暂未选择优先部门"
                  )
                ) : (
                  "部门配置尚未加载"
                )}
              </div>
            </div>
          ),
          footer: () => (
            <Button type="primary" disabled={!state.loaded} loading={state.saving} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
