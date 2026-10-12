import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 加班审批 */
export const ApproveOvertime = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceOvertimeApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "加班审批"} flowCode="OVERTIME" permission={permission} />;
  },
});
