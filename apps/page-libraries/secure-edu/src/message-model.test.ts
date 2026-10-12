import { expect, test } from "bun:test";

import {
  MESSAGE_CHANNELS,
  defaultMessageRules,
  mergeMessageRules,
  messageCommands,
  messagePresentation,
  selectedMessageChannels,
  updateMessageChannels,
} from "./message-model";
import { saveCommand } from "./model";

test("消息培训/考试、人员/负责人保持原场景和模板，各场景隔离回填", () => {
  const defaults = defaultMessageRules();
  expect(defaults).toHaveLength(4);
  expect(defaults[1]?.msgTmpContent).toContain(`您负责\${cultivateTaskName}`);
  expect(defaults[3]?.msgTmpContent).toContain(`您负责\${examTaskName}`);
  const rules = mergeMessageRules([
    {
      id: "exam-1",
      satMsgDefineCode: "EXAM_TASK_PUBLISHED",
      notifyExpression: "EXAM_TASK_USERS",
      enabled: false,
      msgTmpContent: "原考试通知",
      satMsgChannelConfigVOS: [{ channelType: "CHANNEL_SITE", terminal: "bimops-manage-web", terminalName: "PC" }],
    },
    { id: "other", satMsgDefineCode: "OTHER", notifyExpression: "EXAM_TASK_USERS" },
  ]);
  expect(rules[0]?.msgTmpContent).toBe(defaults[0]?.msgTmpContent);
  expect(rules[2]?.enabled).toBe(false);
  expect(rules[2]?.msgTmpContent).toBe("原考试通知");
  expect(rules[2]?.satMsgChannelConfigModifyParams).toEqual([
    { channelType: "CHANNEL_SITE", terminal: "bimops-manage-web", terminalName: "PC" },
  ]);
  const commands = messageCommands(rules);
  expect(commands[2]?.id).toBe("exam-1");
  expect(commands[2]).not.toHaveProperty("satMsgChannelConfigVOS");
});

test("消息通知展示与原页一致：四个中文对象、下发提醒及固定中文模板说明", () => {
  const views = defaultMessageRules().map((rule) => messagePresentation(rule));
  expect(views.map((view) => view.title)).toEqual(["通知参加培训的人员", "培训负责人", "通知参加考试的人员", "考试负责人"]);
  expect(views.map((view) => view.condition)).toEqual([
    "培训任务下发即提醒",
    "培训任务下发即提醒",
    "考试任务下发即提醒",
    "考试任务下发即提醒",
  ]);
  expect(views[0]?.content).toBe("您有一条来源于安全教育的消息，【培训主题】将在【培训开始时间】进行，请合理安排您的时间及时参加培训");
  expect(views[3]?.content).toBe("您有一条来源于安全教育的消息，您负责【考试主题】将在【考试开始时间】进行，请及时协调人员参加");
  expect(views.every((view) => !view.content.includes("${"))).toBe(true);
  expect(MESSAGE_CHANNELS.map(({ label }) => label)).toEqual(["短信", "PC站内", "APP站内", "app推送"]);
});

test("消息渠道回填区分 PC/APP 站内，短信及推送保持原页按类型匹配", () => {
  const rule = mergeMessageRules([
    {
      id: "train-1",
      satMsgDefineCode: "CULTIVATE_TASK_PUBLISHED",
      notifyExpression: "CULTIVATE_TASK_USERS",
      enabled: false,
      effectiveDays: 0,
      msgTmpId: "template-1",
      msgTmpContent: "保留服务器模板",
      satMsgChannelConfigVOS: [
        { channelType: "CHANNEL_SMS", terminal: "another-terminal" },
        { channelType: "CHANNEL_SITE", terminal: "bimops-manage-web" },
        { channelType: "CHANNEL_APP", terminal: "another-terminal" },
      ],
    },
  ])[0];
  if (!rule) {
    throw new Error("培训人员规则缺失");
  }
  expect(selectedMessageChannels(rule)).toEqual([
    "CHANNEL_SMS:bimops-manage-app",
    "CHANNEL_SITE:bimops-manage-web",
    "CHANNEL_APP:bimops-manage-app",
  ]);
  updateMessageChannels(rule, ["CHANNEL_SITE:bimops-manage-app", "not-a-channel"]);
  expect(messageCommands([rule])[0]).toEqual({
    id: "train-1",
    msgTmpId: "template-1",
    satMsgDefineCode: "CULTIVATE_TASK_PUBLISHED",
    notifyExpression: "CULTIVATE_TASK_USERS",
    enabled: false,
    effectiveDays: 0,
    msgTmpContent: "保留服务器模板",
    satMsgChannelConfigModifyParams: [{ channelType: "CHANNEL_SITE", terminal: "bimops-manage-app", terminalName: "常德高铁站app" }],
  });
});

test("空配置不擅自新增原页面没有设置的启用状态及有效天数", () => {
  const defaults = defaultMessageRules();
  expect(defaults.every((rule) => rule.enabled === undefined && rule.effectiveDays === undefined)).toBe(true);
  expect(mergeMessageRules([])).toEqual(defaults);
});

test("保存只提交旧 DTO 的字段，排除默认交叉字段及详情展示数据", () => {
  expect(
    saveCommand("courseware", {
      fileId: "file-1",
      name: "课件",
      themeId: "theme-1",
      duration: 0,
      timed: false,
      file: {},
      createTime: 0,
      themeName: "经济",
    }),
  ).toEqual({ fileId: "file-1", name: "课件", themeId: "theme-1", duration: 0 });
  expect(
    saveCommand("exam-task", {
      name: "考试",
      timed: false,
      examPaperIds: ["1"],
      examUsers: [],
      examPapers: [{}],
      cultivateMode: "OFFLINE",
    }),
  ).toEqual({ name: "考试", timed: false, examPaperIds: ["1"], examUsers: [] });
  expect(saveCommand("paper-question-rule", { ruleName: "规则", passScore: 10, items: [], totalScore: 20, questionNum: 4 })).toEqual({
    ruleName: "规则",
    passScore: 10,
    items: [],
  });
});
