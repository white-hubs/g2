import { Button, DeleteOutlined, InputNumber, RadioGroup, Select } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref } from "vue";

import type { Quota } from "@/api/staff-leave";

import style from "./leave-quota-config.module.less";

interface Props {
  action: string;
  readonly?: boolean;
  value?: Quota | string;
}

/** 请假规则-额度配置 */
export const LeaveQuotaConfig = defineComponent({
  props: ["action", "value", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const quotaConfigOptions = [
      {
        value: "FIXED",
        label: "固定额度",
      },
      {
        value: "SOCIETY_AGE",
        label: "按社会工龄",
      },
      {
        value: "COMPANY_AGE",
        label: "按公司司龄",
      },
    ];
    const fixedUnitOptions = [
      { label: "天", value: "DAY" },
      { label: "小时", value: "HOUR" },
    ];
    const select = ref<"FIXED" | "SOCIETY_AGE" | "COMPANY_AGE">("FIXED");
    const fixedNum = ref<number | null>();
    const fixedUnit = ref<"DAY" | "HOUR">("DAY");
    const ageList = ref<{ age: number | null; day: number | null; unit: "DAY" | "HOUR" }[]>([]);
    const init = ref(false);
    const emitValue = (): void => {
      if (!init.value) {
        return;
      }
      const res = {
        quotaType: select.value,
        fixedNumber: fixedNum.value,
        fixedUnit: fixedUnit.value,
        quotaLevelList:
          select.value === "FIXED"
            ? []
            : ageList.value.map((e) => ({
                ageYear: e.age,
                holidayNumber: e.day,
                unit: e.unit,
              })),
      };
      emit("update:value", res);
    };
    const add = (): void => {
      ageList.value.push({ age: null, day: null, unit: "DAY" });
      emitValue();
    };
    const selectChange = (): void => {
      if (!init.value) {
        return;
      }
      ageList.value.length = 0;
      emitValue();
    };

    onMounted(() => {
      // 切换发放方式会重新挂载，优先恢复已录入额度，避免新增状态覆盖父表单数据。
      if (props.value && typeof props.value !== "string") {
        select.value = props.value.quotaType;
        fixedNum.value = props.value.fixedNumber;
        fixedUnit.value = props.value.fixedUnit;
        ageList.value = props.value.quotaLevelList.map((e) => ({
          age: e.ageYear ?? null,
          day: e.holidayNumber ?? null,
          unit: e.unit,
        }));
      } else if (props.action === "add") {
        init.value = true;
        emitValue();
      }
      init.value = true;
    });

    return (): VNode => (
      <div>
        <div class={style.radio}>
          <RadioGroup disabled={props.readonly} options={quotaConfigOptions} v-model:value={select.value} onChange={selectChange} />
        </div>

        {select.value !== "FIXED" &&
          ageList.value.map(
            (item, i): VNode => (
              <div class={style["config-fixed"]} key={i}>
                <span>{select.value === "SOCIETY_AGE" ? "工龄" : "司龄"}大于等于</span>
                <div style="margin:0 15px;width:120px">
                  <InputNumber
                    disabled={props.readonly}
                    min={0}
                    v-model:value={item.age}
                    onChange={() => {
                      emitValue();
                    }}
                  />{" "}
                </div>
                <span>年,享有</span>
                <div style="margin:0 15px;width:120px">
                  <InputNumber disabled={props.readonly} min={0} v-model:value={item.day} onChange={emitValue} />{" "}
                </div>
                <div style="margin-right:15px;width:80px">
                  <Select disabled={props.readonly} options={fixedUnitOptions} v-model:value={item.unit} onChange={emitValue} />{" "}
                </div>
                <span>假期</span>
                <DeleteOutlined
                  style="margin-left:20px;color:red"
                  onClick={() => {
                    if (props.readonly) {
                      return;
                    }
                    ageList.value.splice(i, 1);
                    emitValue();
                  }}
                />
              </div>
            ),
          )}

        {select.value === "FIXED" ? (
          <div class={style["config-fixed"]}>
            <span>每人发放</span>
            <div style="margin:0 15px;width:120px">
              <InputNumber disabled={props.readonly} min={0} v-model:value={fixedNum.value} onChange={emitValue} />{" "}
            </div>
            <div style="width:80px">
              <Select disabled={props.readonly} options={fixedUnitOptions} v-model:value={fixedUnit.value} onChange={emitValue} />{" "}
            </div>
          </div>
        ) : (
          <Button disabled={props.readonly} shape="round" size="small" type="primary" onClick={add}>
            添加项
          </Button>
        )}
      </div>
    );
  },
});
