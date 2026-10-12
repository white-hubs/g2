import type { SmallEngineeringRecord } from "@g2-client/small-engineering/client";
import type { MessageClient } from "@g2-contract/message";
import type { OuaaClient } from "@g2-contract/ouaa";
import { Button, CheckboxGroup, Form, FormItem, InputNumber, PageLayout, Select, Spin, TabPane, Tabs, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getPatrolClient, getSmallEngineeringClient, getSmallEngineeringContext } from "@/domain-context";

type Code = "TASK_GENERATE" | "TASK_LAPSE" | "TASK_LAPSE_UNFINISHED" | "TASK_RECORD_ERROR";
interface Recipient {
  key: string;
  inspectionType?: string;
  inspectionUsers: string[];
}
interface Scene {
  sceneCode: Code;
  label: string;
  noticeWays: string[];
  value: number;
  recipients: Recipient[];
  options: { label: string; value: string }[];
  loading: boolean;
  loaded: boolean;
}
const BUSINESS_TYPE = "SMALL_ENGINEERING";
const SCENES: { code: Code; label: string; condition: string; content: string }[] = [
  { code: "TASK_GENERATE", label: "巡查任务", condition: "任务下发即提醒", content: "【巡查任务名称】巡查任务已建立，请及时关注该任务" },
  {
    code: "TASK_LAPSE",
    label: "任务即将失效",
    condition: "距离任务失效时间还有指定分钟时提醒",
    content: "您负责的【巡检任务名称】巡检任务，任务将在【配置的通知条件】后失效，请及时接收任务进行巡检",
  },
  {
    code: "TASK_LAPSE_UNFINISHED",
    label: "任务失效未完成",
    condition: "巡检任务未完成且已失效时通知",
    content: "由【巡检任务责任人】负责的【巡检任务名称】没有完成且当前已经失效，请知悉",
  },
  {
    code: "TASK_RECORD_ERROR",
    label: "任务异常",
    condition: "任务异常时通知",
    content: "由【巡检任务责任人】负责的【巡检任务名称】发生异常，请及时处理",
  },
];
const makeScene = (code: Code, label: string): Scene => ({
  sceneCode: code,
  label,
  noticeWays: [],
  value: 0,
  recipients: [],
  options: [],
  loading: false,
  loaded: false,
});
const parseRecipients = (value: unknown): Recipient[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((raw) => {
    const row = raw as SmallEngineeringRecord;
    let users: unknown = row.objInfo;
    if (typeof users === "string") {
      try {
        users = JSON.parse(users);
      } catch {
        users = [];
      }
    }
    return {
      key: String(row.objId ?? crypto.randomUUID()),
      inspectionType: row.objType ? String(row.objType) : undefined,
      inspectionUsers: Array.isArray(users)
        ? users
            .map((item) => String(typeof item === "object" && item !== null ? ((item as SmallEngineeringRecord).id ?? "") : item))
            .filter(Boolean)
        : [],
    };
  });
};

export const MessageConfig = defineComponent({
  name: "SmallEngineeringMessageConfig",
  setup() {
    const client = getSmallEngineeringClient();
    const context = getSmallEngineeringContext();
    const patrol = getPatrolClient();
    const activeKey = ref<Code>("TASK_GENERATE");
    const scenes = reactive<Record<Code, Scene>>({
      TASK_GENERATE: makeScene("TASK_GENERATE", "巡查任务"),
      TASK_LAPSE: makeScene("TASK_LAPSE", "任务即将失效"),
      TASK_LAPSE_UNFINISHED: makeScene("TASK_LAPSE_UNFINISHED", "任务失效未完成"),
      TASK_RECORD_ERROR: makeScene("TASK_RECORD_ERROR", "任务异常"),
    });
    const types = ref<{ label: string; value: string }[]>([]);
    const users = ref<{ label: string; value: string }[]>([]);
    const saving = ref(false);
    const loaded = ref(false);
    let version = 0;
    const loadScene = async (code: Code): Promise<void> => {
      const current = version;
      const scene = scenes[code];
      scene.loading = true;
      scene.loaded = false;
      try {
        const messageClient = await context.ensureClient<MessageClient>("messageClient");
        const [configs, options] = await Promise.all([
          client.getMessageConfig({ businessType: BUSINESS_TYPE, label: scene.label }),
          messageClient.sceneNotificationMethod(code),
        ]);
        if (current !== version) {
          return;
        }
        const config = configs.find((item) => item.sceneCode === code && item.label === scene.label);
        scene.options = options;
        scene.noticeWays = Array.isArray(config?.noticeWays)
          ? (config.noticeWays as SmallEngineeringRecord[]).map((item) => String(item.noticeWay ?? ""))
          : [];
        scene.value = Number(config?.value ?? 0);
        scene.recipients = parseRecipients(config?.noticeObjs);
        if (scene.recipients.length === 0 && (code === "TASK_LAPSE_UNFINISHED" || code === "TASK_RECORD_ERROR")) {
          scene.recipients.push({ key: crypto.randomUUID(), inspectionType: undefined, inspectionUsers: [] });
        }
        scene.loaded = true;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : `${scene.label}加载失败`);
        }
      } finally {
        if (current === version) {
          scene.loading = false;
        }
      }
    };
    const switchScene = (code: Code): void => {
      activeKey.value = code;
    };
    const addRecipient = (scene: Scene): void => {
      scene.recipients.push({ key: crypto.randomUUID(), inspectionType: undefined, inspectionUsers: [] });
    };
    const save = async (): Promise<void> => {
      if (saving.value || !loaded.value) {
        return;
      }
      for (const info of SCENES) {
        const scene = scenes[info.code];
        if (scene.noticeWays.length === 0) {
          activeKey.value = info.code;
          message.warning(`${info.label}：请选择通知方式`);
          return;
        }
        if (
          (info.code === "TASK_LAPSE_UNFINISHED" || info.code === "TASK_RECORD_ERROR") &&
          (scene.recipients.length === 0 || scene.recipients.some((item) => !item.inspectionType || item.inspectionUsers.length === 0))
        ) {
          activeKey.value = info.code;
          message.warning(`${info.label}：请选择巡检类型和通知人员`);
          return;
        }
      }
      saving.value = true;
      try {
        await client.saveMessageConfig({
          businessType: BUSINESS_TYPE,
          sceneConfigDTOS: SCENES.map(({ code }) => {
            const scene = scenes[code];
            return {
              sceneCode: code,
              label: scene.label,
              value: scene.value,
              noticeWays: scene.noticeWays.map((noticeWay) => ({ noticeWay })),
              noticeObjs: scene.recipients.map((item) => ({
                objId: item.key,
                objType: item.inspectionType,
                objInfo: JSON.stringify(item.inspectionUsers),
              })),
            };
          }),
        });
        message.success("保存成功");
        await loadAll();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    void Promise.all([
      patrol.listTypes({ businessType: BUSINESS_TYPE }),
      context.ensureClient<OuaaClient>("ouaaClient").then((ouaa) => ouaa.listUsers({ pageNumber: 1, pageSize: 1000 })),
    ])
      .then(([typeList, userPage]) => {
        types.value = typeList.map((item) => ({ label: String(item.name ?? ""), value: String(item.id ?? "") }));
        users.value = userPage.records.map((item) => ({ label: item.name, value: item.id }));
      })
      .catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : "通知人员选项加载失败");
      });
    const loadAll = async (): Promise<void> => {
      ++version;
      loaded.value = false;
      await Promise.all(SCENES.map(({ code }) => loadScene(code)));
      loaded.value = SCENES.every(({ code }) => scenes[code].loaded);
    };
    void loadAll();
    const slots = {
      "layout-content": () => (
        <Tabs activeKey={activeKey.value} onChange={(key) => switchScene(String(key) as Code)} type="card">
          {SCENES.map((info) => {
            const scene = scenes[info.code];
            return (
              <TabPane key={info.code} tab={info.label}>
                <Spin spinning={scene.loading}>
                  <div style={{ minHeight: "350px", padding: "20px 0" }}>
                    <Form labelCol={{ style: { width: "130px" } }}>
                      <FormItem label="通知条件">
                        {info.code === "TASK_LAPSE" ? (
                          <>
                            距离任务失效时间还有 <InputNumber min={0} max={99999} v-model:value={scene.value} /> 分钟提醒
                          </>
                        ) : (
                          info.condition
                        )}
                      </FormItem>
                      <FormItem label="通知方式" required>
                        <CheckboxGroup v-model:value={scene.noticeWays} options={scene.options} />
                        {scene.options.length === 0 && <span>当前场景未配置可使用的通知方式</span>}
                      </FormItem>
                      <FormItem label="通知内容">{info.content}</FormItem>
                      {(info.code === "TASK_LAPSE_UNFINISHED" || info.code === "TASK_RECORD_ERROR") && (
                        <FormItem label="通知人员" required>
                          {scene.recipients.map((item, index) => (
                            <div key={item.key} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                              <Select
                                v-model:value={item.inspectionType}
                                options={types.value}
                                placeholder="请选择巡检类型"
                                style={{ width: "200px" }}
                              />
                              <Select
                                mode="multiple"
                                v-model:value={item.inspectionUsers}
                                options={users.value}
                                showSearch
                                placeholder="请选择人员"
                                style={{ width: "300px" }}
                              />
                              <Button danger onClick={() => scene.recipients.splice(index, 1)}>
                                删除
                              </Button>
                            </div>
                          ))}
                          <Button onClick={() => addRecipient(scene)}>添加人员</Button>
                        </FormItem>
                      )}
                    </Form>
                  </div>
                </Spin>
              </TabPane>
            );
          })}
        </Tabs>
      ),
      "footer-page": () => (
        <Button
          type="primary"
          disabled={!loaded.value}
          loading={saving.value}
          onClick={() => {
            void save();
          }}
        >
          保存
        </Button>
      ),
    };
    return () => <PageLayout title="消息配置" v-slots={slots} />;
  },
});
