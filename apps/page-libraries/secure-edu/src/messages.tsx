import type { EduMessageRule } from "@g2-contract/secure-edu";
import { defineComponent, onMounted, ref } from "vue";

import { getClient, loadUi } from "./context";
import {
  MESSAGE_CHANNELS,
  defaultMessageRules,
  mergeMessageRules,
  messageCommands,
  messagePresentation,
  selectedMessageChannels,
  updateMessageChannels,
} from "./message-model";
import { errorText, object, text } from "./model";

import styles from "./styles.module.css";
const { Alert, Button, CheckboxGroup, PageLayout, Spin, Tabs, TabPane, message } = await loadUi();
export const Messages = defineComponent({
  setup() {
    const active = ref("CULTIVATE_TASK_PUBLISHED");
    const rules = ref<EduMessageRule[]>(defaultMessageRules());
    const saving = ref(false);
    const loaded = ref(false);
    const create = ref(false);
    const loading = ref(false);
    const loadError = ref("");
    async function load() {
      if (loading.value) {
        return;
      }
      loading.value = true;
      loaded.value = false;
      loadError.value = "";
      try {
        const result = await getClient().messages();
        create.value = result.length === 0;
        rules.value = mergeMessageRules(result);
        loaded.value = true;
      } catch (error) {
        loaded.value = false;
        const detail = object(object(error).errorDetail);
        loadError.value = text(detail.message) || errorText(error);
      } finally {
        loading.value = false;
      }
    }
    onMounted(() => void load());
    const save = async () => {
      if (!loaded.value || loading.value || saving.value) {
        return;
      }
      saving.value = true;
      try {
        await getClient().saveMessages(messageCommands(rules.value), create.value);
        create.value = false;
        message.success("保存成功");
        await load();
      } catch (error) {
        message.error(errorText(error));
      } finally {
        saving.value = false;
      }
    };
    return () => (
      <PageLayout
        title="消息通知"
        showFooter
        v-slots={{
          "layout-content": () => (
            <div class={styles.main}>
              <Tabs
                type="card"
                activeKey={active.value}
                onUpdate:activeKey={(v: unknown) => {
                  active.value = text(v);
                }}
              >
                <TabPane key="CULTIVATE_TASK_PUBLISHED" tab="培训" />
                <TabPane key="EXAM_TASK_PUBLISHED" tab="考试" />
              </Tabs>
              <div class={styles.messageBody}>
                {loadError.value && (
                  <div class={styles.messageError}>
                    <Alert type="error" showIcon message="消息配置读取失败，暂不能保存" description={loadError.value} style={{ flex: 1 }} />
                    <Button loading={loading.value} onClick={() => void load()}>
                      重试
                    </Button>
                  </div>
                )}
                <Spin spinning={loading.value} tip="正在读取消息配置">
                  {rules.value
                    .filter((rule) => rule.satMsgDefineCode === active.value)
                    .map((rule) => {
                      const view = messagePresentation(rule);
                      return (
                        <section key={rule.notifyExpression} class={styles.messageRule}>
                          <h3>{view.title}</h3>
                          <div class={styles.messageFields}>
                            <div class={styles.messageRow}>
                              <span class={styles.messageLabel}>通知条件：</span>
                              <span>{view.condition}</span>
                            </div>
                            <div class={styles.messageRow}>
                              <span class={styles.messageLabel}>通知方式：</span>
                              <CheckboxGroup
                                disabled={!loaded.value || loading.value || saving.value}
                                options={MESSAGE_CHANNELS}
                                value={selectedMessageChannels(rule)}
                                onUpdate:value={(values: unknown[]) => updateMessageChannels(rule, values)}
                              />
                            </div>
                            <div class={styles.messageRow}>
                              <span class={styles.messageLabel}>通知内容：</span>
                              <span>{view.content}</span>
                            </div>
                          </div>
                        </section>
                      );
                    })}
                </Spin>
              </div>
            </div>
          ),
          "footer-page": () => (
            <div class={styles.footer}>
              <Button type="primary" disabled={!loaded.value} loading={saving.value} onClick={() => void save()}>
                保存
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
