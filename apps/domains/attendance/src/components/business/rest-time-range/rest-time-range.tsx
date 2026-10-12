import { dayjs } from "@g2-platform/pc-ui";
import { Tag, TimePicker } from "@g2-platform/pc-ui";
import { type PropType, type VNode, computed, defineComponent, ref, watch } from "vue";

type RestRange = [string, string];

interface Props {
  value?: RestRange | null;
  readonly?: boolean;
}

/** 休息时间（支持跨日，如 23:00 - 次日 01:00） */
export const RestTimeRange = defineComponent({
  props: {
    value: {
      type: Array as unknown as PropType<RestRange | null>,
      default: () => ["", ""],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const startTime = ref(props.value?.[0] ?? "");
    const endTime = ref(props.value?.[1] ?? "");

    watch(
      () => props.value,
      (next) => {
        startTime.value = next?.[0] ?? "";
        endTime.value = next?.[1] ?? "";
      },
    );

    const showNextDay = computed(() => {
      if (!startTime.value || !endTime.value) {
        return false;
      }
      return dayjs(`2023-09-01 ${endTime.value}`).isBefore(dayjs(`2023-09-01 ${startTime.value}`));
    });

    const updateRange = (next: Partial<{ start: string; end: string }>): void => {
      if (next.start !== undefined) {
        startTime.value = next.start;
      }
      if (next.end !== undefined) {
        endTime.value = next.end;
      }
      emit("update:value", [startTime.value, endTime.value] as RestRange);
    };

    return (): VNode => (
      <div class="rest-time-range">
        <div class="rest-time-range-start">
          <TimePicker
            format="HH:mm"
            valueFormat="HH:mm"
            value={startTime.value || undefined}
            placeholder="开始时间"
            disabled={props.readonly ?? false}
            allowClear
            getPopupContainer={() => document.querySelector(".attendance-layout-content") ?? document.body}
            onUpdate:value={(val) => {
              updateRange({ start: typeof val === "string" ? val : (val?.format("HH:mm") ?? "") });
            }}
          />
        </div>
        <span class="rest-time-range-separator">~</span>
        <div class="rest-time-range-end">
          <TimePicker
            format="HH:mm"
            valueFormat="HH:mm"
            value={endTime.value || undefined}
            placeholder="结束时间"
            disabled={props.readonly ?? false}
            allowClear
            getPopupContainer={() => document.querySelector(".attendance-layout-content") ?? document.body}
            onUpdate:value={(val) => {
              updateRange({ end: typeof val === "string" ? val : (val?.format("HH:mm") ?? "") });
            }}
          />
          {showNextDay.value && (
            <Tag color="pink" class="next-day-tag">
              次日
            </Tag>
          )}
        </div>
      </div>
    );
  },
});
