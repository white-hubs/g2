import type { HazardDetailVO, HazardGovernanceStatusStepVO } from "@g2-contract/hazard-governance";
import { defineComponent } from "vue";
import type { PropType, VNodeChild } from "vue";

import { readProcessLogRecords } from "./detail-utils";
import { AcceptanceResultStep } from "./steps/acceptance-result-step";
import { ApprovalRecordStep } from "./steps/approval-record-step";
import { ConfirmationStep } from "./steps/confirmation-step";
import { RectificationExecutionStep } from "./steps/rectification-execution-step";
import { RectificationPlanStep } from "./steps/rectification-plan-step";
import { ReportStep } from "./steps/report-step";
import { CheckCircleOutlined } from "@/pc-ui-runtime";

const detailSteps = [
  { index: 1, status: "PENDING_CONFIRM", title: "待确认" },
  { index: 2, status: "PENDING_PLAN", title: "待填写" },
  { index: 3, status: "PENDING_APPROVAL", title: "待审批" },
  { index: 4, status: "RECTIFYING", title: "整改中" },
  { index: 5, status: "PENDING_ACCEPTANCE", title: "待验收" },
  { index: 6, status: "ACCEPTANCE_COMPLETED", title: "已闭环" },
];

const getActiveStep = (detail: HazardDetailVO): number => {
  const currentStepIndex = detail.statusSteps?.findIndex((step) => step.current);
  if (currentStepIndex !== undefined && currentStepIndex >= 0) {
    return currentStepIndex + 1;
  }
  const status = (detail.currentStatus || detail.basicInfo?.governanceStatus)?.toUpperCase();
  if (status === "PENDING_CONFIRM") return 1;
  if (status === "PENDING_PLAN" || status === "PLAN_REJECTED") return 2;
  if (status === "PENDING_APPROVAL") return 3;
  if (status === "RECTIFYING" || status === "ACCEPTANCE_REJECTED") return 4;
  if (status === "PENDING_ACCEPTANCE") return 5;
  if (status === "ACCEPTANCE_COMPLETED" || status === "CLOSED") return 6;
  if (detail.processInfo?.progressRecords?.length) return 4;
  if (detail.processInfo?.currentPlan) return 3;
  if (detail.basicInfo?.confirmedTime) return 2;
  return 1;
};

const buildDisplaySteps = (statusSteps?: HazardGovernanceStatusStepVO[]): HazardGovernanceStatusStepVO[] =>
  detailSteps.map((defaultStep) => {
    const remoteStep = statusSteps?.find((step) => step.status === defaultStep.status);
    const displayStep: HazardGovernanceStatusStepVO = {
      status: defaultStep.status,
      name: remoteStep?.name || defaultStep.title,
    };
    if (remoteStep?.current !== undefined) {
      displayStep.current = remoteStep.current;
    }
    if (remoteStep?.reached !== undefined) {
      displayStep.reached = remoteStep.reached;
    }
    return displayStep;
  });

const renderProgressSteps = (activeStep: number, statusSteps?: HazardGovernanceStatusStepVO[]): VNodeChild => (
  <div class="hazard-ledger-status-steps">
    {buildDisplaySteps(statusSteps).map((step, index) => {
      const stepIndex = index + 1;
      const current = Boolean(step.current) || stepIndex === activeStep;
      const done = statusSteps?.length ? Boolean(step.reached) && !current : activeStep === detailSteps.length || stepIndex < activeStep;
      return (
        <div
          class={[
            "hazard-ledger-status-step",
            done ? "hazard-ledger-status-step-done" : "",
            current ? "hazard-ledger-status-step-current" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={step.status || stepIndex}
        >
          <span>{done ? <CheckCircleOutlined /> : stepIndex}</span>
          <strong>{step.name}</strong>
        </div>
      );
    })}
  </div>
);

export const BasicDetail = defineComponent({
  name: "HazardLedgerBasicDetail",
  props: {
    detail: { type: Object as PropType<HazardDetailVO>, required: true },
  },
  setup: (props) => {
    return () => {
      const basicInfo = props.detail.basicInfo;
      if (!basicInfo) {
        return <div class="hazard-ledger-empty">暂无详情数据</div>;
      }
      const activeStep = getActiveStep(props.detail);
      const processInfo = props.detail.processInfo;
      const operationLogs = readProcessLogRecords(props.detail);

      return (
        <div class="hazard-ledger-basic-detail">
          {renderProgressSteps(activeStep, props.detail.statusSteps)}
          <div class="hazard-ledger-step-list">
            {ReportStep({ basicInfo })}
            {ConfirmationStep({ basicInfo })}
            {RectificationPlanStep({ basicInfo, plan: processInfo?.currentPlan, activeStep })}
            {ApprovalRecordStep({ tasks: processInfo?.approvalTasks, activeStep })}
            {RectificationExecutionStep({ basicInfo, records: processInfo?.progressRecords, activeStep })}
            {AcceptanceResultStep({ basicInfo, acceptanceInfo: processInfo?.acceptanceInfo, logs: operationLogs, activeStep })}
          </div>
        </div>
      );
    };
  },
});
