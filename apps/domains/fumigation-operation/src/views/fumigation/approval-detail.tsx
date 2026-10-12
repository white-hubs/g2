import { Table as AntTable } from "@g2-platform/pc-ui";
import { Alert, Button, Modal, Space, Tag, Textarea, TimeLine, TimeLineItem, message, type ColumnType } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { loadFumigationWorkToCache } from "./api";
import { buildApprovalTimeline, normalizePersonName, type ApprovalTimelineItem } from "./approval-timeline-utils";
import { EmptyBlock, AttachmentReadonlyPanel, FixedActionFooter, InfoItem, SectionTitle, StatusTag } from "./components";
import { FumigationPageShell } from "./fumigation-page-shell";
import { readQueryValue } from "./navigation-utils";
import {
  APPROVAL_NODE_META,
  canApproveFumigationWork,
  fumigationState,
  formatDateTimeValue,
  getDueAt,
  getPesticideDisplayName,
  upsertFumigationWork,
  type FumigationWork,
} from "./state";
import { buildWorkerTableRows, sameSnowflakeId, type WorkerTableRow } from "./worker-utils";
import { submitFumigationApproval } from "@/api/fumigation-client";

import "./fumigation.less";

export const FumigationApprovalDetail = defineComponent({
  name: "FumigationApprovalDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const selectedWorkId = ref(readQueryValue(route.query.workId));
    const opinion = ref("");
    const approvalModalOpen = ref(false);
    const pendingAction = ref<"approved" | "rejected" | null>(null);

    const currentWork = computed<FumigationWork | undefined>(() =>
      fumigationState.works.find((work) => sameSnowflakeId(work.id, selectedWorkId.value)),
    );
    const pageTitle = computed(() => currentWork.value?.code ?? "作业详情");
    const workerRows = computed<WorkerTableRow[]>(() => buildWorkerTableRows(currentWork.value));
    const approvalTimeline = computed(() => (currentWork.value == null ? [] : buildApprovalTimeline(currentWork.value)));
    const approvalEnabled = computed(() => canApproveFumigationWork(currentWork.value));

    const loadWorkDetail = (workId: string): void => {
      if (workId === "") {
        return;
      }
      void loadFumigationWorkToCache(workId).catch((error: unknown) => {
        message.error((error as Error).message || "获取作业详情失败");
      });
    };

    const openApprovalModal = (action: "approved" | "rejected"): void => {
      pendingAction.value = action;
      opinion.value = "";
      approvalModalOpen.value = true;
    };

    const handleApproval = async (): Promise<void> => {
      const work = currentWork.value;
      const action = pendingAction.value;
      if (work == null || action == null || !canApproveFumigationWork(work)) {
        message.warning("当前作业不在审批节点");
        return;
      }
      const node = work.currentApprovalNode;
      const nodeLabel = node == null ? "审批" : APPROVAL_NODE_META[node].label;
      try {
        const updated = (await submitFumigationApproval(work.id, {
          action,
          opinion: opinion.value,
        })) as FumigationWork;
        upsertFumigationWork(updated);
        approvalModalOpen.value = false;
        pendingAction.value = null;
        opinion.value = "";
        if (action === "approved") {
          message.success(`${nodeLabel}已通过`);
          return;
        }
        message.warning(updated.status === "REJECTED" ? "首个审批节点驳回，流程已结束" : "已驳回并回退到上一审批节点");
      } catch (error) {
        message.error((error as Error).message || "审批提交失败");
      }
    };

    watch(
      () => currentWork.value?.code,
      (code) => {
        if (code != null && code !== "") {
          route.meta.title = code;
        }
      },
      { immediate: true },
    );

    watch(
      () => route.query.workId,
      (workId) => {
        const nextWorkId = readQueryValue(workId);
        if (nextWorkId === "") {
          return;
        }
        selectedWorkId.value = nextWorkId;
        loadWorkDetail(nextWorkId);
      },
    );

    onMounted(() => {
      loadWorkDetail(selectedWorkId.value);
    });

    const workerColumns: ColumnType<WorkerTableRow>[] = [
      { title: "姓名", dataIndex: "name", width: 100 },
      { title: "证书编号", dataIndex: "certNo", width: 140 },
      { title: "有效期", dataIndex: "certExpireAt", width: 120 },
      {
        title: "核验结果",
        dataIndex: "certStatus",
        width: 110,
        customRender: ({ record }: { record: WorkerTableRow }) => {
          if (record.certStatus === "missing") {
            return <Tag>无</Tag>;
          }
          return record.certStatus === "expired" ? <Tag color="error">已过期</Tag> : <Tag color="success">一致</Tag>;
        },
      },
    ];

    const renderTimelineItem = (item: ApprovalTimelineItem): JSX.Element => (
      <TimeLineItem key={item.key} color={item.color}>
        <div class="fumigation-approval-timeline-item">
          <div class="fumigation-approval-timeline-time">{item.time}</div>
          <div class="fumigation-approval-timeline-title">
            <strong>{item.actor}</strong>
            <span>{item.actionLabel}</span>
          </div>
          <div class="fumigation-approval-timeline-desc">{item.description}</div>
        </div>
      </TimeLineItem>
    );

    const renderDetailContent = (work: FumigationWork | undefined): JSX.Element => {
      if (work == null) {
        return <EmptyBlock text="暂无作业详情" />;
      }
      return (
        <>
          <div class="fumigation-panel">
            <SectionTitle title="仓房信息" />
            <div class="fumigation-form-grid">
              <InfoItem label="仓房" value={work.warehouseName || work.warehouseCode || "--"} />
              <InfoItem label="粮食品种" value={work.grainVarietyName || "--"} />
              <InfoItem label="粮食数量（吨）" value={work.grainQuantity == null ? "--" : `${work.grainQuantity}`} />
              <InfoItem label="申请人" value={normalizePersonName(work.applicantName, "--")} />
            </div>
          </div>

          <div class="fumigation-panel">
            <SectionTitle title="熏蒸方案" />
            <div class="fumigation-form-grid">
              <InfoItem label="药剂种类" value={getPesticideDisplayName(work)} />
              <InfoItem label="药剂用量" value={work.pesticideDosage || "--"} />
              <InfoItem label="施药方式" value={work.applicationMethodName || work.applicationMethod || "--"} />
              <InfoItem label="密闭时间（天）" value={work.sealedDays == null ? "--" : `${work.sealedDays}`} />
              <InfoItem label="预计散气时间" value={formatDateTimeValue(work.expectedVentilationAt, "--", "YYYY-MM-DD HH:mm:ss")} />
              <InfoItem label="预计作业时长（小时）" value={`${work.expectedDurationHours}`} />
              <InfoItem label="预计到期" value={getDueAt(work)} />
              <InfoItem label="关联设备" value={work.deviceName ?? work.deviceCode ?? work.deviceId ?? "--"} />
              <InfoItem label="审批状态" value={<StatusTag status={work.status} />} />
              <div class="fumigation-form-field is-full">
                <InfoItem label="安全措施" value={work.safetyMeasures || work.safetyDisclosure || "--"} />
              </div>
            </div>
          </div>

          <div class="fumigation-panel">
            <SectionTitle title="附件" />
            <AttachmentReadonlyPanel attachments={work.attachments} />
          </div>

          <div class="fumigation-panel">
            <SectionTitle title={`作业人员（${workerRows.value.length}人）`} />
            {workerRows.value.length === 0 ? (
              <EmptyBlock text="暂无作业人员信息" />
            ) : (
              <AntTable
                rowKey="id"
                columns={workerColumns}
                dataSource={workerRows.value}
                pagination={false}
                size="small"
                bordered
                customRow={(record) => ({
                  class: (record as WorkerTableRow).certStatus === "expired" ? "fumigation-row-locked" : "",
                })}
              />
            )}
          </div>

          <div class="fumigation-panel">
            <Alert
              type="info"
              showIcon
              message="审批通过后，由保管员在实际作业前手动触发三步校验"
              description={
                <div class="fumigation-precheck-alert">
                  <div>① 第一步：校验通风时长是否达标</div>
                  <div>② 第二步：检测磷化氢浓度是否 &lt; 0.3ppm</div>
                  <div>③ 第三步：检测氧气浓度是否 ≥ 19.5%</div>
                  <div class="fumigation-precheck-alert-note">系统会自动读取设备实时数据，任一步校验未通过将锁定流程。</div>
                </div>
              }
            />
          </div>

          <div class="fumigation-panel">
            <SectionTitle title="审批历史" />
            {approvalTimeline.value.length === 0 ? (
              <EmptyBlock text="暂无审批历史" />
            ) : (
              <TimeLine>{approvalTimeline.value.map(renderTimelineItem)}</TimeLine>
            )}
          </div>
        </>
      );
    };

    return (): JSX.Element => {
      const work = currentWork.value;
      const pendingActionValue = pendingAction.value;

      return (
        <>
          <FumigationPageShell
            title={pageTitle.value}
            showFooter={true}
            v-slots={{
              "layout-content": () => renderDetailContent(work),
              "footer-page": () => (
                <FixedActionFooter>
                  <Space>
                    <Button
                      onClick={() => {
                        void router.push({ name: "fumigation-work-list" });
                      }}
                    >
                      返回列表
                    </Button>
                    {approvalEnabled.value ? (
                      <>
                        <Button
                          type="primary"
                          onClick={() => {
                            openApprovalModal("approved");
                          }}
                        >
                          同意
                        </Button>
                        <Button
                          type="primary"
                          danger
                          onClick={() => {
                            openApprovalModal("rejected");
                          }}
                        >
                          驳回
                        </Button>
                      </>
                    ) : null}
                    {work?.status === "PENDING_CHECK" ? (
                      <Button
                        onClick={() => {
                          void router.push({ name: "fumigation-precheck", query: { workId: work.id } });
                        }}
                      >
                        去三步校验
                      </Button>
                    ) : null}
                  </Space>
                </FixedActionFooter>
              ),
            }}
          />
          <Modal
            title={pendingActionValue === "rejected" ? "驳回审批" : "同意审批"}
            open={approvalModalOpen.value}
            okText="确认"
            cancelText="取消"
            onCancel={() => {
              approvalModalOpen.value = false;
              pendingAction.value = null;
              opinion.value = "";
            }}
            onOk={() => {
              void handleApproval();
            }}
          >
            <Textarea
              rows={4}
              value={opinion.value}
              placeholder="请输入审批意见（选填）"
              maxlength={500}
              showCount
              onUpdate:value={(value: string) => {
                opinion.value = value;
              }}
            />
          </Modal>
        </>
      );
    };
  },
});
