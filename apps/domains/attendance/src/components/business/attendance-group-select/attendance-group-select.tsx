import { Select, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref, watch } from "vue";

import { attendanceGroupList } from "@/api/attendance-group";

interface Props {
  value: string | undefined;
}
export const AttendanceGroupSelect = defineComponent({
  props: ["value"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const value = ref(props.value ?? undefined);
    const options = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const getData = async (): Promise<void> => {
      loading.value = true;
      try {
        const res = await attendanceGroupList();
        options.value = res.data.map((e) => ({ label: e.name, value: e.id }));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "选项加载失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => {
      getData();
    });

    watch(
      () => value.value,
      () => {
        emit("update:value", value.value);
      },
    );
    watch(
      () => props.value,
      () => {
        value.value = props.value ?? undefined;
      },
    );
    return (): VNode => (
      <Select loading={loading.value} value={value.value} v-model:value={value.value} options={options.value} allowClear />
    );
  },
});
