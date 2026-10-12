import type { FormRule } from "@g2-platform/pc-ui";
import { CheckboxGroup, Form, type FormExpose, FormItem, Spin, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref } from "vue";

import { getHolidayRuleNotLimit } from "@/api/staff-leave";

export interface HolidayRule {
  name: string;
  unit: string;
  id: string;
}
interface Props {
  value?: string[];
  title?: string;
}

export const VacationType = defineComponent({
  props: ["value", "title"],
  emits: ["update:value", "change"],
  setup: (props: Props, { emit, expose }) => {
    const formRef = ref<FormExpose>();
    const formState = reactive({
      holidayIdList: [] as string[],
    });
    const formRules: Record<string, FormRule[]> = {
      holidayIdList: [{ required: true, message: "请选择假期类型", trigger: "blur" }],
    };
    const vacationTypeOptions = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const getVacationType = async (): Promise<void> => {
      loading.value = true;
      try {
        const res = await getHolidayRuleNotLimit();
        if (res.data) {
          vacationTypeOptions.value =
            res.data && Array.isArray(res.data)
              ? res.data.map((item: HolidayRule) => ({
                  label: item.name,
                  value: item.id,
                }))
              : [];
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载假期类型失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => {
      getVacationType();
    });
    expose({
      formRef,
    });
    return (): VNode => (
      <>
        <Spin spinning={loading.value}>
          <Form ref={formRef} model={formState} labelCol={{ style: { width: "80px" } }} rules={formRules}>
            <FormItem label="假期类型" name="holidayIdList" style={{ paddingTop: "10px" }}>
              <CheckboxGroup
                v-model:value={formState.holidayIdList}
                options={vacationTypeOptions.value}
                onChange={(values) => {
                  const val = values.map(String);
                  emit("update:value", val);
                  const list = vacationTypeOptions.value.filter((item) => val.includes(item.value));
                  emit("change", list);
                }}
              />
            </FormItem>
          </Form>
        </Spin>
      </>
    );
  },
});
