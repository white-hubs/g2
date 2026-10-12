import { Button, Checkbox, Form, FormItem, InputNumber, PageLayout, PopConfirm, Tabs, TabPane, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import type { GemPageProps } from "./page-props";

import styles from "./message-notice.module.css";

type NoticeMethod = { label: string; value: string };
type NoticeConfig = { id: number; notificationTime: number; channelParams: string[]; noticeMethod: NoticeMethod[] };

function asList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  for (const key of ["records", "list", "data"]) {
    if (Array.isArray(root[key])) return root[key] as Record<string, unknown>[];
  }
  return root.data && typeof root.data === "object" ? asList(root.data) : [];
}

function getNoticeMethods(value: unknown): NoticeMethod[] {
  return asList(value)
    .map((item) => ({
      label: String(item.label ?? item.name ?? item.value ?? item.noticeWay ?? ""),
      value: String(item.value ?? item.noticeWay ?? item.code ?? ""),
    }))
    .filter((item) => item.label && item.value);
}

function getSceneChannelCodes(value: unknown): Set<string> {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current) || !("data" in current)) break;
    current = (current as Record<string, unknown>).data;
  }
  const codes =
    current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>).channelCodes : undefined;
  return new Set(Array.isArray(codes) ? codes.map(String) : []);
}

function getNoticeMethodsFromChannels(channels: unknown, receive: unknown): NoticeMethod[] {
  const selectedCodes = getSceneChannelCodes(receive);
  return asList(channels)
    .filter((item) => selectedCodes.has(String(item.channelCode ?? item.code ?? "")))
    .map((item) => ({
      label: String(item.channelName ?? item.name ?? item.label ?? item.channelCode ?? ""),
      value: String(item.channelCode ?? item.code ?? ""),
    }))
    .filter((item) => item.label && item.value);
}

export default defineComponent({
  name: "GemMessageNoticePage",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getMessageConfigClient: { type: Function as PropType<GemPageProps["getMessageConfigClient"]>, required: true },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "消息配置" },
    notificationSubject: { type: String, default: "动环报警" },
  },
  setup(props) {
    const loading = ref(false);
    const noticeMethods = ref<NoticeMethod[]>([]);
    const configs = ref<NoticeConfig[]>([]);
    let nextId = 1;
    const appCode = () => props.applicationCode.trim();
    const sceneCode = () => `${appCode()}_ALARM_TIMEOUT_NOTIFY`;
    const businessType = () => `${appCode()}_ALARM`;
    const createConfig = (value: Partial<Pick<NoticeConfig, "notificationTime" | "channelParams">> = {}): NoticeConfig => ({
      id: nextId++,
      notificationTime: Math.max(1, Number(value.notificationTime ?? 1)),
      channelParams: value.channelParams ?? [],
      noticeMethod: noticeMethods.value,
    });

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await props.getMessageConfigClient!();
        const [saved, methods] = await Promise.all([
          client.getAlarmNoticeConfig(businessType()),
          (async () => {
            const alarmClient = await props.getAlarmClient!();
            const [channels, receive] = await Promise.all([
              alarmClient.getSatMsgChannels(),
              alarmClient.getSatMsgSceneReceive(sceneCode()),
            ]);
            return getNoticeMethodsFromChannels(channels, receive);
          })(),
        ]);
        noticeMethods.value = Array.isArray(methods) ? methods : getNoticeMethods(methods);
        const savedConfigs = asList(saved)
          .filter((item) => String(item.sceneCode ?? "") === sceneCode())
          .map((item) =>
            createConfig({
              notificationTime: Number(item.value ?? 1),
              channelParams: Array.isArray(item.noticeWays)
                ? item.noticeWays.map((way) => String((way as Record<string, unknown>).noticeWay ?? "")).filter(Boolean)
                : [],
            }),
          );
        configs.value = savedConfigs.length ? savedConfigs : [createConfig()];
      } catch {
        configs.value = [createConfig()];
        message.error("加载消息配置失败");
      } finally {
        loading.value = false;
      }
    };

    const addConfig = (): void => {
      configs.value.push(createConfig());
    };
    const removeConfig = (index: number): void => {
      if (configs.value.length === 1) {
        message.warning("请至少保留一条消息通知！");
        return;
      }
      configs.value.splice(index, 1);
    };
    const updateMethod = (config: NoticeConfig, method: string, checked: boolean): void => {
      config.channelParams = checked
        ? [...new Set([...config.channelParams, method])]
        : config.channelParams.filter((item) => item !== method);
    };
    const save = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await props.getMessageConfigClient!();
        await client.saveAlarmNoticeConfig({
          businessType: businessType(),
          sceneConfigDTOS: configs.value.map((config) => ({
            label: "报警任务超时",
            sceneCode: sceneCode(),
            value: config.notificationTime,
            noticeWays: config.channelParams.map((noticeWay) => ({ noticeWay })),
          })),
        });
        message.success("保存成功");
        await load();
      } catch {
        message.error("保存失败");
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content}>
              <div class={styles.sectionTitle}>消息通知</div>
              <Tabs activeKey={sceneCode()} class={styles.tabs}>
                <TabPane key={sceneCode()} tab="报警任务超时">
                  <div class={styles.toolbar}>
                    <span>报警任务超时，提醒处理人员</span>
                    <Button type="primary" onClick={addConfig}>
                      添加
                    </Button>
                  </div>
                  <div class={styles.configList}>
                    {configs.value.map((config, index) => (
                      <div key={config.id} class={styles.configCard}>
                        <Form class={styles.form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                          <FormItem label="通知条件">
                            <span>距离任务超时时间还有&nbsp;</span>
                            <InputNumber
                              min={1}
                              max={100}
                              value={config.notificationTime}
                              onUpdate:value={(value: unknown) => {
                                config.notificationTime = Math.max(1, Number(value ?? 1));
                              }}
                            />
                            <span>&nbsp;分钟提醒</span>
                          </FormItem>
                          <FormItem label="通知方式">
                            {config.noticeMethod.length ? (
                              config.noticeMethod.map((method) => (
                                <Checkbox
                                  key={method.value}
                                  checked={config.channelParams.includes(method.value)}
                                  onChange={(event: { target: { checked: boolean } }) => {
                                    updateMethod(config, method.value, event.target.checked);
                                  }}
                                >
                                  {method.label}
                                </Checkbox>
                              ))
                            ) : (
                              <span class={styles.emptyMethod}>当前场景未配置可使用的通知方式</span>
                            )}
                          </FormItem>
                          <FormItem label="通知模板">
                            【报警时间】发生的【{props.notificationSubject}】报警事件，将在【配置的通知条件】后超时，请及时处理
                          </FormItem>
                        </Form>
                        {index > 0 ? (
                          <PopConfirm title="确定要删除该条消息吗？" onConfirm={() => removeConfig(index)}>
                            <Button danger type="primary">
                              删除
                            </Button>
                          </PopConfirm>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </TabPane>
              </Tabs>
            </div>
          ),
          "footer-btn": () => (
            <Button type="primary" loading={loading.value} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});
