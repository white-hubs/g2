import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 换班审批 */
export const ApproveChange = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceChangeApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "换班审批"} flowCode="CHANGE_CLASSES" permission={permission} />;
  },
});
