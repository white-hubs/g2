import { Button, Checkbox, InputNumber } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, ref, watch } from "vue";

import { ClassesTypeSelect } from "../classes-type-select/classes-type-select";

import style from "@/assets/style.module.less";
interface Props {
  readonly: boolean;
  value: {
    continuousDays: number | null;
    intervalHour: number | null;
    sameShift: {
      sameShiftNumber: number | null;
      sameShiftType: string[] | null;
    }[];
  };
}

/** 排版规则-限制条件组件 */
export const SchedulingRulesLimit = defineComponent({
  props: ["schedulingWay", "readonly", "value"],
  setup(props: Props) {
    const state = ref(
      props.value ?? {
        continuousDays: null,
        intervalHour: null,
        sameShift: [{ sameShiftNumber: null, sameShiftType: null }],
      },
    );
    const checkedMap = ref([
      Boolean(state.value.continuousDays),
      Boolean(state.value.intervalHour),
      ...state.value.sameShift.map((e) => !!e.sameShiftNumber || (!!e.sameShiftType && e.sameShiftType.length)),
    ]);

    watch(
      () => state.value,
      () => {
        checkedMap.value[0] = Boolean(state.value.continuousDays);
        checkedMap.value[1] = Boolean(state.value.intervalHour);
        state.value.sameShift.forEach((e, i) => {
          checkedMap.value[i + 2] = Boolean(e.sameShiftNumber) || Boolean(e.sameShiftType?.length);
        });
      },
      { deep: true },
    );

    watch(
      () => props.value,
      () => {
        state.value = props.value;
      },
    );

    const checkedUpdate = (index: number): void => {
      if (index === 0) {
        if (!checkedMap.value[0]) {
          state.value.continuousDays = null;
        }
        if (checkedMap.value[0] && !state.value.continuousDays) {
          state.value.continuousDays = 6;
        }
      }
      if (index === 1) {
        if (!checkedMap.value[1]) {
          state.value.intervalHour = null;
        }
        if (checkedMap.value[1] && !state.value.intervalHour) {
          state.value.intervalHour = 8;
        }
      }
      if (index > 1) {
        if (!checkedMap.value[index]) {
          state.value.sameShift[index - 2].sameShiftNumber = null;
        }
        if (!checkedMap.value[index]) {
          state.value.sameShift[index - 2].sameShiftType = [];
        }
        if (checkedMap.value[index] && !state.value.sameShift[index - 2].sameShiftNumber) {
          state.value.sameShift[index - 2].sameShiftNumber = 10;
        }
        if (checkedMap.value[index] && !state.value.sameShift[index - 2].sameShiftType) {
          state.value.sameShift[index - 2].sameShiftType = [];
        }
      }
    };

    const addSameShift = (): void => {
      checkedMap.value.push(false);
      state.value.sameShift.push({
        sameShiftNumber: null,
        sameShiftType: [],
      });
    };

    const delSameShift = (index: number): void => {
      checkedMap.value.splice(index, 1);
      state.value.sameShift.splice(index, 1);
    };

    return (): VNode => {
      const sameShift: JSX.Element[] = [];
      state.value.sameShift.forEach((e, i) => {
        sameShift.push(
          <div class={style["scheduling-rules-limit"] + " " + (props.readonly ? "readonly" : "")}>
            <Checkbox
              v-model:checked={checkedMap.value[i + 2]}
              onUpdate:checked={() => {
                checkedUpdate(i + 2);
              }}
              disabled={props.readonly}
            />
            <div class={style["scheduling-rules-limit-content"]}>
              不允许同一个人一个月内有超过
              <InputNumber
                value={e.sameShiftNumber ?? undefined}
                v-model:value={e.sameShiftNumber}
                style="margin:0 10px;width:120px !important;flex-shrink:0"
                min={1}
                disabled={props.readonly}
              />
              个以上的规定
              <ClassesTypeSelect
                mode="multiple"
                value={e.sameShiftType ?? undefined}
                v-model:value={e.sameShiftType}
                disabled={props.readonly}
                style="margin:0 10px;width:220px;flex-shrink:0"
              />
              班次
            </div>
            <Button type="link" size="small" onClick={addSameShift} v-show={!props.readonly && i === state.value.sameShift.length - 1}>
              添加
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                delSameShift(i);
              }}
              v-show={!props.readonly && state.value.sameShift.length > 1}
              danger
            >
              删除
            </Button>
          </div>,
        );
      });

      return (
        <>
          <div class={style["scheduling-rules-limit"] + " " + (props.readonly ? "readonly" : "")}>
            <Checkbox
              v-model:checked={checkedMap.value[0]}
              onUpdate:checked={() => {
                checkedUpdate(0);
              }}
              disabled={props.readonly}
            />
            <div class={style["scheduling-rules-limit-content"]}>
              不允许同一人一个月内连续排超过
              <InputNumber
                value={state.value.continuousDays ?? undefined}
                v-model:value={state.value.continuousDays}
                style="margin:0 10px"
                min={1}
                disabled={props.readonly}
              />
              天班
            </div>
          </div>
          <div class={style["scheduling-rules-limit"] + " " + (props.readonly ? "readonly" : "")}>
            <Checkbox
              v-model:checked={checkedMap.value[1]}
              onUpdate:checked={() => {
                checkedUpdate(1);
              }}
              disabled={props.readonly}
            />
            <div class={style["scheduling-rules-limit-content"]}>
              同一人一天连续上两个班次时，中间必须间隔
              <InputNumber
                value={state.value.intervalHour ?? undefined}
                v-model:value={state.value.intervalHour}
                style="margin:0 10px"
                min={1}
                disabled={props.readonly}
              />
              小时
            </div>
          </div>
          {sameShift}
        </>
      );
    };
  },
});
