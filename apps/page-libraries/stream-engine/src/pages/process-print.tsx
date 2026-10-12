import type { FormFlowBusiness, ProcessTaskForm, StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import { computed, defineComponent, nextTick, reactive, ref, type PropType } from "vue";

import type { FormPermEntry } from "../form-perms";
import type { FormSchemaItem } from "../form-schema";
import { buildPrintFields, buildPrintOperations } from "../process-print";

import styles from "./process-print.module.css";

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export interface StreamEnginePrintSheetHandle {
  prepare(): Promise<void>;
}

export default defineComponent({
  name: "StreamEnginePrintSheet",
  props: {
    client: { type: Object as PropType<StreamEngineClient>, default: undefined },
    processInstanceId: { type: String, default: "" },
    schemaItems: { type: Array as PropType<FormSchemaItem[]>, required: true },
    formValues: { type: Object as PropType<Record<string, unknown>>, required: true },
    formPerms: { type: Array as PropType<FormPermEntry[]>, required: true },
    processType: { type: String as PropType<"add" | "detail">, required: true },
    nodeId: { type: String, required: true },
    flowForm: { type: Object as PropType<FormFlowBusiness>, default: undefined },
    taskDetail: { type: Object as PropType<ProcessTaskForm>, default: undefined },
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const printNodes = ref<unknown[]>([]);
    const signaturePaths = reactive<Record<string, string>>({});
    const fields = computed(() =>
      buildPrintFields({
        schemaItems: props.schemaItems,
        formValues: props.formValues,
        formPerms: props.formPerms,
        processType: props.processType,
        nodeId: props.nodeId,
        taskDetail: props.taskDetail,
      }),
    );

    const prepare = async (): Promise<void> => {
      if (props.processInstanceId) {
        if (!props.client) throw new Error("打印流程数据尚未加载");
        const result = await props.client.getPrintNodes(props.processInstanceId);
        if (!Array.isArray(result)) throw new Error("打印节点数据格式错误");
        printNodes.value = result;
      } else {
        printNodes.value = [];
      }
      for (const id of Object.keys(signaturePaths)) delete signaturePaths[id];
      const signIds = [
        ...new Set(
          buildPrintOperations(printNodes.value, props.flowForm)
            .map((item) => item.signId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (signIds.length && props.getFileClient) {
        try {
          const fileClient = await props.getFileClient();
          await Promise.all(
            signIds
              .map(async (id) => {
                const response = await fileClient.getFile(id);
                const file = recordOf(recordOf(response).data ?? response);
                if (file.path) signaturePaths[id] = String(file.path);
              })
              .map((request) => request.catch(() => undefined)),
          );
        } catch {
          // 旧签名文件失效时仍允许打印其他表单内容。
        }
      }
      await nextTick();
    };
    expose({ prepare } satisfies StreamEnginePrintSheetHandle);

    return () => {
      const running = recordOf(props.taskDetail?.processInstanceRunningInfo);
      const [outsiderName, outsiderPhone] = String(running.startName ?? "").split(":");
      return (
        <section class={styles.sheet} aria-hidden="true">
          <h1>{String(props.flowForm?.name ?? "流程表单")}</h1>
          <table class={styles.table}>
            <tbody>
              {running.outSider ? (
                <tr>
                  <th>联系方式</th>
                  <td>
                    姓名：{outsiderName || "--"}
                    <br />
                    电话：{outsiderPhone || "--"}
                  </td>
                </tr>
              ) : null}
              {fields.value.map((field, index) => {
                if (field.kind === "description")
                  return (
                    <tr key={index}>
                      <td colspan={2}>{field.value}</td>
                    </tr>
                  );
                if (field.kind === "table")
                  return (
                    <tr key={index}>
                      <td colspan={2} class={styles.nestedCell}>
                        <table class={styles.table}>
                          <thead>
                            <tr>
                              {field.columns.map((name, columnIndex) => (
                                <th key={columnIndex}>{name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {field.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((value, columnIndex) => (
                                  <td key={columnIndex}>{value}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                return (
                  <tr key={index}>
                    <th>{field.title}</th>
                    <td>{field.value}</td>
                  </tr>
                );
              })}
              {printNodes.value.map((node, nodeIndex) => {
                const operations = buildPrintOperations([node], props.flowForm);
                return operations.map((operation, operationIndex) => (
                  <tr key={`${nodeIndex}-${operationIndex}`}>
                    {operationIndex === 0 ? <th rowspan={operations.length}>{operation.nodeName}</th> : null}
                    <td>
                      {operation.operator ? (
                        <div>
                          {operation.operator} {operation.action}
                        </div>
                      ) : null}
                      {operation.opinion ? <div>{operation.opinion}</div> : null}
                      {operation.signId && signaturePaths[operation.signId] ? (
                        <div class={styles.signature}>
                          电子签名：
                          <img src={signaturePaths[operation.signId]} alt="电子签名" />
                        </div>
                      ) : null}
                      <div>时间：{operation.time}</div>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </section>
      );
    };
  },
});
