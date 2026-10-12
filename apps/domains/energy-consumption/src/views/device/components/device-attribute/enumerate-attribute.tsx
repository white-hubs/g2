import { defineComponent, ref, watch, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { Radio, RadioGroup, message } from "@/pc-ui-runtime";

const RadioButton = Radio.Button;

type AttributeItem = {
  attributeCode: string;
  attributeName: string;
  attributeKeyValueVos?: Array<{ label: string; value: string | number | boolean }>;
};

/** 枚举型属性：单选下发，对齐旧 enumerateAttribute.vue */
export const EnumerateAttribute = defineComponent({
  name: "EnumerateAttribute",
  props: {
    curValue: { type: [Boolean, String, Number] as PropType<boolean | string | number | null>, default: null },
    attributeItem: { type: Object as PropType<AttributeItem>, default: () => ({}) },
    deviceId: { type: [Number, String] as PropType<string | number | null>, default: null },
  },
  setup(props) {
    const value = ref(props.curValue ?? null);

    watch(
      () => props.curValue,
      (next) => {
        value.value = next ?? null;
      },
    );

    const changeValue = async () => {
      if (props.deviceId == null || !props.attributeItem.attributeCode) return;
      try {
        const client = await getDeviceCenterClient();
        await client.attributeWriteValue({
          deviceId: props.deviceId,
          propWriteValues: [{ code: props.attributeItem.attributeCode, expectedValue: value.value }],
        });
        message.success("下发指令成功");
      } catch (e) {
        message.error(e instanceof Error ? e.message : "下发失败");
      }
    };

    return () => (
      <>
        <span>{props.attributeItem.attributeName}：</span>
        <RadioGroup
          buttonStyle="solid"
          value={value.value}
          onUpdate:value={(v: string | number | boolean) => {
            value.value = v;
          }}
          onChange={() => void changeValue()}
        >
          {(props.attributeItem.attributeKeyValueVos || []).map((item, index) => (
            <RadioButton key={index} value={item.value}>
              {item.label}
            </RadioButton>
          ))}
        </RadioGroup>
      </>
    );
  },
});
