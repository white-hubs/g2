import { defineComponent, type PropType } from "vue";

import type { StreamEnginePageProps } from "../contract";
import { decodeWorkOrderReturnUrl, workOrderApplication } from "../work-order-model";
import FormProcessDesign from "./form-process-design";

export default defineComponent({
  name: "WorkOrderDesign",
  props: {
    title: { type: String, default: "工单流程设计" },
    formId: { type: String, default: "" },
    formType: { type: String, default: "" },
    applicationCode: { type: String, default: undefined },
    isCopy: { type: Boolean, default: undefined },
    groupId: { type: [String, Number] as PropType<string | number>, default: undefined },
    returnUrl: { type: String, default: undefined },
    getClient: { type: Function as PropType<StreamEnginePageProps["getClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]> },
    onNavigate: { type: Function as PropType<StreamEnginePageProps["onNavigate"]> },
    onClose: { type: Function as PropType<StreamEnginePageProps["onClose"]> },
  },
  setup(props) {
    const published = (returnUrl?: string): void => {
      if (returnUrl) location.assign(decodeWorkOrderReturnUrl(returnUrl));
      else props.onNavigate?.({ page: "FlowformList" });
    };
    return () => {
      const query = new URLSearchParams(location.search);
      const application = workOrderApplication(props.applicationCode, sessionStorage.getItem("GH-currentApplication"));
      const group = props.groupId ?? query.get("group");
      const groupId = typeof group === "string" && /^\d+$/.test(group) ? Number(group) : group;
      return (
        <FormProcessDesign
          title={props.title}
          workOrder
          formId={props.formId || query.get("id") || query.get("formId") || ""}
          formType={props.formType || query.get("type") || "FLOW_FORM"}
          applicationCode={application.code}
          applicationName={application.name}
          isCopy={props.isCopy ?? query.get("isCopy") === "true"}
          groupId={groupId}
          getClient={props.getClient}
          getOuaaClient={props.getOuaaClient}
          onNavigate={props.onNavigate}
          onClose={props.onClose}
          onPublished={() => published(props.returnUrl ?? query.get("returnUrl") ?? undefined)}
        />
      );
    };
  },
});
