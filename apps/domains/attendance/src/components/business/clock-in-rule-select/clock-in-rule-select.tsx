import { Select, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref, watch } from "vue";

import { clockInRulesPage } from "@/api/staff-clock-in";

interface Props {
  value: string | number | undefined;
  readonly?: boolean;
}
export const ClockInRuleSelect = defineComponent({
  props: ["value", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const value = ref(props.value ?? undefined);
    const options = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const getData = async (): Promise<void> => {
      loading.value = true;
      try {
        const res = await clockInRulesPage({ pageSize: 99999, pageNumber: 1 });
        const { records } = res.data;
        options.value = records.map((e) => ({
          label: (e as { name: string }).name,
          value: (e as { id: string }).id,
        }));
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
      (next) => {
        value.value = next;
      },
    );
    return (): VNode | string =>
      !props.readonly ? (
        <Select
          loading={loading.value}
          value={value.value}
          v-model:value={value.value}
          options={options.value}
          getPopupContainer={() => document.querySelector<HTMLElement>(".attendance-layout-content") ?? document.body}
        />
      ) : (
        (options.value.find((e) => e.value === props.value)?.label ?? "未查询到打卡规则")
      );
  },
});
