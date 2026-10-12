import type { DomainModule } from "@g2-composition/contract";

import { installDomainContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";
import { installAttendancePcUi } from "./pc-ui-runtime";

import "./styles.css";
const module: DomainModule = {
  routes: [
    {
      path: "/d/attendance/attendance-pre-record",
      name: "attendancePreRecord",
      meta: { title: "考勤汇总预统计明细", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-pre-statistics" },
      component: () => import("./views/attendance-record/index").then((m) => m.AttendanceRecord),
    },
    {
      path: "/d/attendance/attendance-pre-statistics/flow-render",
      name: "attendance-pre-statistics-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-pre-statistics" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "attendance-pre-statistics" }),
    },

    { path: "/d/attendance", redirect: "/d/attendance/attendance-group" },
    {
      path: "/d/attendance/attendance-group",
      name: "attendanceGroup",
      meta: { title: "考勤组管理@" },
      component: () => import("./views/attendance-group/attendance-group").then((m) => m.AttendanceGroup),
    },
    {
      path: "/d/attendance/attendance-group-form",
      name: "attendanceGroupForm",
      meta: { title: "考勤组管理表单", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-group" },
      component: () => import("./views/attendance-group/attendance-group-form").then((m) => m.AttendanceGroupForm),
    },
    {
      path: "/d/attendance/attendance-ledger-summary",
      name: "attendanceLedgeSummary",
      meta: { title: "汇总统计@" },
      component: () => import("./views/attendance-ledger/summary").then((m) => m.Summary),
    },
    {
      path: "/d/attendance/attendance-ledger-day",
      name: "attendanceLedgeDay",
      meta: { title: "考勤每日统计@" },
      component: () => import("./views/attendance-ledger/day").then((m) => m.Day),
    },
    {
      path: "/d/attendance/attendance-pre-statistics",
      name: "attendancePreStatistics",
      meta: { title: "考勤汇总预统计@" },
      component: () => import("./views/attendance-pre-statistics/index").then((m) => m.Pre),
    },
    {
      path: "/d/attendance/attendance-record",
      name: "attendanceRecord",
      meta: { title: "汇总统计", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-ledger-summary" },
      component: () => import("./views/attendance-record/index").then((m) => m.AttendanceRecord),
    },
    {
      path: "/d/attendance/classes-manage",
      name: "classesManage",
      meta: { title: "班次管理@" },
      component: () => import("./views/classes-manage/classes-manage").then((m) => m.ClassesManage),
    },
    {
      path: "/d/attendance/classes-manage-form",
      name: "classesManageForm",
      meta: { title: "班次管理表单", hideInMenu: true, activeMenuPath: "/d/attendance/classes-manage" },
      component: () => import("./views/classes-manage/classes-manage-form").then((m) => m.ClassesManageForm),
    },
    {
      path: "/d/attendance/handle-record",
      name: "handleRecord",
      meta: { title: "操作日志记录@" },
      component: () => import("./views/handle-record/index").then((m) => m.HandleRecord),
    },
    {
      path: "/d/attendance/attendance-message",
      name: "attendanceMessage",
      meta: { title: "消息配置@" },
      component: () => import("./views/message/index").then((m) => m.Message),
    },
    {
      path: "/d/attendance/scheduling-rules",
      name: "schedulingRules",
      meta: { title: "排班规则@" },
      component: () => import("./views/scheduling-manage/scheduling-rules").then((m) => m.SchedulingRules),
    },
    {
      path: "/d/attendance/scheduling-rules-form",
      name: "schedulingRulesForm",
      meta: { title: "排班规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/scheduling-rules" },
      component: () => import("./views/scheduling-manage/scheduling-rules-form").then((m) => m.SchedulingRulesForm),
    },
    {
      path: "/d/attendance/staff-scheduling",
      name: "StaffScheduling",
      meta: { title: "员工排班@" },
      component: () => import("./views/scheduling-manage/staff-scheduling").then((m) => m.StaffScheduling),
    },
    {
      path: "/d/attendance/staff-duty",
      name: "StaffDuty",
      meta: { title: "员工值班@" },
      component: () => import("./views/scheduling-manage/staff-duty").then((m) => m.StaffDuty),
    },
    {
      path: "/d/attendance/business-trip-rules",
      name: "businessTripRules",
      meta: { title: "出差规则@" },
      component: () => import("./views/staff-business-trip/business-trip-rules").then((m) => m.BusinessTripRules),
    },
    {
      path: "/d/attendance/business-trip-rules-form",
      name: "businessTripRulesForm",
      meta: { title: "出差规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/business-trip-rules" },
      component: () => import("./views/staff-business-trip/business-trip-rules-form").then((m) => m.BusinessTripRulesForm),
    },
    {
      path: "/d/attendance/approve-business-trip",
      name: "approveBusinessTrip",
      meta: { title: "出差审批@" },
      component: () => import("./views/staff-business-trip/approve-business-trip").then((m) => m.ApproveBusinessTrip),
    },
    {
      path: "/d/attendance/approve-change",
      name: "approveChange",
      meta: { title: "换班审批@" },
      component: () => import("./views/staff-change/approve-change").then((m) => m.ApproveChange),
    },
    {
      path: "/d/attendance/change-ledger",
      name: "ChangeLedger",
      meta: { title: "换班审批", hideInMenu: true, activeMenuPath: "/d/attendance/approve-change" },
      component: () => import("./views/staff-change/change-ledger").then((m) => m.ChangeLedger),
    },
    {
      path: "/d/attendance/clock-in-rules",
      name: "clockInRules",
      meta: { title: "打卡规则@" },
      component: () => import("./views/staff-clock-in/clock-in-rules").then((m) => m.ClockInRules),
    },
    {
      path: "/d/attendance/clock-in-rules-form",
      name: "clockInRulesForm",
      meta: { title: "打卡规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/clock-in-rules" },
      component: () => import("./views/staff-clock-in/clock-in-rules-form").then((m) => m.ClockInRulesForm),
    },
    {
      path: "/d/attendance/clock-in-record",
      name: "clockInRecord",
      meta: { title: "打卡记录@" },
      component: () => import("./views/staff-clock-in/clock-in-record").then((m) => m.ClockInRecord),
    },
    {
      path: "/d/attendance/clock-in-ledger",
      name: "clockInLedger",
      meta: { title: "打卡台账@" },
      component: () => import("./views/staff-clock-in/clock-in-ledger").then((m) => m.ClockInLedger),
    },
    {
      path: "/d/attendance/leave-rules",
      name: "leaveRules",
      meta: { title: "请假规则@" },
      component: () => import("./views/staff-leave/leave-rules").then((m) => m.LeaveRules),
    },
    {
      path: "/d/attendance/leave-rules-form",
      name: "leaveRules-form",
      meta: { title: "请假规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/leave-rules" },
      component: () => import("./views/staff-leave/leave-rules-form").then((m) => m.LeaveRulesForm),
    },
    {
      path: "/d/attendance/vacation-balance",
      name: "vacationBalance",
      meta: { title: "假期余额@" },
      component: () => import("./views/staff-leave/vacation-balance").then((m) => m.VacationBalance),
    },
    {
      path: "/d/attendance/approve-leave",
      name: "approveLeave",
      meta: { title: "请假审批@" },
      component: () => import("./views/staff-leave/approve-leave").then((m) => m.ApproveLeave),
    },
    {
      path: "/d/attendance/approve-dispose-leave",
      name: "approveDisposeLeave",
      meta: { title: "销假审批@" },
      component: () => import("./views/staff-leave/approve-dispose-leave").then((m) => m.ApproveDisposeLeave),
    },
    {
      path: "/d/attendance/leave-balance-detail",
      name: "vacationBalanceDetail",
      meta: { title: "假期余额详情", hideInMenu: true, activeMenuPath: "/d/attendance/vacation-balance" },
      component: () => import("./views/staff-leave/vacation-balance-detail").then((m) => m.VacationBalanceDetail),
    },
    {
      path: "/d/attendance/approve-off-duty",
      name: "approveOffDuty",
      meta: { title: "离岗审批@" },
      component: () => import("./views/staff-off-duty/approve-off-duty").then((m) => m.ApproveOffDuty),
    },
    {
      path: "/d/attendance/off-duty-rules",
      name: "offDutyRules",
      meta: { title: "离岗规则@" },
      component: () => import("./views/staff-off-duty/off-duty-rules").then((m) => m.OffDutyRules),
    },
    {
      path: "/d/attendance/off-duty-rules-form",
      name: "offDutyRulesForm",
      meta: { title: "离岗规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/off-duty-rules" },
      component: () => import("./views/staff-off-duty/off-duty-rules-form").then((m) => m.OffDutyRulesForm),
    },
    {
      path: "/d/attendance/overtime-rules",
      name: "overtimeRules",
      meta: { title: "加班规则@" },
      component: () => import("./views/staff-overtime/overtime-rules").then((m) => m.OvertimeRules),
    },
    {
      path: "/d/attendance/approve-overtime",
      name: "approveOvertime",
      meta: { title: "加班审批@" },
      component: () => import("./views/staff-overtime/approve-overtime").then((m) => m.ApproveOvertime),
    },
    {
      path: "/d/attendance/overtime-rules-form",
      name: "overtimeRulesForm",
      meta: { title: "加班规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/overtime-rules" },
      component: () => import("./views/staff-overtime/overtime-rules-form").then((m) => m.OverTimeRulesForm),
    },
    {
      path: "/d/attendance/overtime-ledger-detail",
      name: "overtimeLedgerDetail",
      meta: { title: "加班审批详情", hideInMenu: true, activeMenuPath: "/d/attendance/approve-overtime" },
      component: () => import("./views/staff-overtime/overtime-ledger-detail").then((m) => m.OverTimeLedgerDetail),
    },
    {
      path: "/d/attendance/supplement-rules",
      name: "supplementRules",
      meta: { title: "补卡规则@" },
      component: () => import("./views/staff-supplement/supplement-rules").then((m) => m.SupplementRules),
    },
    {
      path: "/d/attendance/supplement-rules-form",
      name: "supplementRulesForm",
      meta: { title: "补卡规则表单", hideInMenu: true, activeMenuPath: "/d/attendance/supplement-rules" },
      component: () => import("./views/staff-supplement/supplement-rules-form").then((m) => m.SupplementRulesForm),
    },
    {
      path: "/d/attendance/approve-supplement",
      name: "approveSupplement",
      meta: { title: "补卡审批@" },
      component: () => import("./views/staff-supplement/approve-supplement").then((m) => m.ApproveSupplement),
    },
    {
      path: "/d/attendance/supplement-ledger-detail",
      name: "supplementLedgerDetail",
      meta: { title: "补卡审批详情", hideInMenu: true, activeMenuPath: "/d/attendance/approve-supplement" },
      component: () => import("./views/staff-supplement/supplement-ledger-detail").then((m) => m.SupplementLedgerDetail),
    },
    {
      path: "/d/attendance/flow-approval-record",
      name: "flowApprovalRecord",
      meta: { title: "考勤流程审批记录" },
      component: () => import("./views/flow-approval-record/index").then((m) => m.FlowApprovalRecord),
    },
    {
      path: "/d/attendance/attendance-ledger-state",
      name: "attendanceLedgerState",
      meta: { title: "汇总统计", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-ledger-summary" },
      component: () => import("./views/attendance-ledger/state").then((m) => m.State),
    },
    {
      path: "/d/attendance/flow-config",
      name: "attendance-flow-config",
      meta: { title: "流程配置@" },
      component: () => hostStreamEnginePage("ApprovalConfig"),
    },
    {
      path: "/d/attendance/approval-record",
      name: "attendance-approval-record",
      meta: { title: "考勤审批记录@" },
      component: () => hostStreamEnginePage("ApprovalRecord"),
    },
    {
      path: "/d/attendance/approve-leave/flow-render",
      name: "attendance-approve-leave-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-leave" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-leave" }),
    },
    {
      path: "/d/attendance/approve-dispose-leave/flow-render",
      name: "attendance-approve-dispose-leave-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-dispose-leave" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-dispose-leave" }),
    },
    {
      path: "/d/attendance/approve-business-trip/flow-render",
      name: "attendance-approve-business-trip-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-business-trip" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-business-trip" }),
    },
    {
      path: "/d/attendance/approve-change/flow-render",
      name: "attendance-approve-change-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-change" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-change" }),
    },
    {
      path: "/d/attendance/approve-off-duty/flow-render",
      name: "attendance-approve-off-duty-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-off-duty" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-off-duty" }),
    },
    {
      path: "/d/attendance/approve-overtime/flow-render",
      name: "attendance-approve-overtime-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-overtime" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-overtime" }),
    },
    {
      path: "/d/attendance/approve-supplement/flow-render",
      name: "attendance-approve-supplement-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/approve-supplement" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "approve-supplement" }),
    },
    {
      path: "/d/attendance/flow-approval-record/flow-render",
      name: "attendance-flow-approval-record-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/flow-approval-record" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "flow-approval-record" }),
    },
    {
      path: "/d/attendance/vacation-balance/flow-render",
      name: "attendance-vacation-balance-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/vacation-balance" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "vacation-balance" }),
    },
    {
      path: "/d/attendance/attendance-ledger-summary/flow-render",
      name: "attendance-attendance-ledger-summary-render",
      meta: { title: "考勤流程", hideInMenu: true, activeMenuPath: "/d/attendance/attendance-ledger-summary" },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuEntry: "attendance-ledger-summary" }),
    },
  ],
  menuContribution: [
    {
      label: "考勤管理",
      iconKey: "attendance",
      children: [
        {
          label: "班次管理@",
          entry: "classes-manage",
          path: "/d/attendance/classes-manage",
        },
        {
          label: "考勤组管理@",
          entry: "attendance-group",
          path: "/d/attendance/attendance-group",
        },
        {
          label: "排班管理@",
          children: [
            {
              label: "排班规则@",
              entry: "scheduling-rules",
              path: "/d/attendance/scheduling-rules",
            },
            {
              label: "员工排班@",
              entry: "staff-scheduling",
              path: "/d/attendance/staff-scheduling",
            },
          ],
        },
        {
          label: "员工值班@",
          entry: "staff-duty",
          path: "/d/attendance/staff-duty",
        },
        {
          label: "员工打卡@",
          children: [
            {
              label: "打卡规则@",
              entry: "clock-in-rules",
              path: "/d/attendance/clock-in-rules",
            },
            {
              label: "打卡记录@",
              entry: "clock-in-record",
              path: "/d/attendance/clock-in-record",
            },
            {
              label: "打卡台账@",
              entry: "clock-in-ledger",
              path: "/d/attendance/clock-in-ledger",
            },
          ],
        },
        {
          label: "员工请假@",
          children: [
            {
              label: "请假规则@",
              entry: "leave-rules",
              path: "/d/attendance/leave-rules",
            },
            {
              label: "假期余额@",
              entry: "vacation-balance",
              path: "/d/attendance/vacation-balance",
            },
            {
              label: "请假审批@",
              entry: "approve-leave",
              path: "/d/attendance/approve-leave",
            },
            {
              label: "销假审批@",
              entry: "approve-dispose-leave",
              path: "/d/attendance/approve-dispose-leave",
            },
          ],
        },
        {
          label: "员工补卡@",
          children: [
            {
              label: "补卡规则@",
              entry: "supplement-rules",
              path: "/d/attendance/supplement-rules",
            },
            {
              label: "补卡审批@",
              entry: "approve-supplement",
              path: "/d/attendance/approve-supplement",
            },
          ],
        },
        {
          label: "员工加班@",
          children: [
            {
              label: "加班规则@",
              entry: "overtime-rules",
              path: "/d/attendance/overtime-rules",
            },
            {
              label: "加班审批@",
              entry: "approve-overtime",
              path: "/d/attendance/approve-overtime",
            },
          ],
        },
        {
          label: "员工换班@",
          children: [
            {
              label: "换班审批@",
              entry: "approve-change",
              path: "/d/attendance/approve-change",
            },
          ],
        },
        {
          label: "员工离岗@",
          children: [
            {
              label: "离岗规则@",
              entry: "off-duty-rules",
              path: "/d/attendance/off-duty-rules",
            },
            {
              label: "离岗审批@",
              entry: "approve-off-duty",
              path: "/d/attendance/approve-off-duty",
            },
          ],
        },
        {
          label: "员工出差@",
          children: [
            {
              label: "出差规则@",
              entry: "business-trip-rules",
              path: "/d/attendance/business-trip-rules",
            },
            {
              label: "出差审批@",
              entry: "approve-business-trip",
              path: "/d/attendance/approve-business-trip",
            },
          ],
        },
        {
          label: "考勤台账@",
          children: [
            {
              label: "汇总统计@",
              entry: "attendance-ledger-summary",
              path: "/d/attendance/attendance-ledger-summary",
            },
            {
              label: "考勤每日统计@",
              entry: "attendance-ledger-day",
              path: "/d/attendance/attendance-ledger-day",
            },
          ],
        },
        {
          label: "考勤@预统计",
          children: [
            {
              label: "考勤汇总预统计@",
              entry: "attendance-pre-statistics",
              path: "/d/attendance/attendance-pre-statistics",
            },
          ],
        },
        {
          label: "考勤审批记录@",
          entry: "approval-record",
          path: "/d/attendance/approval-record",
        },
        {
          label: "考勤流程审批记录",
          entry: "flow-approval-record",
          path: "/d/attendance/flow-approval-record",
        },
        {
          label: "流程配置@",
          entry: "flow-config",
          path: "/d/attendance/flow-config",
        },
        {
          label: "消息配置@",
          entry: "attendance-message",
          path: "/d/attendance/attendance-message",
        },
        {
          label: "操作日志记录@",
          entry: "handle-record",
          path: "/d/attendance/handle-record",
        },
      ],
    },
  ],
  async install(_app, context) {
    installDomainContext(context);
    await installAttendancePcUi(context);
    await context.loadRuntimeCommon("pcMap", "index");
    await context.loadPlatform("pcUi", "platform");
    await context.ensureClient("attendanceClient");
    const { initializeAttendance } = await import("./initialize");
    await initializeAttendance();
  },
};
export default module;
