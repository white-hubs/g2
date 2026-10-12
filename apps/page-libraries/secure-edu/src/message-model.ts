import type { EduMessageRule, SecureEduRecord } from "@g2-contract/secure-edu";

import { number, rows, text } from "./model";

export const MESSAGE_CHANNELS = [
  { label: "短信", value: "CHANNEL_SMS:bimops-manage-app" },
  { label: "PC站内", value: "CHANNEL_SITE:bimops-manage-web" },
  { label: "APP站内", value: "CHANNEL_SITE:bimops-manage-app" },
  { label: "app推送", value: "CHANNEL_APP:bimops-manage-app" },
];

/** 原页面展示固定中文说明，不把保存用的模板变量变成可编辑内容。 */
export function messagePresentation(rule: EduMessageRule) {
  const training = rule.satMsgDefineCode === "CULTIVATE_TASK_PUBLISHED";
  const charge = rule.notifyExpression === "CULTIVATE_CHARGE_USERS" || rule.notifyExpression === "EXAM_CHARGE_USER";
  const subject = training ? "培训" : "考试";
  return {
    title: charge ? `${subject}负责人` : `通知参加${subject}的人员`,
    condition: `${subject}任务下发即提醒`,
    content: `您有一条来源于安全教育的消息，${charge ? "您负责" : ""}【${subject}主题】将在【${subject}开始时间】进行，${charge ? "请及时协调人员参加" : `请合理安排您的时间及时参加${subject}`}`,
  };
}

export function selectedMessageChannels(rule: EduMessageRule): string[] {
  return MESSAGE_CHANNELS.filter(({ value }) => {
    const [channelType, terminal] = value.split(":");
    return rule.satMsgChannelConfigModifyParams.some(
      (channel) => channel.channelType === channelType && (channelType !== "CHANNEL_SITE" || channel.terminal === terminal),
    );
  }).map(({ value }) => value);
}

/** 站内渠道区分 PC/APP；短信、推送按原页的渠道类型回填。 */
export function updateMessageChannels(rule: EduMessageRule, values: unknown[]): void {
  rule.satMsgChannelConfigModifyParams = MESSAGE_CHANNELS.filter(({ value }) => values.includes(value)).map(({ value }) => {
    const [channelType, terminal] = value.split(":");
    return {
      channelType: channelType!,
      terminal: terminal!,
      terminalName: terminal === "bimops-manage-web" ? "常德高铁站web" : "常德高铁站app",
    };
  });
}

export function defaultMessageRules(): EduMessageRule[] {
  return ["CULTIVATE_TASK_PUBLISHED", "EXAM_TASK_PUBLISHED"].flatMap((code) =>
    [false, true].map((charge) => {
      const training = code.startsWith("CULTIVATE");
      const subject = training ? `\${cultivateTaskName}将在\${cultivateStartTime}` : `\${examTaskName}将在\${examStartTime}`;
      return {
        satMsgDefineCode: code,
        notifyExpression: training
          ? charge
            ? "CULTIVATE_CHARGE_USERS"
            : "CULTIVATE_TASK_USERS"
          : charge
            ? "EXAM_CHARGE_USER"
            : "EXAM_TASK_USERS",
        msgTmpContent: `您有一条来源于安全教育的消息，${charge ? "您负责" : ""}${subject}进行，${charge ? "请及时协调人员参加" : `请合理安排您的时间及时参加${training ? "培训" : "考试"}`}`,
        satMsgChannelConfigModifyParams: [],
      };
    }),
  );
}

export function mergeMessageRules(records: SecureEduRecord[]): EduMessageRule[] {
  return defaultMessageRules().map((rule) => {
    const existing = records.find(
      (item) => item.satMsgDefineCode === rule.satMsgDefineCode && item.notifyExpression === rule.notifyExpression,
    );
    return existing
      ? {
          id: existing.id,
          msgTmpId: existing.msgTmpId,
          satMsgDefineCode: rule.satMsgDefineCode,
          notifyExpression: rule.notifyExpression,
          enabled: typeof existing.enabled === "boolean" ? existing.enabled : undefined,
          effectiveDays:
            existing.effectiveDays === undefined || existing.effectiveDays === null ? undefined : number(existing.effectiveDays),
          msgTmpContent: typeof existing.msgTmpContent === "string" ? existing.msgTmpContent : rule.msgTmpContent,
          satMsgChannelConfigModifyParams: rows(existing.satMsgChannelConfigVOS).map((channel) => ({
            channelType: text(channel.channelType),
            terminal: text(channel.terminal),
            terminalName: text(channel.terminalName),
          })),
        }
      : rule;
  });
}

/** 只提交原消息接口的修改 DTO，不把读取时的 VOS、展示字段回传。 */
export function messageCommands(rules: EduMessageRule[]): EduMessageRule[] {
  return rules.map((rule) => ({
    id: rule.id,
    msgTmpId: rule.msgTmpId,
    satMsgDefineCode: rule.satMsgDefineCode,
    notifyExpression: rule.notifyExpression,
    enabled: rule.enabled,
    effectiveDays: rule.effectiveDays,
    msgTmpContent: rule.msgTmpContent,
    satMsgChannelConfigModifyParams: rule.satMsgChannelConfigModifyParams,
  }));
}
