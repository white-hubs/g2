import { HazardAiRecognitionCallResult, HazardSourceType } from "@g2-contract/hazard-governance";
import type {
  HazardAiRecognitionCommand,
  HazardAiRecognitionResultVO,
  HazardAiRecognitionVO,
  HazardPendingConfirmationCreateCommand,
} from "@g2-contract/hazard-governance";
import { defineComponent, reactive, ref, shallowRef } from "vue";
import type { VNodeChild } from "vue";

import { HazardCategoryCascader } from "../../../components/hazard-category-cascader";
import { LocationPickerModal, type HazardLocationValue, type LocationPickerModalExpose } from "../../../components/location-picker-modal";
import { RiskUnitObjectSelect } from "../../../components/risk-unit-object-select";
import { HazardFileUpload as FileUpload } from "../../../shared/file-upload";
import { useAuthRequest } from "@/api/request";
import { batchCreateHazardPendingConfirmation, createHazardPendingConfirmation, recognizeHazardsByAi } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Button, DeleteOutlined, Form, FormItem, Input, Space, TabPane, Tabs, Textarea, message } from "@/pc-ui-runtime";
const APPLICATION_CODE = "hazard-governance";

type CreateHazardMode = "ai" | "manual";

interface HazardDraft {
  id: string;
  aiRecognitionRecordId?: string | number;
  aiRecommendedCategoryId?: string | number;
  categoryPath: string[];
  categoryNamePath: string[];
  description: string;
  disposalSuggestion: string;
  riskUnitId: string;
  riskUnitName: string;
  riskObjectId: string;
  riskObjectName: string;
  locationName: string;
  longitude: number | null | undefined;
  latitude: number | null | undefined;
}

interface UploadedFile {
  businessKey: string | null;
  id?: string | number;
  fileId?: string | number;
  fileID?: string | number;
  file_id?: string | number;
  ossId?: string | number;
  data?: Partial<UploadedFile>;
  result?: Partial<UploadedFile>;
  name: string;
  path: string;
  refCount: number;
  size: number;
  suffix: string;
  type: string;
}

const HAZARD_FILE_SCENE_CODE = "HIDDENDANGER::FLOW";
const AI_RECOGNITION_MIN_DESCRIPTION_LENGTH = 5;
const AI_RECOGNITION_INPUT_ERROR = "请至少上传一张现场照片或填写隐患描述";
const AI_RECOGNITION_SHORT_DESCRIPTION_ERROR = `隐患描述至少填写${AI_RECOGNITION_MIN_DESCRIPTION_LENGTH}个字，或上传一张现场照片`;

interface LocationEditable {
  locationName: string;
  longitude: number | null | undefined;
  latitude: number | null | undefined;
}

interface HazardCategorySelectedOption {
  label?: string;
  value?: string;
}

const readLastValue = (values: string[]): string | undefined => values.at(-1);

const readIdValue = (value: string): number | string => {
  if (!value) {
    return value;
  }
  const numericValue = Number(value);
  return Number.isSafeInteger(numericValue) ? numericValue : value;
};

const readFileIds = (files: UploadedFile[]): string | undefined => {
  const ids = files
    .map(
      (file) =>
        file.id ??
        file.fileId ??
        file.fileID ??
        file.file_id ??
        file.ossId ??
        file.data?.id ??
        file.data?.fileId ??
        file.result?.id ??
        file.result?.fileId,
    )
    .map((id) => String(id ?? ""))
    .filter(Boolean);
  return ids.length > 0 ? ids.join(",") : undefined;
};

const readDescriptionText = (...values: (string | undefined | null)[]): string => {
  const value = values.map((item) => item?.trim() ?? "").find(Boolean);
  return value ?? "";
};

const readAiGeneratedDescription = (value: HazardAiRecognitionResultVO | HazardAiRecognitionVO): string =>
  readDescriptionText(value.description, value.hazardDescription, "generatedDescription" in value ? value.generatedDescription : undefined);

const readAiRecommendedCategoryId = (item: HazardAiRecognitionResultVO): string | number | undefined => {
  const record = item as HazardAiRecognitionResultVO & {
    aiRecommendCategoryId?: string | number;
    aiRecommendedHazardCategoryId?: string | number;
    aiRecommendedHazardTypeId?: string | number;
    categoryId?: string | number;
    hazardCategoryId?: string | number;
    recommendedCategoryId?: string | number;
    recommendedHazardCategoryId?: string | number;
    recommendedHazardTypeId?: string | number;
  };
  return (
    record.aiRecommendedCategoryId ??
    record.aiRecommendCategoryId ??
    record.aiRecommendedHazardCategoryId ??
    record.aiRecommendedHazardTypeId ??
    record.recommendedCategoryId ??
    record.recommendedHazardCategoryId ??
    record.recommendedHazardTypeId ??
    record.categoryId ??
    record.hazardCategoryId ??
    record.hazardTypeId
  );
};

const readAiRecommendedCategoryName = (item: HazardAiRecognitionResultVO): string => {
  const record = item as HazardAiRecognitionResultVO & {
    aiRecommendCategoryName?: string;
    aiRecommendedHazardCategoryName?: string;
    aiRecommendedHazardTypeName?: string;
    categoryName?: string;
    hazardCategoryName?: string;
    recommendedCategoryName?: string;
    recommendedHazardCategoryName?: string;
    recommendedHazardTypeName?: string;
  };
  return (
    record.aiRecommendedCategoryName ??
    record.aiRecommendCategoryName ??
    record.aiRecommendedHazardCategoryName ??
    record.aiRecommendedHazardTypeName ??
    record.recommendedCategoryName ??
    record.recommendedHazardCategoryName ??
    record.recommendedHazardTypeName ??
    record.categoryName ??
    record.hazardCategoryName ??
    record.hazardTypeName ??
    ""
  );
};

const validateAiRecognitionInput = (fileId: string | undefined, description: string): string | undefined => {
  if (fileId || description.length >= AI_RECOGNITION_MIN_DESCRIPTION_LENGTH) {
    return undefined;
  }
  return description.length === 0 ? AI_RECOGNITION_INPUT_ERROR : AI_RECOGNITION_SHORT_DESCRIPTION_ERROR;
};

const createRecognizedDraft = (
  item: HazardAiRecognitionResultVO,
  index: number,
  userDescription: string,
  fallbackGeneratedDescription: string,
  aiRecognitionRecordId?: string | number,
): HazardDraft => {
  const aiRecommendedCategoryId = readAiRecommendedCategoryId(item);
  const aiRecommendedCategoryName = readAiRecommendedCategoryName(item);
  return {
    id: `ai-${aiRecommendedCategoryId ?? "unknown"}-${index}`,
    aiRecognitionRecordId,
    aiRecommendedCategoryId,
    categoryPath: aiRecommendedCategoryId === undefined ? [] : [String(aiRecommendedCategoryId)],
    categoryNamePath: aiRecommendedCategoryName ? [aiRecommendedCategoryName] : [],
    description: userDescription || readAiGeneratedDescription(item) || fallbackGeneratedDescription,
    disposalSuggestion: item.disposalSuggestion ?? "",
    riskUnitId: "",
    riskUnitName: "",
    riskObjectId: "",
    riskObjectName: "",
    locationName: "",
    longitude: undefined,
    latitude: undefined,
  };
};

const createLocationValue = (target: LocationEditable): HazardLocationValue => ({
  locationName: target.locationName,
  ...(target.longitude !== undefined && target.longitude !== null ? { longitude: target.longitude } : {}),
  ...(target.latitude !== undefined && target.latitude !== null ? { latitude: target.latitude } : {}),
});

const unwrapRecognitionResult = (response: unknown): HazardAiRecognitionVO => {
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      return record.data as HazardAiRecognitionVO;
    }
    if (record.result && typeof record.result === "object") {
      return record.result as HazardAiRecognitionVO;
    }
  }
  return response as HazardAiRecognitionVO;
};

export interface CreateHazardModalExpose {
  openModal: () => void;
}

export const CreateHazardModal = defineComponent({
  name: "CreateHazardModal",
  emits: ["created"],
  setup: (_, { emit, expose }) => {
    const activeMode = shallowRef<CreateHazardMode>("ai");
    const recognizing = shallowRef(false);
    const uploading = shallowRef(false);
    const locationPickerModalRef = ref<LocationPickerModalExpose>();
    const pendingLocationTarget = shallowRef<LocationEditable>();
    const aiState = reactive({
      photos: [] as UploadedFile[],
      description: "",
      recognized: false,
      drafts: [] as HazardDraft[],
    });
    const manualForm = reactive({
      photos: [] as UploadedFile[],
      categoryPath: [] as string[],
      categoryNamePath: [] as string[],
      description: "",
      riskUnitId: "",
      riskUnitName: "",
      riskObjectId: "",
      riskObjectName: "",
      locationName: "",
      longitude: undefined as number | null | undefined,
      latitude: undefined as number | null | undefined,
    });

    const resetState = (): void => {
      activeMode.value = "ai";
      aiState.photos = [];
      aiState.description = "";
      aiState.recognized = false;
      aiState.drafts = [];
      manualForm.photos = [];
      manualForm.categoryPath = [];
      manualForm.categoryNamePath = [];
      manualForm.description = "";
      manualForm.riskUnitId = "";
      manualForm.riskUnitName = "";
      manualForm.riskObjectId = "";
      manualForm.riskObjectName = "";
      manualForm.locationName = "";
      manualForm.longitude = undefined;
      manualForm.latitude = undefined;
    };

    const openModal = (): void => {
      resetState();
      modalApi.open();
    };

    const switchMode = (mode: CreateHazardMode): void => {
      activeMode.value = mode;
    };

    const startRecognition = async (): Promise<void> => {
      const fileId = readFileIds(aiState.photos)?.split(",")[0];
      const description = aiState.description.trim();
      if (uploading.value) {
        message.warning("现场照片正在上传，请稍后再试");
        return;
      }
      const validationMessage = validateAiRecognitionInput(fileId, description);
      if (validationMessage) {
        message.error(validationMessage);
        return;
      }
      const payload: HazardAiRecognitionCommand = {
        ...(fileId ? { fileId } : {}),
        ...(description ? { description } : {}),
      };
      recognizing.value = true;
      modalApi.setState({ confirmLoading: true });
      try {
        const response = await useAuthRequest(() => recognizeHazardsByAi(payload));
        const result = unwrapRecognitionResult(response);
        if (result.callResult === HazardAiRecognitionCallResult.FAILED) {
          message.error(result.failureReason || "AI识别失败，请稍后重试");
          return;
        }
        const generatedDescription = readAiGeneratedDescription(result) || readAiGeneratedDescription(result.hazards?.[0] ?? result);
        if (!description && generatedDescription) {
          aiState.description = generatedDescription;
        }
        aiState.drafts = (result.hazards ?? []).map((item, index) =>
          createRecognizedDraft(item, index, description, generatedDescription, result.analysisRecordId),
        );
        aiState.recognized = true;
        if (aiState.drafts.length === 0) {
          message.warning("未识别到隐患，请更换照片或补充描述后重试");
        }
      } catch (error) {
        console.error(error);
        message.error("AI识别失败，请稍后重试");
      } finally {
        recognizing.value = false;
        modalApi.setState({ confirmLoading: false });
      }
    };

    const deleteDraft = (draft: HazardDraft): void => {
      aiState.drafts = aiState.drafts.filter((item) => item.id !== draft.id);
    };

    const validateDraft = (draft: HazardDraft): boolean => Boolean(readLastValue(draft.categoryPath) && draft.description.trim());

    const openLocationPicker = (target: LocationEditable): void => {
      pendingLocationTarget.value = target;
      locationPickerModalRef.value?.openModal(createLocationValue(target));
    };

    const handleLocationSelected = (location: HazardLocationValue): void => {
      const target = pendingLocationTarget.value;
      if (!target) {
        return;
      }
      target.locationName = location.locationName;
      target.longitude = location.longitude;
      target.latitude = location.latitude;
      pendingLocationTarget.value = undefined;
    };

    const submitAiHazards = async (): Promise<void> => {
      if (!aiState.recognized) {
        await startRecognition();
        return;
      }
      if (aiState.drafts.length === 0) {
        message.error("请至少保留一条识别隐患");
        return;
      }
      if (aiState.drafts.some((draft) => !validateDraft(draft))) {
        message.error("请补全识别隐患的三级品类和描述");
        return;
      }
      const sceneImages = readFileIds(aiState.photos);
      modalApi.setState({ confirmLoading: true });
      try {
        const payloads: HazardPendingConfirmationCreateCommand[] = aiState.drafts.map((draft) => {
          const categoryId = readLastValue(draft.categoryPath);
          const aiRecommendedCategoryId = draft.aiRecommendedCategoryId ?? categoryId;
          return {
            description: draft.description.trim(),
            sourceType: HazardSourceType.MANUAL,
            applicationCode: APPLICATION_CODE,
            categoryId: categoryId ?? "",
            aiRecommendedCategoryId: readIdValue(String(aiRecommendedCategoryId ?? "")),
            ...(draft.aiRecognitionRecordId ? { aiRecognitionRecordId: draft.aiRecognitionRecordId } : {}),
            ...(sceneImages ? { sceneImages } : {}),
            ...(draft.riskUnitId ? { riskUnitId: readIdValue(draft.riskUnitId) } : {}),
            ...(draft.riskObjectId ? { riskObjectId: readIdValue(draft.riskObjectId) } : {}),
            ...(draft.locationName.trim() ? { locationName: draft.locationName.trim() } : {}),
            ...(draft.longitude !== undefined && draft.longitude !== null ? { longitude: draft.longitude } : {}),
            ...(draft.latitude !== undefined && draft.latitude !== null ? { latitude: draft.latitude } : {}),
          };
        });
        await useAuthRequest(() => batchCreateHazardPendingConfirmation(payloads));
        message.success(`已创建 ${aiState.drafts.length} 条待确认隐患`);
        emit("created");
        modalApi.close();
      } catch (error) {
        console.error(error);
        message.error("创建隐患失败，请稍后重试");
      } finally {
        modalApi.setState({ confirmLoading: false });
      }
    };

    const createManualPayload = (): HazardPendingConfirmationCreateCommand | undefined => {
      const sceneImages = readFileIds(manualForm.photos);
      const description = manualForm.description.trim();
      const locationName = manualForm.locationName.trim();
      if (!sceneImages || !description || manualForm.categoryPath.length !== 3) {
        message.error("请补全现场照片、隐患类型（三级）和隐患描述");
        return undefined;
      }
      const categoryId = readLastValue(manualForm.categoryPath);
      if (!categoryId) {
        message.error("请选择三级隐患类型");
        return undefined;
      }
      return {
        description,
        sourceType: HazardSourceType.MANUAL,
        applicationCode: APPLICATION_CODE,
        categoryId,
        ...(locationName ? { locationName } : {}),
        ...(manualForm.longitude !== undefined && manualForm.longitude !== null ? { longitude: manualForm.longitude } : {}),
        ...(manualForm.latitude !== undefined && manualForm.latitude !== null ? { latitude: manualForm.latitude } : {}),
        sceneImages,
        ...(manualForm.riskUnitId ? { riskUnitId: readIdValue(manualForm.riskUnitId) } : {}),
        ...(manualForm.riskObjectId ? { riskObjectId: readIdValue(manualForm.riskObjectId) } : {}),
      };
    };

    const submitManualHazard = async (): Promise<void> => {
      const payload = createManualPayload();
      if (!payload) {
        return;
      }
      modalApi.setState({ confirmLoading: true });
      try {
        await useAuthRequest(() => createHazardPendingConfirmation(payload));
        message.success("已创建待确认隐患");
        emit("created");
        modalApi.close();
      } catch (error) {
        console.error(error);
        message.error("创建隐患失败，请稍后重试");
      } finally {
        modalApi.setState({ confirmLoading: false });
      }
    };

    const submitActiveMode = (): void => {
      if (activeMode.value === "ai") {
        void submitAiHazards();
        return;
      }
      void submitManualHazard();
    };

    const [PcModal, modalApi] = usePcModal({
      title: "新增隐患",
      width: "920px",
      wrapperClass: "hazard-create-modal-wrap",
      onConfirm: submitActiveMode,
      onCancel: () => modalApi.close(),
    });

    expose({ openModal });

    const renderImageUpload = (fileList: UploadedFile[], maxCount = 3): VNodeChild => (
      <FileUpload
        value={fileList}
        onUpdate:value={(value: UploadedFile[]) => {
          fileList.splice(0, fileList.length, ...(value ?? []));
        }}
        onStart={() => {
          uploading.value = true;
        }}
        onEnd={() => {
          uploading.value = false;
        }}
        multiple={maxCount > 1}
        showText
        maxCount={maxCount}
        type="picture-card"
        size={100}
        sceneCode={HAZARD_FILE_SCENE_CODE}
        customText={`请上传图片，最多${maxCount}张，单个附件最大支持100MB`}
        typeList={[".png", ".jpg", ".jpeg", ".webp"]}
        accept="image/*"
      />
    );

    const readCategoryNamePath = (selectedOptions: HazardCategorySelectedOption[]): string[] =>
      selectedOptions.map((option) => option.label || "").filter(Boolean);

    const renderAiEntry = (): VNodeChild => (
      <div class="hazard-create-entry">
        <div class="hazard-create-section">
          <div class="hazard-create-label">现场照片（照片/描述二选一）</div>
          {renderImageUpload(aiState.photos, 1)}
        </div>
        <Form layout="vertical" model={aiState}>
          <FormItem class="hazard-create-nowrap-label" label="隐患描述（照片/描述二选一）">
            <Textarea v-model:value={aiState.description} rows={4} placeholder="请上传现场照片，或填写至少5个字的隐患描述" />
          </FormItem>
        </Form>
      </div>
    );

    const renderDraftCard = (draft: HazardDraft, index: number): VNodeChild => (
      <div class="hazard-ai-draft-card" key={draft.id}>
        <div class="hazard-ai-draft-head">
          <strong>{draft.categoryNamePath.at(-1) || `隐患${index + 1}`}</strong>
          <Button type="link" danger size="small" onClick={() => deleteDraft(draft)}>
            <DeleteOutlined />
            删除
          </Button>
        </div>
        <Form layout="vertical" model={draft}>
          <FormItem label="隐患类型" required>
            <HazardCategoryCascader
              v-model:value={draft.categoryPath}
              placeholder="请选择一级 / 二级 / 三级类型"
              onChange={(_value, selectedOptions: HazardCategorySelectedOption[]) => {
                draft.categoryNamePath = readCategoryNamePath(selectedOptions);
              }}
            />
          </FormItem>
          <FormItem label="描述" required>
            <Textarea v-model:value={draft.description} rows={3} placeholder="请输入隐患描述" />
          </FormItem>
          <div class="hazard-create-form-grid">
            <FormItem class="hazard-risk-unit-object-form-item">
              <RiskUnitObjectSelect
                v-model:unitValue={draft.riskUnitId}
                v-model:unitName={draft.riskUnitName}
                v-model:objectValue={draft.riskObjectId}
                v-model:objectName={draft.riskObjectName}
              />
            </FormItem>
          </div>
          <FormItem label="位置">
            <Space class="hazard-create-location" size={8}>
              <Input value={draft.locationName} placeholder="请通过地图选择位置" disabled />
              <Button onClick={() => openLocationPicker(draft)}>选择位置</Button>
            </Space>
          </FormItem>
        </Form>
      </div>
    );

    const renderAiResult = (): VNodeChild => (
      <div class="hazard-ai-result">
        <div class="hazard-ai-result-summary">
          <span>已识别 {aiState.drafts.length} 条隐患</span>
          <Button size="small" loading={recognizing.value} onClick={() => void startRecognition()}>
            重新识别
          </Button>
        </div>
        {aiState.drafts.length > 0 ? (
          aiState.drafts.map((draft, index) => renderDraftCard(draft, index))
        ) : (
          <div class="hazard-create-empty">暂无识别结果</div>
        )}
      </div>
    );

    const renderManualForm = (): VNodeChild => (
      <div class="hazard-create-entry">
        <div class="hazard-create-section">
          <div class="hazard-create-label">现场照片（必填）</div>
          {renderImageUpload(manualForm.photos, 3)}
        </div>
        <Form layout="vertical" model={manualForm}>
          <FormItem label="隐患类型" required>
            <HazardCategoryCascader
              v-model:value={manualForm.categoryPath}
              placeholder="请选择一级 / 二级 / 三级类型"
              onChange={(_value, selectedOptions: HazardCategorySelectedOption[]) => {
                manualForm.categoryNamePath = readCategoryNamePath(selectedOptions);
              }}
            />
          </FormItem>
          <FormItem label="风险描述" required>
            <Textarea v-model:value={manualForm.description} rows={4} placeholder="请描述隐患具体情况" />
          </FormItem>
          <div class="hazard-create-form-grid">
            <FormItem class="hazard-risk-unit-object-form-item">
              <RiskUnitObjectSelect
                v-model:unitValue={manualForm.riskUnitId}
                v-model:unitName={manualForm.riskUnitName}
                v-model:objectValue={manualForm.riskObjectId}
                v-model:objectName={manualForm.riskObjectName}
              />
            </FormItem>
          </div>
          <FormItem label="位置">
            <Space class="hazard-create-location" size={8}>
              <Input value={manualForm.locationName} placeholder="请通过地图选择位置" disabled />
              <Button onClick={() => openLocationPicker(manualForm)}>选择位置</Button>
            </Space>
          </FormItem>
        </Form>
      </div>
    );

    const modalSlots = {
      default: (): VNodeChild => (
        <div class="hazard-create-modal">
          <Tabs
            activeKey={activeMode.value}
            onChange={(key) => {
              switchMode(String(key) as CreateHazardMode);
            }}
          >
            <TabPane key="ai" tab="AI识别">
              {aiState.recognized ? renderAiResult() : renderAiEntry()}
            </TabPane>
            <TabPane key="manual" tab="手动创建">
              {renderManualForm()}
            </TabPane>
          </Tabs>
          <div class="hazard-create-footer-tip">
            {activeMode.value === "ai"
              ? aiState.recognized
                ? "确认后将批量提交全部识别隐患"
                : "点击确定开始识别"
              : "点击确定创建单条隐患"}
          </div>
          {aiState.recognized && aiState.drafts.length > 0 ? (
            <div class="hazard-create-levels">
              {aiState.drafts.map((draft) => (
                <span key={draft.id}>{draft.categoryNamePath.join(" / ") || "未选择品类"}</span>
              ))}
            </div>
          ) : null}
          <LocationPickerModal ref={locationPickerModalRef} onSelected={handleLocationSelected} />
        </div>
      ),
    };

    return () => <PcModal v-slots={modalSlots} />;
  },
});
