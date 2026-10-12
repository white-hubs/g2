import { createWorkbenchClient } from "./client";

function createMockHttp(urls: string[], responses: Record<string, unknown> = {}) {
  return {
    get: async (url: string) => {
      urls.push(`GET ${url}`);
      const key = Object.keys(responses).find((k) => url.includes(k));
      return key ? responses[key] : { data: [] };
    },
    post: async (url: string, body?: unknown) => {
      urls.push(`POST ${url} ${JSON.stringify(body ?? null)}`);
      return { data: 1 };
    },
    put: async (url: string) => {
      urls.push(`PUT ${url}`);
      return { data: null };
    },
    delete: async (url: string) => {
      urls.push(`DELETE ${url}`);
      return { data: null };
    },
  };
}

test("@g2-client/workbench card APIs hit /api/ouaa", async () => {
  const urls: string[] = [];
  const client = createWorkbenchClient(createMockHttp(urls));
  await client.getCards();
  await client.getNoUseCards({ keyword: "a" });
  await client.deleteHomeCard("TasksTodo");
  await client.saveHomeCard([{ cardCode: "TasksTodo" }]);
  expect(urls.some((u) => u.includes("GET /api/ouaa/context/terminal-home-cards"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/ouaa/context/terminal-cards"))).toBe(true);
  expect(urls.some((u) => u.includes("DELETE /api/ouaa/home-application-card/TasksTodo"))).toBe(true);
  expect(urls.some((u) => u.includes("POST /api/ouaa/home-application-card/batch"))).toBe(true);
});

test("@g2-client/workbench cross-domain cards hit /api prefixes", async () => {
  const urls: string[] = [];
  const client = createWorkbenchClient(createMockHttp(urls));
  await client.getTodoTaskCount();
  await client.alarmSummaryStat({});
  await client.getSummaryStat({});
  await client.getDeviceStatusCountByTagCode({ tagCode: "x" });
  await client.listAnnouncement({ pageNumber: 1 });
  await client.alarmStatusStat({});
  await client.listMarket({});
  await client.fetchAssistantSkills();
  expect(urls.some((u) => u.includes("GET /api/todo/todo-task-statistics"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/alarm/alarm-statistics"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/energymanagement/"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/device-center/"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/management/announcement/page"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/safety-management/"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/dataintegrate/market-config/list"))).toBe(true);
  expect(urls.some((u) => u.includes("GET /api/ai-center/agent/console/my/skills"))).toBe(true);
  expect(urls.every((u) => !u.includes("/gw-bff/"))).toBe(true);
});

test("@g2-client/workbench maps applicationPageVOS to apps", async () => {
  const client = createWorkbenchClient(
    createMockHttp([], {
      "terminal-application-groups": {
        data: [
          {
            id: "g1",
            name: "运维",
            applicationPageVOS: [{ id: "a1", name: "隐患", icon: "/resource/app-icons/x.png", code: "HAZARD" }],
          },
        ],
      },
    }),
  );
  const groups = (await client.getApplicationGroups()) as Array<{ apps: Array<{ code: string }> }>;
  expect(groups[0]?.apps?.[0]?.code).toBe("HAZARD");
});

test("@g2-client/workbench transforms alarm/safety period params", async () => {
  const urls: string[] = [];
  const client = createWorkbenchClient(createMockHttp(urls));
  const fixed = new Date("2026-09-11T12:00:00");
  await client.alarmSummaryStat({ time: fixed, type: "TODAY" });
  await client.alarmTrendStat({ time: fixed, type: "THIS_MONTH" });
  await client.alarmStatusStat({ time: fixed, type: "TODAY", tenantID: "m1" });
  const alarmSummary = urls.find((u) => u.includes("/api/alarm/alarm-statistics?") && !u.includes("type-rank") && !u.includes("trend"));
  const alarmTrend = urls.find((u) => u.includes("/api/alarm/alarm-statistics/trend?"));
  const safety = urls.find((u) => u.includes("/api/safety-management/safety-alarm-statistics/status?"));
  expect(alarmSummary).toContain("period=2026-09-11%2C2026-09-11");
  expect(alarmSummary).not.toContain("type=");
  expect(alarmTrend).toContain("period=2026-09-01%2C2026-09-30");
  expect(alarmTrend).toContain("type=THIS_MONTH");
  expect(safety).toContain("period=2026-09-11%2000%3A00%3A00%2C2026-09-11%2023%3A59%3A59");
  expect(safety).toContain("marketTenant=m1");
  expect(safety).not.toContain("tenantID=");
});

test("@g2-client/workbench unwraps AI { items } shelf envelope", async () => {
  const client = createWorkbenchClient(
    createMockHttp([], {
      "/my/skills": {
        items: [
          { targetKind: "skill", targetId: "skill-a", runnableStatus: "runnable", displayName: "A" },
          { targetKind: "skill", targetId: "default-reasoning", runnableStatus: "runnable", displayName: "hidden" },
          { targetKind: "agent", targetId: "agt", runnableStatus: "runnable", displayName: "not-skill" },
        ],
      },
      "library/skills": {
        items: [{ ref: "skill-a", displayName: "技能A" }],
      },
    }),
  );
  const skills = await client.fetchAssistantSkills();
  expect(skills).toEqual([{ id: "skill-a", label: "技能A" }]);
});
