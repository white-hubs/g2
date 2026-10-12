import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 补卡审批 */
export const ApproveSupplement = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceSupplementApproval;
    return (): VNode => <FlowListTable title={pageTitle ?? "补卡审批"} flowCode="REPAIR_CLOCK" permission={permission} />;
  },
});
