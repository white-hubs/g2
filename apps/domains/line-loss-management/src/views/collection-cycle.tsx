import type { CollectionCycleDetail } from "@g2-contract/line-loss-management";
import { Button, PageLayout, RadioGroup, Select, Space, Spin, TimePicker, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { useLineLossClient } from "../api";

type CycleType = CollectionCycleDetail["periodType"];

export default defineComponent({
  name: "LineLossCollectionCycle",
  setup() {
    const client = useLineLossClient();
    const loading = ref(false);
    const saving = ref(false);
    const currentId = ref<string>();
    let requestVersion = 0;
    const state = reactive({
      cycleType: "EVERY_DAY" as CycleType,
      everyDayTime: undefined as string | undefined,
      everyWeekDay: undefined as number | undefined,
      everyWeekTime: undefined as string | undefined,
      everyMonthDay: undefined as number | undefined,
      everyMonthTime: undefined as string | undefined,
    });
    const weekOptions = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label, index) => ({ label, value: index + 1 }));
    const monthOptions = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}日`, value: index + 1 }));

    const load = async (): Promise<void> => {
      const version = ++requestVersion;
      loading.value = true;
      try {
        const api = await client();
        const detail = await api.getCollectionCycle();
        if (version !== requestVersion || !detail) {
          return;
        }
        currentId.value = detail.id;
        state.cycleType = detail.periodType || "EVERY_DAY";
        if (detail.periodType === "EVERY_DAY") {
          state.everyDayTime = detail.hourTime || undefined;
        }
        if (detail.periodType === "EVERY_WEEK") {
          state.everyWeekDay = detail.days ? Number(detail.days) : undefined;
          state.everyWeekTime = detail.hourTime || undefined;
        }
        if (detail.periodType === "EVERY_MONTH") {
          state.everyMonthDay = detail.days ? Number(detail.days) : undefined;
          state.everyMonthTime = detail.hourTime || undefined;
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "采集周期加载失败");
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      const hourTime =
        state.cycleType === "EVERY_DAY"
          ? state.everyDayTime
          : state.cycleType === "EVERY_WEEK"
            ? state.everyWeekTime
            : state.everyMonthTime;
      const day =
        state.cycleType === "EVERY_WEEK" ? state.everyWeekDay : state.cycleType === "EVERY_MONTH" ? state.everyMonthDay : undefined;
      if (!hourTime) {
        message.warning("请选择采集时间");
        return;
      }
      if (state.cycleType !== "EVERY_DAY" && !day) {
        message.warning("请选择采集日期");
        return;
      }
      saving.value = true;
      try {
        const api = await client();
        await api.saveCollectionCycle({ id: currentId.value, periodType: state.cycleType, days: day ? String(day) : "", hourTime });
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => void load());
    const content = () => (
      <div class="line-loss-cycle">
        <Spin spinning={loading.value}>
          <div class="line-loss-cycle-form">
            <div class="line-loss-cycle-label">
              <span>*</span>采集时间：
            </div>
            <div class="line-loss-cycle-content">
              <RadioGroup
                v-model:value={state.cycleType}
                optionType="button"
                options={[
                  { label: "每天", value: "EVERY_DAY" },
                  { label: "每周", value: "EVERY_WEEK" },
                  { label: "每月", value: "EVERY_MONTH" },
                ]}
              />
              {state.cycleType === "EVERY_DAY" && (
                <div class="line-loss-cycle-row">
                  <span>从今天起，每天</span>
                  <TimePicker v-model:value={state.everyDayTime} valueFormat="HH:mm:ss" format="HH:mm:ss" placeholder="某时" allowClear />
                  <span>点采集一次数据。</span>
                </div>
              )}
              {state.cycleType === "EVERY_WEEK" && (
                <div class="line-loss-cycle-row">
                  <span>从本周起，每周</span>
                  <Select v-model:value={state.everyWeekDay} options={weekOptions} placeholder="某天" allowClear />
                  <span>的</span>
                  <TimePicker v-model:value={state.everyWeekTime} valueFormat="HH:mm:ss" format="HH:mm:ss" placeholder="某时" allowClear />
                  <span>点采集一次数据。</span>
                </div>
              )}
              {state.cycleType === "EVERY_MONTH" && (
                <div class="line-loss-cycle-row">
                  <span>从本月起，每月</span>
                  <Select v-model:value={state.everyMonthDay} options={monthOptions} placeholder="某日" allowClear />
                  <span>的</span>
                  <TimePicker v-model:value={state.everyMonthTime} valueFormat="HH:mm:ss" format="HH:mm:ss" placeholder="某时" allowClear />
                  <span>点采集一次数据。</span>
                </div>
              )}
            </div>
          </div>
        </Spin>
      </div>
    );
    return () => (
      <PageLayout
        title="采集周期"
        v-slots={{
          "layout-content": content,
          "footer-page": () => (
            <Space>
              <Button type="primary" loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
            </Space>
          ),
        }}
      />
    );
  },
});
