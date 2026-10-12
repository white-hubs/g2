import { Tag, TimePicker, dayjs } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, ref, watch } from "vue";

interface WorkTime {
  workTime: string;
  afterTime: string;
  beforeTime: string;
}
interface Props {
  value: WorkTime;
  showNextDay?: boolean;
  firstText: string;
  readonly?: boolean;
}

/** 打卡时间 */
export const ClockInTime = defineComponent({
  props: ["value", "showNextDay", "firstText", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const workTime = ref(props.value.workTime);
    const afterTime = ref(props.value.afterTime);
    const beforeTime = ref(props.value.beforeTime);

    watch(
      () => props.value,
      (next) => {
        workTime.value = next.workTime;
        beforeTime.value = next.beforeTime;
        afterTime.value = next.afterTime;
      },
      { deep: true },
    );
    const emitValue = (): void => {
      const res = {
        workTime: workTime.value,
        afterTime: afterTime.value,
        beforeTime: beforeTime.value,
      };
      emit("update:value", res);
    };
    const workTimeChange = (): void => {
      if (workTime.value) {
        beforeTime.value = dayjs("2023-09-01 " + workTime.value)
          .subtract(3, "hour")
          .format("HH:mm");
        afterTime.value = dayjs("2023-09-01 " + workTime.value)
          .add(3, "hour")
          .format("HH:mm");
      } else {
        beforeTime.value = "";
        afterTime.value = "";
      }
      emitValue();
    };

    return (): VNode => (
      <>
        <div class="work-time-picker">
          <TimePicker
            format="HH:mm"
            valueFormat="HH:mm"
            value={workTime.value || undefined}
            onUpdate:value={(value) => {
              workTime.value = typeof value === "string" ? value : (value?.format("HH:mm") ?? "");
              workTimeChange();
            }}
            disabled={props.readonly ?? false}
            getPopupContainer={() => document.querySelector(".attendance-layout-content") ?? document.body}
          />
          {props.showNextDay && (
            <Tag color="pink" class="next-day-tag">
              次日
            </Tag>
          )}
        </div>
        <div class="clock-in-time-range">
          <span style="white-space:nowrap">{props.firstText}</span>
          <div class="item">
            <span class="label">不早于</span>
            <TimePicker
              format="HH:mm"
              valueFormat="HH:mm"
              value={beforeTime.value || undefined}
              onUpdate:value={(value) => {
                beforeTime.value = typeof value === "string" ? value : (value?.format("HH:mm") ?? "");
                emitValue();
              }}
              disabled={props.readonly ?? false}
              getPopupContainer={() => document.querySelector(".attendance-layout-content") ?? document.body}
            />
          </div>
          <div class="item">
            <span class="label">不晚于</span>
            <TimePicker
              format="HH:mm"
              valueFormat="HH:mm"
              value={afterTime.value || undefined}
              onUpdate:value={(value) => {
                afterTime.value = typeof value === "string" ? value : (value?.format("HH:mm") ?? "");
                emitValue();
              }}
              disabled={props.readonly ?? false}
              getPopupContainer={() => document.querySelector(".attendance-layout-content") ?? document.body}
            />
          </div>
        </div>
      </>
    );
  },
});
