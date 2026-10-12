import { HazardLevel as HazardLevelEnum } from "@g2-contract/hazard-governance";
import type { FileVO, HazardAttachmentVO, HazardDetailBasicInfoVO, HazardDetailVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, shallowRef, type VNode } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AiRichTextPanel } from "../shared/ai-rich-text-panel";
import type { HazardLevel } from "../shared/data";
import { levelColor, levelText, normalizeHazardLevel } from "../shared/data";
import { HazardFileUpload as FileUpload } from "../shared/file-upload";
import { goBack, pushByHistory, useLayoutTitle } from "../shared/page";
import { useAuthRequest } from "@/api/request";
import { getHazardDetail, submitHazardRectificationPlan } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Form, FormItem, Space, Spin, Tag, Textarea, message } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const HAZARD_FILE_SCENE_CODE = "HIDDENDANGER::FLOW";

type UploadedFile = FileVO & {
  fileId?: string | number;
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

const normalizePlanAttachmentFiles = (files?: (FileVO | HazardAttachmentVO)[]): UploadedFile[] =>
  (files ?? []).map((file) => {
    if ("fileId" in file || "fileName" in file) {
      return {
        id: file.fileId ?? file.id ?? "",
        fileId: file.fileId,
        name: file.fileName ?? String(file.fileId ?? file.id ?? ""),
      };
    }
    return file as UploadedFile;
  });

const unwrapHazardDetail = (response: HazardDetailVO): HazardDetailVO => {
  const candidate = response as HazardDetailVO & { data?: HazardDetailVO; result?: HazardDetailVO };
  return candidate.data ?? candidate.result ?? response;
};

const getPlanAttachments = (detail: HazardDetailVO): (FileVO | HazardAttachmentVO)[] | undefined => {
  const candidate = detail as HazardDetailVO & { planAttachments?: HazardAttachmentVO[] };
  return detail.processInfo?.currentPlan?.attachments ?? candidate.planAttachments;
};

export const RectificationForm = defineComponent({
  name: "RectificationForm",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const loading = shallowRef(false);
    const submitting = shallowRef(false);
    const detail = shallowRef<HazardDetailVO>();
    const form = reactive({
      content: "",
      measure: "",
      temporary: "",
      beforePhotos: [] as UploadedFile[],
      planAttachments: [] as UploadedFile[],
    });
    const hazardId = computed(() => String(route.query.id ?? ""));
    const basicInfo = computed<HazardDetailBasicInfoVO | undefined>(() => detail.value?.basicInfo);
    const level = computed<HazardLevel>(() => normalizeHazardLevel(basicInfo.value?.level));
    const temporaryRequired = computed(() => level.value === HazardLevelEnum.MAJOR || level.value === HazardLevelEnum.CRITICAL);
    const aiDisposalSuggestion = computed(() => basicInfo.value?.aiDisposalSuggestion ?? "");

    const loadDetail = async (): Promise<void> => {
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      loading.value = true;
      try {
        const currentDetail = unwrapHazardDetail(await useAuthRequest(() => getHazardDetail(hazardId.value)));
        detail.value = currentDetail;
        const plan = currentDetail.processInfo?.currentPlan;
        form.content = plan?.rectificationContent ?? currentDetail.basicInfo?.description ?? "";
        form.measure = plan?.rectificationMeasures ?? "";
        form.temporary = plan?.temporaryControlMeasures ?? "";
        form.beforePhotos = [...(currentDetail.basicInfo?.sceneImages ?? [])] as UploadedFile[];
        form.planAttachments = normalizePlanAttachmentFiles(getPlanAttachments(currentDetail));
      } finally {
        loading.value = false;
      }
    };

    const submitApproval = async (): Promise<void> => {
      const rectificationContent = form.content.trim();
      const rectificationMeasures = form.measure.trim();
      const temporaryControlMeasures = form.temporary.trim();
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      if (!rectificationContent) {
        message.warning("请填写整改内容");
        return;
      }
      if (!rectificationMeasures) {
        message.warning("请填写整改措施");
        return;
      }
      if (temporaryRequired.value && !temporaryControlMeasures) {
        message.warning("重大及以上隐患请填写临时管控措施");
        return;
      }
      const planAttachments = readFileIds(form.planAttachments);
      if (temporaryRequired.value && !planAttachments) {
        message.warning("重大及以上隐患请上传方案附件");
        return;
      }
      submitting.value = true;
      try {
        const sceneImages = readFileIds(form.beforePhotos);
        await useAuthRequest(() => {
          const payload = {
            rectificationContent,
            rectificationMeasures,
            ...(temporaryControlMeasures ? { temporaryControlMeasures } : {}),
            ...(planAttachments ? { planAttachments } : {}),
            ...(sceneImages ? { sceneImages } : {}),
          };
          return submitHazardRectificationPlan(hazardId.value, payload);
        });
        message.success("整改方案已提交审批");
        pushByHistory(router, { name: "rectification-tasks" });
      } finally {
        submitting.value = false;
      }
    };

    onMounted(loadDetail);

    const renderHazardReadonlyPanel = (): VNode => (
      <section class="hazard-plan-panel hazard-plan-readonly">
        <div class="hazard-plan-section-title">隐患信息</div>
        <div class="hazard-plan-info-grid">
          <div class="hazard-plan-info-item">
            <span>编号：</span>
            <strong>{renderValue(basicInfo.value?.code ?? basicInfo.value?.id)}</strong>
          </div>
          <div class="hazard-plan-info-item">
            <span>等级：</span>
            <Tag color={levelColor[level.value]}>{levelText[level.value]}</Tag>
          </div>
          <div class="hazard-plan-info-item">
            <span>截止时间：</span>
            <strong>{formatTime(basicInfo.value?.deadline)}</strong>
          </div>
          <div class="hazard-plan-info-item hazard-plan-info-wide">
            <span>描述：</span>
            <strong>{renderValue(basicInfo.value?.description)}</strong>
          </div>
          <div class="hazard-plan-info-item">
            <span>位置：</span>
            <strong>{renderValue(basicInfo.value?.locationName)}</strong>
          </div>
          <div class="hazard-plan-info-item">
            <span>验收人：</span>
            <strong>{renderValue(basicInfo.value?.acceptanceUserName ?? basicInfo.value?.acceptanceUserId)}</strong>
            <small>确认属实时已指派</small>
          </div>
        </div>
        <div class="hazard-plan-muted">截止日=确认属实+整改时限，审批通过不重置</div>
      </section>
    );

    const renderPlanContent = (): VNode => (
      <Spin spinning={loading.value}>
        <div class="hazard-plan-page">
          {renderHazardReadonlyPanel()}

          <AiRichTextPanel variant="plain" title="AI处置建议" meta="AI生成 · 仅供参考" content={aiDisposalSuggestion.value} />

          <section class="hazard-plan-panel hazard-plan-form-panel">
            <div class="hazard-plan-section-title">整改方案</div>
            <Form layout="vertical" model={form}>
              <FormItem label="整改内容" required>
                <Textarea rows={3} v-model:value={form.content} />
                <div class="hazard-plan-help">系统预填，可编辑修改</div>
              </FormItem>
              <FormItem label="整改措施" required>
                <Textarea rows={5} placeholder="请参考AI处置建议填写具体整改措施和步骤..." v-model:value={form.measure} />
              </FormItem>
              <FormItem
                label={
                  <span>
                    临时管控措施 <em class="hazard-plan-required-note">（重大隐患必填）</em>
                  </span>
                }
                required={temporaryRequired.value}
              >
                <Textarea rows={4} placeholder="整改完成前的临时防护措施..." v-model:value={form.temporary} />
              </FormItem>
            </Form>

            <div class="hazard-plan-upload-block">
              <div class="hazard-plan-field-title">
                整改前照片 <span>（继承自隐患上报，可选补充）</span>
              </div>
              <FileUpload
                v-model:value={form.beforePhotos}
                multiple
                showText
                maxCount={6}
                type="picture-card"
                size={100}
                sceneCode={HAZARD_FILE_SCENE_CODE}
                customText="请上传整改前照片，最多6张，单个附件最大支持100MB"
                typeList={[".png", ".jpg", ".jpeg", ".webp"]}
                accept="image/*"
              />
              <div class="hazard-plan-help">原隐患照片已自动带入，如需补充其他角度可点击添加</div>
            </div>

            <div class="hazard-plan-upload-block">
              <div class="hazard-plan-field-title">
                方案附件 <em class="hazard-plan-required-star">*</em>
                <em class="hazard-plan-required-note">（重大隐患必传）</em>
              </div>
              <FileUpload
                v-model:value={form.planAttachments}
                multiple
                showText
                maxCount={6}
                type="text"
                size={10}
                sceneCode={HAZARD_FILE_SCENE_CODE}
                customText="支持PDF/Word，≤10MB"
                typeList={[".pdf", ".doc", ".docx", ".PDF", ".DOC", ".DOCX"]}
                accept=".pdf,.doc,.docx,.PDF,.DOC,.DOCX"
              />
            </div>
          </section>
        </div>
      </Spin>
    );

    const slots = {
      "layout-content": () => renderPlanContent(),
      "footer-page": () => (
        <Space>
          <Button onClick={() => goBack(router, { name: "rectification-tasks" })}>返回</Button>
          <Button type="primary" loading={submitting.value} onClick={submitApproval}>
            提交审批
          </Button>
        </Space>
      ),
    };

    return () => <PcLayout title={useLayoutTitle("整改方案填写")} v-slots={slots} />;
  },
});
