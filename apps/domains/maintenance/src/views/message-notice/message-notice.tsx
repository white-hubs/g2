import type { SatMsgChannelConfig, SatMsgConfig } from "@g2-client/maintenance/client";
import { Button, CheckboxGroup, Form, FormItem, PageLayout, Spin, TabPane, Tabs, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";

import { getMaintenanceClient, getMessageClient } from "@/domain-context";
import { MAINTENANCE_NOTICE_SCENE, renderNoticeTemplate } from "@/utils/enum";
import { toText, toTextArray } from "@/utils/form-value";

import styles from "./message-notice.module.css";

/** 旧页仅配置「待维保」一个场景，保留数组结构便于后续扩展。 */
const PANELS = [{ key: MAINTENANCE_NOTICE_SCENE, tab: "待维保" }];

const DEFAULT_TEMPLATE = "您有一条来源于${maintenaceEvent}${maintenaceName}的维保事项，请及时处理";

interface NoticeRule {
  config: SatMsgConfig;
  /** 已勾选的通知通道编码（channelType）。 */
  channelCodes: string[];
  /** 已有配置中的通道明细，保存时复用其 terminal / terminalName。 */
  existingChannels: SatMsgChannelConfig[];
}

export const MaintenanceMessageNotice = defineComponent({
  name: "MaintenanceMessageNotice",
  setup() {
    const client = getMaintenanceClient();
    const activeKey = ref(MAINTENANCE_NOTICE_SCENE);
    const rulesByScene = ref<Record<string, NoticeRule[]>>({});
    const noticeMethods = ref<Record<string, { label: string; value: string }[]>>({});
    const loading = ref(false);
    const saving = ref(false);
    /** 无既有配置时走新增，否则走更新，与旧页一致。 */
    const isCreate = ref(true);

    const loadData = async (): Promise<void> => {
      loading.value = true;
      try {
        const messageClient = await getMessageClient();
        const [configs, methods] = await Promise.all([
          client.listSatMsgConfigs(MAINTENANCE_NOTICE_SCENE),
          messageClient.sceneNotificationMethod(MAINTENANCE_NOTICE_SCENE),
        ]);
        noticeMethods.value = { [MAINTENANCE_NOTICE_SCENE]: methods };
        isCreate.value = configs.length === 0;
        if (configs.length === 0) {
          rulesByScene.value = {
            [MAINTENANCE_NOTICE_SCENE]: [
              {
                config: {
                  satMsgDefineCode: MAINTENANCE_NOTICE_SCENE,
                  effectiveDays: 30,
                  notifyExpression: "",
                  enabled: false,
                  msgTmpContent: DEFAULT_TEMPLATE,
                },
                channelCodes: [],
                existingChannels: [],
              },
            ],
          };
          return;
        }
        // 每个场景只渲染本场景返回的规则，不把全量结果重复填进每个 Tab。
        const grouped: Record<string, NoticeRule[]> = {};
        for (const config of configs) {
          const scene = config.satMsgDefineCode ?? MAINTENANCE_NOTICE_SCENE;
          const existingChannels = config.satMsgChannelConfigVOS ?? [];
          const rule: NoticeRule = {
            config,
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
            // 旧页提交的通道三元组；terminal / terminalName 沿用既有配置，新增时由后端按通道补全。
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
            <div class={styles.sectionTitle}>维保通知</div>
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

    return () => <PageLayout title="消息配置" v-slots={slots} />;
  },
});
