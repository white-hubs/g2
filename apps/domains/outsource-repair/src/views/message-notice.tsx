import type { SatMsgChannelConfig, SatMsgConfig } from "@g2-client/outsource-repair/client";
import { Button, CheckboxGroup, Form, FormItem, PageLayout, Spin, TabPane, Tabs, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref } from "vue";

import { getMessageClient, getOutsourceRepairClient } from "@/domain-context";
import { toText, toTextArray } from "@/utils/form-value";

import styles from "./message-notice.module.css";

/** 五个消息场景，顺序与旧 `messageNotice.vue` 的 panelList 一致。 */
const PANELS = [
  { key: "MAINTAIN_OUTSOURCE_REPAIR_DISTRIBUTED", tab: "接收工单" },
  { key: "MAINTAIN_OUTSOURCE_REPAIR_SOLVE", tab: "处理工单" },
  { key: "MAINTAIN_OUTSOURCE_REPAIR_CONFIRM", tab: "待确认" },
  { key: "MAINTAIN_OUTSOURCE_REPAIR_RECEIVED", tab: "已接收" },
  { key: "MAINTAIN_OUTSOURCE_REPAIR_HANDLED", tab: "已处理" },
];

/** 无既有配置时，各场景的默认规则名称与模板内容，逐条对齐旧页。 */
const SCENE_DEFAULTS: Record<string, { name: string; msgTmpContent: string }> = {
  MAINTAIN_OUTSOURCE_REPAIR_DISTRIBUTED: {
    name: "通知委外公司责任人",
    msgTmpContent: "${userName}您好，您有一条来自${tenantName}的委外维修工单，请点击下面的链接确认接收该工单：${address}",
  },
  MAINTAIN_OUTSOURCE_REPAIR_SOLVE: {
    name: "通知工单处理人",
    msgTmpContent: "${userName}您好，您有一条来自${tenantName}的委外维修工单，请点击下面的链接进行处理结果提交：${address}",
  },
  MAINTAIN_OUTSOURCE_REPAIR_CONFIRM: {
    name: "",
    msgTmpContent: "您有一条来自${outsourceEvent}${outsourceName}的确认事项，请及时处理",
  },
  MAINTAIN_OUTSOURCE_REPAIR_RECEIVED: {
    name: "",
    msgTmpContent: "您好，来源于${outsourceEvent}，名称为：${outsourceName}已被${userName}接受，处理结果为：${handleResult}",
  },
  MAINTAIN_OUTSOURCE_REPAIR_HANDLED: {
    name: "",
    msgTmpContent: "您好，来源于${outsourceEvent}，名称为：${outsourceName}已被${userName}处理完成，处理结果为：${handleResult}",
  },
};

/** 已有配置统一按旧页显示该名称。 */
const EXISTING_RULE_NAME = "通知委外公司责任人";

const TEMPLATE_LABELS: [string, string][] = [
  ["${userName}", "【用户名称】"],
  ["${tenantName}", "【企业名称】"],
  ["${outsourceEvent}", "【委外维修】"],
  ["${outsourceName}", "【委外维修单名称】"],
  ["${handleResult}", "【处理结果】"],
  ["${address}", "http://www.dfadf.com/adfadf.html"],
];

/** 把模板变量替换为旧页的中文示意文案。 */
function renderNoticeTemplate(template?: string): string {
  let text = template ?? "";
  for (const [token, label] of TEMPLATE_LABELS) {
    text = text.split(token).join(label);
  }
  return text;
}

interface NoticeRule {
  config: SatMsgConfig;
  /** 已勾选的通知通道编码（channelType）。 */
  channelCodes: string[];
  /** 已有配置中的通道明细，保存时复用其 terminal / terminalName。 */
  existingChannels: SatMsgChannelConfig[];
}

export const OutsourceMessageNotice = defineComponent({
  name: "OutsourceMessageNotice",
  setup() {
    const client = getOutsourceRepairClient();
    const activeKey = ref(PANELS[0]?.key ?? "");
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
        const [configs, ...methods] = await Promise.all([
          // 旧页一次批量查询全部场景编码。
          client.listSatMsgConfigs(PANELS.map((panel) => panel.key).join(",")),
          ...PANELS.map(async (panel) => messageClient.sceneNotificationMethod(panel.key)),
        ]);
        noticeMethods.value = Object.fromEntries(PANELS.map((panel, index) => [panel.key, methods[index] ?? []]));
        isCreate.value = configs.length === 0;
        if (configs.length === 0) {
          // 空数据时每个场景只创建本场景的一条默认规则。
          rulesByScene.value = Object.fromEntries(
            PANELS.map((panel) => [
              panel.key,
              [
                {
                  config: {
                    satMsgDefineCode: panel.key,
                    effectiveDays: 30,
                    name: SCENE_DEFAULTS[panel.key]?.name ?? "",
                    notifyExpression: "",
                    enabled: false,
                    msgTmpContent: SCENE_DEFAULTS[panel.key]?.msgTmpContent ?? "",
                  },
                  channelCodes: [],
                  existingChannels: [],
                } satisfies NoticeRule,
              ],
            ]),
          );
          return;
        }
        // 每个 Tab 只渲染本场景返回的规则。
        const grouped: Record<string, NoticeRule[]> = {};
        for (const config of configs) {
          const scene = config.satMsgDefineCode ?? "";
          const existingChannels = config.satMsgChannelConfigVOS ?? [];
          const rule: NoticeRule = {
            config: { ...config, name: EXISTING_RULE_NAME },
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
            <div class={styles.sectionTitle}>委外维修单</div>
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
                      {rule.config.name ? <div class={styles.ruleName}>{rule.config.name}</div> : null}
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

    return () => <PageLayout title="委外消息配置" v-slots={slots} />;
  },
});
