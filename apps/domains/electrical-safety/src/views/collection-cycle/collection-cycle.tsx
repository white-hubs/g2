import type { OrUpdateDetail } from "@g2-contract/electrical-safety/line-loss";
import { Button, PageLayout, RadioGroup, Select, Space, Spin, TimePicker, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { getElectricalSafetyClient } from "@/domain-context";
import { usePageName } from "@/utils/page-name";

import styles from "./collection-cycle.module.less";

export const CollectionCycle = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const loading = ref(false);
    const saveLoading = ref(false);

    /** 每天 / 每周 / 每月各自独立，切换类型时不互相覆盖 */
    /** cycleType: EVERY_DAY | EVERY_WEEK | EVERY_MONTH */
    const state = reactive({
      cycleType: "EVERY_DAY",
      everyDay: {
        period: undefined as string | undefined,
      },
      everyWeek: {
        period: undefined as string | undefined,
        dayOfWeek: undefined as string | number | undefined,
      },
      everyMonth: {
        period: undefined as string | undefined,
        dayOfMonth: undefined as string | number | undefined,
      },
    });
    const newData = ref<OrUpdateDetail>();

    const weekOptions = [
      { label: "周一", value: 1 },
      { label: "周二", value: 2 },
      { label: "周三", value: 3 },
      { label: "周四", value: 4 },
      { label: "周五", value: 5 },
      { label: "周六", value: 6 },
      { label: "周日", value: 7 },
    ];

    const monthOptions = Array.from({ length: 31 }, (_, i) => ({
      label: `${i + 1}日`,
      value: i + 1,
    }));

    const loadData = async () => {
      loading.value = true;
      try {
        // Mock load data
        // await new Promise((resolve) => setTimeout(resolve, 500));
        const data = await getElectricalSafetyClient().getOrUpdate();
        setData(data);
        // Set default values if needed
      } catch {
        /* 详情加载失败时保持表单为空 */
      } finally {
        loading.value = false;
      }
    };

    /** 保存后仅保留当前周期，其余 Tab 表单清空 */
    const clearOtherCycleForms = (keep: string): void => {
      if (keep !== "EVERY_DAY") {
        state.everyDay.period = undefined;
      }
      if (keep !== "EVERY_WEEK") {
        state.everyWeek.period = undefined;
        state.everyWeek.dayOfWeek = undefined;
      }
      if (keep !== "EVERY_MONTH") {
        state.everyMonth.period = undefined;
        state.everyMonth.dayOfMonth = undefined;
      }
    };

    const setData = (data: OrUpdateDetail) => {
      newData.value = data;
      state.cycleType = data.periodType;
      if (data.periodType === "EVERY_DAY") {
        state.everyDay.period = data.hourTime || undefined;
        clearOtherCycleForms("EVERY_DAY");
      } else if (data.periodType === "EVERY_WEEK") {
        const d = data.days;
        state.everyWeek.dayOfWeek = d === "" || d === undefined ? undefined : Number(d) || d;
        state.everyWeek.period = data.hourTime || undefined;
        clearOtherCycleForms("EVERY_WEEK");
      } else if (data.periodType === "EVERY_MONTH") {
        const d = data.days;
        state.everyMonth.dayOfMonth = d === "" || d === undefined ? undefined : Number(d) || d;
        state.everyMonth.period = data.hourTime || undefined;
        clearOtherCycleForms("EVERY_MONTH");
      }
    };
    const onSave = async () => {
      let hourTime = "";
      let days = "";
      if (state.cycleType === "EVERY_DAY") {
        hourTime = state.everyDay.period ?? "";
        days = "";
      } else if (state.cycleType === "EVERY_WEEK") {
        hourTime = state.everyWeek.period ?? "";
        days = state.everyWeek.dayOfWeek === undefined || state.everyWeek.dayOfWeek === null ? "" : String(state.everyWeek.dayOfWeek);
      } else if (state.cycleType === "EVERY_MONTH") {
        hourTime = state.everyMonth.period ?? "";
        days = state.everyMonth.dayOfMonth === undefined || state.everyMonth.dayOfMonth === null ? "" : String(state.everyMonth.dayOfMonth);
      }
      const params = {
        periodType: state.cycleType,
        days,
        hourTime,
      };
      if (!hourTime) {
        message.warning("请选择采集时间");
        return;
      }
      if (state.cycleType === "EVERY_WEEK" && !days) {
        message.warning("请选择采集日期");
        return;
      }
      if (state.cycleType === "EVERY_MONTH" && !days) {
        message.warning("请选择采集日期");
        return;
      }
      saveLoading.value = true;
      try {
        /** 仅提交当前选中的采集周期（每天/每周/每月），不附带详情里其它字段 */
        const payload: { id?: string; periodType: string; days?: string; hourTime: string } = {
          periodType: params.periodType,
          days: params.days,
          hourTime: params.hourTime,
        };
        if (newData.value?.id) {
          payload.id = newData.value.id;
        }
        await getElectricalSafetyClient().saveOrUpdate(payload);
        clearOtherCycleForms(payload.periodType);
        if (newData.value) {
          newData.value = {
            ...newData.value,
            periodType: payload.periodType,
            days: payload.days ?? "",
            hourTime: payload.hourTime,
          };
        }
        message.success("保存成功");
      } catch {
        message.error("保存失败");
      } finally {
        saveLoading.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    const slots = {
      "layout-content": () => (
        <div class={styles.container}>
          <Spin spinning={loading.value}>
            <div class={styles["form-item"]}>
              <div class={styles.label}>
                <span class={styles.required}>*</span>
                <span>采集时间：</span>
              </div>
              <div class={styles.content}>
                <RadioGroup
                  v-model:value={state.cycleType}
                  options={[
                    { label: "每天", value: "EVERY_DAY" },
                    { label: "每周", value: "EVERY_WEEK" },
                    { label: "每月", value: "EVERY_MONTH" },
                  ]}
                />

                <div class={styles["config-wrapper"]}>
                  {state.cycleType === "EVERY_DAY" && (
                    <div class={styles["config-row"]}>
                      <span class={styles["text-prefix"]}>从今天起，每天</span>
                      <TimePicker
                        class={styles["select-time"]}
                        format="HH:mm:ss"
                        valueFormat="HH:mm:ss"
                        v-model:value={state.everyDay.period}
                        placeholder="某时"
                        allowClear
                      />
                      <span class={styles["text-suffix"]}>点采集一次数据。</span>
                    </div>
                  )}

                  {state.cycleType === "EVERY_WEEK" && (
                    <div class={styles["config-row"]}>
                      <span class={styles["text-prefix"]}>从本周起，每周</span>
                      <Select
                        class={styles["select-day"]}
                        v-model:value={state.everyWeek.dayOfWeek}
                        options={weekOptions}
                        placeholder="某天"
                        allowClear
                      />
                      <span class={styles["text-middle"]}>的</span>
                      <TimePicker
                        class={styles["select-time"]}
                        format="HH:mm:ss"
                        valueFormat="HH:mm:ss"
                        v-model:value={state.everyWeek.period}
                        placeholder="某时"
                        allowClear
                      />
                      <span class={styles["text-suffix"]}>点采集一次数据。</span>
                    </div>
                  )}

                  {state.cycleType === "EVERY_MONTH" && (
                    <div class={styles["config-row"]}>
                      <span class={styles["text-prefix"]}>从本月起，每月</span>
                      <Select
                        class={styles["select-day"]}
                        v-model:value={state.everyMonth.dayOfMonth}
                        options={monthOptions}
                        placeholder="某日"
                        allowClear
                      />
                      <span class={styles["text-middle"]}>的</span>
                      <TimePicker
                        class={styles["select-time"]}
                        format="HH:mm:ss"
                        valueFormat="HH:mm:ss"
                        v-model:value={state.everyMonth.period}
                        placeholder="某时"
                        allowClear
                      />
                      <span class={styles["text-suffix"]}>点采集一次数据。</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button type="primary" loading={saveLoading.value} onClick={onSave}>
            保存
          </Button>
        </Space>
      ),
    };

    return () => <PageLayout title={pageTitle.value} v-slots={slots} />;
  },
});
