import type { FacilityDetail, FacilityModifyRequest } from "@g2-contract/electrical-safety";
import {
  Form,
  type FormExpose,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Textarea,
  TreeSelect,
  message,
} from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent, reactive, ref, watch } from "vue";

export interface FacilitySelectOption {
  label: string;
  value: string;
}

export interface FacilityAreaTreeOption extends FacilitySelectOption {
  children: FacilityAreaTreeOption[];
}

interface FacilityFormDraft {
  facilityName: string;
  areaId: string;
  floorArea: number | null;
  fireRatingCode: string;
  fireResistanceLevelCode: string;
  responsibleId: string;
  remark: string;
}

const emptyDraft = (): FacilityFormDraft => ({
  facilityName: "",
  areaId: "",
  floorArea: null,
  fireRatingCode: "",
  fireResistanceLevelCode: "",
  responsibleId: "",
  remark: "",
});

export const FacilityModal = defineComponent({
  name: "FacilityModal",
  props: {
    open: { type: Boolean, required: true },
    facility: { type: Object as PropType<FacilityDetail | null>, default: null },
    loading: { type: Boolean, default: false },
    areaOptions: { type: Array as PropType<FacilityAreaTreeOption[]>, default: () => [] },
    responsibleOptions: { type: Array as PropType<FacilitySelectOption[]>, default: () => [] },
    fireRatingOptions: { type: Array as PropType<FacilitySelectOption[]>, default: () => [] },
    fireResistanceOptions: { type: Array as PropType<FacilitySelectOption[]>, default: () => [] },
    submitting: { type: Boolean, default: false },
  },
  emits: {
    close: (): boolean => true,
    save: (_payload: FacilityModifyRequest): boolean => true,
  },
  setup: (props, { emit }) => {
    const formRef = ref<FormExpose>();
    const draft = reactive<FacilityFormDraft>(emptyDraft());

    watch(
      () => [props.open, props.facility] as const,
      () => {
        Object.assign(
          draft,
          emptyDraft(),
          props.facility
            ? {
                facilityName: props.facility.facilityName,
                areaId: String(props.facility.areaId),
                floorArea: props.facility.floorArea,
                fireRatingCode: props.facility.fireRatingCode,
                fireResistanceLevelCode: props.facility.fireResistanceLevelCode ?? "",
                responsibleId: props.facility.responsibleId == null ? "" : String(props.facility.responsibleId),
                remark: props.facility.remark ?? "",
              }
            : {},
        );
      },
      { immediate: true },
    );

    const handleSave = async (): Promise<void> => {
      try {
        await formRef.value?.validate();
        emit("save", {
          facilityName: draft.facilityName.trim(),
          areaId: draft.areaId,
          floorArea: draft.floorArea,
          fireRatingCode: draft.fireRatingCode,
          fireResistanceLevelCode: draft.fireResistanceLevelCode || null,
          responsibleId: draft.responsibleId || null,
          remark: draft.remark.trim() || null,
        });
      } catch {
        message.warning("请完整填写设施必填信息");
      }
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={props.facility ? "编辑设施" : "新增设施"}
        width="760px"
        wrapClassName="electrical-viewport-modal"
        destroyOnClose
        confirmLoading={props.submitting}
        onCancel={() => emit("close")}
        onOk={() => void handleSave()}
      >
        <Spin spinning={props.loading}>
          <Form
            ref={formRef}
            model={draft}
            layout="vertical"
            rules={{
              facilityName: [{ required: true, whitespace: true, message: "请输入设施名称" }],
              areaId: [{ required: true, message: "请选择所属区域" }],
              floorArea: [{ type: "number" as const, min: 0, message: "面积不能小于0" }],
              fireRatingCode: [{ required: true, message: "请选择火灾危险性" }],
            }}
          >
            <div class="electrical-modal-form-grid">
              <FormItem label="设施名称" name="facilityName">
                <Input
                  value={draft.facilityName}
                  maxlength={128}
                  placeholder="请输入设施名称"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.facilityName = value);
                  }}
                />
              </FormItem>
              <FormItem label="所属区域" name="areaId">
                <TreeSelect
                  showSearch
                  value={draft.areaId || undefined}
                  placeholder="请选择所属区域"
                  treeData={props.areaOptions}
                  fieldNames={{ label: "label", value: "value", children: "children" }}
                  treeDefaultExpandAll
                  treeNodeFilterProp="label"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.areaId = value);
                  }}
                />
              </FormItem>
              <FormItem label="面积（㎡）" name="floorArea">
                <InputNumber
                  value={draft.floorArea ?? undefined}
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="请输入面积"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as number | undefined;
                    return (draft.floorArea = value ?? null);
                  }}
                />
              </FormItem>
              <FormItem label="火灾危险性" name="fireRatingCode">
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={draft.fireRatingCode || undefined}
                  placeholder="请选择火灾危险性"
                  options={props.fireRatingOptions}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.fireRatingCode = value);
                  }}
                />
              </FormItem>
              <FormItem label="耐火等级" name="fireResistanceLevelCode">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  value={draft.fireResistanceLevelCode || undefined}
                  placeholder="请选择耐火等级"
                  options={props.fireResistanceOptions}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string | undefined;
                    return (draft.fireResistanceLevelCode = value ?? "");
                  }}
                />
              </FormItem>
              <FormItem label="责任人" name="responsibleId">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  value={draft.responsibleId || undefined}
                  placeholder="请选择责任人"
                  options={props.responsibleOptions}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string | undefined;
                    return (draft.responsibleId = value ?? "");
                  }}
                />
              </FormItem>
              <FormItem class="electrical-modal-form-full" label="备注" name="remark">
                <Textarea
                  value={draft.remark}
                  maxlength={500}
                  rows={3}
                  placeholder="请输入备注"
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (draft.remark = value);
                  }}
                />
              </FormItem>
            </div>
          </Form>
        </Spin>
      </Modal>
    );
  },
});
