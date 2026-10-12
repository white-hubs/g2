import { type VNode, defineComponent } from "vue";

import { FlowListTable } from "@/components/flow-table/flow-table";
import { usePageName } from "@/hook/use-page-name";
import { appFunctionCodes } from "@/permission";
/** 出差审批 */
export const ApproveBusinessTrip = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const permission = appFunctionCodes.attendanceBusinessTripApproval;

    return (): VNode => <FlowListTable title={pageTitle ?? "出差审批"} flowCode="AWAY_BUSINESS" permission={permission} />;
  },
});
