import { defineComponent, onMounted, reactive, ref } from "vue";

import { getLinkageControlClient, getLinkageControlMessageClient } from "../domain-context";
import { Button, CheckboxGroup, FormItem, PageLayout, Tabs, TabPane, message } from "../pc-ui-runtime";

interface ChannelConfig {
  terminal: string;
  channelType: string;
  terminalName: string;
}
interface MessageRule extends Record<string, unknown> {
  satMsgDefineCode: string;
  enabled: boolean;
  channelParams: string[];
  satMsgChannelConfigModifyParams: ChannelConfig[];
  msgTmpContent: string;
}

const definitions = [
  { code: "LINKAGE_CONDITION_EVENT", label: "条件联动", content: "${triggerTime}系统检测条件联动策略${eventName}符合触发条件，系统自动执行" },
  { code: "LINKAGE_SCENE_EVENT", label: "场景控制", content: "${triggerTime}场景控制策略${eventName}被${operatorName}手动执行" },
  { code: "LINKAGE_TIMING_EVENT", label: "定时策略", content: "${triggerTime}系统检测定时控制策略${eventName}符合触发条件，系统自动执行" },
];
const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";

export const LinkageMessageConfigPage = defineComponent({
  name: "LinkageMessageConfigPage",
  setup() {
    const activeKey = ref(definitions[0].code);
    const loading = ref(false);
    const saving = ref(false);
    const loadErrors = ref<string[]>([]);
    const configsReady = ref(false);
    const methods = reactive<Record<string, { label: string; value: string }[]>>({});
    const model = reactive<Record<string, MessageRule[]>>({});

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const codes = definitions.map((item) => item.code);
        configsReady.value = false;
        loadErrors.value = [];
        const requests = await Promise.allSettled([
          getLinkageControlClient().getMessageConfigs(codes),
          ...codes.map((code) => getLinkageControlMessageClient().sceneNotificationMethod(code)),
        ]);
        const [configResult, ...methodResults] = requests;
        const rows = configResult?.status === "fulfilled" ? configResult.value : [];
        configsReady.value = configResult?.status === "fulfilled";
        if (configResult?.status === "rejected") loadErrors.value.push(`消息配置读取失败：${errorText(configResult.reason)}`);
        codes.forEach((code, index) => {
          const result = methodResults[index];
          if (result?.status === "fulfilled") methods[code] = result.value;
          else {
            methods[code] = [];
            loadErrors.value.push(`${definitions[index]?.label ?? code}通知方式读取失败：${errorText(result?.reason)}`);
          }
        });
        for (const definition of definitions) {
          const existing = rows.filter((item) => item.satMsgDefineCode === definition.code);
          model[definition.code] = existing.length ? existing.map((item) => {
            const channelVOS = Array.isArray(item.satMsgChannelConfigVOS) ? item.satMsgChannelConfigVOS as ChannelConfig[] : [];
            return {
              ...item,
              satMsgDefineCode: definition.code,
              enabled: channelVOS.length > 0,
              channelParams: channelVOS.map((channel) => `${channel.terminal}&${channel.channelType}&${channel.terminalName}`),
              satMsgChannelConfigModifyParams: [],
              msgTmpContent: String(item.msgTmpContent ?? definition.content),
            };
          }) : [{
            satMsgDefineCode: definition.code, effectiveDays: 30, enabled: false, channelParams: [],
            satMsgChannelConfigModifyParams: [], msgTmpContent: definition.content,
          }];
        }
      } catch (error) { loadErrors.value = [errorText(error)]; message.error(errorText(error)); }
      finally { loading.value = false; }
    }

    async function save(): Promise<void> {
      if (saving.value) return;
      if (!configsReady.value) { message.warning("消息配置读取失败，已阻止保存，避免覆盖服务器配置"); return; }
      saving.value = true;
      try {
        const rows = definitions.flatMap(({ code }) => model[code] ?? []).map((item) => ({
          ...item,
          enabled: item.channelParams.length > 0,
          satMsgChannelConfigModifyParams: item.channelParams.map((value) => {
            const [terminal, channelType, terminalName] = value.split("&");
            return { terminal, channelType, terminalName };
          }),
        }));
        await getLinkageControlClient().saveMessageConfigs(rows.some((item) => "id" in item) ? "put" : "post", rows);
        message.success("操作成功");
        await load();
      } catch (error) { message.error(errorText(error)); }
      finally { saving.value = false; }
    }

    onMounted(() => { void load(); });
    return () => <PageLayout title="消息配置" v-slots={{
      "layout-content": () => <div aria-busy={loading.value}>
        {loadErrors.value.length > 0 && <div role="alert" style={{ color: "#cf1322", padding: "12px 16px", background: "#fff2f0", marginBottom: "12px" }}>
          {loadErrors.value.map((error) => <div key={error}>{error}</div>)}
        </div>}
        <Tabs activeKey={activeKey.value} onUpdate:activeKey={(value: string | number) => activeKey.value = String(value)}>
          {definitions.map((definition) => <TabPane key={definition.code} tab={definition.label} forceRender>
            {(model[definition.code] ?? []).map((rule, index) => <div key={`${definition.code}-${index}`} style={{ padding: "20px 16px", borderBottom: "1px solid #eee" }}>
              <h3>{definition.label}</h3>
              <FormItem label="通知方式">
                {methods[definition.code]?.length ? <CheckboxGroup
                  options={methods[definition.code].map((item) => ({ label: item.label, value: `${item.value}&${item.value}&${item.label}` }))}
                  value={rule.channelParams}
                  onUpdate:value={(value: (string | number | boolean)[]) => { rule.channelParams = value.map(String); rule.enabled = value.length > 0; }}
                /> : <span>当前场景未配置可使用的通知方式</span>}
              </FormItem>
              <FormItem label="通知内容">{rule.msgTmpContent.replace("${triggerTime}", "【当前时间】").replace("${eventName}", "【策略名称】").replace("${operatorName}", "【人员名称】")}</FormItem>
            </div>)}
          </TabPane>)}
        </Tabs>
      </div>,
      "footer-page": () => <Button type="primary" disabled={!configsReady.value} loading={saving.value} onClick={() => void save()}>保存</Button>,
    }} />;
  },
});
