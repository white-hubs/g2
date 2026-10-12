// @ts-nocheck
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { defineComponent, watch, type PropType } from "vue";

import { TARGET_CATEGORY_MAP, formatDisplayTime } from "@/compat/constants";

import styles from "../archive-info.module.css";

export const ArchiveBasicInfo = defineComponent({
  name: "ArchiveBasicInfo",
  props: {
    initFormState: { type: Object as PropType<InspectionRecord>, default: () => ({}) },
  },
  setup(props) {
    watch(
      () => props.initFormState,
      () => undefined,
      { deep: true },
    );

    return () => {
      const data = props.initFormState ?? {};
      const category = String(data.targetCategory ?? "");
      const result = String(data.result ?? "");
      const fields = [
        { label: "对象名称", value: data.targetName || "--" },
        { label: "对象类型", value: TARGET_CATEGORY_MAP[category] ?? (category || "--") },
        { label: "所在区域", value: data.areaName || "--" },
        { label: "所属部门", value: data.organizationName || "--" },
        { label: "最后一次巡检时间", value: formatDisplayTime(data.time) },
        {
          label: "最近一次巡检结果",
          value: result === "ABNORMAL" ? "异常" : result === "NORMAL" ? "正常" : "--",
          danger: result === "ABNORMAL",
        },
      ];
      return (
        <dl class={styles["detail-grid"]}>
          {fields.map((field) => (
            <div class={styles["detail-item"]} key={field.label}>
              <dt>{field.label}</dt>
              <dd style={field.danger ? { color: "#ff4158" } : undefined}>{String(field.value)}</dd>
            </div>
          ))}
        </dl>
      );
    };
  },
});
