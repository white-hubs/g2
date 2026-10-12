import { PcIcon, Progress, Tag } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent, shallowRef } from "vue";

import { SEVERITY_META, STATUS_META } from "./deep-analysis.const";
import type { DiagnosisRecord } from "@/types/electrical";

import "./deep-analysis.less";

export const DiagnosisCard = defineComponent({
  name: "DiagnosisCard",
  props: {
    record: {
      type: Object as PropType<DiagnosisRecord>,
      required: true,
    },
  },
  setup: (props) => {
    const expanded = shallowRef(false);
    const toggleExpanded = (): void => {
      expanded.value = !expanded.value;
    };
    return (): JSX.Element => {
      const severity = SEVERITY_META[props.record.severity];
      const status = STATUS_META[props.record.status];
      return (
        <article
          class="diagnosis-card"
          role="button"
          tabindex={0}
          aria-expanded={expanded.value}
          onClick={toggleExpanded}
          onKeydown={(event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleExpanded();
            }
          }}
        >
          <div class="diagnosis-main">
            <div class="diagnosis-summary">
              <div class="diagnosis-heading">
                <strong>{props.record.problemName}</strong>
                <Tag color={severity.color}>{severity.label}</Tag>
                <Tag color={status.color}>{status.label}</Tag>
              </div>
              <div class="diagnosis-meta">
                <span>{props.record.deviceName}</span>
                <span>{props.record.facilityName}</span>
                <span>{props.record.diagnosedAt}</span>
              </div>
            </div>
            <p class="diagnosis-description">{props.record.description}</p>
          </div>
          <span class="diagnosis-toggle" aria-hidden="true">
            {expanded.value ? "⌃" : "⌄"}
          </span>
          {expanded.value && (
            <div class="diagnosis-detail">
              <section>
                <h4>
                  <PcIcon iconClass="icon-shujuzhengjulian" size={16} /> 数据证据链
                </h4>
                <ul>
                  {props.record.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4>
                  <PcIcon iconClass="icon-genyingaishuaipaixu" size={16} /> 根因概率排序
                </h4>
                <div class="cause-list">
                  {props.record.causes.map((cause) => (
                    <div class="cause-row" key={cause.name}>
                      <span>{cause.name}</span>
                      <Progress percent={cause.probability} size="small" />
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h4>
                  <PcIcon iconClass="icon-jianyifangan" size={16} /> 整改建议
                </h4>
                <ol>
                  {props.record.suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </article>
      );
    };
  },
});
