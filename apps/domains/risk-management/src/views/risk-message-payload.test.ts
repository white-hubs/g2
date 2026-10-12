import { expect, test } from "bun:test";

import { buildRiskMessageSavePayload, createSceneItem, normalizeSceneItem, staffRecordsOf } from "./risk-message-payload";

test("消息保存 payload 补齐 label，空人员保持数组", () => {
  const soon = createSceneItem("RISK_SOURCE_OVERDUE_ABOUT");
  soon.noticeWays = ["CHANNEL_SITE"];
  soon.noticeObjs = [
    { id: "obj-1", objType: "gas", objId: ["u1", "u2"] },
    { id: "obj-2", objType: "chem", objId: [] },
  ];
  const overdue = createSceneItem("RISK_SOURCE_OVERDUE");
  overdue.noticeWays = ["CHANNEL_SMS"];
  overdue.noticeObjs = [{ id: "obj-3", objType: "gas", objId: ["u3"] }];
  const imperative = createSceneItem("MANDATORY_TESTING_OVERDUE_ABOUT");
  imperative.noticeWays = ["CHANNEL_SITE"];
  imperative.noticeObjs = [{ id: "obj-4", objType: "chem", objId: ["u4"] }];

  const payload = buildRiskMessageSavePayload({
    RISK_SOURCE_OVERDUE_ABOUT: [soon],
    RISK_SOURCE_OVERDUE: [overdue],
    MANDATORY_TESTING_OVERDUE_ABOUT: [imperative],
  });

  expect(payload.businessType).toBe("RISK_SOURCE");
  expect(payload.sceneConfigDTOS).toHaveLength(3);
  expect(payload.sceneConfigDTOS[0]).toMatchObject({
    label: "RISK_SOURCE_OVERDUE_ABOUT",
    sceneCode: "RISK_SOURCE_OVERDUE_ABOUT",
    name: null,
    noticeWays: [{ noticeWay: "CHANNEL_SITE" }],
  });
  expect(payload.sceneConfigDTOS[0]?.noticeObjs).toEqual([
    { id: "obj-1", objType: "gas", objId: "u1,u2" },
    { id: "obj-2", objType: "chem", objId: [] },
  ]);
});

test("配置回显可解析 noticeWays/objId 字符串", () => {
  const item = normalizeSceneItem(
    {
      id: "cfg-1",
      value: 5,
      noticeWays: [{ noticeWay: "CHANNEL_SITE" }],
      noticeObjs: [{ id: "n1", objType: "gas", objId: "a,b" }],
    },
    "RISK_SOURCE_OVERDUE_ABOUT",
  );
  expect(item).toMatchObject({
    id: "cfg-1",
    label: "RISK_SOURCE_OVERDUE_ABOUT",
    value: 5,
    noticeWays: ["CHANNEL_SITE"],
  });
  expect(item.noticeObjs[0]).toEqual({
    id: "n1",
    objType: "gas",
    objId: ["a", "b"],
  });
});

test("人员分页响应可解包 records", () => {
  expect(
    staffRecordsOf({
      records: [
        { id: "1", name: "张三" },
        { id: "", name: "无效" },
      ],
    }),
  ).toEqual([{ id: "1", name: "张三" }]);
});
