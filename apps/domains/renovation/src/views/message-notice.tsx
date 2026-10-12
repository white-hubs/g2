import type { SatMsgChannelConfig, SatMsgConfig } from "@g2-client/renovation/client";
import { Button, CheckboxGroup, Form, FormItem, PageLayout, Spin, TabPane, Tabs, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";

import { getMessageClient, getRenovationClient } from "@/domain-context";
import { toText, toTextArray } from "@/utils/form-value";

import styles from "./message-notice.module.css";

/** 两个消息场景，顺序与旧 `messageNotice.vue` 的 panelList 一致。 */
const PANELS = [
  { key: "MAINTAIN_RETROFIT_RECEIPT_CONFIRM", tab: "待确认" },
  { key: "MAINTAIN_RETROFIT_RECEIPT_ASSESSMENT", tab: "待评估" },
];

const SCENE_DEFAULTS: Record<string, string> = {
  MAINTAIN_RETROFIT_RECEIPT_CONFIRM: "您有一条来源于${retrofitEvent}${retrofitName}的确认事项,请及时处理",
  MAINTAIN_RETROFIT_RECEIPT_ASSESSMENT: "您有一条来源于${retrofitEvent}${retrofitName}的评估事项,请及时处理",
};

const TEMPLATE_LABELS: [string, string][] = [
  ["${retrofitEvent}", "【更新改造】"],
  ["${retrofitName}", "【更新改造单名称】"],
];

function renderNoticeTemplate(template?: string): string {
  let text = template ?? "";
  for (const [token, label] of TEMPLATE_LABELS) {
    text = text.split(token).join(label);
  }
  return text;
}

interface NoticeRule {
  config: SatMsgConfig;
  channelCodes: string[];
  existingChannels: SatMsgChannelConfig[];
}

export const RenovationMessageNotice = defineComponent({
  name: "RenovationMessageNotice",
  setup() {
    const client = getRenovationClient();
    const activeKey = ref(PANELS[0]?.key ?? "");
    const rulesByScene = ref<Record<string, NoticeRule[]>>({});
    const noticeMethods = ref<Record<string, { label: string; value: string }[]>>({});
    const loading = ref(false);
    const saving = ref(false);
    const isCreate = ref(true);

    const loadData = async (): Promise<void> => {
      loading.value = true;
      try {
        const messageClient = await getMessageClient();
        const [configs, ...methods] = await Promise.all([
          client.listSatMsgConfigs(PANELS.map((panel) => panel.key).join(",")),
          ...PANELS.map(async (panel) => messageClient.sceneNotificationMethod(panel.key)),
        ]);
        noticeMethods.value = Object.fromEntries(PANELS.map((panel, index) => [panel.key, methods[index] ?? []]));
        isCreate.value = configs.length === 0;
        if (configs.length === 0) {
          rulesByScene.value = Object.fromEntries(
            PANELS.map((panel) => [
              panel.key,
              [
                {
                  config: {
                    satMsgDefineCode: panel.key,
                    effectiveDays: 30,
                    name: "",
                    notifyExpression: "",
                    enabled: false,
                    msgTmpContent: SCENE_DEFAULTS[panel.key] ?? "",
                  },
                  channelCodes: [],
                  existingChannels: [],
                } satisfies NoticeRule,
              ],
            ]),
          );
          return;
        }
        const grouped: Record<string, NoticeRule[]> = {};
        for (const config of configs) {
          const scene = config.satMsgDefineCode ?? "";
          const existingChannels = config.satMsgChannelConfigVOS ?? [];
          const rule: NoticeRule = {
            config: { ...config, name: "" },
            channelCodes: existingChannels.map((channel) => String(channel.channelType ?? "")).filter(Boolean),
            existingChannels,
          };
          grouped[scene] = [...(grouped[scene] ?? []), rule];
        }
        rulesByScene.value = grouped;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "消息配置加载失败");
      } finally {
        loading.value = false;
      }
    };

    const save = async (): Promise<void> => {
      if (saving.value) {
        return;
      }
      saving.value = true;
      try {
        const payload = Object.values(rulesByScene.value)
          .flat()
          .map((rule) => ({
            ...rule.config,
            enabled: rule.channelCodes.length > 0,
            satMsgChannelConfigModifyParams: rule.channelCodes.map((code) => {
              const existing = rule.existingChannels.find((channel) => channel.channelType === code);
              return { terminal: existing?.terminal ?? "", channelType: code, terminalName: existing?.terminalName ?? "" };
            }),
          }));
        if (isCreate.value) {
          await client.createSatMsgConfigs(payload);
        } else {
          await client.updateSatMsgConfigs(payload);
        }
        message.success("操作成功");
        await loadData();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
        await loadData();
      } finally {
        saving.value = false;
      }
    };

    onMounted(() => {
      void loadData();
    });

    const slots = {
      "layout-content": () => (
        <Spin spinning={loading.value}>
          <div class={styles.noticeConfig}>
            <div class={styles.sectionTitle}>改造通知</div>
            <Tabs
              activeKey={activeKey.value}
              onUpdate:activeKey={(key: unknown) => {
                activeKey.value = toText(key);
              }}
            >
              {PANELS.map((panel) => (
                <TabPane tab={panel.tab} key={panel.key}>
                  {(rulesByScene.value[panel.key] ?? []).map((rule, index) => (
                    <Form key={rule.config.id ?? index} labelCol={{ style: { width: "90px" } }} class={styles.ruleForm}>
                      <FormItem label="通知方式">
                        {(noticeMethods.value[panel.key] ?? []).length > 0 ? (
                          <CheckboxGroup
                            value={rule.channelCodes}
                            options={noticeMethods.value[panel.key]}
                            onUpdate:value={(raw: unknown) => {
                              rule.channelCodes = toTextArray(raw);
                            }}
                          />
                        ) : (
                          <span>当前场景未配置可使用的通知方式</span>
                        )}
                      </FormItem>
                      <FormItem label="通知内容">
                        <span>{renderNoticeTemplate(rule.config.msgTmpContent)}</span>
                      </FormItem>
                    </Form>
                  ))}
                </TabPane>
              ))}
            </Tabs>
          </div>
        </Spin>
      ),
      "footer-page": () => (
        <Button type="primary" loading={saving.value} onClick={() => void save()}>
          保存
        </Button>
      ),
    };

    return () => <PageLayout title="更新改造通知" v-slots={slots} />;
  },
});
