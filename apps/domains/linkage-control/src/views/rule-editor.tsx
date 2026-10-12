import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLinkageControlClient } from "../domain-context";
import { Button, DatePicker, Form, FormItem, Input, InputNumber, PageLayout, Select, Space, Switch, Textarea, message } from "../pc-ui-runtime";

type RuleKind = "condition" | "scene" | "time";
const errorText = (error: unknown): string => error instanceof Error ? error.message : "请求失败";
const actionTypes = ["IOT_DEVICE_ACTION", "VIDEO_DEVICE_ACTION", "MESSAGE_NOTIFY_ACTION"] as const;
const actionLabels = ["物联设备联动配置", "监控联动配置", "消息通知配置"];
const parseJson = (value: string, label: string): unknown => {
  try { return JSON.parse(value); } catch { throw new Error(`${label} JSON 格式错误`); }
};
const stringify = (value: unknown): string => JSON.stringify(value ?? [], null, 2);

export const LinkageRuleEditorPage = (kind: RuleKind) => defineComponent({
  name: `LinkageRuleEditor-${kind}`,
  setup() {
    const route = useRoute();
    const router = useRouter();
    const id = typeof route.params.id === "string" ? route.params.id : undefined;
    const loading = ref(false);
    const saving = ref(false);
    const basic = reactive({ name: "", enabled: true, repeatTime: "" });
    const payload = reactive({ ruleConfig: "", password: "", againPassword: "", looped: false, executeTime: "", cron: "", iot: "[]", video: "[]", message: "[]" });
    const title = id ? "编辑联动" : "新增联动";
    const path = `/d/linkage-control/${kind === "condition" ? "condition" : kind}-rules`;

    async function load(): Promise<void> {
      if (!id) {
        payload.ruleConfig = stringify(kind === "condition" ? [] : {});
        payload.password = ""; payload.againPassword = ""; payload.looped = false; payload.executeTime = ""; payload.cron = "";
        payload.iot = stringify([]); payload.video = stringify([]); payload.message = stringify([]);
        return;
      }
      loading.value = true;
      try {
        const detail = await getLinkageControlClient().getRule(id);
        const basicInfo = (detail.ruleBasicVO ?? {}) as Record<string, unknown>;
        basic.name = String(basicInfo.name ?? "");
        basic.enabled = Boolean(basicInfo.enabled);
        basic.repeatTime = String(basicInfo.repeatTime ?? "");
        const config = detail.ruleConfig;
        const parsedConfig = typeof config === "string" ? JSON.parse(config) as Record<string, unknown> : (config ?? {}) as Record<string, unknown>;
        payload.ruleConfig = kind === "condition" ? stringify(parsedConfig) : stringify({});
        if (kind === "scene") {
          payload.password = String(parsedConfig.password ?? "");
          payload.againPassword = String(parsedConfig.againPassword ?? "");
        }
        if (kind === "time") {
          payload.looped = parsedConfig.looped === true || parsedConfig.looped === "true";
          payload.executeTime = String(parsedConfig.executeTime ?? "");
          payload.cron = String(parsedConfig.cron ?? "");
        }
        const actions = Array.isArray(detail.linkageActionVOS) ? detail.linkageActionVOS as Record<string, unknown>[] : [];
        for (const [index, type] of actionTypes.entries()) {
          const item = actions.find((action) => action.actionType === type);
          payload[["iot", "video", "message"][index] as "iot" | "video" | "message"] = stringify(item ?? { actionType: type, enabled: true, actionConfig: [] });
        }
      } catch (error) { message.error(errorText(error)); }
      finally { loading.value = false; }
    }

    async function save(): Promise<void> {
      if (saving.value || !basic.name.trim()) { if (!basic.name.trim()) message.warning("请输入联动名称"); return; }
      saving.value = true;
      try {
        if (kind === "condition" && (!Number.isInteger(Number(basic.repeatTime)) || Number(basic.repeatTime) < 1 || Number(basic.repeatTime) > 60)) {
          throw new Error("静默时长必须为 1~60 之间的整数");
        }
        if (kind === "scene" && payload.password && payload.password !== payload.againPassword) throw new Error("两次输入的控制密码不一致");
        if (kind === "time" && (payload.looped ? !payload.cron.trim() : !payload.executeTime.trim())) {
          throw new Error(payload.looped ? "请输入循环 Cron 表达式" : "请选择执行时间");
        }
        const ruleConfig = kind === "condition" ? parseJson(payload.ruleConfig, "联动规则") : kind === "scene"
          ? { password: payload.password, againPassword: payload.againPassword }
          : { looped: payload.looped, executeTime: payload.looped ? "" : payload.executeTime, cron: payload.looped ? payload.cron.trim() : "" };
        if (kind === "condition" && (!Array.isArray(ruleConfig) || ruleConfig.length === 0)) throw new Error("请至少配置一条联动条件");
        const linkageEmergencyActionModifies = [payload.iot, payload.video, payload.message].map((value, index) => {
          const action = parseJson(value, actionLabels[index]) as Record<string, unknown>;
          if (!action || typeof action !== "object" || action.actionType !== actionTypes[index] || !Array.isArray(action.actionConfig)) {
            throw new Error(`${actionLabels[index]}结构不正确`);
          }
          return action;
        });
        const body = {
          basicModify: {
            id: id ?? "", code: "", name: basic.name.trim(), applicationCode: "DEVICE", applicationName: "设备管理",
            type: kind === "condition" ? "DEVICE_CONDITION_RULE" : kind === "scene" ? "SCENE_RULE" : "TIMING_RULE",
            businessType: kind === "condition" ? "DEVICE_CONDITION" : kind === "scene" ? "SCENE_CONTROL" : "TIMING_CONTROL",
            ...(kind === "condition" ? { reiterated: false, repeatTime: basic.repeatTime, repeatTimeUnit: "MINUTE" } : {}), enabled: basic.enabled,
          },
          ruleConfig: JSON.stringify(ruleConfig), linkageEmergencyActionModifies,
        };
        if (id) await getLinkageControlClient().updateRule(id, body);
        else await getLinkageControlClient().createRule(body);
        message.success(id ? "修改成功" : "新增成功");
        await router.push(path);
      } catch (error) { message.error(errorText(error)); }
      finally { saving.value = false; }
    }

    onMounted(() => { void load(); });
    return () => <PageLayout title={title} aria-busy={loading.value} v-slots={{
      "layout-content": () => <div style={{ overflow: "auto", padding: "16px" }}>
        <Form layout="vertical">
          <FormItem label={kind === "time" ? "任务名称" : kind === "scene" ? "场景名称" : "联动名称"} required>
            <Input value={basic.name} placeholder="请输入名称" onUpdate:value={(value: string) => basic.name = value} />
          </FormItem>
          {kind === "condition" && <FormItem label="静默时长（分钟）" required><InputNumber min={1} max={60} precision={0} value={Number(basic.repeatTime) || undefined} onUpdate:value={(value: string | number | undefined) => basic.repeatTime = String(value ?? "")} /></FormItem>}
          <FormItem label="是否启用"><Switch checked={basic.enabled} onChange={(value: boolean | string | number) => basic.enabled = value === true} /></FormItem>
          {kind === "condition" && <FormItem label="联动条件配置（JSON 数组）" required>
            <Textarea value={payload.ruleConfig} rows={8} onUpdate:value={(value: string) => payload.ruleConfig = value} />
          </FormItem>}
          {kind === "scene" && <>
            <FormItem label="控制密码"><Input type="password" autocomplete="new-password" value={payload.password} onUpdate:value={(value: string) => payload.password = value} /></FormItem>
            <FormItem label="确认控制密码"><Input type="password" autocomplete="new-password" value={payload.againPassword} onUpdate:value={(value: string) => payload.againPassword = value} /></FormItem>
          </>}
          {kind === "time" && <>
            <FormItem label="是否循环"><Select value={payload.looped ? "true" : "false"} options={[{ label: "单次执行", value: "false" }, { label: "循环执行", value: "true" }]} onUpdate:value={(value: unknown) => payload.looped = value === "true"} /></FormItem>
            {payload.looped
              ? <FormItem label="Cron 表达式" required><Input value={payload.cron} placeholder="请输入 Cron 表达式" onUpdate:value={(value: string) => payload.cron = value} /></FormItem>
              : <FormItem label="执行时间" required><DatePicker showTime valueFormat="YYYY-MM-DD HH:mm:ss" value={payload.executeTime || undefined} onUpdate:value={(value: string | { format: (pattern: string) => string }) => payload.executeTime = typeof value === "string" ? value : value.format("YYYY-MM-DD HH:mm:ss")} /></FormItem>}
          </>}
          {actionLabels.map((label, index) => {
            const field = ["iot", "video", "message"][index] as "iot" | "video" | "message";
            return <FormItem key={field} label={`${label}（JSON）`}><Textarea value={payload[field]} rows={6} onUpdate:value={(value: string) => payload[field] = value} /></FormItem>;
          })}
        </Form>
      <p>动作配置按旧接口 DTO 保存；旧版设备选择器、视频动作选择器和消息对象选择组件仍需迁入。</p>
      </div>,
      "footer-page": () => <Space><Button onClick={() => void router.push(path)}>返回</Button><Button type="primary" loading={saving.value} onClick={() => void save()}>保存</Button></Space>,
    }} />;
  },
});
