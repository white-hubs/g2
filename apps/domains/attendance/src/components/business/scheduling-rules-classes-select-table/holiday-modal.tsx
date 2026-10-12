import "./holiday-modal.css";

import { Calendar, Modal, Spin, dayjs, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch } from "vue";

import { getHolidayApi } from "@/api/staff-clock-in";

export const HolidayModal = defineComponent({
  props: { show: Boolean },
  emits: ["update:show"],
  setup(props, { emit }) {
    const date = ref(dayjs());
    const loading = ref(false);
    const holidays = ref(new Set<string>());
    let version = 0;
    const load = async (): Promise<void> => {
      const current = ++version;
      if (!props.show) {
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const res = await getHolidayApi(date.value.year(), date.value.month() + 1);
        if (current !== version || !props.show) {
          return;
        }
        holidays.value = new Set(
          ((res.data?.[0]?.almanac ?? []) as { year: string; month: string; day: string; status?: string }[])
            .filter((day) => day.status === "1")
            .map((day) => `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : "法定节假日加载失败");
      } finally {
        if (current === version) {
          loading.value = false;
        }
      }
    };
    watch(
      () => [props.show, date.value.format("YYYY-MM")],
      () => {
        void load();
      },
      { immediate: true },
    );
    return () => (
      <Modal
        open={props.show}
        width={800}
        centered
        wrapClassName="attendance-holiday-modal"
        title="法定节假日"
        footer={null}
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          version++;
          emit("update:show", false);
        }}
      >
        <Spin spinning={loading.value}>
          <Calendar
            mode="month"
            value={date.value}
            onUpdate:value={(value) => {
              date.value = typeof value === "string" ? dayjs(value) : value;
            }}
            v-slots={{
              dateCellRender: ({ current }: { current: dayjs.Dayjs }) => (holidays.value.has(current.format("YYYY-MM-DD")) ? "节假日" : ""),
            }}
          />
        </Spin>
      </Modal>
    );
  },
});
