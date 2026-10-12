import type { CertTypeVO } from "@g2-contract/safety-personnel";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectOption,
  Spin,
  message,
} from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { computed, defineComponent, reactive, ref } from "vue";

import { certAttachmentToOssFiles } from "../../api/file-service";
import { createCertificate, getCertificate, updateCertificate } from "../../api/safety-personnel";
import { FileUpload, type OSSFile } from "../../components/file-upload";
import { PersonPickerModal } from "../../components/person-picker-modal/person-picker-modal";
import { FILE_BUCKET, FILE_SCENE_CODE } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import type { PoolPersonUI } from "../../types/ui";
import { showApiError } from "../../utils/api-error";
import { calcCertValidityFromType, isCertDateOrderInvalid } from "../../utils/cert-date";
import {
  CERT_REVIEW_STATUS,
  getEditReviewStatusOptions,
  resolveInitialReviewStatus,
  syncReviewStatusOnNeedReviewChange,
} from "../../utils/cert-review";
import { withPreviewPaths } from "../../utils/file-url";

import styles from "./cert-form-drawer.module.css";

export const CertFormDrawer = defineComponent({
  emits: ["saved"],
  setup(_, { expose, emit }) {
    const open = ref(false);
    const loading = ref(false);
    const saving = ref(false);
    const mode = ref<"add" | "edit">("add");
    const editingCertId = ref<string | null>(null);
    const pickerOpen = ref(false);
    const typeOptions = ref<CertTypeVO[]>([]);
    const selectedUserId = ref<string | null>(null);
    const certImageFiles = ref<OSSFile[]>([]);
    const form = reactive({
      certTypeId: undefined as string | undefined,
      employeeName: "",
      dept: "",
      post: "",
      certName: "",
      certNo: "",
      issueDate: null as string | null,
      validStart: null as string | null,
      validEnd: null as string | null,
      needReview: true,
      reviewStatus: "",
      issueOrg: "",
    });

    const resetForm = (): void => {
      selectedUserId.value = null;
      form.certTypeId = undefined;
      form.employeeName = "";
      form.dept = "";
      form.post = "";
      form.certName = "";
      form.certNo = "";
      form.issueDate = null;
      form.validStart = null;
      form.validEnd = null;
      form.needReview = true;
      form.reviewStatus = "";
      form.issueOrg = "";
      certImageFiles.value = [];
    };

    const fillFromDetail = async (id: string): Promise<void> => {
      const detail = await useAuthRequest(() => getCertificate(id));
      editingCertId.value = id;
      form.certTypeId = detail.typeId != null ? String(detail.typeId) : undefined;
      selectedUserId.value = detail.userId != null ? String(detail.userId) : null;
      form.employeeName = detail.userName ?? "";
      form.dept = detail.deptName ?? "";
      form.post = detail.postName ?? "";
      form.certName = detail.certName ?? "";
      form.certNo = detail.certNo ?? "";
      form.issueDate = detail.issueDate ?? null;
      form.validStart = detail.validStart ?? null;
      form.validEnd = detail.validEnd ?? null;
      form.needReview = detail.needReview ?? false;
      form.reviewStatus = detail.reviewStatus ?? resolveInitialReviewStatus(detail.needReview ?? false);
      form.issueOrg = detail.issueOrg ?? "";
      certImageFiles.value = await certAttachmentToOssFiles(detail.attachmentFile, detail.attachmentFileId);
    };

    const showAdd = (types: CertTypeVO[]): void => {
      mode.value = "add";
      editingCertId.value = null;
      typeOptions.value = types;
      resetForm();
      open.value = true;
    };

    const showEdit = async (types: CertTypeVO[], id: string): Promise<void> => {
      mode.value = "edit";
      typeOptions.value = types;
      resetForm();
      open.value = true;
      loading.value = true;
      try {
        await fillFromDetail(id);
      } catch (e) {
        showApiError(e);
        open.value = false;
      } finally {
        loading.value = false;
      }
    };

    expose({
      open: showAdd,
      openEdit: (types: CertTypeVO[], id: string) => {
        void showEdit(types, id);
      },
    });

    const drawerTitle = computed(() => (mode.value === "add" ? "新增证书" : "编辑证书"));
    const isEditMode = computed(() => mode.value === "edit");
    const reviewStatusOptions = computed(() => getEditReviewStatusOptions());

    const syncReviewStatus = (): void => {
      form.reviewStatus =
        mode.value === "edit"
          ? syncReviewStatusOnNeedReviewChange(form.needReview, form.reviewStatus)
          : resolveInitialReviewStatus(form.needReview);
    };

    const selectedType = computed(() => typeOptions.value.find((t) => String(t.id) === form.certTypeId));

    const pickerInitialSelected = computed((): PoolPersonUI[] => {
      if (!selectedUserId.value) {
        return [];
      }
      return [
        {
          personId: selectedUserId.value,
          name: form.employeeName,
          dept: form.dept,
          post: form.post,
          phone: "",
        },
      ];
    });

    const canSave = computed(() =>
      Boolean(
        form.certTypeId &&
        selectedUserId.value &&
        form.certName.trim() &&
        form.certNo.trim() &&
        form.issueDate &&
        form.validStart &&
        form.validEnd &&
        form.issueOrg.trim() &&
        form.issueOrg.trim().length <= 30 &&
        !isCertDateOrderInvalid(form.issueDate, form.validStart, form.validEnd) &&
        (!isEditMode.value || Boolean(form.reviewStatus)),
      ),
    );

    const applyValidityFromType = (): void => {
      if (!form.issueDate || !selectedType.value) {
        return;
      }
      const { validStart, validEnd } = calcCertValidityFromType(form.issueDate, selectedType.value);
      form.validStart = validStart;
      form.validEnd = validEnd;
    };

    const onCertTypeChange = (typeId: string): void => {
      form.certTypeId = typeId;
      const type = typeOptions.value.find((t) => String(t.id) === typeId);
      if (type) {
        form.needReview = type.needReview ?? false;
        syncReviewStatus();
      }
      applyValidityFromType();
    };

    const onIssueDateChange = (value: string): void => {
      form.issueDate = value || null;
      applyValidityFromType();
    };

    const openPicker = (): void => {
      pickerOpen.value = true;
    };

    const onPickEmployee = (rows: PoolPersonUI[]): void => {
      const row = rows[0];
      if (!row) {
        return;
      }
      selectedUserId.value = row.personId;
      form.employeeName = row.name;
      form.dept = row.dept;
      form.post = row.post;
    };

    const onSave = async (): Promise<void> => {
      if (!canSave.value || selectedUserId.value == null || !form.certTypeId) {
        return;
      }
      const type = selectedType.value;
      const payload = {
        userId: selectedUserId.value,
        userName: form.employeeName.trim() || undefined,
        categoryId: type?.categoryId ?? "",
        typeId: form.certTypeId,
        certName: form.certName.trim(),
        certNo: form.certNo.trim(),
        issueOrg: form.issueOrg.trim(),
        issueDate: form.issueDate || undefined,
        validStart: form.validStart || undefined,
        validEnd: form.validEnd || undefined,
        reviewStatus: form.reviewStatus || resolveInitialReviewStatus(form.needReview),
        certStatus: "VALID",
        attachmentFileId: certImageFiles.value[0]?.id ? String(certImageFiles.value[0].id) : undefined,
      };
      saving.value = true;
      try {
        if (mode.value === "edit" && editingCertId.value) {
          await useAuthRequest(() => updateCertificate(editingCertId.value!, payload));
          message.success("编辑成功");
        } else {
          await useAuthRequest(() => createCertificate(payload));
          message.success("新增成功");
        }
        open.value = false;
        emit("saved");
      } catch (e) {
        showApiError(e, "保存失败");
      } finally {
        saving.value = false;
      }
    };

    return () => (
      <>
        <Drawer
          open={open.value}
          title={drawerTitle.value}
          width={520}
          onClose={() => {
            open.value = false;
          }}
          v-slots={{
            footer: () =>
              !loading.value && (
                <div class={styles.drawerFooter}>
                  <Button
                    class={styles.cancelBtn}
                    onClick={() => {
                      open.value = false;
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    disabled={!canSave.value}
                    loading={saving.value}
                    onClick={() => {
                      void onSave();
                    }}
                  >
                    保存
                  </Button>
                </div>
              ),
          }}
        >
          {loading.value ? (
            <Spin />
          ) : (
            <Form layout="vertical">
              <FormItem label="证书类型" required>
                <Select placeholder="请选择" value={form.certTypeId} onUpdate:value={(value) => onCertTypeChange(String(value ?? ""))}>
                  {typeOptions.value.map((t) => (
                    <SelectOption key={t.id} value={String(t.id)}>
                      {t.typeName}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
              <FormItem label="员工" required>
                <div class={styles.row}>
                  <span class={styles.pickerField} onClick={openPicker}>
                    <Input readonly showCount={false} class={styles.pickerInput} value={form.employeeName} placeholder="请选择员工" />
                  </span>
                  <Button onClick={openPicker}>选择</Button>
                </div>
              </FormItem>
              <FormItem label="部门">
                <Input disabled showCount={false} value={form.dept} />
              </FormItem>
              <FormItem label="岗位">
                <Input disabled showCount={false} value={form.post} />
              </FormItem>
              <FormItem label="证书名称" required>
                <Input
                  value={form.certName}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.certName = v;
                  }}
                />
              </FormItem>
              <FormItem label="证书编号" required>
                <Input
                  value={form.certNo}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.certNo = v;
                  }}
                />
              </FormItem>
              <FormItem label="发证日期" required>
                <DatePicker
                  valueFormat="YYYY-MM-DD"
                  value={form.issueDate ?? ""}
                  onUpdate:value={(value) => onIssueDateChange(typeof value === "string" ? value : (value?.format("YYYY-MM-DD") ?? ""))}
                  style={{ width: "100%" }}
                />
              </FormItem>
              <FormItem label="有效期开始" required>
                <DatePicker
                  valueFormat="YYYY-MM-DD"
                  value={form.validStart ?? ""}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.validStart = v || null;
                  }}
                  style={{ width: "100%" }}
                />
              </FormItem>
              <FormItem label="有效期结束" required>
                <DatePicker
                  valueFormat="YYYY-MM-DD"
                  value={form.validEnd ?? ""}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.validEnd = v || null;
                  }}
                  style={{ width: "100%" }}
                />
              </FormItem>
              <FormItem label="是否需要复审">
                <RadioGroup
                  value={form.needReview}
                  onUpdate:value={(v: boolean) => {
                    form.needReview = v;
                    syncReviewStatus();
                  }}
                >
                  <Radio value={true}>是</Radio>
                  <Radio value={false}>否</Radio>
                </RadioGroup>
              </FormItem>
              {isEditMode.value && (
                <FormItem label="复审状态" required>
                  <Select
                    placeholder="请选择"
                    value={form.reviewStatus || undefined}
                    onUpdate:value={(value) => {
                      const v = String(value ?? "");
                      form.reviewStatus = v;
                      form.needReview = v !== CERT_REVIEW_STATUS.NOT_REQUIRED;
                    }}
                  >
                    {reviewStatusOptions.value.map((status) => (
                      <SelectOption key={status} value={status}>
                        {status}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
              )}
              <FormItem label="发证机构" required>
                <Input
                  maxlength={30}
                  value={form.issueOrg}
                  onUpdate:value={(value) => {
                    const v = String(value ?? "");
                    form.issueOrg = v;
                  }}
                />
              </FormItem>
              <FormItem label="证书图片">
                <FileUpload
                  sceneCode={FILE_SCENE_CODE.CERT_ATTACHMENT}
                  businessKey={FILE_BUCKET}
                  useTemporaryUpload
                  value={certImageFiles.value}
                  onUpdate:value={(files: OSSFile[]) => {
                    certImageFiles.value = withPreviewPaths(files);
                  }}
                  maxCount={1}
                  type="picture-card"
                  showText
                  accept=".png,.jpg,.jpeg,.PDF,.JPG,.JPEG,.PNG"
                  typeList={[".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"]}
                  size={5}
                  customText="支持图片，单张不超过 5MB"
                />
              </FormItem>
            </Form>
          )}
        </Drawer>
        <PersonPickerModal
          open={pickerOpen.value}
          mode="single"
          source="org-candidates"
          initialSelected={pickerInitialSelected.value}
          onUpdate:open={(v: boolean) => {
            pickerOpen.value = v;
          }}
          onConfirm={onPickEmployee}
        />
      </>
    );
  },
});
