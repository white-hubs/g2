import type { SafetyPersonnelClient } from "@g2-client/safety-personnel/client";

import type { PersonnelDependencies } from "../src/api/safety-personnel";

export const person = {
  id: "person-1",
  userId: "u1",
  userName: "张安全",
  phone: "13800000000",
  companyName: "测试单位",
  deptName: "安全部",
  postName: "安全员",
  typeCodes: ["SAFETY"],
  status: "ACTIVE",
};
export const pool = [1, 2].map((id) => ({
  userId: `u${id}`,
  userName: `候选人员${id}`,
  phone: "13800000000",
  deptName: "安全部",
  postName: "安全员",
}));
export const certType = {
  id: "type-1",
  categoryId: "category-1",
  categoryName: "职业资格",
  typeName: "安全工程师",
  validPeriod: 1,
  validPeriodUnit: "YEAR",
  warnDays: 30,
  needReview: true,
};
export const certificate = {
  id: "cert-1",
  userId: "u1",
  userName: "张安全",
  typeId: "type-1",
  categoryId: "category-1",
  certName: "注册安全工程师",
  certNo: "CERT-001",
  issueOrg: "测试发证机构",
  issueDate: "2026-01-01",
  validStart: "2026-01-01",
  validEnd: "2026-12-31",
  remainingDays: 100,
  needReview: true,
  reviewStatus: "已复审",
};
export const committee = {
  id: "committee-1",
  committeeName: "安全生产委员会",
  deptId: "dept-1",
  deptName: "安全部",
  contactPhone: "13800000000",
  introduction: "安全管理",
  memberCount: 1,
  attachmentCount: 0,
  status: "ACTIVE",
  members: [{ userId: "u1", userName: "张安全", phone: "13800000000", active: true }],
  attachments: [],
};
export const org = { id: "org-1", name: "安全部", level: 1, members: [{ userId: "u1", userName: "张安全" }], children: [] };
export const keyPerson = {
  id: 8,
  personCode: "KP-008",
  name: "李重点",
  phone: "13900000000",
  areaSequence: "area-1",
  areaName: "一号库区",
  riskLevel: "HIGH",
  supervisorUserId: 10,
  supervisorName: "王监管",
  supervisionReason: "风险管理",
  status: "ACTIVE",
};
export function createFixture() {
  const calls: { method: string; args: unknown[] }[] = [];
  const page = (records: unknown[]) => ({ records, total: records.length });
  const replies: Record<string, unknown> = {
    pagePersons: page([person]),
    pagePersonPool: page(pool),
    pageOrgUserCandidates: page(pool.map((p) => ({ ...p, mobile: p.phone }))),
    getPersonProfile: person,
    getPersonCertificates: [certificate],
    getPersonResumeTimeline: [],
    getPersonResumeByType: [],
    pageCommittees: page([committee]),
    getCommittee: committee,
    getCommitteeChangeLogs: [
      { id: "log-1", changeType: "CREATE", changeContent: "创建委员会", operatorName: "管理员", changeTime: "2026-09-21 10:00:00" },
    ],
    pageCertificates: page([certificate]),
    getCertificate: certificate,
    pageCertTypes: page([certType]),
    getCertType: certType,
    getCertCategoryTree: [{ id: "category-1", name: "职业资格", children: [] }],
    getOrgTree: [org],
    getHomeOrgArchitecture: { root: org },
    pageKeyPersons: page([keyPerson]),
    getKeyPersonDetail: keyPerson,
    getKeyPersonOptions: [keyPerson],
    getKeyPersonAreaOptions: [{ sequence: "area-1", name: "一号库区", children: [] }],
    getKeyPersonSupervisorOptions: [{ userId: 10, name: "王监管" }],
    pageKeyPersonReports: page([
      { id: 1, personId: 8, reportTime: "2026-09-21 10:00:00", reporterName: "王监管", content: "巡查正常", reportAttachmentFiles: [] },
    ]),
    getKeyPersonStatisticsDashboard: { totalCount: 12, highRiskCount: 2, mediumRiskCount: 4, lowRiskCount: 6 },
    getKeyPersonAreaSupervisorStats: [{ areaName: "一号库区", count: 5 }],
    getKeyPersonAreaHighRiskStats: [{ areaName: "一号库区", count: 2 }],
  };
  const client = new Proxy(
    {},
    {
      get: (_target, key: string) =>
        key === "then"
          ? undefined
          : async (...args: unknown[]) => {
              calls.push({ method: key, args });
              if (key.startsWith("export")) {
                return new Blob(["test export"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
              }
              return structuredClone(replies[key] ?? {});
            },
    },
  ) as SafetyPersonnelClient;
  const auxiliary = new Proxy(
    {},
    {
      get: (_target, key: string) =>
        key === "then"
          ? undefined
          : async (...args: unknown[]) => {
              calls.push({ method: key, args });
              if (key === "getOrganizationTree") {
                return [{ id: "dept-1", name: "安全部", children: [] }];
              }
              if (key === "getDictionaryByItem") {
                return [];
              }
              if (key === "uploadSceneFile") {
                return { id: "file-1", name: "测试附件.png", path: "/test.png" };
              }
              return {};
            },
    },
  );
  const dependencies: PersonnelDependencies = {
    file: async () => auxiliary as Awaited<ReturnType<PersonnelDependencies["file"]>>,
    ouaa: async () => auxiliary as Awaited<ReturnType<PersonnelDependencies["ouaa"]>>,
    alarm: async () => auxiliary as Awaited<ReturnType<PersonnelDependencies["alarm"]>>,
    dictionary: async () => auxiliary as Awaited<ReturnType<PersonnelDependencies["dictionary"]>>,
  };
  return { client, dependencies, calls, replies };
}
