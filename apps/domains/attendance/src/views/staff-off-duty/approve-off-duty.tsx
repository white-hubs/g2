import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 离岗审批 */
export const ApproveOffDuty = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceOffDutyApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "离岗审批"} flowCode="LEAVE_THE_POST" permission={permission} />;
  },
});
