import { defineComponent, type PropType } from "vue";

import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { RISK_LEVEL_LABEL } from "@/constants";
import type { NotificationCardVO, RiskLevel } from "@/types/risk";

import styles from "./notification-card-content.module.less";

const LEVEL_CLASS: Record<
  RiskLevel,
  {
    card: string;
    header: string;
    badge: string;
  }
> = {
  MAJOR: { card: styles.major, header: styles.headerMajor, badge: styles.levelMajor },
  SIGNIFICANT: { card: styles.significant, header: styles.headerSignificant, badge: styles.levelSignificant },
  GENERAL: { card: styles.general, header: styles.headerGeneral, badge: styles.levelGeneral },
  LOW: { card: styles.low, header: styles.headerLow, badge: styles.levelLow },
};

const emptyText = (value?: string | number): string => {
  if (value == null || value === "") return "--";
  return String(value);
};

export const NotificationCardContent = defineComponent({
  props: {
    card: { type: Object as PropType<NotificationCardVO>, required: true },
    actions: { type: Function as PropType<() => JSX.Element>, default: undefined },
  },
  setup(props) {
    const renderTagList = (values: string[], className: string): JSX.Element => {
      if (values.length === 0) {
        return <span class={styles.muted}>--</span>;
      }
      return (
        <div class={styles.tagList}>
          {values.map((value) => (
            <span key={value} class={className}>
              {value}
            </span>
          ))}
        </div>
      );
    };

    const renderField = (label: string, value: JSX.Element | string, full = false): JSX.Element => (
      <div class={full ? styles.fieldFull : undefined}>
        <div class={styles.label}>{label}</div>
        <div class={styles.value}>{value}</div>
      </div>
    );

    return (): JSX.Element => {
      const level = props.card.controlRiskLevel ?? props.card.riskLevel;
      const levelClass = LEVEL_CLASS[level];
      return (
        <div class={[styles.card, levelClass.card].join(" ")}>
          <div class={[styles.header, levelClass.header].join(" ")}>
            <div class={styles.titleGroup}>
              <span class={styles.title}>{props.card.unitName || "--"}</span>
              <span class={[styles.levelBadge, levelClass.badge].join(" ")}>{RISK_LEVEL_LABEL[level]}</span>
            </div>
            {props.actions && <div class={styles.actions}>{props.actions()}</div>}
          </div>
          <div class={styles.body}>
            {renderField("风险单元", props.card.unitName || "--")}
            {renderField("固有风险等级", props.card.inherentRiskLevel ? <RiskLevelTag level={props.card.inherentRiskLevel} /> : "--")}
            {renderField("现状风险等级", props.card.controlRiskLevel ? <RiskLevelTag level={props.card.controlRiskLevel} /> : "--")}
            {renderField("责任部门", emptyText(props.card.department))}
            {renderField(
              "责任人及联系方式",
              <>
                {emptyText(props.card.responsibleUser)}
                {props.card.phone && <span class={styles.muted}> {props.card.phone}</span>}
              </>,
            )}
            {renderField("主要危险描述", props.card.hazardSummary || "--", true)}
            {renderField("事故类型", renderTagList(props.card.accidentTypes, styles.riskTag), true)}
            {renderField("安全标志", renderTagList(props.card.warningSigns, styles.signTag), true)}
            {renderField("主要风险管控措施", renderTagList(props.card.measures, styles.measureTag), true)}
            {renderField("应急处置措施", props.card.emergencyText || "--", true)}
          </div>
        </div>
      );
    };
  },
});
