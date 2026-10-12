import { defineComponent, type PropType } from "vue";

import { RISK_LEVEL_COLOR, RISK_LEVEL_LABEL } from "@/constants";
import { Tag } from "@/pc-ui-runtime";
import type { RiskLevel } from "@/types/risk";

export const RiskLevelTag = defineComponent({
  props: {
    level: { type: String as PropType<RiskLevel | undefined>, default: undefined },
  },
  setup(props) {
    return (): JSX.Element | null => {
      if (!props.level) {
        return <span>--</span>;
      }
      return <Tag color={RISK_LEVEL_COLOR[props.level]}>{RISK_LEVEL_LABEL[props.level]}</Tag>;
    };
  },
});
