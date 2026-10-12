import { HazardLevel as HazardLevelEnum } from "@g2-contract/hazard-governance";
import { defineComponent, reactive, shallowRef } from "vue";

import { ApprovalTemplateSelect } from "../../../components/approval-template-select";
import { hazardLevelOptions, rectificationDeadlineHourOptions, type HazardLevel } from "../../../shared/data";
import { useAuthRequest } from "@/api/request";
import { createHazardCategory, updateHazardCategory } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Input, Select, Space, Switch, message } from "@/pc-ui-runtime";

type TypeRuleModalMode = "create" | "update";

export interface TypeRuleModalOpenOptions {
  mode?: TypeRuleModalMode;
  id?: string;
  categoryId: string;
  categoryName: string;
  parentName: string;
  sortNo: number;
  name?: string;
  level?: HazardLevel;
  approvalTemplateId?: string;
  limitHours?: number;
  returnThreshold?: number;
  enabled?: boolean;
}

export interface TypeRuleModalSavedPayload {
  id: string;
  categoryId: string;
  mode: TypeRuleModalMode;
}

interface ApprovalTemplateOption {
  label: string;
  value: string;
}

const thresholdOptions = [
  { label: "1次", value: 1 },
  { label: "2次", value: 2 },
  { label: "3次", value: 3 },
  { label: "5次", value: 5 },
];

export const TypeRuleModal = defineComponent({
  name: "TypeRuleModal",
  emits: ["saved"],
  setup: (_, { emit, expose }) => {
    const modalTitle = shallowRef("新增三级类型");
    const form = reactive({
      mode: "create" as TypeRuleModalMode,
      id: "",
      categoryId: "",
      categoryName: "",
      parentName: "",
      sortNo: 0,
      name: "",
      level: HazardLevelEnum.GENERAL as HazardLevel,
      approvalTemplateId: "",
      limitHours: 168,
      returnThreshold: 3,
      enabled: true,
    });

    const openModal = (options: TypeRuleModalOpenOptions): void => {
      const mode = options.mode ?? "create";
      modalTitle.value = mode === "create" ? "新增三级类型" : "编辑三级类型";
      form.mode = mode;
      form.id = options.id ?? "";
      form.categoryId = options.categoryId;
      form.categoryName = options.categoryName;
      form.parentName = options.parentName;
      form.sortNo = options.sortNo;
      form.name = options.name ?? "";
      form.level = options.level ?? HazardLevelEnum.GENERAL;
      form.approvalTemplateId = options.approvalTemplateId ?? "";
      form.limitHours = options.limitHours ?? 168;
      form.returnThreshold = options.returnThreshold ?? 3;
      form.enabled = options.enabled ?? true;
      modalApi.setState({ title: modalTitle.value, confirmLoading: false });
      modalApi.open();
    };

    const submit = async (): Promise<void> => {
      const name = form.name.trim();
      if (!name) {
        message.warning("请输入隐患类型名称");
        return;
      }
      if (!form.approvalTemplateId) {
        message.warning("请选择审批链模板");
        return;
      }
      modalApi.setConfirmLoading(true);
      try {
        const payload = {
          name,
          parentId: form.categoryId,
          defaultLevel: form.level,
          approvalTemplateId: form.approvalTemplateId,
          defaultDeadlineHours: form.limitHours,
          acceptanceRejectThreshold: form.returnThreshold,
          enabled: form.enabled,
          sortNo: form.sortNo,
        };
        if (form.mode === "create") {
          const nextId = await useAuthRequest(() => createHazardCategory(payload));
          emit("saved", { id: String(nextId), categoryId: form.categoryId, mode: form.mode } as TypeRuleModalSavedPayload);
        } else {
          await useAuthRequest(() => updateHazardCategory(form.id, payload));
          emit("saved", { id: form.id, categoryId: form.categoryId, mode: form.mode } as TypeRuleModalSavedPayload);
        }
        modalApi.close();
      } catch {
        message.error(form.mode === "create" ? "新增三级类型失败" : "三级类型保存失败");
      } finally {
        modalApi.setConfirmLoading(false);
      }
    };

    const handleTemplatesLoaded = (options: ApprovalTemplateOption[]): void => {
      if (!form.approvalTemplateId) {
        form.approvalTemplateId = options[0]?.value ?? "";
      }
    };

    const [PcModal, modalApi] = usePcModal({
      title: modalTitle.value,
      width: "640px",
      onConfirm: () => {
        void submit();
      },
      onCancel: () => modalApi.close(),
    });

    expose({ openModal });

    const slots = {
      default: (): JSX.Element => (
        <div class="hazard-type-rule-modal">
          <div class="hazard-type-rule-context">
            <span>所属品类</span>
            <strong>{form.parentName ? `${form.parentName} / ${form.categoryName}` : form.categoryName}</strong>
          </div>
          <div class="hazard-type-rule-field">
            <span>类型名称</span>
            <Input v-model:value={form.name} placeholder="请输入隐患类型名称" maxlength={100} />
          </div>
          <div class="hazard-type-rule-grid">
            <div class="hazard-type-rule-field">
              <span>默认等级</span>
              <Select v-model:value={form.level} options={hazardLevelOptions} />
            </div>
            <div class="hazard-type-rule-field">
              <span>审批链模板</span>
              <ApprovalTemplateSelect
                v-model:value={form.approvalTemplateId}
                placeholder="请选择审批链模板"
                onLoaded={handleTemplatesLoaded}
              />
            </div>
            <div class="hazard-type-rule-field">
              <span>默认时限</span>
              <Select v-model:value={form.limitHours} options={rectificationDeadlineHourOptions} />
            </div>
            <div class="hazard-type-rule-field">
              <span>退回阈值</span>
              <Select v-model:value={form.returnThreshold} options={thresholdOptions} />
            </div>
          </div>
          <div class="hazard-type-rule-field">
            <span>启用状态</span>
            <Space>
              <Switch
                v-model:checked={form.enabled}
                checked-children="启用"
                un-checked-children="禁用"
                checkedValue
                unCheckedValue={false}
                onChange={(checked) => {
                  form.enabled = Boolean(checked);
                }}
              />
            </Space>
          </div>
        </div>
      ),
    };

    return (): JSX.Element => <PcModal v-slots={slots} />;
  },
});
