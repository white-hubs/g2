import type { KeyPersonRiskLevel } from "@g2-contract/safety-personnel";
import { Tag } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { type PropType, defineComponent } from "vue";

import { KEY_PERSON_RISK_LEVEL_LABEL } from "../../../constants";

const COLOR_MAP: Record<KeyPersonRiskLevel, string> = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "processing",
};

export const RiskLevelTag = defineComponent({
  props: {
    level: { type: String as PropType<KeyPersonRiskLevel>, required: true },
  },
  setup(props) {
    return () => <Tag color={COLOR_MAP[props.level]}>{KEY_PERSON_RISK_LEVEL_LABEL[props.level]}</Tag>;
  },
});
