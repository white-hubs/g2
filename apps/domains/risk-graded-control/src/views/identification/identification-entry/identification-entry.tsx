import type { RiskAiIdentificationObjectDraftVO } from "@g2-contract/risk-graded-control";
import { defineComponent, onMounted, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { generateRiskObjectByAiPhoto, getUnit, pageRiskObjects, reviseRiskObjectByAiPhoto, submitUnitIdentification } from "@/api/server";
import { uploadRiskControlFile } from "@/api/upload-risk-file";
import { AssetPickerModal, type AssetPickerOption } from "@/components/asset-picker-modal/asset-picker-modal";
import { ACCIDENT_TYPES, FILE_SCENE_CODE, FORM_INPUT_PROPS } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Col,
  Input,
  PageLayout as PcLayout,
  PopConfirm,
  Result,
  Row,
  Select,
  SelectOption,
  Spin,
  Textarea,
  message,
} from "@/pc-ui-runtime";
import type { UnitVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { enrichRiskObjectsWithAssetNames } from "@/utils/load-property-assets";
import { useLayoutTitle } from "@/utils/page-title";
import { readCurrentUserId } from "@/utils/read-current-user";
import { mapIdentificationObjectToApi, mapRiskObjectFromApi, mapUnitFromApi } from "@/utils/risk-control-mapper";

import entryStyles from "./identification-entry.module.less";
import formStyles from "@/styles/form-page.module.less";

const MAX_OBJECTS = 5;

interface RiskObjectForm {
  id: string;
  name: string;
  assetId: string;
  assetName: string;
  hazardDesc: string;
  accidentTypes: string[];
  cause: string;
  triggerFactors: string;
  emergencyMeasures: string;
  responsibleUser: string;
  responsibleUserName: string;
}

let objectSeq = 1;
type AiPhotoMode = "create" | "revise";
type AiRiskObjectPhotoResult = {
  recognized?: boolean;
  noRiskReason?: string;
  object?: RiskAiIdentificationObjectDraftVO | null;
};

const emptyObject = (unit?: UnitVO | null): RiskObjectForm => ({
  id: `new-${objectSeq++}`,
  name: "",
  assetId: "",
  assetName: "",
  hazardDesc: "",
  accidentTypes: [],
  cause: "",
  triggerFactors: "",
  emergencyMeasures: "",
  responsibleUser: unit?.responsibleUserId ?? "",
  responsibleUserName: unit?.responsibleUser ?? "",
});

export const IdentificationEntryPage = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const layoutTitle = useLayoutTitle("辨识录入");
    const loading = ref(false);
    const submitting = ref(false);
    const unit = ref<UnitVO | null>(null);
    const assetPickerVisible = ref(false);
    const editingAssetIdx = ref(-1);
    const assetInitialSelected = ref<AssetPickerOption | null>(null);
    const deletedObjects = ref<RiskObjectForm[]>([]);
    const aiPhotoInputRef = ref<HTMLInputElement | null>(null);
    const aiPhotoMode = ref<AiPhotoMode>("create");
    const aiPhotoTargetIdx = ref(-1);
    const aiGeneratingKey = ref("");

    const unitId = computed(() => (route.query.unitId as string) ?? "");

    const isReIdentifyMode = computed(() => unit.value?.identifyStatus === "PENDING_REVIEW");
    const isReviewedUnit = computed(() => unit.value?.identifyStatus === "REVIEWED");
    const canAddObject = computed(() => Boolean(unit.value) && !isReIdentifyMode.value && !isReviewedUnit.value);
    const emptyHint = computed(() => {
      if (isReviewedUnit.value) return "该风险单元已审核完成，需到下次辨识周期后再发起辨识。";
      if (isReIdentifyMode.value) return "该风险单元审核中，当前没有可再次辨识的退回对象。";
      return "请添加风险对象后提交辨识。";
    });

    const riskObjects = ref<RiskObjectForm[]>([emptyObject()]);

    const loadData = async (): Promise<void> => {
      if (!unitId.value) return;
      loading.value = true;
      try {
        deletedObjects.value = [];
        const unitVo = await useAuthRequest(() => getUnit(unitId.value));
        const mapped = mapUnitFromApi(unitVo);
        unit.value = mapped;

        let existing = (unitVo.objects ?? []).map(mapRiskObjectFromApi);
        if (!existing.length) {
          try {
            const riskPage = await useAuthRequest(() =>
              pageRiskObjects({
                unitId: unitId.value,
                pageNumber: 1,
                pageSize: 500,
              }),
            );
            existing = riskPage.records.map(mapRiskObjectFromApi);
          } catch {
            existing = [];
          }
        }

        try {
          await enrichRiskObjectsWithAssetNames(existing);
        } catch {
          // 资产名称解析失败不影响辨识录入
        }

        const editableObjects =
          mapped.identifyStatus === "PENDING_REVIEW"
            ? existing.filter((o) => o.status === "DRAFT")
            : mapped.identifyStatus === "REVIEWED"
              ? []
              : existing;

        if (editableObjects.length > 0) {
          riskObjects.value = editableObjects.map((o) => ({
            id: o.id,
            name: o.name,
            assetId: o.assetId ?? "",
            assetName: o.assetName ?? "",
            hazardDesc: o.hazardDesc,
            accidentTypes: [...o.accidentTypes],
            cause: o.cause,
            triggerFactors: o.triggerFactors ?? "",
            emergencyMeasures: o.emergencyMeasures,
            responsibleUser: o.responsibleUserId || mapped.responsibleUserId,
            responsibleUserName: o.responsibleUser || mapped.responsibleUser,
          }));
        } else if (mapped.identifyStatus !== "PENDING_REVIEW" && mapped.identifyStatus !== "REVIEWED") {
          riskObjects.value = [emptyObject(mapped)];
        } else {
          riskObjects.value = [];
        }
      } catch (e) {
        unit.value = null;
        showApiError(e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void loadData();
    });
    watch(unitId, () => {
      void loadData();
    });

    const addObject = (): void => {
      if (!canAddObject.value) {
        message.warning(isReIdentifyMode.value ? "再次辨识只能修改退回对象" : "当前单元暂不能辨识");
        return;
      }
      if (riskObjects.value.length >= MAX_OBJECTS) {
        message.warning(`最多添加 ${MAX_OBJECTS} 个风险对象`);
        return;
      }
      riskObjects.value.push(emptyObject(unit.value));
    };

    const removeObject = (idx: number): void => {
      if (riskObjects.value.length <= 1) {
        message.warning("至少保留一个风险对象");
        return;
      }
      const [removed] = riskObjects.value.splice(idx, 1);
      if (removed && !removed.id.startsWith("new-")) {
        deletedObjects.value.push(removed);
      }
    };

    const validateForm = (): boolean => {
      if (!unit.value) {
        message.error("未找到风险单元");
        return false;
      }
      if (!riskObjects.value.length) {
        message.error(emptyHint.value);
        return false;
      }
      for (const [i, obj] of riskObjects.value.entries()) {
        if (!obj.name.trim()) {
          message.error(`对象 ${i + 1}：请填写对象名称`);
          return false;
        }
        if (!obj.hazardDesc.trim()) {
          message.error(`对象 ${i + 1}：请填写危险源`);
          return false;
        }
        if (!obj.accidentTypes.length) {
          message.error(`对象 ${i + 1}：请选择事故类型`);
          return false;
        }
        if (!obj.cause.trim()) {
          message.error(`对象 ${i + 1}：请填写事故原因`);
          return false;
        }
        if (!obj.emergencyMeasures.trim()) {
          message.error(`对象 ${i + 1}：请填写应急处理措施`);
          return false;
        }
        if (!obj.responsibleUser.trim()) {
          message.error(`对象 ${i + 1}：缺少责任人员`);
          return false;
        }
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (!unitId.value || !validateForm()) return;
      submitting.value = true;
      try {
        const userId = readCurrentUserId();
        await useAuthRequest(() =>
          submitUnitIdentification(unitId.value, {
            objects: [
              ...riskObjects.value.map((obj) =>
                mapIdentificationObjectToApi({
                  objectId: obj.id.startsWith("new-") ? undefined : obj.id,
                  name: obj.name,
                  assetId: obj.assetId || undefined,
                  hazardDesc: obj.hazardDesc,
                  accidentTypes: obj.accidentTypes,
                  accidentCause: obj.cause,
                  triggerFactor: obj.triggerFactors,
                  emergencyMeasure: obj.emergencyMeasures,
                  responsibleUserId: obj.responsibleUser,
                  userId,
                }),
              ),
              ...deletedObjects.value.map((obj) =>
                mapIdentificationObjectToApi({
                  objectId: obj.id,
                  name: obj.name,
                  assetId: obj.assetId || undefined,
                  hazardDesc: obj.hazardDesc,
                  accidentTypes: obj.accidentTypes,
                  accidentCause: obj.cause,
                  triggerFactor: obj.triggerFactors,
                  emergencyMeasure: obj.emergencyMeasures,
                  responsibleUserId: obj.responsibleUser,
                  deleted: true,
                  userId,
                }),
              ),
            ],
          }),
        );
        message.success(isReIdentifyMode.value ? "再次辨识已提交审核" : "辨识信息已提交审核");
        void router.push({ name: "identifications" });
      } catch (e) {
        showApiError(e);
      } finally {
        submitting.value = false;
      }
    };

    const openAssetPicker = (idx: number): void => {
      editingAssetIdx.value = idx;
      const obj = riskObjects.value[idx];
      assetInitialSelected.value = obj?.assetId ? { id: obj.assetId, name: obj.assetName } : null;
      assetPickerVisible.value = true;
    };

    const clearAsset = (idx: number): void => {
      const obj = riskObjects.value[idx];
      if (!obj) return;
      obj.assetId = "";
      obj.assetName = "";
    };

    const onAssetSelected = (selected: AssetPickerOption): void => {
      const idx = editingAssetIdx.value;
      const obj = riskObjects.value[idx];
      if (!obj) return;
      obj.assetId = selected.id;
      obj.assetName = selected.name;
    };

    const parseAiAccidentTypes = (value: RiskAiIdentificationObjectDraftVO["accidentTypes"]): string[] => {
      const values = (Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,，、;；/\s]+/))
        .map((item) => item.trim())
        .filter(Boolean);
      const selected = values.filter(
        (item, index) => (ACCIDENT_TYPES as readonly string[]).includes(item) && values.indexOf(item) === index,
      );
      return selected.length ? selected : values.length ? ["其他"] : [];
    };

    const hasAiRiskContent = (draft?: RiskAiIdentificationObjectDraftVO | null): boolean => {
      if (!draft) return false;
      const accidentTypes = parseAiAccidentTypes(draft.accidentTypes);
      return Boolean(
        String(draft.hazardDesc ?? "").trim() ||
        String(draft.accidentCause ?? draft.cause ?? "").trim() ||
        String(draft.triggerFactor ?? draft.triggerFactors ?? "").trim() ||
        String(draft.emergencyMeasure ?? draft.emergencyMeasures ?? "").trim() ||
        accidentTypes.some((type) => type !== "其他"),
      );
    };

    const aiNoRiskMessage = (result: AiRiskObjectPhotoResult): string =>
      String(result.noRiskReason ?? "").trim() || "未识别到风险，请手动输入";

    const applyAiDraft = (idx: number, draft: RiskAiIdentificationObjectDraftVO, mode: AiPhotoMode): void => {
      const obj = riskObjects.value[idx];
      if (!obj) return;
      if (mode === "create") {
        obj.name = String(draft.name ?? draft.objectName ?? obj.name ?? "");
      }
      obj.hazardDesc = String(draft.hazardDesc ?? obj.hazardDesc ?? "");
      const accidentTypes = parseAiAccidentTypes(draft.accidentTypes);
      if (accidentTypes.length) {
        obj.accidentTypes = accidentTypes;
      }
      obj.cause = String(draft.accidentCause ?? draft.cause ?? obj.cause ?? "");
      obj.triggerFactors = String(draft.triggerFactor ?? draft.triggerFactors ?? obj.triggerFactors ?? "");
      obj.emergencyMeasures = String(draft.emergencyMeasure ?? draft.emergencyMeasures ?? obj.emergencyMeasures ?? "");
    };

    const buildCurrentContext = (obj: RiskObjectForm) =>
      mapIdentificationObjectToApi({
        objectId: obj.id.startsWith("new-") ? undefined : obj.id,
        name: obj.name,
        hazardDesc: obj.hazardDesc,
        accidentTypes: obj.accidentTypes,
        accidentCause: obj.cause,
        triggerFactor: obj.triggerFactors,
        emergencyMeasure: obj.emergencyMeasures,
        responsibleUserId: obj.responsibleUser,
      });

    const openAiPhoto = (idx: number, mode: AiPhotoMode): void => {
      if (!unitId.value) {
        message.warning("请先选择风险单元");
        return;
      }
      const obj = riskObjects.value[idx];
      if (!obj) return;
      if (mode === "revise" && obj.id.startsWith("new-")) {
        message.warning("AI拍照修改需要先选择已有风险对象，新对象请使用AI拍照生成");
        return;
      }
      aiPhotoMode.value = mode;
      aiPhotoTargetIdx.value = idx;
      aiPhotoInputRef.value?.click();
    };

    const handleAiPhotoSelected = async (event: Event): Promise<void> => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      const idx = aiPhotoTargetIdx.value;
      const obj = riskObjects.value[idx];
      if (!obj) return;
      const key = `${idx}-${aiPhotoMode.value}`;
      aiGeneratingKey.value = key;
      try {
        const uploaded = await useAuthRequest(() => uploadRiskControlFile(file, FILE_SCENE_CODE.AI_IDENTIFICATION_PHOTO));
        const context = buildCurrentContext(obj);
        const generatePayload = {
          unitId: unitId.value,
          fileId: uploaded.id,
          context,
        };
        const modifyPayload = {
          fileId: uploaded.id,
          context,
        };
        const result = (
          aiPhotoMode.value === "revise"
            ? await useAuthRequest(() => reviseRiskObjectByAiPhoto(obj.id, modifyPayload))
            : await useAuthRequest(() => generateRiskObjectByAiPhoto(generatePayload))
        ) as AiRiskObjectPhotoResult;
        const draft = result.object;
        if (result.recognized === false || !hasAiRiskContent(draft)) {
          message.warning(aiNoRiskMessage(result));
          return;
        }
        applyAiDraft(idx, draft as RiskAiIdentificationObjectDraftVO, aiPhotoMode.value);
        message.success(aiPhotoMode.value === "revise" ? "AI修改内容已回填" : "AI生成内容已回填");
      } catch (e) {
        showApiError(e);
      } finally {
        aiGeneratingKey.value = "";
      }
    };

    const renderFieldLabel = (label: string, required = false, hint?: string): JSX.Element => (
      <span class={[entryStyles.fieldLabel, required && entryStyles.requiredMark]}>
        {label}
        {hint ? <span class={entryStyles.readonlyHint}>{hint}</span> : null}
      </span>
    );

    const renderObjectCard = (obj: RiskObjectForm, idx: number): JSX.Element => {
      const canReviseByAiPhoto = !obj.id.startsWith("new-");
      return (
        <div key={obj.id} class={entryStyles.objectPanel}>
          <div class={entryStyles.objectTitle}>
            <span>风险对象 {idx + 1}</span>
            <div class={entryStyles.objectActions}>
              <PopConfirm title="确认删除该对象？" onConfirm={() => removeObject(idx)}>
                <Button type="link" danger size="small">
                  删除
                </Button>
              </PopConfirm>
            </div>
          </div>
          <div class={entryStyles.aiPhotoBar}>
            <Button
              type="primary"
              ghost
              class={entryStyles.aiPhotoButton}
              loading={aiGeneratingKey.value === `${idx}-create`}
              onClick={() => openAiPhoto(idx, "create")}
            >
              AI拍照生成
            </Button>
            {canReviseByAiPhoto ? (
              <Button
                class={entryStyles.aiPhotoButton}
                loading={aiGeneratingKey.value === `${idx}-revise`}
                onClick={() => openAiPhoto(idx, "revise")}
              >
                AI拍照修改
              </Button>
            ) : null}
          </div>
          <Row gutter={[16, 12]}>
            <Col span={12}>
              {renderFieldLabel("对象名称", true)}
              <Input {...FORM_INPUT_PROPS} v-model:value={obj.name} maxlength={100} placeholder="如：氨压缩机氨泄漏" />
            </Col>
            <Col span={12}>
              {renderFieldLabel("关联资产")}
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openAssetPicker(idx)}>
                  <Input
                    {...FORM_INPUT_PROPS}
                    value={obj.assetName}
                    readonly
                    placeholder="点击选择资产（可选）"
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>
                <Button onClick={() => openAssetPicker(idx)}>选择</Button>
                {obj.assetId ? <Button onClick={() => clearAsset(idx)}>清除</Button> : null}
              </div>
            </Col>
            <Col span={24}>
              {renderFieldLabel("危险源", true)}
              <Input {...FORM_INPUT_PROPS} v-model:value={obj.hazardDesc} maxlength={500} placeholder="描述危险源属性" />
            </Col>
            <Col span={12}>
              {renderFieldLabel("事故类型", true)}
              <Select v-model:value={obj.accidentTypes} mode="multiple" placeholder="请选择" style={{ width: "100%" }}>
                {ACCIDENT_TYPES.map((t) => (
                  <SelectOption key={t} value={t}>
                    {t}
                  </SelectOption>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              {renderFieldLabel("事故原因", true)}
              <Input {...FORM_INPUT_PROPS} v-model:value={obj.cause} maxlength={200} placeholder="如：管道腐蚀破损" />
            </Col>
            <Col span={12}>
              {renderFieldLabel("触发因素")}
              <Input {...FORM_INPUT_PROPS} v-model:value={obj.triggerFactors} maxlength={200} placeholder="如：检修操作不当" />
            </Col>
            <Col span={12}>
              {renderFieldLabel("责任人员", true, "(自动填充,只读)")}
              <Input
                {...FORM_INPUT_PROPS}
                value={obj.responsibleUserName || obj.responsibleUser}
                disabled
                style={{ background: "#f5f5f5" }}
              />
            </Col>
            <Col span={24}>
              {renderFieldLabel("应急处理措施", true)}
              <Textarea
                {...FORM_INPUT_PROPS}
                v-model:value={obj.emergencyMeasures}
                rows={2}
                maxlength={500}
                placeholder="启动氨泄漏应急预案、开启排风系统、人员疏散"
                style={{ width: "100%" }}
              />
            </Col>
          </Row>
        </div>
      );
    };

    return (): JSX.Element => (
      <>
        <input
          ref={aiPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(event: Event) => {
            void handleAiPhotoSelected(event);
          }}
        />
        <PcLayout
          title={layoutTitle}
          v-slots={{
            "layout-content": () => (
              <div class={formStyles.formContent}>
                <div class={[formStyles.sectionTitle, "g2-skin-section-title"]}>辨识录入</div>
                <p class={entryStyles.pageDesc}>
                  {isReIdentifyMode.value
                    ? "请根据退回原因修正风险对象后重新提交审核"
                    : "选择风险单元，按标准化模板填写风险对象信息，支持一次辨识创建多个风险对象"}
                </p>
                <div class={entryStyles.toolbar}>
                  <Button onClick={() => router.push({ name: "identifications" })}>← 返回列表</Button>
                  <span class={entryStyles.currentUnit}>
                    当前单元：<span class={entryStyles.unitName}>{unit.value?.name ?? "—"}</span>
                  </span>
                </div>
                {!unit.value && !loading.value ? (
                  <div class={entryStyles.emptyWrap}>
                    <Result status="warning" title="未找到风险单元" subTitle="请从辨识列表进入" />
                  </div>
                ) : (
                  <Spin spinning={loading.value}>
                    <div class={entryStyles.formPanel}>
                      {riskObjects.value.length ? (
                        riskObjects.value.map((obj, idx) => renderObjectCard(obj, idx))
                      ) : (
                        <div class={entryStyles.emptyWrap}>
                          <Result status="info" title="暂无可辨识对象" subTitle={emptyHint.value} />
                        </div>
                      )}
                      <Button
                        style={{
                          border: "1px dashed var(--cube-theme-var--primary-color, #1677ff)",
                          color: "var(--cube-theme-var--primary-color, #1677ff)",
                        }}
                        disabled={!canAddObject.value || riskObjects.value.length >= MAX_OBJECTS}
                        onClick={addObject}
                      >
                        + 添加风险对象
                      </Button>
                    </div>
                  </Spin>
                )}
              </div>
            ),
            "footer-page": () => (
              <div class={formStyles.footerActions}>
                <PopConfirm title="确定取消？未保存的内容将丢失" onConfirm={() => router.push({ name: "identifications" })}>
                  <Button>取消</Button>
                </PopConfirm>
                <Button
                  type="primary"
                  loading={submitting.value || loading.value}
                  disabled={!unit.value || !riskObjects.value.length}
                  onClick={() => {
                    void submit();
                  }}
                >
                  {isReIdentifyMode.value ? "提交再次辨识" : "提交审核"}
                </Button>
              </div>
            ),
          }}
        />
        <AssetPickerModal
          visible={assetPickerVisible.value}
          initialSelected={assetInitialSelected.value}
          onUpdate:visible={(v: boolean) => {
            assetPickerVisible.value = v;
          }}
          onConfirm={onAssetSelected}
        />
      </>
    );
  },
});
