// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { TaskResultOptions } from "@g2-client/daily-task/client";
import { defineComponent } from "vue";

import { FileUpload } from "@/components/daily-task-widgets";
import { dayjs } from "@/pc-ui-runtime";

import styles from "./index.module.css";

export interface ExecutionRecordProps {
  executorName: string;
  executionTime: number | string;
  executionResult: string;
  remark?: string;
  fileList?: {
    id: string;
    name: string;
    path?: string;
    endpointPath?: string;
  }[];
}

export const ExecutionRecord = defineComponent({
  props: ["executorName", "executionTime", "executionResult", "remark", "fileList"],
  setup(props: ExecutionRecordProps) {
    const formatExecutionTime = (value: number | string | null | undefined): string => {
      if (value === null || value === undefined || value === "") {
        return "--";
      }

      const parsedValue = typeof value === "string" ? value.trim() : value;
      if (parsedValue === "") {
        return "--";
      }

      const numericValue = Number(parsedValue);
      const dateValue =
        Number.isFinite(numericValue) && /^\d+$/.test(String(parsedValue))
          ? String(parsedValue).length === 10
            ? numericValue * 1000
            : numericValue
          : parsedValue;

      const formattedDate = dayjs(dateValue);
      return formattedDate.isValid() ? formattedDate.format("YYYY-MM-DD HH:mm:ss") : "--";
    };

    return () => (
      <div class={styles["execution-record"]}>
        <div class={styles["execution-record-row"]}>
          <div class={styles["execution-record-item"]}>
            <span class={styles["execution-record-label"]}>执行人：</span>
            <span class={styles["execution-record-value"]}>{props.executorName}</span>
          </div>
          {props.executionTime !== null && props.executionTime !== undefined && props.executionTime !== "" && (
            <div class={styles["execution-record-item"]}>
              <span class={styles["execution-record-label"]}>执行时间：</span>
              <span class={styles["execution-record-value"]}>{formatExecutionTime(props.executionTime)}</span>
            </div>
          )}
          <div class={styles["execution-record-item"]}>
            <span class={styles["execution-record-label"]}>执行结果：</span>
            <span class={styles["execution-record-value"]}>
              {TaskResultOptions[props.executionResult as keyof typeof TaskResultOptions] ?? props.executionResult ?? "--"}
            </span>
          </div>
        </div>

        {props.remark && props.remark.trim() && (
          <div class={styles["execution-record-row"]}>
            <span class={styles["execution-record-label"]}>备注：</span>
            <span class={styles["execution-record-value"]}>{props.remark}</span>
          </div>
        )}

        {props.fileList && props.fileList.length > 0 && (
          <div class={styles["execution-record-row"]}>
            <span class={styles["execution-record-label"]}>附件：</span>
            <div class={styles["execution-record-files"]}>
              <FileUpload value={props.fileList} multiple readonly={true} type="picture-card" />
            </div>
          </div>
        )}
      </div>
    );
  },
});
