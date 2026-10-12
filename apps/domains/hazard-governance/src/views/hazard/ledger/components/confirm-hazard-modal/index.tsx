import { HazardLevel as HazardLevelEnum } from "@g2-contract/hazard-governance";
import type {
  FileVO,
  HazardConfirmCommand,
  HazardDetailBasicInfoVO,
  HazardDetailVO,
  HazardLedgerRecordVO,
} from "@g2-contract/hazard-governance";
import { defineComponent, reactive, ref } from "vue";

import { HazardCategoryCascader } from "../../../components/hazard-category-cascader";
import { type HazardLocationValue, LocationPickerModal, type LocationPickerModalExpose } from "../../../components/location-picker-modal";
import { RiskUnitObjectSelect } from "../../../components/risk-unit-object-select";
import type { HazardLevel } from "../../../shared/data";
import { hazardLevelOptions, rectificationDeadlineHourOptions } from "../../../shared/data";
import { HazardFileUpload as FileUpload } from "../../../shared/file-upload";
import { HazardUserSelect as UserSelect } from "../../../shared/user-select";
import { useAuthRequest } from "@/api/request";
import { confirmHazard, getHazardDetail } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Button, Form, FormItem, Input, Select, Space, Textarea, message } from "@/pc-ui-runtime";

import "./index.less";

type HazardLedgerRecordWithCategory = HazardLedgerRecordVO & {
  categoryId?: string | number;
  categoryIds?: (string | number)[];
  categoryIdPath?: (string | number)[];
  categoryPath?: (string | number)[];
  hazardCategoryId?: string | number;
  category?: {
    id?: string | number;
    categoryId?: string | number;
    path?: (string | number)[];
    ids?: (string | number)[];
  };
};

interface OptionalRef {
  id?: string | number;
  userId?: string;
  name?: string;
  userName?: string;
  unitId?: string | number;
  unitName?: string;
  objectId?: string | number;
  objectName?: string;
}

interface CurrentUserStorage {
  id?: string | number;
  userId?: string | number;
  name?: string;
  userName?: string;
  username?: string;
  displayName?: string;
  nickname?: string;
}

type ConfirmHazardRecord = (HazardLedgerRecordVO | HazardDetailBasicInfoVO) & {
  hazardId?: string | number;
  hazardDescription?: string;
  hazardLevel?: HazardLevel | string;
  riskUnit?: OptionalRef;
  riskObject?: OptionalRef;
  responsibleUser?: OptionalRef;
  acceptanceUser?: OptionalRef;
  acceptorUser?: OptionalRef;
  confirmUser?: OptionalRef;
  deadlineHours?: number | string;
  defaultDeadlineHours?: number | string;
  categoryPath?: (string | number)[];
  confirmUserId?: string | number;
  confirmUserName?: string;
  acceptanceUserId?: string | number;
  acceptanceUserName?: string;
  rectificationDeadlineHours?: number | string;
  sceneImages?: FileVO[];
};

type UploadedFile = FileVO & {
  fileId?: string | number;
};

const HAZARD_FILE_SCENE_CODE = "HIDDENDANGER::FLOW";

export interface ConfirmHazardModalExpose {
  openModal: (record: HazardLedgerRecordVO) => void;
}

const readOptionalText = (...values: (string | number | undefined | null)[]): string => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined || value === null ? "" : String(value);
};

const readCurrentUser = (): CurrentUserStorage | undefined => {
  try {
    const raw = sessionStorage.getItem("GH-UserInfo");
    return raw ? (JSON.parse(raw) as CurrentUserStorage) : undefined;
  } catch {
    return undefined;
  }
};

const readNumberValue = (value: number | null | undefined): number | undefined => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const readNumberLike = (value: number | string | null | undefined): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const readFileIds = (files: UploadedFile[]): string =>
  files
    .map((file) => String(file.id ?? file.fileId ?? ""))
    .filter(Boolean)
    .join(",");

const readRecordCategoryPath = (record: ConfirmHazardRecord): string[] => {
  const categoryRecord = record as HazardLedgerRecordWithCategory;
  if (Array.isArray(categoryRecord.categoryPath)) {
    return categoryRecord.categoryPath.map(String);
  }
  if (Array.isArray(categoryRecord.categoryIds)) {
    return categoryRecord.categoryIds.map(String);
  }
  if (Array.isArray(categoryRecord.categoryIdPath)) {
    return categoryRecord.categoryIdPath.map(String);
  }
  if (Array.isArray(categoryRecord.category?.path)) {
    return categoryRecord.category.path.map(String);
  }
  if (Array.isArray(categoryRecord.category?.ids)) {
    return categoryRecord.category.ids.map(String);
  }
  const categoryId = readOptionalText(
    categoryRecord.categoryId,
    categoryRecord.hazardCategoryId,
    categoryRecord.category?.categoryId,
    categoryRecord.category?.id,
  );
  return categoryId ? [categoryId] : [];
};

const unwrapHazardDetail = (response: unknown, fallbackId: string): ConfirmHazardRecord | undefined => {
  const candidate =
    response && typeof response === "object"
      ? ((response as { data?: unknown }).data ??
        (response as { result?: unknown }).result ??
        (response as { details?: unknown }).details ??
        response)
      : undefined;
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const detailSource = candidate as HazardDetailVO | ConfirmHazardRecord;
  const detail = ("basicInfo" in detailSource && detailSource.basicInfo ? detailSource.basicInfo : detailSource) as ConfirmHazardRecord;
  const detailId = readOptionalText(detail.id, detail.hazardId);
  if (detailId && detailId !== fallbackId) {
    return undefined;
  }
  if (
    detailId ||
    detail.description ||
    detail.hazardDescription ||
    detail.riskUnitId ||
    detail.riskUnit ||
    (detail as HazardLedgerRecordWithCategory).categoryId ||
    (detail as HazardLedgerRecordWithCategory).hazardCategoryId ||
    detail.categoryPath
  ) {
    return detail;
  }
  return undefined;
};

export const ConfirmHazardModal = defineComponent({
  name: "ConfirmHazardModal",
  emits: ["confirmed"],
  setup: (_, { emit, expose }) => {
    const locationPickerModalRef = ref<LocationPickerModalExpose>();
    const confirmForm = reactive({
      id: "",
      sceneImages: [] as UploadedFile[],
      description: "",
      categoryPath: [] as string[],
      level: HazardLevelEnum.GENERAL,
      riskUnitId: "",
      riskUnitName: "",
      riskObjectId: "",
      riskObjectName: "",
      locationName: "",
      longitude: undefined as number | null | undefined,
      latitude: undefined as number | null | undefined,
      rectifierUserId: "",
      rectifierUserName: "",
      acceptorUserId: "",
      acceptorUserName: "",
      deadline: 120,
    });

    const [ConfirmModal, confirmModalApi] = usePcModal({
      title: "确认属实",
      width: "680px",
      wrapperClass: "hazard-confirm-modal-wrap",
      onConfirm: () => {
        void submitConfirm();
      },
      onCancel: () => confirmModalApi.close(),
    });

    const createPayload = (): HazardConfirmCommand | undefined => {
      const categoryId = confirmForm.categoryPath.at(-1);
      const { riskUnitId, riskObjectId } = confirmForm;
      const sceneImages = readFileIds(confirmForm.sceneImages);
      const longitude = readNumberValue(confirmForm.longitude);
      const latitude = readNumberValue(confirmForm.latitude);
      const rectificationDeadlineHours = confirmForm.deadline;

      if (!sceneImages) {
        message.error("请上传隐患图片");
        return undefined;
      }
      if (!confirmForm.description.trim()) {
        message.error("请输入隐患描述");
        return undefined;
      }
      if (!categoryId) {
        message.error("请选择隐患类型");
        return undefined;
      }
      if (!confirmForm.level) {
        message.error("请选择隐患等级");
        return undefined;
      }
      if (!confirmForm.rectifierUserId) {
        message.error("请选择整改责任人");
        return undefined;
      }
      if (!confirmForm.acceptorUserId) {
        message.error("请选择验收人");
        return undefined;
      }
      if (!Number.isSafeInteger(rectificationDeadlineHours) || rectificationDeadlineHours < 1) {
        message.error("请选择整改时限");
        return undefined;
      }
      if (confirmForm.rectifierUserId && confirmForm.acceptorUserId && confirmForm.rectifierUserId === confirmForm.acceptorUserId) {
        message.error("验收人与整改责任人不能为同一人，请修改");
        return undefined;
      }

      return {
        sceneImages,
        description: confirmForm.description.trim(),
        categoryId,
        level: confirmForm.level as HazardLevel,
        ...(riskUnitId ? { riskUnitId } : {}),
        ...(riskObjectId ? { riskObjectId } : {}),
        ...(confirmForm.locationName.trim() ? { locationName: confirmForm.locationName.trim() } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        responsibleUserId: confirmForm.rectifierUserId,
        acceptanceUserId: confirmForm.acceptorUserId,
        rectificationDeadlineHours,
      };
    };

    const submitConfirm = async (): Promise<void> => {
      const payload = createPayload();
      if (!payload) {
        return;
      }
      confirmModalApi.setState({ confirmLoading: true });
      try {
        await useAuthRequest(() => confirmHazard(confirmForm.id, payload));
        message.success("已确认隐患属实");
        emit("confirmed");
        confirmModalApi.close();
      } catch (error) {
        console.error(error);
        message.error(error instanceof Error && error.message ? error.message : "确认隐患属实失败，请稍后重试");
      } finally {
        confirmModalApi.setState({ confirmLoading: false });
      }
    };

    const openLocationPicker = (): void => {
      locationPickerModalRef.value?.openModal({
        locationName: confirmForm.locationName,
        longitude: confirmForm.longitude,
        latitude: confirmForm.latitude,
      });
    };

    const handleLocationSelected = (location: HazardLocationValue): void => {
      confirmForm.locationName = location.locationName;
      confirmForm.longitude = location.longitude;
      confirmForm.latitude = location.latitude;
    };

    const resetForm = (): void => {
      confirmForm.id = "";
      confirmForm.sceneImages = [];
      confirmForm.description = "";
      confirmForm.level = HazardLevelEnum.GENERAL;
      confirmForm.categoryPath = [];
      confirmForm.riskUnitId = "";
      confirmForm.riskUnitName = "";
      confirmForm.riskObjectId = "";
      confirmForm.riskObjectName = "";
      confirmForm.locationName = "";
      confirmForm.longitude = undefined;
      confirmForm.latitude = undefined;
      confirmForm.rectifierUserId = "";
      confirmForm.rectifierUserName = "";
      confirmForm.acceptorUserId = "";
      confirmForm.acceptorUserName = "";
      confirmForm.deadline = 120;
    };

    const fillForm = (record: ConfirmHazardRecord, fallbackId = ""): void => {
      const hazardId = readOptionalText(record.id, record.hazardId, fallbackId);
      const riskUnitId = readOptionalText(record.riskUnitId, record.riskUnit?.unitId, record.riskUnit?.id);
      const riskObjectId = readOptionalText(record.riskObjectId, record.riskObject?.objectId, record.riskObject?.id);
      const responsibleUserId = readOptionalText(record.responsibleUserId, record.responsibleUser?.userId, record.responsibleUser?.id);
      const currentUser = readCurrentUser();
      const acceptanceUserId = readOptionalText(
        currentUser?.id,
        currentUser?.userId,
        record.confirmUserId,
        record.confirmUser?.userId,
        record.confirmUser?.id,
        record.acceptanceUserId,
        record.acceptanceUser?.userId,
        record.acceptanceUser?.id,
        record.acceptorUser?.userId,
        record.acceptorUser?.id,
      );
      const rectificationDeadlineHours = readNumberLike(
        record.rectificationDeadlineHours ?? record.deadlineHours ?? record.defaultDeadlineHours,
      );

      confirmForm.id = hazardId;
      confirmForm.sceneImages = [...(record.sceneImages ?? [])];
      confirmForm.description = record.description || record.hazardDescription || "";
      confirmForm.level = ((record.level || record.hazardLevel) as HazardLevel | undefined) ?? HazardLevelEnum.GENERAL;
      confirmForm.categoryPath = readRecordCategoryPath(record);
      confirmForm.riskUnitId = riskUnitId;
      confirmForm.riskUnitName = readOptionalText(record.riskUnitName, record.riskUnit?.unitName, record.riskUnit?.name, riskUnitId);
      confirmForm.riskObjectId = riskObjectId;
      confirmForm.riskObjectName = readOptionalText(
        record.riskObjectName,
        record.riskObject?.objectName,
        record.riskObject?.name,
        riskObjectId,
      );
      confirmForm.locationName = record.locationName || "";
      confirmForm.longitude = readNumberLike(record.longitude);
      confirmForm.latitude = readNumberLike(record.latitude);
      confirmForm.rectifierUserId = responsibleUserId;
      confirmForm.rectifierUserName = readOptionalText(
        record.responsibleUserName,
        record.responsibleUser?.userName,
        record.responsibleUser?.name,
      );
      confirmForm.acceptorUserId = acceptanceUserId;
      confirmForm.acceptorUserName = readOptionalText(
        currentUser?.name,
        currentUser?.userName,
        currentUser?.displayName,
        currentUser?.nickname,
        currentUser?.username,
        record.confirmUserName,
        record.confirmUser?.userName,
        record.confirmUser?.name,
        record.acceptanceUserName,
        record.acceptanceUser?.userName,
        record.acceptanceUser?.name,
        record.acceptorUser?.userName,
        record.acceptorUser?.name,
      );
      if (rectificationDeadlineHours) {
        confirmForm.deadline = rectificationDeadlineHours;
      }
    };

    const loadDetail = async (id: string): Promise<void> => {
      confirmModalApi.setState({ confirmLoading: true });
      try {
        const response = await useAuthRequest(() => getHazardDetail(id));
        const detail = unwrapHazardDetail(response, id);
        if (!detail) {
          return;
        }
        fillForm(detail, id);
      } catch (error) {
        console.error(error);
        message.error("获取隐患详情失败，已使用列表数据回填");
      } finally {
        confirmModalApi.setState({ confirmLoading: false });
      }
    };

    const openModal = (record: HazardLedgerRecordVO): void => {
      resetForm();
      fillForm(record);
      confirmModalApi.open();
      void loadDetail(String(record.id));
    };

    expose({ openModal });

    const modalSlots = {
      default: (): JSX.Element => (
        <div class="hazard-confirm-modal">
          <Form layout="vertical" model={confirmForm}>
            <FormItem label="隐患图片" required>
              <FileUpload
                v-model:value={confirmForm.sceneImages}
                multiple
                showText
                maxCount={3}
                type="picture-card"
                size={100}
                sceneCode={HAZARD_FILE_SCENE_CODE}
                customText="请上传图片，最多3张，单个附件最大支持100MB"
                typeList={[".png", ".jpg", ".jpeg", ".webp"]}
                accept="image/*"
              />
            </FormItem>
            <FormItem label="隐患描述" required>
              <Textarea v-model:value={confirmForm.description} rows={3} placeholder="请输入隐患描述" />
            </FormItem>
            <div class="hazard-modal-grid">
              <FormItem label="隐患类型" required>
                <HazardCategoryCascader v-model:value={confirmForm.categoryPath} placeholder="请选择隐患类型" />
              </FormItem>
              <FormItem label="等级" required>
                <Select v-model:value={confirmForm.level} options={hazardLevelOptions} />
              </FormItem>
              <FormItem class="hazard-risk-unit-object-form-item">
                <RiskUnitObjectSelect
                  v-model:unitValue={confirmForm.riskUnitId}
                  v-model:unitName={confirmForm.riskUnitName}
                  v-model:objectValue={confirmForm.riskObjectId}
                  v-model:objectName={confirmForm.riskObjectName}
                />
              </FormItem>
              <FormItem label="位置" required>
                <Space class="hazard-create-location" size={8}>
                  <Input value={confirmForm.locationName} placeholder="请通过地图选择位置" disabled />
                  <Button onClick={openLocationPicker}>选择位置</Button>
                </Space>
              </FormItem>
              <FormItem label="整改时限" required>
                <Select v-model:value={confirmForm.deadline} options={rectificationDeadlineHourOptions} />
              </FormItem>
            </div>
            <div class="hazard-modal-grid">
              <FormItem label="整改责任人" required>
                <UserSelect
                  class="hazard-user-select"
                  v-model:value={confirmForm.rectifierUserId}
                  allowClear
                  showSearch
                  onChange={(_value, option) => {
                    const selected = option as { name?: string; label?: string } | undefined;
                    confirmForm.rectifierUserName = selected?.name || selected?.label || "";
                  }}
                />
              </FormItem>
              <FormItem label="验收人" required>
                <UserSelect
                  class="hazard-user-select"
                  v-model:value={confirmForm.acceptorUserId}
                  allowClear
                  showSearch
                  onChange={(_value, option) => {
                    const selected = option as { name?: string; label?: string } | undefined;
                    confirmForm.acceptorUserName = selected?.name || selected?.label || "";
                  }}
                />
              </FormItem>
            </div>
          </Form>
          <LocationPickerModal ref={locationPickerModalRef} onSelected={handleLocationSelected} />
        </div>
      ),
    };

    return () => <ConfirmModal v-slots={modalSlots} />;
  },
});
