import type { DomainModule } from "@g2-composition/contract";
import type { PersonnelManagementClient } from "@g2-contract/person-management";

import { installPersonManagementContext } from "./domain-context";
import { hostPersonnelStreamPage } from "./mount-stream-page";
import { installPersonManagementPcUi } from "./pc-ui-runtime";

export const PERSON_MANAGEMENT_BASE = "/d/person-management";
const BASE = PERSON_MANAGEMENT_BASE;

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "person-management-home", redirect: `${BASE}/roster` },
    {
      path: `${BASE}/roster`,
      name: "person-management-roster",
      meta: { title: "员工花名册" },
      component: () => import("./views/roster").then((module) => module.RosterPage),
    },
    {
      path: `${BASE}/personnel-statistics-list`,
      name: "person-management-personnel-statistics",
      meta: { title: "人员异动统计" },
      component: () => import("./views/personnel-statistics-page").then((module) => module.PersonnelStatisticsPage),
    },
    {
      path: `${BASE}/person-type`,
      name: "person-management-person-type",
      meta: { title: "人员类别" },
      component: () => import("./views/person-type-page").then((module) => module.PersonTypePage),
    },
    {
      path: `${BASE}/recruit-approval-list`,
      name: "person-management-recruit-approval",
      meta: { title: "招聘申请" },
      component: () => import("./views/workflows").then((module) => module.RecruitApprovalPage),
    },
    {
      path: `${BASE}/recruit-statistics-list`,
      name: "person-management-recruit-statistics",
      meta: { title: "申请统计" },
      component: () => import("./views/workflows").then((module) => module.RecruitStatisticsPage),
    },
    {
      path: `${BASE}/induction-approval-list`,
      name: "person-management-induction-approval",
      meta: { title: "入职申请" },
      component: () => import("./views/workflows").then((module) => module.InductionApprovalPage),
    },
    {
      path: `${BASE}/induction-statistics-list`,
      name: "person-management-induction-statistics",
      meta: { title: "审批统计" },
      component: () => import("./views/workflows").then((module) => module.InductionStatisticsPage),
    },
    {
      path: `${BASE}/appraise-approval-list`,
      name: "person-management-appraise-approval",
      meta: { title: "考核申请" },
      component: () => import("./views/workflows").then((module) => module.AppraiseApprovalPage),
    },
    {
      path: `${BASE}/appraise-statistics-list`,
      name: "person-management-appraise-statistics",
      meta: { title: "考核统计" },
      component: () => import("./views/workflows").then((module) => module.AppraiseStatisticsPage),
    },
    {
      path: `${BASE}/regular-approval-list`,
      name: "person-management-regular-approval",
      meta: { title: "转正申请" },
      component: () => import("./views/workflows").then((module) => module.RegularApprovalPage),
    },
    {
      path: `${BASE}/regular-statistics-list`,
      name: "person-management-regular-statistics",
      meta: { title: "转正统计" },
      component: () => import("./views/workflows").then((module) => module.RegularStatisticsPage),
    },
    {
      path: `${BASE}/drill-approval-list`,
      name: "person-management-drill-approval",
      meta: { title: "培训申请" },
      component: () => import("./views/workflows").then((module) => module.DrillApprovalPage),
    },
    {
      path: `${BASE}/depart-approval-list`,
      name: "person-management-depart-approval",
      meta: { title: "离职申请" },
      component: () => import("./views/workflows").then((module) => module.DepartApprovalPage),
    },
    {
      path: `${BASE}/depart-statistics-list`,
      name: "person-management-depart-statistics",
      meta: { title: "离职统计" },
      component: () => import("./views/workflows").then((module) => module.DepartStatisticsPage),
    },
    {
      path: `${BASE}/flow-config`,
      name: "person-management-flow-config",
      meta: { title: "标准流程配置" },
      component: () => hostPersonnelStreamPage("ApprovalConfig", { title: "标准流程配置" }),
    },
    {
      path: `${BASE}/depart-procedures-list`,
      name: "person-management-depart-procedures",
      meta: { title: "离职手续" },
      component: () => import("./views/workflows").then((module) => module.DepartProceduresPage),
    },
    {
      path: `${BASE}/work-shift-approval-list`,
      name: "person-management-work-shift-approval",
      meta: { title: "轮岗申请" },
      component: () => import("./views/workflows").then((module) => module.WorkShiftApprovalPage),
    },
    {
      path: `${BASE}/work-shift-statistics-list`,
      name: "person-management-work-shift-statistics",
      meta: { title: "轮岗统计" },
      component: () => import("./views/workflows").then((module) => module.WorkShiftStatisticsPage),
    },
    {
      path: `${BASE}/approval-record`,
      name: "person-management-approval-record",
      meta: { title: "人事审批记录" },
      component: () => import("./views/workflows").then((module) => module.ApprovalRecordPage),
    },
    {
      path: `${BASE}/field-config`,
      name: "person-management-field-config",
      meta: { title: "字段配置" },
      component: () => import("./views/field-config").then((module) => module.FieldConfigPage),
    },
    {
      path: `${BASE}/roster-operate`,
      name: "person-management-roster-operate",
      meta: { title: "员工档案", hideInMenu: true, activeMenuPath: `${BASE}/roster` },
      component: () => import("./views/roster").then((module) => module.RosterOperatePage),
    },
    {
      path: `${BASE}/business-permissions`,
      name: "person-management-business-permissions",
      meta: { title: "业务权限", hideInMenu: true, activeMenuPath: `${BASE}/roster` },
      component: () => import("./views/roster").then((module) => module.BusinessPermissionsPage),
    },
    ...[
      ["recruit", "申请统计", "recruit-statistics-list"],
      ["induction", "审批统计", "induction-statistics-list"],
      ["appraise", "考核统计", "appraise-statistics-list"],
      ["regular", "转正统计", "regular-statistics-list"],
      ["depart", "离职统计", "depart-statistics-list"],
      ["work-shift", "轮岗统计", "work-shift-statistics-list"],
    ].map(([kind, title, activePath]) => ({
      path: `${BASE}/statistics-detail/${kind}`,
      name: `person-management-statistics-detail-${kind}`,
      meta: { title, hideInMenu: true, activeMenuPath: `${BASE}/${activePath}` },
      component: () => import("./views/workflows").then((module) => module.StatisticsDetailPage),
    })),
    ...[
      ["recruit", "招聘申请", "recruit-approval-list"],
      ["induction", "入职申请", "induction-approval-list"],
      ["appraise", "考核申请", "appraise-approval-list"],
      ["regular", "转正申请", "regular-approval-list"],
      ["drill", "培训申请", "drill-approval-list"],
      ["depart", "离职申请", "depart-approval-list"],
      ["depart-procedures", "离职手续", "depart-procedures-list"],
      ["work-shift", "轮岗申请", "work-shift-approval-list"],
      ["record", "人事审批记录", "approval-record"],
    ].map(([kind, title, activePath]) => ({
      path: `${BASE}/flow-render/${kind}`,
      name: `person-management-flow-render-${kind}`,
      meta: { title, hideInMenu: true, activeMenuPath: `${BASE}/${activePath}` },
      component: () => hostPersonnelStreamPage("StreamEngineRender", { title, activeMenuPath: `${BASE}/${activePath}` }),
    })),
  ],
  menuContribution: [
    {
      label: "人事管理",
      iconKey: "person-management",
      children: [
        {
          label: "员工管理",
          entry: "personnelmanagement",
          children: [
            { label: "员工花名册", entry: "personnelmanagementRoster", path: `${BASE}/roster` },
            { label: "人员异动统计", entry: "ryydtj", path: `${BASE}/personnel-statistics-list` },
            { label: "人员类别", entry: "person-type", path: `${BASE}/person-type` },
          ],
        },
        {
          label: "招聘审批",
          entry: "zpsp",
          children: [
            { label: "招聘申请", entry: "zpsqb", path: `${BASE}/recruit-approval-list` },
            { label: "申请统计", entry: "sqtj", path: `${BASE}/recruit-statistics-list` },
          ],
        },
        {
          label: "入职审批",
          entry: "rzsp",
          children: [
            { label: "入职申请", entry: "rzsq", path: `${BASE}/induction-approval-list` },
            { label: "审批统计", entry: "sptj", path: `${BASE}/induction-statistics-list` },
          ],
        },
        {
          label: "试用考核",
          entry: "sykh",
          children: [
            { label: "考核申请", entry: "khsq", path: `${BASE}/appraise-approval-list` },
            { label: "考核统计", entry: "khtj", path: `${BASE}/appraise-statistics-list` },
          ],
        },
        {
          label: "转正审批",
          entry: "zzsp",
          children: [
            { label: "转正申请", entry: "zzsq", path: `${BASE}/regular-approval-list` },
            { label: "转正统计", entry: "zztj", path: `${BASE}/regular-statistics-list` },
          ],
        },
        {
          label: "培训审批",
          entry: "pxsp",
          children: [{ label: "培训申请", entry: "pxsq", path: `${BASE}/drill-approval-list` }],
        },
        {
          label: "离职审批",
          entry: "lzsp",
          children: [
            { label: "离职申请", entry: "lzsq", path: `${BASE}/depart-approval-list` },
            { label: "离职统计", entry: "lztj", path: `${BASE}/depart-statistics-list` },
          ],
        },
        { label: "标准流程配置", entry: "1", path: `${BASE}/flow-config` },
        { label: "离职手续", entry: "lzsx", path: `${BASE}/depart-procedures-list` },
        {
          label: "轮岗审批",
          entry: "lgsp",
          children: [
            { label: "轮岗申请", entry: "lgsq", path: `${BASE}/work-shift-approval-list` },
            { label: "轮岗统计", entry: "lgtj", path: `${BASE}/work-shift-statistics-list` },
          ],
        },
        { label: "人事审批记录", entry: "personnel-approval-record", path: `${BASE}/approval-record` },
        { label: "字段配置", entry: "FIELD_CONFIG", path: `${BASE}/field-config` },
      ],
    },
  ],
  async install(_app, context) {
    await installPersonManagementPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<PersonnelManagementClient>("personManagementClient");
    installPersonManagementContext(context, client);
  },
};

export default domainModule;
