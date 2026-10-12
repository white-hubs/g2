// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { computed, defineComponent, ref, watch } from "vue";

import type { EvacuationRouteState } from "../../composables/use-evacuation-route-state";
import { FileUpload } from "@/components/file-upload";
import { Button, Slider } from "@/pc-ui-runtime";
import type { OSSFile } from "@/types/oss-file";
import { GLOBAL_SCENE_CODE } from "@/types/oss-file";
import { getFloorPlanImagePath, toImageSrc } from "@/utils/file-url";

import "./index.less";

const PLAN_SCALE_STEP = 0.15;
const PLAN_ROTATION_STEP = 15;

export const PlanImagePanel = defineComponent({
  name: "PlanImagePanel",
  props: {
    state: { type: Object as () => EvacuationRouteState, required: true },
    onRefresh: { type: Function as () => () => void, required: true },
    onResetPlan: { type: Function as () => () => void, required: true },
  },
  setup(props) {
    const scaleSlider = ref(100);
    const rotationSlider = ref(0);
    const reuploadFiles = ref<OSSFile[]>([]);
    const reuploadRef = ref<{ triggerUpload: () => void; clearAll: () => void }>();

    const planScaleLabel = computed(() => `${Math.round(scaleSlider.value)}%`);
    const planRotationLabel = computed(() => `${Math.round(rotationSlider.value)}°`);
    const hasPlan = computed(() => Boolean(props.state.floorPlan.value));
    const isEditing = computed(() => Boolean(props.state.selectedPlanId.value));
    const controlsEnabled = computed(() => hasPlan.value && isEditing.value && !planBusy.value);
    const planImageUrl = computed(() => toImageSrc(getFloorPlanImagePath(props.state.floorPlan.value)));
    const planImageName = computed(() => props.state.floorPlan.value?.name ?? "");

    const syncSliderFromState = (): void => {
      const transform = props.state.selectedPlanTransform.value ?? props.state.getPlanTransform(props.state.floorPlan.value?.id ?? "");
      scaleSlider.value = Math.round((transform?.scale ?? 1) * 100);
      rotationSlider.value = Math.round(transform?.rotation ?? 0);
    };

    const planId = (): string | undefined => props.state.floorPlan.value?.id;

    const refresh = (): void => {
      props.onRefresh();
    };

    const enterEdit = (): void => {
      const id = planId();
      if (!id) {
        return;
      }
      props.state.selectPlan(id);
    };

    const saveEdit = (): void => {
      void props.state.persistPlanEdit();
    };

    const adjustScale = (delta: number): void => {
      if (!controlsEnabled.value) {
        return;
      }
      const id = planId();
      if (!id) {
        return;
      }
      props.state.adjustPlanScale(id, delta);
      syncSliderFromState();
      refresh();
    };

    const adjustRotation = (delta: number): void => {
      if (!controlsEnabled.value) {
        return;
      }
      const id = planId();
      if (!id) {
        return;
      }
      props.state.adjustPlanRotation(id, delta);
      syncSliderFromState();
      refresh();
    };

    const onScaleSlider = (value: number | [number, number]): void => {
      if (!controlsEnabled.value) {
        return;
      }
      const id = planId();
      if (!id) {
        return;
      }
      const scale = Math.round(Array.isArray(value) ? value[0] : value);
      scaleSlider.value = scale;
      props.state.setPlanScale(id, scale / 100);
      refresh();
    };

    const onRotationSlider = (value: number | [number, number]): void => {
      if (!controlsEnabled.value) {
        return;
      }
      const id = planId();
      if (!id) {
        return;
      }
      const rotation = Math.round(Array.isArray(value) ? value[0] : value);
      rotationSlider.value = rotation;
      props.state.setPlanRotation(id, rotation);
      refresh();
    };

    const handleResetPlan = (): void => {
      if (!controlsEnabled.value) {
        return;
      }
      props.onResetPlan();
      syncSliderFromState();
    };

    const triggerReupload = (): void => {
      reuploadRef.value?.clearAll();
      reuploadRef.value?.triggerUpload();
    };

    const handleReuploadChange = (files: OSSFile[]): void => {
      if (files.length === 0) {
        return;
      }
      props.state.onFloorPlansChange(files);
      reuploadRef.value?.clearAll();
      reuploadFiles.value = [];
      syncSliderFromState();
      refresh();
    };

    const handleDeletePlan = (): void => {
      void props.state.deletePlanFromServer();
      reuploadRef.value?.clearAll();
      reuploadFiles.value = [];
      refresh();
    };

    const planBusy = computed(() => props.state.planLoading.value || props.state.planSaving.value);

    watch(
      () => [props.state.floorPlan.value?.id, props.state.selectedPlanId.value, props.state.selectedPlanTransform.value],
      () => syncSliderFromState(),
      { deep: true },
    );

    return (): JSX.Element => (
      <div class="plan-image-panel">
        <div class="plan-image-panel__head">
          <div class="plan-image-panel__title-wrap">
            <span class="plan-image-panel__title">平面图</span>
            <span class="plan-image-panel__subtitle">上传一张图片叠加在 GIS 地图上，用于对齐疏散路线</span>
          </div>
          {hasPlan.value ? (
            <div class="plan-image-panel__head-action">
              <Button size="small" onClick={triggerReupload}>
                重新上传
              </Button>
              {isEditing.value ? (
                <Button size="small" type="primary" loading={planBusy.value} onClick={saveEdit}>
                  保存
                </Button>
              ) : (
                <Button size="small" disabled={planBusy.value} onClick={enterEdit}>
                  编辑
                </Button>
              )}
              <div class="plan-image-panel__reupload-input">
                <FileUpload
                  ref={reuploadRef}
                  showText={false}
                  type="picture"
                  maxCount={1}
                  businessKey="emergency-dispatch"
                  sceneCode={GLOBAL_SCENE_CODE.emergencyFile}
                  useTemporaryUpload
                  accept="image/*"
                  size={50}
                  typeList={[".png", ".jpg", ".jpeg", ".webp"]}
                  value={reuploadFiles.value}
                  onUpdate:value={handleReuploadChange}
                />
              </div>
            </div>
          ) : null}
        </div>

        {!hasPlan.value ? (
          <div class="plan-image-panel__media plan-image-panel__media--empty">
            {planBusy.value ? <div class="plan-image-panel__loading">加载中…</div> : null}
            <FileUpload
              dragger
              showText
              type="picture"
              maxCount={1}
              businessKey="emergency-dispatch"
              sceneCode={GLOBAL_SCENE_CODE.emergencyFile}
              useTemporaryUpload
              accept="image/*"
              size={50}
              typeList={[".png", ".jpg", ".jpeg", ".webp"]}
              customText="点击或拖拽图片到此处上传 · JPG / PNG / WEBP · 最大 50MB"
              value={props.state.uploadedImages.value}
              readonly={planBusy.value}
              onUpdate:value={(files) => {
                props.state.onFloorPlansChange(files);
              }}
            />
          </div>
        ) : (
          <>
            <div class="plan-image-panel__media plan-image-panel__media--filled">
              <div class="plan-image-panel__preview">
                <div class="plan-image-panel__preview-thumb-wrap">
                  <img class="plan-image-panel__preview-thumb" src={planImageUrl.value} alt={planImageName.value} />
                </div>
                <div class="plan-image-panel__preview-info">
                  <span class="plan-image-panel__preview-name" title={planImageName.value}>
                    {planImageName.value}
                  </span>
                </div>
                <Button size="small" danger loading={planBusy.value} onClick={handleDeletePlan}>
                  删除
                </Button>
              </div>
            </div>
            <div class={["plan-image-panel__controls-row", !controlsEnabled.value ? "plan-image-panel__controls-row--disabled" : ""]}>
              <div class="plan-image-panel__control-group">
                <span class="plan-image-panel__control-label">缩放</span>
                <button
                  type="button"
                  class="plan-image-panel__step-btn"
                  disabled={!controlsEnabled.value}
                  onClick={() => adjustScale(-PLAN_SCALE_STEP)}
                >
                  －
                </button>
                <Slider
                  class="plan-image-panel__slider"
                  min={20}
                  max={400}
                  disabled={!controlsEnabled.value}
                  value={scaleSlider.value}
                  onChange={onScaleSlider}
                />
                <button
                  type="button"
                  class="plan-image-panel__step-btn"
                  disabled={!controlsEnabled.value}
                  onClick={() => adjustScale(PLAN_SCALE_STEP)}
                >
                  ＋
                </button>
                <span class="plan-image-panel__control-value">{planScaleLabel.value}</span>
              </div>

              <div class="plan-image-panel__control-divider" aria-hidden="true" />

              <div class="plan-image-panel__control-group">
                <span class="plan-image-panel__control-label">旋转</span>
                <button
                  type="button"
                  class="plan-image-panel__step-btn"
                  disabled={!controlsEnabled.value}
                  onClick={() => adjustRotation(-PLAN_ROTATION_STEP)}
                >
                  ↺
                </button>
                <Slider
                  class="plan-image-panel__slider plan-image-panel__slider--rotation"
                  min={0}
                  max={359}
                  disabled={!controlsEnabled.value}
                  value={rotationSlider.value}
                  onChange={onRotationSlider}
                />
                <button
                  type="button"
                  class="plan-image-panel__step-btn"
                  disabled={!controlsEnabled.value}
                  onClick={() => adjustRotation(PLAN_ROTATION_STEP)}
                >
                  ↻
                </button>
                <span class="plan-image-panel__control-value">{planRotationLabel.value}</span>
              </div>

              <div class="plan-image-panel__control-divider" aria-hidden="true" />

              <Button size="small" disabled={!controlsEnabled.value} onClick={handleResetPlan}>
                重置
              </Button>
            </div>
          </>
        )}
      </div>
    );
  },
});
