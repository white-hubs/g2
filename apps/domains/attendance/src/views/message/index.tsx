import type { MessageConfigPayload } from "@g2-contract/attendance/api/message";
import {
  Button,
  CheckboxGroup,
  FormItem,
  InputNumber,
  MinusCircleOutlined,
  PageLayout,
  Spin,
  TabPane,
  Tabs,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { addnewmessage, getnewmessage } from "@/api/message";
import { cubeMessageCenterService } from "@/api/service";
import { usePageName } from "@/hook/use-page-name";

type Scene = "START_CLOCK" | "END_CLOCK" | "HOLIDAY_BALANCE_EXPIRE";
interface Rule {
  id: number;
  value: number;
  noticeWays: string[];
}
interface SceneState {
  label: string;
  title: string;
  options: { value: string; label: string }[];
  rules: Rule[];
  loading: boolean;
  loaded: boolean;
}
const scenes: Scene[] = ["START_CLOCK", "END_CLOCK", "HOLIDAY_BALANCE_EXPIRE"];
export const Message = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const active = ref<Scene>("START_CLOCK");
    let ruleId = 0;
    const rule = (): Rule => ({ id: ++ruleId, value: 0, noticeWays: [] });
    const state = reactive<Record<Scene, SceneState>>({
      START_CLOCK: { label: "START_CLOCK", title: "上班打卡提醒", options: [], rules: [rule()], loading: false, loaded: false },
      END_CLOCK: { label: "END_CLOCK", title: "下班打卡提醒", options: [], rules: [rule()], loading: false, loaded: false },
      HOLIDAY_BALANCE_EXPIRE: { label: "假期到期提醒", title: "假期到期提醒", options: [], rules: [rule()], loading: false, loaded: false },
    });
    const saving = ref(false);
    const versions: Record<Scene, number> = { START_CLOCK: 0, END_CLOCK: 0, HOLIDAY_BALANCE_EXPIRE: 0 };
    const load = async (scene: Scene): Promise<void> => {
      const current = state[scene];
      const version = ++versions[scene];
      current.loading = true;
      try {
        const [options, response] = await Promise.all([
          cubeMessageCenterService.sceneNotificationMethod(scene),
          getnewmessage({ businessType: "ATTENDANCE_MANAGEMENT", label: current.label }),
        ]);
        if (version !== versions[scene]) {
          return;
        }
        current.options = options;
        const rows = scene === "HOLIDAY_BALANCE_EXPIRE" ? response.data : response.data.slice(0, 1);
        current.rules =
          rows.length > 0
            ? rows.map((item) => ({ id: ++ruleId, value: item.value, noticeWays: item.noticeWays.map((way) => way.noticeWay) }))
            : [rule()];
        current.loaded = true;
      } catch (error) {
        if (version === versions[scene]) {
          message.error(error instanceof Error ? error.message : "消息配置加载失败");
        }
      } finally {
        if (version === versions[scene]) {
          current.loading = false;
        }
      }
    };
    const save = async (): Promise<void> => {
      if (saving.value || scenes.some((scene) => !state[scene].loaded || state[scene].loading)) {
        return;
      }
      saving.value = true;
      try {
        const payload: MessageConfigPayload = {
          businessType: "ATTENDANCE_MANAGEMENT",
          sceneConfigDTOS: scenes.flatMap((scene) =>
            state[scene].rules.map((item) => ({
              label: state[scene].label,
              sceneCode: scene,
              value: item.value,
              noticeWays: item.noticeWays.map((noticeWay) => ({ noticeWay })),
            })),
          ),
        };
        await addnewmessage(payload);
        message.success("保存成功");
        await Promise.all(scenes.map(load));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => {
      void Promise.all(scenes.map(load));
    });
    const renderRule = (scene: Scene, item: Rule, index: number) => (
      <div key={item.id} class={scene === "HOLIDAY_BALANCE_EXPIRE" ? "attendance-message-rule" : "attendance-message-single"}>
        {scene === "HOLIDAY_BALANCE_EXPIRE" && index > 0 && (
          <MinusCircleOutlined class="attendance-message-delete" onClick={() => state[scene].rules.splice(index, 1)} />
        )}
        <FormItem label="通知条件">
          {scene === "START_CLOCK" ? "距离上班还有 " : scene === "END_CLOCK" ? "距离下班已有 " : "距离假期到期 "}
          <InputNumber style={{ width: "200px" }} min={scene === "HOLIDAY_BALANCE_EXPIRE" ? 0 : 1} max={999} v-model:value={item.value} />
          {scene === "HOLIDAY_BALANCE_EXPIRE" ? " 天时提醒" : " 分钟提醒"}
        </FormItem>
        <FormItem label="通知方式">
          {state[scene].options.length > 0 ? (
            <CheckboxGroup v-model:value={item.noticeWays} options={state[scene].options} />
          ) : (
            "当前场景未配置可使用的通知方式"
          )}
        </FormItem>
        <FormItem label={scene === "START_CLOCK" ? "通知内容" : "通知示例"}>
          {scene === "START_CLOCK"
            ? "您有一个安保早班09:00-17:00即将开始，请记得打卡"
            : scene === "END_CLOCK"
              ? "您有一个安保早班09:00-17:00已经结束，请记得打卡"
              : "您的年假，即将在2026-10-01日到期，请您及时关注"}
        </FormItem>
      </div>
    );
    return () => (
      <PageLayout
        title={pageTitle}
        v-slots={{
          "layout-content": () => (
            <Tabs
              activeKey={active.value}
              onChange={(value) => {
                active.value = value as Scene;
                if (!state[active.value].loaded && !state[active.value].loading) {
                  void load(active.value);
                }
              }}
              type="card"
            >
              {scenes.map((scene) => (
                <TabPane key={scene} tab={state[scene].title}>
                  <Spin spinning={state[scene].loading}>
                    <div class="attendance-message-panel">
                      {scene === "HOLIDAY_BALANCE_EXPIRE" && <Button onClick={() => state[scene].rules.push(rule())}>添加</Button>}
                      {state[scene].rules.map((item, index) => renderRule(scene, item, index))}
                      {!state[scene].loading && !state[scene].loaded && <Button onClick={() => void load(scene)}>重新加载</Button>}
                    </div>
                  </Spin>
                </TabPane>
              ))}
            </Tabs>
          ),
          "footer-page": () => (
            <Button
              type="primary"
              loading={saving.value}
              disabled={scenes.some((scene) => !state[scene].loaded || state[scene].loading)}
              onClick={() => void save()}
            >
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
