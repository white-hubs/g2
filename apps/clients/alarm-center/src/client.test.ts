import { describe, expect, test } from "bun:test";

import { createAlarmCenterClient } from "./client";

function createHttp() {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(`GET ${url}`);
      return {};
    },
    post: async (url: string) => {
      urls.push(`POST ${url}`);
      return {};
    },
    put: async (url: string) => {
      urls.push(`PUT ${url}`);
      return {};
    },
    delete: async (url: string) => {
      urls.push(`DELETE ${url}`);
      return {};
    },
  };
  return { http, urls };
}

describe("@g2-client/alarm-center", () => {
  test("getAlarmRecordPage hits alarm-records", async () => {
    const { http, urls } = createHttp();
    const api = createAlarmCenterClient(http);
    await api.getAlarmRecordPage({ pageNumber: 1 });
    expect(urls.some((u) => u.includes("GET /api/alarm/alarm-records"))).toBe(true);
  });

  test("statistics and safety paths match GEM legacy", async () => {
    const { http, urls } = createHttp();
    const api = createAlarmCenterClient(http);
    await api.getAlarmTrendAnalysis({});
    await api.getEmergencyEventTypes({});
    await api.getAlarmSafetyRecords({ pageNumber: 1 });
    await api.getEnergyAlarmRulesPage({});
    expect(urls.some((u) => u.includes("/api/alarm/alarm-statistics/trend-analysis"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/emergency/emergency-event-types"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/safety-management/alarm-record/page"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/energymanagement/alarm-rules/page"))).toBe(true);
  });

  test("emergency rule list/enable/delete match GEM planRules APIs", async () => {
    const { http, urls } = createHttp();
    const api = createAlarmCenterClient(http);
    await api.getEmergencyRulesPage({ pageNumber: 1, pageSize: 10, applicationCode: "DOORMANAGE" });
    await api.setEmergencyRuleEnabled({ id: "1", enabled: false, disableDuration: 2 });
    await api.deleteEmergencyRule("1");
    expect(urls.some((u) => u.includes("GET /api/emergency/emergency-rule/list-page") && u.includes("applicationCode=DOORMANAGE"))).toBe(
      true,
    );
    expect(urls.some((u) => u.includes("PUT /api/emergency/emergency-rule/enabled"))).toBe(true);
    expect(urls.some((u) => u.includes("DELETE /api/emergency/emergency-rule/delete/1"))).toBe(true);
  });

  test("alarm popup APIs hit legacy alarm/linkage paths", async () => {
    const { http, urls } = createHttp();
    const api = createAlarmCenterClient(http);
    await api.getAlarmDetails("bk-1");
    await api.getVideoListByEventId("bk-1");
    await api.getAlarmLevelPlayConfig({ alarmLevelCode: "one_level" });
    expect(urls.some((u) => u.includes("GET /api/alarm/alarm-record/bk-1"))).toBe(true);
    expect(urls.some((u) => u.includes("GET /api/linkage/event-video/bk-1"))).toBe(true);
    expect(urls.some((u) => u.includes("GET /api/alarm/alarm-level/play-config/one_level"))).toBe(true);
  });

  test("message scene notification APIs hit message2 paths", async () => {
    const { http, urls } = createHttp();
    const api = createAlarmCenterClient(http);
    await api.getSatMsgChannels();
    await api.getSatMsgSceneReceive("DOORMANAGE_ALARM_ASSIGN_NOTIFY");
    expect(urls.some((u) => u.includes("GET /api/message2/sat-msg-channels"))).toBe(true);
    expect(urls.some((u) => u.includes("GET /api/message2/sat-msg-scene-receive/code/DOORMANAGE_ALARM_ASSIGN_NOTIFY"))).toBe(true);
  });
});
