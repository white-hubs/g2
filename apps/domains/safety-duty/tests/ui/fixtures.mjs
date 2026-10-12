export const template = {
  id: 11,
  templateId: 1,
  industryType: "INDUSTRY_TRADE",
  roleId: "r1",
  roleName: "主要负责人",
  clauseNo: "第二十一条",
  lawNameCode: "SAFETY_LAW",
  lawNameLabel: "安全生产法",
  taskDescription: "组织开展安全生产检查",
  periodType: "MONTH",
  mandatory: true,
  evidenceSourceCode: "INSPECTION",
  evidenceSourceName: "日常检查",
};
export const person = {
  userId: 101,
  userName: "测试负责人",
  deptId: 1,
  deptName: "安全管理部",
  positionName: "部门负责人",
  mobile: "13800000001",
  rankNo: 1,
  roleName: "主要负责人",
  level: "A",
  completionRate: 0.95,
  mandatoryCompleted: true,
  mandatoryMissingCount: 0,
  momChangeRate: 0.05,
};
export const roles = [
  {
    roleId: "r1",
    roleName: "主要负责人",
    roleDisplayName: "主要负责人",
    legalBasis: "安全生产法第二十一条",
    dutySummary: "组织落实安全生产责任制",
    users: [person],
  },
];
export const task = {
  ...template,
  assignmentItemId: 111,
  deadlineTime: "2026-09-30 23:59:59",
  status: "PENDING",
  manualFillAllowed: true,
  recordCount: 1,
};
export const assignment = {
  assignmentId: 1,
  responsibleUserId: 101,
  responsibleUserName: person.userName,
  roleName: person.roleName,
  industryType: "INDUSTRY_TRADE",
  periodType: "MONTH",
  periodStartTime: "2026-09-01 00:00:00",
  periodEndTime: "2026-09-30 23:59:59",
  signStatus: "SIGNED",
  completionRate: 0.5,
  pendingItemCount: 1,
  overdueItemCount: 1,
  groups: [
    {
      periodType: "MONTH",
      itemCount: 2,
      items: [
        task,
        { ...task, id: 12, assignmentItemId: 112, status: "OVERDUE", taskDescription: "组织安全教育培训", manualFillAllowed: false },
      ],
    },
  ],
};
export const record = {
  recordId: 1,
  title: "日常安全检查记录",
  summary: "已检查现场设备和消防通道",
  sourceType: "SYSTEM_COLLECT",
  occurredTime: "2026-09-08 09:00:00",
};
export const report = {
  id: 21,
  reportName: "安全生产法履职报告",
  periodType: "MONTH",
  periodLabel: "2026年09月",
  responsibleUserName: person.userName,
  deptName: person.deptName,
  generatedTime: "2026-09-08 10:00:00",
  generateMethod: "MANUAL",
};
export const mapping = {
  id: 31,
  reportId: 21,
  clauseNo: template.clauseNo,
  lawNameLabel: template.lawNameLabel,
  taskDescription: template.taskDescription,
  mappingStatus: "INCOMPLETE",
  evidenceCount: 1,
  gapDescription: "待补充执行记录",
};
export function createFixtureHandler() {
  let items = [{ ...template }],
    signed = false;
  const page = (rows, total = rows.length) => ({ records: rows, total, pages: Math.ceil(total / 10) });
  return async function handle(url, method, payload) {
    const u = new URL(url),
      p = u.pathname;
    if (p.endsWith("/getConfigInfo"))
      return [
        {
          label: "签收到期提醒",
          sceneCode: "SAFETY_PERSONNEL::DUTY_DISPATCH_SIGN",
          value: "3",
          noticeWays: [{ noticeWay: "CHANNEL_SITE" }],
        },
        { label: "评分等级通知", sceneCode: "SAFETY_PERSONNEL::DUTY_SCORE_LEVEL", noticeWays: [{ noticeWay: "CHANNEL_SITE" }] },
      ];
    if (p.endsWith("/addConfig")) return "ok";
    if (p.endsWith("/sat-msg-channels"))
      return [
        { channelCode: "CHANNEL_SITE", channelName: "站内信" },
        { channelCode: "CHANNEL_SMS", channelName: "短信" },
      ];
    if (p.includes("/sat-msg-scene-receive/code/")) return { channelCodes: ["CHANNEL_SITE", "CHANNEL_SMS"] };
    if (p.includes("/organizations/tree") || p.includes("/organization/tree")) return [{ id: 1, name: "安全管理部", children: [] }];
    if (p.endsWith("/file/file") || p.endsWith("/file/upload/temporary")) return { id: "file-1", path: "/fixture-evidence.png" };
    if (p.endsWith("/duty-role-assignments")) return roles;
    if (p.endsWith("/duty-role-user-candidates")) return page([person], 21);
    if (p.endsWith("/duty-template-item-statistics"))
      return { itemCount: items.length, mandatoryCount: items.length, lastUpdatedTime: "2026-09-08 10:00:00" };
    if (p.endsWith("/duty-template-items")) {
      if (method === "POST") {
        const row = { ...template, ...payload, id: 13 };
        items.push(row);
        return row;
      }
      return page(items.filter((x) => !u.searchParams.get("keyword") || x.taskDescription.includes(u.searchParams.get("keyword"))));
    }
    if (/\/duty-template-items\/\d+$/.test(p)) {
      const id = Number(p.split("/").pop());
      if (method === "DELETE") {
        items = items.filter((x) => x.id !== id);
        return null;
      }
      items = items.map((x) => (x.id === id ? { ...x, ...payload } : x));
      return items.find((x) => x.id === id);
    }
    if (p.endsWith("/duty-template-items/batch")) return [template];
    if (p.endsWith("/duty-legal-clauses")) return [{ ...template, clauseNo: "第二十二条", taskDescription: "建立安全风险分级管控制度" }];
    if (p.endsWith("/duty-evidence-source-options")) return [{ sourceCode: "INSPECTION", sourceName: "日常检查" }];
    if (p.endsWith("/overview-statistics")) return { totalUserCount: 2, signedCount: 1, unsignedCount: 1, averageCompletionRate: 0.75 };
    if (p.endsWith("/overview-role-groups"))
      return [
        {
          roleName: "主要负责人",
          userCount: 2,
          assignments: [assignment, { ...assignment, assignmentId: 2, responsibleUserName: "测试安全员", signStatus: "UNSIGNED" }],
        },
      ];
    if (p.endsWith("/tracking-statistics")) return { signedCount: 1, unsignedCount: 1, overdueUnsignedCount: 1 };
    if (p.endsWith("/duty-assignments"))
      return page([{ ...assignment, dispatchTime: "2026-09-01 09:00:00", signTime: "2026-09-01 10:00:00" }]);
    if (/\/duty-assignments\/\d+$/.test(p) || p.endsWith("/duty-my-assignments/current")) return assignment;
    if (p.endsWith("/duty-my-assignments/sign-preview"))
      return { alreadySigned: signed, assignmentIds: [1], userName: person.userName, assignments: [assignment] };
    if (p.endsWith("/duty-signatures")) {
      signed = true;
      return [{ id: 1 }];
    }
    if (p.endsWith("/records")) return [record];
    if (p.endsWith("/duty-records")) return { ...record, ...payload };
    if (p.endsWith("/duty-dispatch-options")) return { deadlineDayOptions: [1, 3, 7] };
    if (p.endsWith("/duty-score-models/current")) return { levels: [] };
    if (p.endsWith("/duty-score-dashboard/summary"))
      return { totalUserCount: 2, averageCompletionRate: 0.95, levelACount: 1, levelBCount: 1, levelCCount: 0, levelDCount: 0 };
    if (p.endsWith("/duty-score-department-summaries"))
      return [{ deptId: 1, deptName: person.deptName, userCount: 2, averageCompletionRate: 0.95 }];
    if (p.endsWith("/duty-score-rankings")) return page([person]);
    if (p.endsWith("/duty-score-publicities"))
      return { redList: [person], blackList: [{ ...person, userId: 102, userName: "测试待整改人员", level: "D" }] };
    if (p.endsWith("/duty-score-publicity-rankings")) return page([person]);
    if (p.includes("/duty-score-reports/"))
      return { person, summary: { ...person, totalItemCount: 2, completedItemCount: 1, companyRankNo: 1 }, items: [task], rankTrends: [] };
    if (p.endsWith("/duty-score-notify-targets")) return ["A", "B", "C", "D"].map((level) => ({ level, targets: [] }));
    if (p.endsWith("/duty-score-notify-target-candidates"))
      return page([{ targetType: u.searchParams.get("targetType"), targetId: 101, targetName: person.userName, ...person }]);
    if (p.endsWith("/duty-reports")) return method === "POST" ? report : page([report]);
    if (/\/duty-reports\/\d+$/.test(p)) return { report, mappings: [mapping], evidences: [record] };
    if (p.endsWith("/gap-detail")) return { gapDescription: "待补充执行记录" };
    if (/\/mappings\/\d+$/.test(p)) return { mapping, evidences: [{ id: 1, ...record }] };
    throw new Error(`Unmatched fixture: ${method} ${p}`);
  };
}
