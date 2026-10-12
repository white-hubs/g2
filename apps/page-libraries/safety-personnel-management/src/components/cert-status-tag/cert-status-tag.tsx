import { Tag } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent } from "vue";

import type { ExpireDisplay } from "../../utils/cert-status";
import { expireDisplayLabel } from "../../utils/cert-status";

const colorMap: Record<ExpireDisplay, string> = {
  normal: "success",
  expiring: "warning",
  expired: "error",
};

export const CertStatusTag = defineComponent({
  props: {
    status: { type: String as () => ExpireDisplay, required: true },
  },
  setup(props) {
    return () => <Tag color={colorMap[props.status]}>{expireDisplayLabel[props.status]}</Tag>;
  },
});
