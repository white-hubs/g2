import type { ApprovalTypeItem, FormFlowRecord, StreamEngineClient } from "@g2-client/stream-engine/client";
import { Button, Cascader, Empty, PageLayout, Select, Spin, message, usePcTable, type PcTableColumn } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import type { StreamEnginePageProps } from "../contract";
import {
  buildFieldMapList,
  controlOptions,
  formControlTree,
  restoreBusinessFields,
  type BusinessFieldRow,
  type FormControlMapNode,
} from "./approval-mapping";

import styles from "./approval-config.module.css";

export default defineComponent({
  name: "ApprovalConfig",
  props: {
    title: { type: String, default: "流程配置" },
    applicationCode: { type: String, default: "HIDDENDANGER" },
    approvalApiPrefix: { type: String, default: "" },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]>, required: true },
  },
  setup(props) {
    const loading = ref(true);
    const fieldsLoading = ref(false);
    const saving = ref(false);
    const client = ref<StreamEngineClient>();
    const approvalList = ref<ApprovalTypeItem[]>([]);
    const selectedCode = ref<string>();
    const flowOptions = ref<FormFlowRecord[]>([]);
    const flowSelectValue = ref<string>();
    const controls = ref<FormControlMapNode[]>([]);
    const tableRows = ref<BusinessFieldRow[]>([]);
    const formDefinitionId = ref<string>();
    let requestVersion = 0;

    const apiPrefix = (): string =>
      props.approvalApiPrefix.replace(/\/$/, "") ||
      (props.applicationCode === "HIDDENDANGER"
        ? "/api/maintain/hidden"
        : ["FAULT", "COMPLAINT"].includes(props.applicationCode)
          ? "/api/maintain/fault"
          : "/api/attendance");

    const loadFlow = async (flowId: string, version: number): Promise<void> => {
      if (!client.value) return;
      const detail = await client.value.getFormFlow(flowId);
      if (version !== requestVersion) return;
      formDefinitionId.value = detail.formDefinitionId ? String(detail.formDefinitionId) : undefined;
      controls.value = formControlTree(detail.formJson);
      tableRows.value = restoreBusinessFields(tableRows.value, controls.value, detail.formBizFieldMapList ?? []);
      if (!flowOptions.value.some((item) => String(item.id) === flowId)) {
        flowOptions.value = [...flowOptions.value, { id: flowId, name: String(detail.name ?? detail.formName ?? flowId) }];
      }
    };

    const loadFields = async (code: string): Promise<void> => {
      if (!client.value) return;
      const version = ++requestVersion;
      fieldsLoading.value = true;
      controls.value = [];
      tableRows.value = [];
      flowSelectValue.value = undefined;
      formDefinitionId.value = undefined;
      try {
        const fields = await client.value.listBusinessFormFields(apiPrefix(), { type: code });
        if (version !== requestVersion) return;
        tableRows.value = fields.map((field) => ({ ...field }));
        const flowId = await client.value.getFormFlowBusinessFlow(code);
        if (version !== requestVersion) return;
        if (flowId) {
          flowSelectValue.value = flowId;
          await loadFlow(flowId, version);
        }
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "流程配置加载失败");
      } finally {
        if (version === requestVersion) fieldsLoading.value = false;
      }
    };

    const selectBusiness = (code: string): void => {
      if (code === selectedCode.value) return;
      selectedCode.value = code;
      void loadFields(code);
    };

    const changeFlow = (value: unknown): void => {
      const flowId = value == null ? undefined : String(value);
      const version = ++requestVersion;
      flowSelectValue.value = flowId;
      controls.value = [];
      formDefinitionId.value = undefined;
      tableRows.value = tableRows.value.map(({ formItemId: _formItemId, ...field }) => field);
      if (flowId) {
        fieldsLoading.value = true;
        void loadFlow(flowId, version)
          .catch((error: unknown) => {
            if (version === requestVersion) message.error(error instanceof Error ? error.message : "表单流程加载失败");
          })
          .finally(() => {
            if (version === requestVersion) fieldsLoading.value = false;
          });
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: "业务流程",
        dataIndex: "name",
        width: 380,
        customRender: ({ record }) => {
          const row = record as BusinessFieldRow;
          return (
            <>
              {row.required ? <span class={styles.required}>*</span> : null}
              {row.name}
            </>
          );
        },
      },
      {
        title: "表单字段",
        dataIndex: "formItemId",
        customRender: ({ record }) => {
          const row = record as BusinessFieldRow;
          return (
            <Cascader
              value={row.formItemId}
              changeOnSelect
              options={controlOptions(controls.value)}
              fieldNames={{ label: "title", value: "controlId", children: "children" }}
              placeholder="请选择"
              class={styles.fieldSelect}
              onUpdate:value={(value) => {
                row.formItemId = Array.isArray(value) ? value.map(String) : undefined;
              }}
            />
          );
        },
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "STREAM_ENGINE_APPROVAL_MAPPING",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
    });
    watch(tableRows, (rows) => tableApi.setDataSource(rows), { immediate: true });

    const save = async (): Promise<void> => {
      if (!client.value || !selectedCode.value || !flowSelectValue.value || !formDefinitionId.value) {
        message.warning("请选择业务类型与表单流程");
        return;
      }
      saving.value = true;
      try {
        const selected = approvalList.value.find((item) => item.code === selectedCode.value);
        await client.value.saveFormFlowBusiness({
          formDefinitionId: formDefinitionId.value,
          businessType: selectedCode.value,
          businessTypeName: selected?.name,
          formFlowId: flowSelectValue.value,
          fieldMapList: buildFieldMapList(controls.value, tableRows.value),
        });
        message.success("保存成功");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(async () => {
      try {
        client.value = await props.getClient();
        const [types, flows] = await Promise.all([
          client.value.listApprovalTypes(apiPrefix(), props.applicationCode),
          client.value.listFormFlows({ enable: true, application: props.applicationCode }),
        ]);
        approvalList.value = types;
        flowOptions.value = flows;
        selectedCode.value = types[0]?.code;
        if (selectedCode.value) await loadFields(selectedCode.value);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "流程配置加载失败");
      } finally {
        loading.value = false;
      }
    });

    return () => {
      if (loading.value) {
        return (
          <PageLayout
            title={props.title}
            showFooter={false}
            v-slots={{
              "layout-content": () => (
                <div class={styles.loading}>
                  <Spin size="large" />
                </div>
              ),
            }}
          />
        );
      }
      const slots = {
        "layout-content": () => (
          <div class={styles.layout}>
            <aside class={styles.sidebar}>
              {approvalList.value.length ? (
                approvalList.value.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    class={[styles.businessType, selectedCode.value === item.code ? styles.selected : ""]}
                    onClick={() => selectBusiness(item.code)}
                  >
                    {item.name}
                  </button>
                ))
              ) : (
                <Empty description="暂无业务类型" />
              )}
            </aside>
            <div class={styles.main}>
              <div class={styles.flowBar}>
                <label class={styles.flowLabel}>表单流程:</label>
                <Select
                  value={flowSelectValue.value}
                  disabled={fieldsLoading.value}
                  class={styles.flowSelect}
                  options={flowOptions.value.map((item) => ({
                    label: String(item.name ?? item.formName ?? item.id),
                    value: String(item.id),
                  }))}
                  onUpdate:value={changeFlow}
                />
              </div>
              <div class={styles.tableArea}>
                <Spin spinning={fieldsLoading.value}>
                  <PcTable />
                </Spin>
              </div>
            </div>
          </div>
        ),
        "footer-btn": () => (
          <Button
            type="primary"
            loading={saving.value}
            disabled={fieldsLoading.value || !flowSelectValue.value}
            onClick={() => void save()}
          >
            保存
          </Button>
        ),
      };
      return <PageLayout title={props.title} v-slots={slots} />;
    };
  },
});
