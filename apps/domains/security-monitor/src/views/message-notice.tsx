import { computed, defineComponent, onMounted, ref } from "vue";

import { getSecurityMessageConfigClient } from "../domain-context";
import { defineAsyncSecurityPcUiComponent, showSecurityPcUiMessage } from "./pc-ui-runtime";

import styles from "./message-notice.module.css";

const sceneCode = "SECURITY_MONITORING_ALARM_TIMEOUT_NOTIFY";
const businessType = "SECURITY_MONITORING_ALARM";
const template = "【报警时间】发生的【车辆违停】报警事件，将在【配置的通知条件（例：30分钟）】后超时，请及时处理";
const Button = defineAsyncSecurityPcUiComponent("Button");
const Checkbox = defineAsyncSecurityPcUiComponent("Checkbox");
const Form = defineAsyncSecurityPcUiComponent("Form");
const FormItem = defineAsyncSecurityPcUiComponent("FormItem");
const InputNumber = defineAsyncSecurityPcUiComponent("InputNumber");
const PageLayout = defineAsyncSecurityPcUiComponent("PageLayout");
const PopConfirm = defineAsyncSecurityPcUiComponent("PopConfirm");
const Tabs = defineAsyncSecurityPcUiComponent("Tabs");
const TabPane = defineAsyncSecurityPcUiComponent("TabPane");

interface NoticeMethod {
  label: string;
  value: string;
}

interface NoticeConfig {
  id: number;
  notificationTime: number;
  channelParams: string[];
  noticeMethod: NoticeMethod[];
}

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

export const SecurityMessageNoticePage = defineComponent({
  name: "SecurityMessageNoticePage",
  setup() {
    const notify = async (level: "error" | "success" | "warning", text: string): Promise<void> => {
      await showSecurityPcUiMessage(level, text);
    };
    const loading = ref(false);
    const noticeMethods = ref<NoticeMethod[]>([]);
    const configs = ref<NoticeConfig[]>([]);
    let nextId = 1;

    const createConfig = (value: Partial<Pick<NoticeConfig, "notificationTime" | "channelParams">> = {}): NoticeConfig => ({
      id: nextId++,
      notificationTime: Math.max(1, Number(value.notificationTime ?? 1)),
      channelParams: value.channelParams ?? [],
      noticeMethod: noticeMethods.value,
    });

    const activeConfigCount = computed(() => configs.value.length);

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getSecurityMessageConfigClient();
        const [saved, methods] = await Promise.all([client.getAlarmNoticeConfig(businessType), client.getNoticeMethods(sceneCode)]);

        noticeMethods.value = getNoticeMethods(methods);
        const savedConfigs = asList(saved)
          .filter((item) => String(item.sceneCode) === sceneCode)
          .map((item) =>
            createConfig({
              notificationTime: Number(item.value ?? 1),
              channelParams: Array.isArray(item.noticeWays)
                ? item.noticeWays.map((noticeWay) => String((noticeWay as Record<string, unknown>).noticeWay ?? "")).filter(Boolean)
                : [],
            }),
          );
        configs.value = savedConfigs.length ? savedConfigs : [createConfig()];
      } catch {
        configs.value = [createConfig()];
        await notify("error", "加载消息配置失败");
      } finally {
        loading.value = false;
      }
    };

    const addConfig = (): void => {
      configs.value.push(createConfig());
    };

    const removeConfig = async (index: number): Promise<void> => {
      if (configs.value.length === 1) {
        await notify("warning", "请至少保留一条消息通知！");
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
        const client = await getSecurityMessageConfigClient();
        await client.saveAlarmNoticeConfig({
          businessType,
          sceneConfigDTOS: configs.value.map((config) => ({
            label: "报警任务超时",
            sceneCode,
            value: config.notificationTime,
            noticeWays: config.channelParams.map((noticeWay) => ({ noticeWay })),
          })),
        });
        await notify("success", "保存成功");
        await load();
      } catch {
        await notify("error", "保存失败");
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => void load());

    return () => (
      <PageLayout
        title="消息配置"
        v-slots={{
          "layout-content": () => (
            <div class={styles.content}>
              <div class={styles.sectionTitle}>消息通知</div>
              <Tabs activeKey={sceneCode} class={styles.tabs}>
                <TabPane key={sceneCode} tab="报警任务超时">
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
                          <FormItem label="通知模板">{template}</FormItem>
                        </Form>
                        {index > 0 ? (
                          <PopConfirm title="确定要删除该条消息吗？" onConfirm={() => void removeConfig(index)}>
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
              <span class={styles.configCount}>当前共 {activeConfigCount.value} 条通知配置</span>
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
