import type {
  HazardApprovalCommand,
  HazardApprovalDetailVO,
  HazardApprovalRecordVO,
  HazardApprovalTaskSummaryVO,
} from "@g2-contract/hazard-governance";
import { HazardActionCode } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { HazardLevel } from "../shared/data";
import { levelColor, levelText } from "../shared/data";
import { goBack, useLayoutTitle } from "../shared/page";
import { ReadonlyFileUpload, type ReadonlyDisplayFile } from "../shared/readonly-file-upload";
import { useAuthRequest } from "@/api/request";
import { approveHazardApprovalTask, getHazardApprovalTaskDetail, rejectHazardApprovalTask } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Card, CheckCircleOutlined, ClockCircleOutlined, Space, Spin, Tag, Textarea, message } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

type ApprovalNodeStatus = "done" | "current" | "waiting";
type SubmittingApprovalAction = "approve" | "reject" | "";
type ApprovalPlanWithImages = NonNullable<HazardApprovalDetailVO["plan"]> & {
  sceneImages?: ReadonlyDisplayFile[];
};

const doneStatuses = new Set(["APPROVED", "PASSED", "COMPLETED", "DONE", "FINISHED"]);
const currentStatuses = new Set(["PENDING", "ACTIVE", "PROCESSING", "WAITING", "TODO"]);

const renderValue = (value?: string | number | boolean | null): string => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
};

const renderLevelTag = (level?: string): JSX.Element => {
  const knownLevel = (level && level in levelText ? level : undefined) as HazardLevel | undefined;
  return <Tag color={knownLevel ? levelColor[knownLevel] : undefined}>{knownLevel ? levelText[knownLevel] : renderValue(level)}</Tag>;
};

const splitLines = (value?: string): string[] =>
  value
    ? value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const getTaskStatus = (node: HazardApprovalTaskSummaryVO, detail: HazardApprovalDetailVO): ApprovalNodeStatus => {
  const status = node.status?.toUpperCase();
  if (status && doneStatuses.has(status)) {
    return "done";
  }
  if (String(node.id) === String(detail.approvalTaskId)) {
    return "current";
  }
  if (status && currentStatuses.has(status)) {
    return "current";
  }
  return "waiting";
};

const getNodeDescription = (status: ApprovalNodeStatus): string => {
  if (status === "done") {
    return "已通过";
  }
  if (status === "current") {
    return "当前节点 · 待审批";
  }
  return "等待前序审批完成";
};

const getApprovalActionText = (action?: string): { text: string; tone: "submit" | "approve" | "reject" | "default" } => {
  const normalizedAction = action?.toUpperCase();
  if (normalizedAction === "SUBMIT") {
    return { text: "提交审批", tone: "submit" };
  }
  if (normalizedAction === "APPROVE") {
    return { text: "审批通过", tone: "approve" };
  }
  if (normalizedAction === "REJECT") {
    return { text: "审批退回", tone: "reject" };
  }
  return { text: renderValue(action), tone: "default" };
};

export const ApprovalDetail = defineComponent({
  name: "ApprovalDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const detail = shallowRef<HazardApprovalDetailVO>();
    const loading = shallowRef(false);
    const submittingAction = shallowRef<SubmittingApprovalAction>("");
    const approvalForm = reactive<HazardApprovalCommand>({ opinion: "", reasonCode: "" });
    const taskId = computed(() => String(route.query.taskId ?? route.query.id ?? ""));
    const isSubmittingApproval = computed(() => !!submittingAction.value);
    const canApprove = computed(() => {
      if (!detail.value) {
        return false;
      }
      return (
        detail.value.canApprove !== false &&
        (detail.value.actions?.length ? detail.value.actions.includes(HazardActionCode.APPROVAL) : true)
      );
    });

    const loadDetail = async (): Promise<void> => {
      if (!taskId.value) {
        message.warning("缺少审批任务ID");
        return;
      }
      loading.value = true;
      try {
        detail.value = await useAuthRequest(() => getHazardApprovalTaskDetail(taskId.value));
      } finally {
        loading.value = false;
      }
    };

    const submitApproval = async (approved: boolean): Promise<void> => {
      if (submittingAction.value) {
        return;
      }
      if (!taskId.value) {
        message.warning("缺少审批任务ID");
        return;
      }
      submittingAction.value = approved ? "approve" : "reject";
      try {
        await useAuthRequest(() =>
          approved
            ? approveHazardApprovalTask(taskId.value, { ...approvalForm })
            : rejectHazardApprovalTask(taskId.value, { ...approvalForm }),
        );
        message.success(approved ? "审批已通过" : "审批已退回");
        approvalForm.opinion = "";
        approvalForm.reasonCode = "";
        window.history.back();
      } finally {
        submittingAction.value = "";
      }
    };

    onMounted(loadDetail);

    const renderInfoItem = (label: string, value: string | JSX.Element, extra?: JSX.Element): JSX.Element => (
      <div class="approval-info-item" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        {extra}
      </div>
    );

    const renderApprovalNode = (node: HazardApprovalTaskSummaryVO): JSX.Element => {
      const status = detail.value ? getTaskStatus(node, detail.value) : "waiting";
      return (
        <div
          class={["approval-chain-node", `approval-chain-node-${status}`].join(" ")}
          key={String(node.id ?? node.sequenceNo ?? node.nodeName)}
        >
          <div class="approval-chain-marker">
            {status === "done" ? <CheckCircleOutlined /> : status === "current" ? <span /> : <ClockCircleOutlined />}
          </div>
          <div class="approval-chain-content">
            <strong>{renderValue(node.nodeName)}</strong>
            <span>{getNodeDescription(status)}</span>
            {node.approverName || node.approverId ? <small>{renderValue(node.approverName ?? node.approverId)}</small> : null}
            {node.completedTime || node.activatedTime ? <small>{formatTime(node.completedTime ?? node.activatedTime)}</small> : null}
          </div>
        </div>
      );
    };

    const renderHistory = (record: HazardApprovalRecordVO): JSX.Element => {
      const action = getApprovalActionText(record.action);
      return (
        <div class={`approval-history-item approval-history-item-${action.tone}`} key={String(record.id ?? record.approvalTaskId)}>
          <span class="approval-history-marker" />
          <div class="approval-history-content">
            <div class="approval-history-head">
              <strong>{action.text}</strong>
              <span>{formatTime(record.operatedTime)}</span>
            </div>
            <div class="approval-history-operator">{renderValue(record.operatorName ?? record.operatorId)}</div>
            <p>{renderValue(record.opinion)}</p>
          </div>
        </div>
      );
    };

    const renderContent = (currentDetail: HazardApprovalDetailVO): JSX.Element => {
      const plan = currentDetail.plan as ApprovalPlanWithImages | undefined;
      const measures = splitLines(plan?.rectificationMeasures);
      const beforePhotos = currentDetail.sceneImages?.length ? currentDetail.sceneImages : (plan?.sceneImages ?? []);
      const planAttachments = currentDetail.planAttachments?.length ? currentDetail.planAttachments : (plan?.attachments ?? []);

      return (
        <div class="approval-detail-page">
          <section class="approval-detail-main">
            <Card title="隐患信息" class="approval-card">
              <div class="approval-info-grid">
                {renderInfoItem("隐患编号", renderValue(currentDetail.code))}
                {renderInfoItem("等级", renderLevelTag(currentDetail.level))}
                {renderInfoItem("提交人", renderValue(currentDetail.submittedByName ?? currentDetail.submittedBy))}
                {renderInfoItem("位置", renderValue(currentDetail.locationName))}
                {renderInfoItem("截止时间", formatTime(currentDetail.deadline))}
                {renderInfoItem("提交时间", formatTime(currentDetail.submittedTime))}
              </div>
              <div class="approval-hazard-desc">{renderValue(currentDetail.description)}</div>
            </Card>

            <Card title="整改方案" class="approval-card">
              <div class="approval-plan">
                <p>
                  <strong>整改内容：</strong>
                  {renderValue(plan?.rectificationContent)}
                </p>
                <p>
                  <strong>整改措施：</strong>
                </p>
                {measures.length > 0 ? (
                  <ol>
                    {measures.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p>{renderValue(plan?.rectificationMeasures)}</p>
                )}
                <p>
                  <strong>临时管控：</strong>
                  {renderValue(plan?.temporaryControlMeasures)}
                </p>
                <p>
                  <strong>预计完成时间：</strong>
                  {formatTime(plan?.estimatedFinishTime)}
                </p>
              </div>
            </Card>

            <Card title="整改前照片" class="approval-card">
              <ReadonlyFileUpload files={beforePhotos} emptyText="暂无照片" />
            </Card>

            <Card title="方案附件" class="approval-card">
              <ReadonlyFileUpload files={planAttachments} type="text" emptyText="暂无附件" />
            </Card>
          </section>

          <section class="approval-detail-side">
            <Card title="审批链" class="approval-card">
              <div class="approval-chain">
                {currentDetail.approvalChain?.length ? (
                  currentDetail.approvalChain.map(renderApprovalNode)
                ) : (
                  <div class="approval-empty">暂无审批链</div>
                )}
              </div>
            </Card>

            <Card title="审批操作" class="approval-card">
              <div class="approval-action-form">
                <label>审批意见</label>
                <Textarea
                  rows={4}
                  maxlength={500}
                  placeholder={canApprove.value ? "输入审批意见..." : "当前任务不可审批"}
                  disabled={!canApprove.value || isSubmittingApproval.value}
                  v-model:value={approvalForm.opinion}
                />
                <Space class="approval-action-buttons" size={10}>
                  <Button
                    class="approval-pass-button"
                    type="primary"
                    loading={submittingAction.value === "approve"}
                    disabled={!canApprove.value || submittingAction.value === "reject"}
                    onClick={() => submitApproval(true)}
                  >
                    审批通过
                  </Button>
                  <Button
                    class="approval-reject-button"
                    danger
                    type="primary"
                    loading={submittingAction.value === "reject"}
                    disabled={!canApprove.value || submittingAction.value === "approve"}
                    onClick={() => submitApproval(false)}
                  >
                    审批不通过
                  </Button>
                </Space>
              </div>
            </Card>

            <Card title="审批历史" class="approval-card">
              <div class="approval-history-list">
                {currentDetail.approvalHistory?.length ? (
                  currentDetail.approvalHistory.map(renderHistory)
                ) : (
                  <div class="approval-empty">暂无审批历史</div>
                )}
              </div>
            </Card>
          </section>
        </div>
      );
    };

    const slots = {
      "layout-content": () => (
        <div class="approval-detail-viewport">
          <Spin class="approval-detail-spin" spinning={loading.value}>
            {detail.value ? renderContent(detail.value) : <div class="approval-empty approval-detail-empty">暂无审批详情</div>}
          </Spin>
        </div>
      ),
      "footer-page": () => <Button onClick={() => goBack(router, { name: "approval-list" })}>返回</Button>,
    };

    return () => <PcLayout title={useLayoutTitle("审批详情")} v-slots={slots} />;
  },
});
