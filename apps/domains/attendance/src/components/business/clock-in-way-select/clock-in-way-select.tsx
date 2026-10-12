import { Select } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref, watch } from "vue";

interface Props {
  value: string | undefined;
}
export const ClockInWaySelect = defineComponent({
  props: ["value"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const value = ref(props.value ?? undefined);
    const options = ref<{ label: string; value: string }[]>([]);
    const getData = (): void => {
      options.value = [{ label: "11", value: "11" }];
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
    return (): VNode => <Select value={value.value} v-model:value={value.value} options={options.value} />;
  },
});
