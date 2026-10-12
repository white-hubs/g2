import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 请假审批 */
export const ApproveLeave = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceLeaveApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "请假审批"} flowCode="LEAVE" permission={permission} />;
  },
});
