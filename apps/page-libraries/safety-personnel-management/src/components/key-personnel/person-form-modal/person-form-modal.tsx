import { showApiError } from "../../../utils/api-error";
/** @jsxImportSource vue */
import type { KeyPersonAreaOptionVO, KeyPersonDetailVO, KeyPersonRiskLevel } from "@g2-contract/safety-personnel";
import { Cascader, Form, FormItem, Input, Modal, Select, SelectOption, Textarea, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import {
  createKeyPerson,
  getKeyPersonAreaOptions,
  getKeyPersonDetail,
  getKeyPersonSupervisorOptions,
  updateKeyPerson,
} from "../../../api/safety-personnel";
import { KEY_PERSON_ATTACHMENT_TYPE_LIST, KEY_PERSON_RISK_LEVEL_OPTIONS, KEY_PERSON_SCENE } from "../../../constants";
import { useAuthRequest } from "../../../hooks/use-auth-request";
import { type AreaTreeNode, areaOptionsToTree, findAreaSequencePath } from "../../../utils/key-personnel/area-tree";
import { toImageSrc } from "../../../utils/key-personnel/file-attachment";
import { FileUpload, type OSSFile } from "../../file-upload";

function trimRequired(v: string, maxLen = 50): boolean {
  const t = v.trim();
  return t.length > 0 && t.length <= maxLen;
}

export const PersonFormModal = defineComponent({
  emits: ["success"],
  setup(_, { emit, expose }) {
    const visible = ref(false);
    const submitting = ref(false);
    const editId = ref<number | null>(null);
    const areaTree = ref<AreaTreeNode[]>([]);
    const rawAreas = ref<KeyPersonAreaOptionVO[]>([]);
    const supervisorOptions = ref<{ label: string; value: number }[]>([]);

    const form = reactive({
      name: "",
      phone: "",
      idCard: "",
      areaSequence: [] as string[],
      riskLevel: "HIGH" as KeyPersonRiskLevel,
      supervisorUserId: undefined as number | undefined,
      supervisionReason: "",
      photoFiles: [] as OSSFile[],
      attachmentFiles: [] as OSSFile[],
      originalAttachmentIds: [] as string[],
    });

    const reset = (): void => {
      form.name = "";
      form.phone = "";
      form.idCard = "";
      form.areaSequence = [];
      form.riskLevel = "HIGH";
      form.supervisorUserId = undefined;
      form.supervisionReason = "";
      form.photoFiles = [];
      form.attachmentFiles = [];
      form.originalAttachmentIds = [];
    };

    const loadOptions = async (): Promise<void> => {
      const [areas, supervisors] = await Promise.all([
        useAuthRequest(() => getKeyPersonAreaOptions()),
        useAuthRequest(() => getKeyPersonSupervisorOptions()),
      ]);
      rawAreas.value = areas;
      areaTree.value = areaOptionsToTree(areas);
      supervisorOptions.value = supervisors.map((s) => ({
        label: s.organizationName ? `${s.name} (${s.organizationName})` : s.name,
        value: s.userId,
      }));
    };

    const applyDetail = (detail: KeyPersonDetailVO): void => {
      form.name = detail.name;
      form.phone = detail.phone;
      form.idCard = detail.idCard ?? "";
      form.riskLevel = detail.riskLevel;
      form.supervisorUserId = detail.supervisorUserId;
      form.supervisionReason = detail.supervisionReason ?? "";
      if (detail.areaSequence) {
        const path = findAreaSequencePath(rawAreas.value, detail.areaSequence);
        form.areaSequence = path ?? [detail.areaSequence];
      }
      if (detail.photoFile) {
        form.photoFiles = [
          {
            id: String(detail.photoFile.id),
            name: detail.photoFile.name ?? "",
            path: toImageSrc(detail.photoFile),
            suffix: detail.photoFile.suffix ?? "",
            size: detail.photoFile.size ?? 0,
            type: detail.photoFile.type ?? "",
            refCount: detail.photoFile.refCount ?? 0,
            businessKey: null,
          },
        ];
      }
      form.originalAttachmentIds = (detail.personAttachmentFileIds ?? []).map((id) => String(id));
      form.attachmentFiles = (detail.personAttachmentFiles ?? []).map((f) => ({
        id: String(f.id),
        name: f.name ?? "",
        path: toImageSrc(f),
        suffix: f.suffix ?? "",
        size: f.size ?? 0,
        type: f.type ?? "",
        refCount: f.refCount ?? 0,
        businessKey: null,
      }));
    };

    const openAdd = (): void => {
      editId.value = null;
      reset();
      visible.value = true;
      void loadOptions().catch((error) => showApiError(error));
    };

    const openEdit = (id: number): void => {
      editId.value = id;
      reset();
      visible.value = true;
      void (async () => {
        const [, detail] = await Promise.all([loadOptions(), useAuthRequest(() => getKeyPersonDetail(id))]);
        applyDetail(detail);
      })().catch((error) => showApiError(error));
    };

    const validate = (): boolean => {
      if (!trimRequired(form.name)) {
        message.warning("请填写姓名（50字以内）");
        return false;
      }
      if (!trimRequired(form.phone)) {
        message.warning("请填写手机号");
        return false;
      }
      if (form.areaSequence.length === 0) {
        message.warning("请选择区域");
        return false;
      }
      if (!form.supervisorUserId) {
        message.warning("请选择监管人员");
        return false;
      }
      if (!trimRequired(form.supervisionReason, 500)) {
        message.warning("请填写监管原因（500字以内）");
        return false;
      }
      return true;
    };

    const submit = async (): Promise<void> => {
      if (!validate()) {
        return;
      }
      const areaSequence = form.areaSequence.at(-1) ?? "";
      const attachmentIds = form.attachmentFiles.length > 0 ? form.attachmentFiles.map((f) => f.id) : form.originalAttachmentIds;

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        idCard: form.idCard.trim() || undefined,
        areaSequence,
        riskLevel: form.riskLevel,
        supervisorUserId: form.supervisorUserId!,
        supervisionReason: form.supervisionReason.trim(),
        photoFileId: form.photoFiles[0]?.id,
        clearPhoto: form.photoFiles.length === 0,
        personAttachmentFileIds: attachmentIds,
      };

      submitting.value = true;
      try {
        if (editId.value) {
          await useAuthRequest(() => updateKeyPerson(editId.value!, payload));
          message.success("保存成功");
        } else {
          await useAuthRequest(() => createKeyPerson(payload));
          message.success("新增成功");
        }
        visible.value = false;
        emit("success");
      } catch (error) {
        showApiError(error);
      } finally {
        submitting.value = false;
      }
    };

    expose({ openAdd, openEdit });

    const riskOptions = KEY_PERSON_RISK_LEVEL_OPTIONS.filter((o) => o.value !== "");

    return () => (
      <Modal
        open={visible.value}
        title={editId.value ? "编辑重点人员" : "新增重点人员"}
        width={720}
        confirmLoading={submitting.value}
        onOk={() => {
          void submit();
        }}
        onCancel={() => {
          visible.value = false;
        }}
      >
        <Form layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormItem label="姓名" required>
              <Input v-model:value={form.name} maxlength={50} />
            </FormItem>
            <FormItem label="手机号" required>
              <Input v-model:value={form.phone} />
            </FormItem>
            <FormItem label="身份证号">
              <Input v-model:value={form.idCard} />
            </FormItem>
            <FormItem label="区域" required>
              <Cascader v-model:value={form.areaSequence} options={areaTree.value} placeholder="请选择区域" changeOnSelect />
            </FormItem>
            <FormItem label="风险等级" required>
              <Select v-model:value={form.riskLevel}>
                {riskOptions.map((o) => (
                  <SelectOption key={o.value} value={o.value}>
                    {o.label}
                  </SelectOption>
                ))}
              </Select>
            </FormItem>
            <FormItem label="监管人员" required>
              <Select v-model:value={form.supervisorUserId} showSearch optionFilterProp="label">
                {supervisorOptions.value.map((o) => (
                  <SelectOption key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectOption>
                ))}
              </Select>
            </FormItem>
          </div>
          <FormItem label="监管原因" required>
            <Textarea v-model:value={form.supervisionReason} rows={3} maxlength={500} showCount />
          </FormItem>
          <FormItem label="相关附件">
            <FileUpload
              sceneCode={KEY_PERSON_SCENE.ATTACHMENT}
              v-model:value={form.attachmentFiles}
              multiple
              maxCount={5}
              type="text"
              showText={true}
              typeList={KEY_PERSON_ATTACHMENT_TYPE_LIST}
              size={300}
              customText="支持上传图片（.png/.jpeg/.jpg）、视频（MP4、AVI、MKV）、文档（.doc/.docx/.xls/.xlsx/.ppt/.pptx/.pdf），单个最大 300MB"
            />
          </FormItem>
          <FormItem label="人员照片">
            <FileUpload
              sceneCode={KEY_PERSON_SCENE.PHOTO}
              v-model:value={form.photoFiles}
              maxCount={1}
              type="picture-card"
              showText={true}
              accept=".png,.jpg,.jpeg,.PNG,.JPG,.JPEG"
              typeList={[".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"]}
              size={5}
              customText="仅支持图片格式（.png / .jpeg / .jpg），单张不超过 5MB"
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
