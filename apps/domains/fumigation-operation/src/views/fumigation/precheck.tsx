import { Table as AntTable } from "@g2-platform/pc-ui";
import { Button, Space, Spin, Tag, TimeLine, TimeLineItem, message, type ColumnType } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { loadFumigationPrechecksToCache, loadFumigationWorksToCache, loadFumigationWorkToCache } from "./api";
import { buildApprovalTimeline, normalizePersonName, type ApprovalTimelineItem } from "./approval-timeline-utils";
import { CheckTag, EmptyBlock, FixedActionFooter, InfoItem, SectionTitle, StatusTag } from "./components";
import { FumigationPageShell } from "./fumigation-page-shell";
import { readQueryValue } from "./navigation-utils";
import {
  PRECHECK_STEP_META,
  allPrechecksPassed,
  canRunPrecheck,
  fumigationState,
  formatDateTimeValue,
  getDueAt,
  getPesticideDisplayName,
  type CheckFieldValue,
  type CheckPropertyValue,
  type FumigationWork,
  type PrecheckResult,
  type PrecheckStepId,
} from "./state";
import { buildWorkerTableRows, sameSnowflakeId, type WorkerTableRow } from "./worker-utils";
import { runFumigationPrechecks } from "@/api/fumigation-client";

import "./fumigation.less";

const stepOrder: PrecheckStepId[] = ["VENTILATION_DURATION", "PH3_CONCENTRATION", "OXYGEN_CONCENTRATION"];

export const FumigationPrecheck = defineComponent({
  name: "FumigationPrecheck",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const selectedWorkId = ref(readQueryValue(route.query.workId));
    const precheckLoading = shallowRef(false);
    const checking = shallowRef(false);

    const selectableWorks = computed(() =>
      fumigationState.works.filter((work: FumigationWork) => ["PENDING_CHECK", "CHECK_FAILED"].includes(work.status)),
    );
    const currentWork = computed<FumigationWork | undefined>(() => {
      const routed = fumigationState.works.find((work: FumigationWork) => sameSnowflakeId(work.id, selectedWorkId.value));
      return routed ?? selectableWorks.value[0];
    });
    const pageTitle = computed(() => currentWork.value?.code ?? "三步校验");
    const workerRows = computed<WorkerTableRow[]>(() => buildWorkerTableRows(currentWork.value));
    const approvalTimeline = computed(() => (currentWork.value == null ? [] : buildApprovalTimeline(currentWork.value)));

    const loadPrecheckSources = async (work: FumigationWork | undefined): Promise<void> => {
      if (work == null) {
        return;
      }
      precheckLoading.value = true;
      try {
        await loadFumigationPrechecksToCache(work);
      } finally {
        precheckLoading.value = false;
      }
    };

    const loadWorkDetail = (workId: string): void => {
      if (workId === "") {
        return;
      }
      void loadFumigationWorkToCache(workId)
        .then(loadPrecheckSources)
        .catch((error: unknown) => {
          message.error((error as Error).message || "获取作业详情失败");
        });
    };

    const handleRunAll = async (work: FumigationWork): Promise<void> => {
      if (!canRunPrecheck(work)) {
        message.warning("当前作业不能执行校验");
        return;
      }
      checking.value = true;
      try {
        const prechecks = (await runFumigationPrechecks(work.id)) as Record<PrecheckStepId, PrecheckResult>;
        const latest = await loadFumigationWorkToCache(work.id);
        if (latest != null) {
          await loadFumigationPrechecksToCache(latest);
        }
        const results = stepOrder.map((stepId) => prechecks[stepId]);
        const failed = results.find((item) => item.status !== "passed");
        if (failed == null) {
          message.success("三步校验已通过，已进入监护中");
          return;
        }
        message.warning(failed.message || `${failed.title}未通过`);
      } catch (error) {
        message.error((error as Error).message || "三步校验失败");
      } finally {
        checking.value = false;
      }
    };

    const goMonitorBoard = (work: FumigationWork): void => {
      void router.push({ name: "fumigation-monitor", query: { workId: work.id } });
    };

    onMounted(() => {
      void loadFumigationWorksToCache({ pageSize: 100 })
        .then((records) => {
          const targetId = selectedWorkId.value || records[0]?.id || "";
          selectedWorkId.value = targetId;
          if (targetId !== "") {
            if (readQueryValue(route.query.workId) === "") {
              void router.replace({ name: "fumigation-precheck", query: { workId: targetId } });
              return;
            }
            loadWorkDetail(targetId);
          }
        })
        .catch((error: unknown) => {
          message.error((error as Error).message || "获取校验作业列表失败");
        });
    });

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

    watch(
      () => currentWork.value?.code,
      (code) => {
        if (code != null && code !== "") {
          route.meta.title = code;
        }
      },
      { immediate: true },
    );

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

    const getDisplayCheckValues = (result: PrecheckResult): CheckFieldValue[] => {
      if (result.values.length > 0) {
        return result.values;
      }
      if (result.propertyValues.length === 0) {
        return [];
      }
      return [
        {
          label: [result.title, result.rule].filter(Boolean).join(" "),
          value: result.propertyValues.map(formatCheckPropertyValue).join(" / ") || "--",
        },
      ];
    };

    const formatCheckPropertyValue = (property: CheckPropertyValue): string => {
      const value = property.value == null || property.value === "" ? "--" : `${property.value}`;
      const unit = property.unit == null || property.unit === "" ? "" : ` ${property.unit}`;
      return property.name === "" ? `${value}${unit}` : `${property.name} ${value}${unit}`;
    };

    const renderCheckCards = (work: FumigationWork): JSX.Element => (
      <Spin spinning={precheckLoading.value}>
        <div class="fumigation-check-grid">
          {stepOrder.map((stepId) => {
            const result = work.prechecks[stepId];
            const displayValues = getDisplayCheckValues(result);
            return (
              <div class="fumigation-check-card" key={stepId}>
                <div class="fumigation-check-header">
                  <div>
                    <div class="fumigation-check-title">{PRECHECK_STEP_META[stepId].title}</div>
                    <div class="fumigation-card-desc">{PRECHECK_STEP_META[stepId].description}</div>
                  </div>
                  <CheckTag status={result.status} />
                </div>
                <div class="fumigation-check-message">{result.message || "--"}</div>
                <div class="fumigation-check-values">
                  {displayValues.length === 0 ? (
                    <div class="fumigation-card-desc">暂无校验值</div>
                  ) : (
                    displayValues.map((item: CheckFieldValue) => (
                      <div class="fumigation-check-value-row" key={item.label}>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                    ))
                  )}
                </div>
                <InfoItem label="校验时间" value={formatDateTimeValue(result.checkedAt, "--", "YYYY-MM-DD HH:mm:ss")} />
              </div>
            );
          })}
        </div>
      </Spin>
    );

    const renderDetailContent = (work: FumigationWork | undefined): JSX.Element => {
      if (work == null) {
        return <EmptyBlock text="暂无校验作业" />;
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
              <InfoItem label="作业状态" value={<StatusTag status={work.status} />} />
              <div class="fumigation-form-field is-full">
                <InfoItem label="安全措施" value={work.safetyMeasures || work.safetyDisclosure || "--"} />
              </div>
            </div>
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
            <SectionTitle
              title="校验结果"
              extra={
                precheckLoading.value ? (
                  <Tag color="blue">加载中</Tag>
                ) : allPrechecksPassed(work) ? (
                  <Tag color="green">全部通过</Tag>
                ) : undefined
              }
            />
            {!canRunPrecheck(work) && !allPrechecksPassed(work) && work.status !== "ARCHIVED" ? (
              <div class="fumigation-source-note" style={{ marginBottom: "12px" }}>
                当前作业尚未完成技术审批，不能执行三步校验。
              </div>
            ) : null}
            {renderCheckCards(work)}
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

    const renderFooterActions = (work: FumigationWork | undefined): JSX.Element => (
      <FixedActionFooter>
        <Space>
          {work != null && canRunPrecheck(work) ? (
            <Button
              type="primary"
              loading={checking.value}
              onClick={() => {
                void handleRunAll(work);
              }}
            >
              开始校验
            </Button>
          ) : null}
          {work != null && allPrechecksPassed(work) ? (
            <Button
              type="primary"
              onClick={() => {
                goMonitorBoard(work);
              }}
            >
              进入监护看板
            </Button>
          ) : null}
        </Space>
      </FixedActionFooter>
    );

    return (): JSX.Element => {
      const work = currentWork.value;
      return (
        <FumigationPageShell
          title={pageTitle.value}
          showFooter={true}
          v-slots={{
            "layout-content": () => renderDetailContent(work),
            "footer-page": () => renderFooterActions(work),
          }}
        />
      );
    };
  },
});
