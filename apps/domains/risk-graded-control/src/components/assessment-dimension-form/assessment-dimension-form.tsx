import { computed, defineComponent, ref, watch, type PropType } from "vue";

import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { RISK_LEVEL_LABEL } from "@/constants";
import { Select, SelectOption, Card, Space, Tag, Tooltip } from "@/pc-ui-runtime";
import type { AssessmentDimensionOption, AssessmentMethodVO, RiskLevel } from "@/types/risk";
import { calcAssessmentTotalScore, formatAssessmentScore } from "@/utils/assessment-score";

import styles from "./assessment-dimension-form.module.less";

const OPTION_LABEL_MAX = 28;

const formatOptionText = (opt: AssessmentDimensionOption): string => `${opt.label}=${opt.value}`;

const formatOptionBrief = (opt: AssessmentDimensionOption): string => {
  const briefLabel = opt.label.length > OPTION_LABEL_MAX ? `${opt.label.slice(0, OPTION_LABEL_MAX)}…` : opt.label;
  return `${briefLabel}=${opt.value}`;
};

export const AssessmentDimensionForm = defineComponent({
  props: {
    method: { type: Object as PropType<AssessmentMethodVO>, required: true },
    modelValue: { type: Object as PropType<Record<string, number>>, default: () => ({}) },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "scoreChange"],
  setup(props, { emit }) {
    const scores = ref<Record<string, number>>({ ...props.modelValue });

    watch(
      () => props.modelValue,
      (v) => {
        scores.value = { ...v };
      },
      { deep: true },
    );

    const totalScore = computed<number | undefined>(() => {
      const complete = props.method.dimensions.length > 0 && props.method.dimensions.every((dim) => scores.value[dim.code] != null);
      if (!complete) return undefined;
      return calcAssessmentTotalScore(scores.value, props.method.dimensions);
    });

    const level = computed((): RiskLevel | undefined => {
      const s = totalScore.value;
      if (s == null) return undefined;
      if (props.method.code === "LEC") {
        if (s >= 200) return "MAJOR";
        if (s >= 70) return "SIGNIFICANT";
        if (s >= 20) return "GENERAL";
        return "LOW";
      }
      if (props.method.code === "MES") {
        if (s >= 180) return "MAJOR";
        if (s >= 90) return "SIGNIFICANT";
        if (s >= 50) return "GENERAL";
        return "LOW";
      }
      if (s >= 20) return "MAJOR";
      if (s >= 10) return "SIGNIFICANT";
      if (s >= 5) return "GENERAL";
      return "LOW";
    });

    const onChange = (code: string, val: number): void => {
      scores.value = { ...scores.value, [code]: val };
      emit("update:modelValue", scores.value);
      emit("scoreChange", { total: totalScore.value, level: level.value });
    };

    const selectedOptionText = (options: AssessmentDimensionOption[], value?: number): string => {
      if (value == null) return "";
      const matched = options.find((opt) => opt.value === value);
      return matched ? formatOptionText(matched) : "";
    };

    return (): JSX.Element => (
      <Card size="small" title={`评估方法：${props.method.name}（${props.method.formula}）`}>
        <Space direction="vertical" style={{ width: "100%" }}>
          {props.method.dimensions.map((dim) => {
            const selectedText = selectedOptionText(dim.options, scores.value[dim.code]);
            return (
              <div key={dim.code} class={styles.dimensionRow}>
                <div class={styles.dimensionLabel}>
                  {dim.name}（{dim.code}）
                </div>
                <Tooltip title={selectedText || undefined} placement="topLeft">
                  <div class={styles.selectWrap}>
                    <Select
                      class={styles.dimensionSelect}
                      popupClassName={styles.optionDropdown}
                      dropdownMatchSelectWidth={false}
                      listHeight={320}
                      optionLabelProp="label"
                      getPopupContainer={() => document.body}
                      value={scores.value[dim.code]}
                      placeholder="请选择"
                      disabled={props.disabled}
                      onChange={(value: unknown) => {
                        if (typeof value === "number") onChange(dim.code, value);
                      }}
                    >
                      {dim.options.map((opt) => {
                        const fullText = formatOptionText(opt);
                        return (
                          <SelectOption key={opt.value} value={opt.value} label={formatOptionBrief(opt)} title={fullText}>
                            <div class={styles.optionText}>{fullText}</div>
                          </SelectOption>
                        );
                      })}
                    </Select>
                  </div>
                </Tooltip>
              </div>
            );
          })}
          <div>
            总分值：<strong>{formatAssessmentScore(totalScore.value)}</strong> 判定等级：
            {level.value ? <RiskLevelTag level={level.value} /> : <span style={{ color: "#999" }}>未评估</span>}
          </div>
          {level.value && (
            <Tag class={styles.levelRuleTag}>
              {RISK_LEVEL_LABEL[level.value]} — {props.method.levelRules.find((r) => r.level === level.value)?.requirement}
            </Tag>
          )}
        </Space>
      </Card>
    );
  },
});
