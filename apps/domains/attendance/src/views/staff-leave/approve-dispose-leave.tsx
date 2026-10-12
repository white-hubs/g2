import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 销假审批 */
export const ApproveDisposeLeave = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceDisposeLeaveApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "销假审批"} flowCode="CANCEL_LEAVE" permission={permission} />;
  },
});
