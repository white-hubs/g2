import { defineComponent, ref, watch, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { Input, message } from "@/pc-ui-runtime";

type AttributeItem = {
  attributeCode: string;
  attributeName: string;
};

/** 字符串属性：输入框防抖下发，对齐旧 setStringAttribute.vue */
export const SetStringAttribute = defineComponent({
  name: "SetStringAttribute",
  props: {
    curValue: { type: [String, Number] as PropType<string | number | null>, default: null },
    attributeItem: { type: Object as PropType<AttributeItem>, default: () => ({}) },
    deviceId: { type: [Number, String] as PropType<string | number | null>, default: null },
  },
  setup(props) {
    const value = ref(props.curValue != null ? String(props.curValue) : "");
    let timer: ReturnType<typeof setTimeout> | null = null;

    watch(
      () => props.curValue,
      (next) => {
        value.value = next != null ? String(next) : "";
      },
    );

    const changeValue = (next: string) => {
      value.value = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (props.deviceId == null || !props.attributeItem.attributeCode) return;
        try {
          const client = await getDeviceCenterClient();
          await client.attributeWriteValue({
            deviceId: props.deviceId,
            propWriteValues: [{ code: props.attributeItem.attributeCode, expectedValue: next }],
          });
          message.success("下发指令成功");
        } catch (e) {
          message.error(e instanceof Error ? e.message : "下发失败");
        }
      }, 500);
    };

    return () => (
      <div class="row" style="width: 100%;">
        <span>{props.attributeItem.attributeName}：</span>
        <Input value={value.value} style="margin-left: 16px; width: 160px" onUpdate:value={(v: string) => changeValue(v)} />
      </div>
    );
  },
});
