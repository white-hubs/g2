import { defineComponent, ref, watch, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { InputNumber, Slider, message } from "@/pc-ui-runtime";

type AttributeItem = {
  attributeCode: string;
  attributeName: string;
  valueMin?: unknown;
  valueMax?: unknown;
  precision?: number;
};

/** 数值型属性：滑块 + 数字输入下发，对齐旧 setValueAttribute.vue */
export const SetValueAttribute = defineComponent({
  name: "SetValueAttribute",
  props: {
    curValue: { type: [String, Number] as PropType<string | number | null>, default: null },
    attributeItem: { type: Object as PropType<AttributeItem>, default: () => ({}) },
    deviceId: { type: [Number, String] as PropType<string | number | null>, default: null },
  },
  setup(props) {
    const value = ref<number>(Number(props.curValue ?? 0));
    let timer: ReturnType<typeof setTimeout> | null = null;

    watch(
      () => props.curValue,
      (next) => {
        value.value = Number(next ?? 0);
      },
    );

    const changeValue = (next: number | null) => {
      if (next == null || Number.isNaN(next)) return;
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

    const min = Number(props.attributeItem.valueMin);
    const max = Number(props.attributeItem.valueMax);
    const showSlider =
      Number(props.attributeItem.valueMin) !== Number(props.attributeItem.valueMax) && !Number.isNaN(min) && !Number.isNaN(max);

    return () => (
      <div class="row flex-between" style="width: 100%;">
        <span>{props.attributeItem.attributeName}：</span>
        <div class="flex-start">
          {showSlider ? (
            <div class="flex-start">
              <div>
                <span>{props.attributeItem.valueMin != null ? min : "--"}&nbsp;</span>
              </div>
              <div style="width: 200px">
                <Slider
                  value={value.value}
                  min={min}
                  max={max}
                  onChange={(v) => changeValue(typeof v === "number" ? v : Number(Array.isArray(v) ? v[0] : v))}
                />
              </div>
              <div>
                <span>&nbsp;{props.attributeItem.valueMax != null ? max : "--"}</span>
              </div>
            </div>
          ) : null}
          <div>
            <InputNumber
              value={value.value}
              min={Number.isNaN(min) ? undefined : min}
              max={Number.isNaN(max) ? undefined : max}
              style="margin-left: 16px; width: 80px"
              precision={props.attributeItem.precision}
              onChange={(v) => changeValue(v == null || v === "" ? null : Number(v))}
            />
          </div>
        </div>
      </div>
    );
  },
});
