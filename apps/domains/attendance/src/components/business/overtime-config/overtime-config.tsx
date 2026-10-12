import type { FormExpose, FormRule } from "@g2-platform/pc-ui";
import { Form, FormItem, InputNumber, Radio, RadioGroup, Select } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, reactive, ref } from "vue";

import type { OverTimeRuleDetails } from "@/api/staff-overtime";

interface Props {
  readonly?: boolean;
  title: string;
  value: OverTimeRuleDetails;
  type: "WORK" | "REST" | "FESTIVAL";
}

/** 加班规则 配置 */
export const OvertimeConfig = defineComponent({
  props: ["title", "value", "type", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit, expose }) => {
    const formRef = ref<FormExpose>();
    expose({ formRef });
    const formState = reactive({
      type: props.type,
      workCondition: props.value.workCondition ?? undefined,
      units: props.value.units ?? undefined,
      method: props.value.method ?? undefined,
      afterTime: props.value.afterTime ?? null,
      compensate: props.value.compensate ?? undefined,
      compensationMethod: props.value.compensationMethod ?? undefined,
      proportion: props.value.proportion ?? 1,
    });

    const checkMethod = async (): Promise<void> => {
      if (!formState.method) {
        throw new Error("请选择时长核算方式");
      }
      return;
    };

    const checkCompensationMethod = async (): Promise<void> => {
      if (!formState.compensationMethod) {
        throw new Error("请选择加班补偿计算方法");
      }
      if (formState.compensationMethod === "SYSTEM" && !formState.compensate) {
        throw new Error("请选择加班补偿方式");
      }
      if (!formState.proportion) {
        throw new Error("请设置加班补偿比例");
      }
      return;
    };
    const formRules: Record<string, FormRule[]> = {
      workCondition: [{ required: true, message: "请选择加班审批条件", trigger: "blur" }],
      units: [{ required: true, message: "请选择加班计算单位", trigger: "blur" }],
      method: [{ required: true, validator: checkMethod, trigger: "blur" }],
      compensationMethod: [{ required: true, validator: checkCompensationMethod, trigger: [] }],
    };

    const emitValue = (): void => {
      emit("update:value", formState);
    };

    return (): VNode => (
      <div>
        <div style="font-weight:600;font-size:14px;padding-left:50px;margin-bottom:20px">{props.title}</div>
        <div style="margin-left:30px">
          <Form
            disabled={props.readonly}
            ref={formRef}
            model={formState}
            rules={formRules}
            labelCol={{ style: { width: "150px", display: "inline" } }}
          >
            <FormItem label="加班审批条件" name="workCondition">
              <RadioGroup onChange={emitValue} v-model:value={formState.workCondition}>
                <Radio value="ADVANCE">加班前发起审批</Radio>
                <Radio value="UNLIMITED">无限制</Radio>
              </RadioGroup>
            </FormItem>
            <FormItem label="加班计算单位" name="units">
              <Select
                options={[
                  { label: "半小时", value: "HALF_HOUR" },
                  { label: "小时", value: "HOUR" },
                ]}
                onChange={emitValue}
                v-model:value={formState.units}
                getPopupContainer={(trigger: HTMLElement) => trigger.parentElement ?? document.body}
              />
            </FormItem>
            <FormItem label="时长核算方式" name="method">
              <Select
                options={[
                  { label: "按加班审批通过的时长计算", value: "APPROVAL" },
                  { label: "在加班审批时段内，按实际打卡时间计算", value: "CLOCK" },
                ]}
                onChange={emitValue}
                v-model:value={formState.method}
                getPopupContainer={(trigger: HTMLElement) => trigger.parentElement ?? document.body}
              />
              <div style="display:flex;white-space:nowrap;align-items:center;margin-top:15px" v-show={props.title === "工作日加班"}>
                下班
                <InputNumber
                  style="width:100px;margin:0 10px"
                  placeholder="请输入"
                  max={999}
                  min={1}
                  v-model:value={formState.afterTime}
                  onChange={emitValue}
                />
                分钟后开始算加班
              </div>
            </FormItem>

            <FormItem label="加班补偿方式" name="compensationMethod">
              <Select
                options={[
                  { label: "系统自动计算", value: "SYSTEM" },
                  { label: "人工判定", value: "ARTIFICAL" },
                ]}
                onChange={() => {
                  formState.compensate = "";
                  emitValue();
                }}
                v-model:value={formState.compensationMethod}
                getPopupContainer={(trigger: HTMLElement) => trigger.parentElement ?? document.body}
              />
              <RadioGroup
                style="margin:10px 0;white-space:nowrap"
                onChange={emitValue}
                v-model:value={formState.compensate}
                disabled={formState.compensationMethod === "ARTIFICAL"}
              >
                <Radio value="LEAVE">计为调休</Radio>
                <Radio value="FEE">计算加班费</Radio>
                <Radio value="NOTHING">不做补偿</Radio>
              </RadioGroup>
              <div style="display:flex;white-space:nowrap;align-items:center;margin-top:5px">
                按照1:
                <InputNumber
                  style="width:100px;margin:0 10px"
                  placeholder="请输入"
                  min={0}
                  max={999}
                  v-model:value={formState.proportion}
                  disabled={formState.compensationMethod === "SYSTEM" && formState.compensate !== "LEAVE"}
                  onChange={emitValue}
                />
                比例计算调休时长
              </div>
            </FormItem>
          </Form>
        </div>
      </div>
    );
  },
});
