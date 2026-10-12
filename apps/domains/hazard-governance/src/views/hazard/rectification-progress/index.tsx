import type { FileVO, HazardRectificationPlanVO, HazardRectificationProgressVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onBeforeUnmount, onMounted, reactive, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { HazardLevel } from "../shared/data";
import { levelColor, levelText, normalizeHazardLevel } from "../shared/data";
import { HazardFileUpload as FileUpload } from "../shared/file-upload";
import { goBack, useLayoutTitle } from "../shared/page";
import { ReadonlyFileUpload } from "../shared/readonly-file-upload";
import { useAuthRequest } from "@/api/request";
import { createHazardRectificationProgress, getLatestHazardRectificationProgress, submitHazardAcceptance } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Slider, Spin, Tag, Textarea, message } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const HAZARD_FILE_SCENE_CODE = "HIDDENDANGER::FLOW";

type UploadedFile = FileVO & {
  fileId?: string | number;
};

type ProgressRecord = HazardRectificationProgressVO & {
  content?: string;
  progressImages?: FileVO[];
  remark?: string;
  reportContent?: string;
};

const renderValue = (value?: string | number | boolean | null): string => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
};

const readFileIds = (files: UploadedFile[]): string | undefined => {
  const ids = files.map((file) => String(file.id ?? file.fileId ?? "")).filter(Boolean);
  return ids.length > 0 ? ids.join(",") : undefined;
};

const renderPlanValue = (plan: HazardRectificationPlanVO | undefined, key: keyof HazardRectificationPlanVO): string =>
  renderValue(plan?.[key] as string | number | boolean | null | undefined);

const normalizePercent = (value?: string | number | null): number | undefined => {
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : undefined;
};

const readProgressContent = (record: ProgressRecord): string =>
  record.progressContent || record.reportContent || record.content || record.remark || "";

const readProgressImages = (record: ProgressRecord): FileVO[] =>
  record.afterImages?.length ? record.afterImages : (record.progressImages ?? []);

const formatHistoryDate = (value?: string): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatTime(value, "-");
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
};

export const RectificationProgress = defineComponent({
  name: "RectificationProgress",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const loading = shallowRef(false);
    const submitting = shallowRef(false);
    const reportCooldown = shallowRef(false);
    const acceptanceSubmitting = shallowRef(false);
    const detail = shallowRef<HazardRectificationProgressVO>();
    let reportCooldownTimer: number | undefined;
    const form = reactive({
      percent: 0,
      content: "",
      photos: [] as UploadedFile[],
    });
    const hazardId = computed(() => String(route.query.id ?? ""));
    const basicInfo = computed(() => detail.value?.basicInfo ?? detail.value);
    const level = computed<HazardLevel>(() => normalizeHazardLevel(basicInfo.value?.level));
    const approvedPlan = computed(() => detail.value?.approvedPlan);
    const progressRecords = computed<ProgressRecord[]>(() => {
      const records = detail.value?.progressRecords ?? [];
      if (records.length > 0) {
        return records.toSorted((a, b) => String(b.recordTime ?? "").localeCompare(String(a.recordTime ?? "")));
      }
      return detail.value?.progressPercent !== undefined ? [detail.value as ProgressRecord] : [];
    });
    const latestProgressRecord = computed(() => progressRecords.value[0]);
    const latestServerProgressPercent = computed(() => {
      if (progressRecords.value.length > 0) {
        return normalizePercent(latestProgressRecord.value?.progressPercent) ?? 0;
      }
      return (
        normalizePercent(detail.value?.basicInfo?.latestProgressPercent) ??
        normalizePercent(
          (detail.value as (HazardRectificationProgressVO & { latestProgressPercent?: number }) | undefined)?.latestProgressPercent,
        ) ??
        normalizePercent(detail.value?.progressPercent) ??
        0
      );
    });
    const submittedProgressPercent = computed(() => Math.min(100, Math.max(0, latestServerProgressPercent.value)));
    const progressLocked = computed(() => submittedProgressPercent.value >= 100);
    const canSubmitAcceptance = computed(() => latestServerProgressPercent.value >= 100);

    watch(
      () => form.percent,
      (percent) => {
        if (percent < submittedProgressPercent.value) {
          form.percent = submittedProgressPercent.value;
        }
      },
    );

    const clearReportForm = (): void => {
      form.content = "";
      form.photos = [];
    };

    const startReportCooldown = (): void => {
      if (reportCooldownTimer) {
        window.clearTimeout(reportCooldownTimer);
      }
      reportCooldown.value = true;
      reportCooldownTimer = window.setTimeout(() => {
        reportCooldown.value = false;
        reportCooldownTimer = undefined;
      }, 2000);
    };

    const loadDetail = async (options: { clearReportForm?: boolean } = {}): Promise<void> => {
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      loading.value = true;
      try {
        detail.value = await useAuthRequest(() => getLatestHazardRectificationProgress(hazardId.value));
        form.percent = latestServerProgressPercent.value;
        if (options.clearReportForm) {
          clearReportForm();
        } else {
          form.content = "";
          form.photos = [...(latestProgressRecord.value?.afterImages ?? detail.value.afterImages ?? [])] as UploadedFile[];
        }
      } finally {
        loading.value = false;
      }
    };

    const saveProgress = async (): Promise<void> => {
      if (submitting.value || reportCooldown.value) {
        return;
      }
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      const progressContent = form.content.trim();
      if (!Number.isFinite(form.percent) || form.percent < 0 || form.percent > 100) {
        message.warning("请选择执行进度");
        return;
      }
      if (form.percent < submittedProgressPercent.value) {
        message.warning(`整改进度不能低于已汇报进度${submittedProgressPercent.value}%`);
        form.percent = submittedProgressPercent.value;
        return;
      }
      if (progressLocked.value) {
        message.warning("整改进度已达到100%，无需继续汇报");
        return;
      }
      if (!progressContent) {
        message.warning("请填写汇报说明");
        return;
      }
      const progressImages = readFileIds(form.photos);
      if (!progressImages) {
        message.warning("请上传整改后照片");
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() =>
          createHazardRectificationProgress(hazardId.value, {
            progressPercent: form.percent,
            progressContent,
            progressImages,
          }),
        );
        message.success("整改进度已汇报");
        clearReportForm();
        startReportCooldown();
        await loadDetail({ clearReportForm: true });
      } finally {
        submitting.value = false;
      }
    };

    const submitAcceptance = async (): Promise<void> => {
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      if (!canSubmitAcceptance.value) {
        message.warning("最新进度达到100%后才可提交验收");
        return;
      }
      acceptanceSubmitting.value = true;
      try {
        await useAuthRequest(() => submitHazardAcceptance(hazardId.value));
        message.success("已提交验收");
        window.history.back();
      } finally {
        acceptanceSubmitting.value = false;
      }
    };

    onMounted(() => {
      void loadDetail();
    });
    onBeforeUnmount(() => {
      if (reportCooldownTimer) {
        window.clearTimeout(reportCooldownTimer);
      }
    });

    const renderHistoryRecord = (record: ProgressRecord): JSX.Element => {
      const images = readProgressImages(record);
      return (
        <div class="hazard-progress-history-item" key={String(record.id ?? record.recordTime ?? record.progressPercent)}>
          <div class="hazard-progress-history-head">
            <strong>
              {formatHistoryDate(record.recordTime)} · {renderValue(record.recordUserName ?? record.recordUserId)}
            </strong>
            <Tag color="blue">进度 {renderValue(record.progressPercent)}%</Tag>
          </div>
          <p>{renderValue(readProgressContent(record))}</p>
          {images.length > 0 ? <ReadonlyFileUpload files={images} emptyText="暂无照片" /> : null}
        </div>
      );
    };

    const slots = {
      "layout-content": () => (
        <div class="viewport">
          <Spin class="hazard-progress-spin" spinning={loading.value}>
            <div class="hazard-progress-layout">
              <section class="hazard-progress-left">
                <section class="hazard-progress-left-scroll">
                  <section class="hazard-progress-panel hazard-progress-readonly">
                    <div class="hazard-progress-section-title">隐患信息</div>
                    <div class="hazard-progress-info-grid">
                      <div class="hazard-progress-info-item">
                        <span>编号：</span>
                        <strong>{renderValue(basicInfo.value?.code ?? basicInfo.value?.id ?? detail.value?.hazardId)}</strong>
                      </div>
                      <div class="hazard-progress-info-item">
                        <span>等级：</span>
                        <Tag color={levelColor[level.value]}>{levelText[level.value]}</Tag>
                      </div>
                      <div class="hazard-progress-info-item">
                        <span>截止时间：</span>
                        <strong>{formatTime(basicInfo.value?.deadline)}</strong>
                        {basicInfo.value?.overdue ? <em> 已超{renderValue(basicInfo.value.overdueHours)}小时</em> : null}
                      </div>
                      <div class="hazard-progress-info-item hazard-progress-info-wide">
                        <span>总时限：</span>
                        <strong>
                          {renderValue(basicInfo.value?.rectificationDeadlineHours)}小时 | 确认属实：
                          {formatTime(basicInfo.value?.confirmedTime)} | 最新进度：
                        </strong>
                        <em>{renderValue(latestServerProgressPercent.value)}%</em>
                      </div>
                      <div class="hazard-progress-info-item">
                        <span>验收人：</span>
                        <strong>{renderValue(basicInfo.value?.acceptanceUserName ?? basicInfo.value?.acceptanceUserId)}</strong>
                        <small>确认属实时已指派</small>
                      </div>
                    </div>
                  </section>

                  <section class="hazard-progress-panel hazard-progress-approved">
                    <div class="hazard-progress-section-title">已审批方案</div>
                    <div class="hazard-progress-approved-list">
                      <p>
                        <span>整改内容：</span>
                        {renderPlanValue(approvedPlan.value, "rectificationContent")}
                      </p>
                      <p>
                        <span>整改措施：</span>
                        {renderPlanValue(approvedPlan.value, "rectificationMeasures")}
                      </p>
                      <p>
                        <span>临时管控措施：</span>
                        {renderPlanValue(approvedPlan.value, "temporaryControlMeasures")}
                      </p>
                    </div>
                  </section>

                  <section class="hazard-progress-panel hazard-progress-execution">
                    <div class="hazard-progress-section-title">
                      执行进度 <em>*</em>
                    </div>
                    <div class="hazard-progress-slider-row">
                      <Slider
                        class="hazard-progress-slider"
                        min={0}
                        max={100}
                        disabled={progressLocked.value}
                        v-model:value={form.percent}
                      />
                      <strong>{form.percent}%</strong>
                    </div>
                    <div class="hazard-progress-report-block">
                      <div class="hazard-progress-field-title">
                        汇报说明 <em>*</em>
                      </div>
                      <Textarea rows={4} maxlength={2000} placeholder="请输入本次整改进度说明" v-model:value={form.content} />
                    </div>
                    <div class="hazard-progress-upload-block">
                      <div class="hazard-progress-field-title">
                        整改后照片 <em>*</em>
                      </div>
                      <FileUpload
                        v-model:value={form.photos}
                        multiple
                        showText
                        maxCount={6}
                        type="picture-card"
                        size={100}
                        sceneCode={HAZARD_FILE_SCENE_CODE}
                        customText="请上传整改后照片，最多6张，单个附件最大支持100MB"
                        typeList={[".png", ".jpg", ".jpeg", ".webp"]}
                        accept="image/*"
                      />
                    </div>
                  </section>
                </section>

                {progressLocked.value ? null : (
                  <div class="hazard-progress-report-action">
                    <Button
                      class="hazard-progress-report-button"
                      type="primary"
                      loading={submitting.value}
                      disabled={reportCooldown.value}
                      onClick={saveProgress}
                    >
                      汇报进度
                    </Button>
                    <span>每次提交生成一条独立记录，不覆盖</span>
                  </div>
                )}
              </section>

              <section class="hazard-progress-history">
                <section class="hazard-progress-history-scroll">
                  <div class="hazard-progress-section-title">历史汇报记录（共{progressRecords.value.length}条）</div>
                  <div class="hazard-progress-history-list">
                    {progressRecords.value.length > 0 ? (
                      progressRecords.value.map(renderHistoryRecord)
                    ) : (
                      <div class="hazard-progress-empty">暂无汇报记录</div>
                    )}
                  </div>
                </section>
                {canSubmitAcceptance.value ? (
                  <div class="hazard-progress-history-action">
                    <Button
                      class="hazard-progress-acceptance-button"
                      type="primary"
                      loading={acceptanceSubmitting.value}
                      onClick={submitAcceptance}
                    >
                      提交验收
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          </Spin>
        </div>
      ),
      "footer-page": () => <Button onClick={() => goBack(router, { name: "rectification-tasks" })}>返回</Button>,
    };

    return () => <PcLayout title={useLayoutTitle("整改进度")} v-slots={slots} />;
  },
});
