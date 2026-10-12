import type { AttendanceGroup } from "@g2-contract/attendance/api/attendance-group";
import type { Classes } from "@g2-contract/attendance/api/classes-manage";
import type { SchedulingRule } from "@g2-contract/attendance/api/scheduling-manage";
import type { ClockInRules } from "@g2-contract/attendance/api/staff-clock-in";
import type { LeaveRules } from "@g2-contract/attendance/api/staff-leave";
import { describe, expect, test } from "bun:test";

import { createAttendanceClient } from "./client";
import { type AttendanceHttpClient, attendanceUrl } from "./transport";

interface Call {
  method: string;
  url: string;
  body?: unknown;
  init?: RequestInit;
}
const defaultResponse = { code: 200, data: { records: [], total: 0 } };
function fixture(response: unknown = defaultResponse) {
  const calls: Call[] = [];
  const http: AttendanceHttpClient = {
    get: async (url, init) => {
      calls.push({ method: "GET", url, init });
      return response;
    },
    post: async (url, body, init) => {
      calls.push({ method: "POST", url, body, init });
      return response;
    },
    put: async (url, body, init) => {
      calls.push({ method: "PUT", url, body, init });
      return response;
    },
    delete: async (url, init) => {
      calls.push({ method: "DELETE", url, init });
      return response;
    },
  };
  return { calls, api: createAttendanceClient(http) };
}
const query = { pageNumber: 2, pageSize: 20, keyword: "考勤 甲", period: "2026-09-01,2026-09-30" };
const classes: Classes = {
  classesType: "EARLY",
  endClockAfterTime: "18:00",
  endClockBeforeTime: "16:00",
  endTimeIsMorrow: false,
  endWorkTime: "17:00",
  name: "早班",
  nickName: "早",
  restEndTime: "13:00",
  restStartTime: "12:00",
  startClockAfterTime: "09:00",
  startClockBeforeTime: "07:00",
  startWorkTime: "08:00",
};
const group: AttendanceGroup = {
  name: "考勤组",
  clockRuleId: 1,
  ranges: "ALL",
  schedulingRuleId: 2,
  cardRuleIds: "3",
  groupClassIds: "4",
  overtimeRuleId: "5",
  holidayRuleIds: "6",
  leavePostRuleId: "7",
  awayBusinessRuleId: "8",
};
const scheduling: SchedulingRule = {
  continuousDays: undefined,
  sameShift: [],
  intervalHour: undefined,
  legalHolidaysRest: true,
  name: "排班规则",
  rulesClassesList: [{ id: "1", name: "早班", week: "1" }],
  ways: "WEEK",
};
const clock: ClockInRules = {
  faceRecognition: true,
  name: "打卡规则",
  outClock: false,
  ways: "DEVICE",
  deviceList: [{ id: "1", code: "C1", modelName: "门禁", name: "闸机", genreName: "考勤机" }],
};
const leave: LeaveRules = {
  calculationWay: "WORKING_DAY",
  dayOfHour: 8,
  grantDate: "ENTRY_DATE",
  grantWay: "YEAR",
  minAskUnit: 1,
  name: "年假",
  notLimit: false,
  quota: "{}",
  validity: "{}",
  intoAbsence: false,
  holidayType: "ANNUAL",
};

describe("考勤完整旧接口迁移", () => {
  test("班次的增查改删及部门过滤保持原协议", async () => {
    const { api, calls } = fixture();
    await api.classesInsert(classes);
    await api.classesUpdate({ ...classes, id: "c1" });
    await api.classesDetail({ id: "c1" });
    await api.classesList();
    await api.classesDelCheck({ id: "c1" });
    await api.classesDel({ id: "c1" });
    await api.classesPageWithDept({ ...query });
    expect(calls.map((call) => [call.method, call.url.split("?")[0]])).toEqual([
      ["POST", "/api/attendance/att/classes/add"],
      ["POST", "/api/attendance/att/classes/edit"],
      ["GET", "/api/attendance/att/classes/detail"],
      ["GET", "/api/attendance/att/classes/list"],
      ["GET", "/api/attendance/att/classes/checkGroupUse"],
      ["DELETE", "/api/attendance/att/classes/remove"],
      ["GET", "/api/attendance/att/classes/page"],
    ]);
    expect(calls[0]?.body).toEqual(classes);
    expect(new URL(calls[6]!.url, "http://localhost").searchParams.get("deptWhere")).toBe("true");
    expect(calls[2]?.url).toEndWith("?id=c1");
  });

  test("排班、值班、考勤组、打卡规则保留全部保存结构和方法", async () => {
    const { api, calls } = fixture();
    await api.schedulingRuleInsert(scheduling);
    await api.schedulingRuleUpdate({ ...scheduling, id: "r1" });
    await api.staffSchedulingRulehand({ month: "2026-09", staffId: "u1", classesIds: ["c1"] });
    await api.staffDutyInsert({ staffIds: ["u1"] });
    await api.staffDutyhand({ id: "d1", today: 2 });
    await api.staffDutyRemove({ staffIds: ["u1"] });
    await api.attendanceGroupInsert(group);
    await api.attendanceGroupUpdate({ ...group, id: "g1" });
    await api.attendanceGroupPreChecked({ ...group, id: undefined });
    await api.clockInRulesInsert(clock);
    await api.clockInRulesUpdate({ ...clock, id: "c1" });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/attendance/att/scheduling/rule/add",
      "/api/attendance/att/scheduling/rule/edit",
      "/api/attendance/att/scheduling/hand/action",
      "/api/attendance/att/duty/add/staff",
      "/api/attendance/att/duty/hand",
      "/api/attendance/att/duty/remove/staff",
      "/api/attendance/att/group/add",
      "/api/attendance/att/group/edit",
      "/api/attendance/att/group/check/staff",
      "/api/attendance/att/clock/rule/add",
      "/api/attendance/att/clock/rule/edit",
    ]);
    expect(calls.every((call) => call.method === "POST")).toBe(true);
    expect(calls[0]?.body).toEqual(scheduling);
    expect(calls[6]?.body).toEqual(group);
    expect(calls[9]?.body).toEqual(clock);
  });

  test("考勤组手机号解密和台账 permission 请求头保持原值", async () => {
    const { api, calls } = fixture();
    await api.attendanceGroupDetail({ id: "g1" });
    await api.attendanceGroupDetail({ id: "g1" }, true);
    await api.DayLedgerPage(query, "permission-1");
    await api.SummaryLedgerPage(query, "permission-2");
    await api.beforeStatPage(query, "permission-3");
    expect(calls[0]?.init?.headers).toEqual({ encryption: "false" });
    expect(calls[1]?.init?.headers).toEqual({ encryption: "true" });
    expect(calls.slice(2).map((call) => call.init?.headers)).toEqual([
      { permission: "permission-1" },
      { permission: "permission-2" },
      { permission: "permission-3" },
    ]);
  });

  test("补卡、加班、离岗、出差和请假规则保持各自路径及 HTTP 动词", async () => {
    const { api, calls } = fixture();
    await api.supplementRulesPost({ id: "s1", name: "补卡" });
    await api.supplementRulesDelete({ id: "s1" });
    await api.overtimeRulesPost({ name: "加班", ruleDetails: [], upperLimitCycle: undefined, upperLimitDuration: undefined });
    await api.overtimeRulesDelete({ id: "o1" });
    await api.offDutyRulesInsert({ beforeApply: true, calculationWay: "WORKING_DAY", minAskUnit: 1, name: "离岗" });
    await api.businessTripRulesUpdate({ id: "b1", beforeApply: false, name: "出差" });
    await api.leaveRulesInsert(leave);
    await api.leaveRulesUpdate({ ...leave, id: "h1" });
    await api.leaveRulesDelete({ id: "h1" });
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", "/api/attendance/card-rule"],
      ["DELETE", "/api/attendance/card-rule/s1"],
      ["POST", "/api/attendance/work-overtime-rule"],
      ["DELETE", "/api/attendance//work-overtime-rule/o1"],
      ["POST", "/api/attendance/att/leavePost/rule/add"],
      ["POST", "/api/attendance/att/awayBusiness/rule/edit"],
      ["POST", "/api/attendance/att/holiday/rule/add"],
      ["PUT", "/api/attendance/att/holiday/rule/edit"],
      ["DELETE", "/api/attendance/att/holiday/rule/remove?id=h1"],
    ]);
    expect(calls[7]?.body).toEqual({ ...leave, id: "h1" });
  });

  test("所有台账与记录族的列表使用 /api 原路径和分页字段", async () => {
    const { api, calls } = fixture();
    await api.clockInLedgerPage(query);
    await api.clockInRecordPage(query);
    await api.clockInLogByDate(query);
    await api.DayLedgerPage(query);
    await api.SummaryLedgerPage(query);
    await api.SequentialPage(query);
    await api.SequentialDetail(query);
    await api.beforeStatPage(query);
    await api.supplementLedgerList(query);
    await api.supplementLedgerDetail(query);
    await api.overtimeLedgerPage(query);
    await api.overtimeDetailPage(query);
    await api.offDutyLedgerPage(query);
    await api.leaveBalancePage(query);
    await api.leaveBalanceDetailPage(query);
    await api.getStaffleaveLedger(query);
    await api.staffSchedulingPage(query);
    await api.staffDutyPage(query);
    await api.getHandleLogPage(query);
    await api.getFlowProcessPage(query);
    expect(calls.map((call) => call.url.split("?")[0])).toEqual([
      "/api/attendance/att/clockIn/ledgerPage",
      "/api/attendance/getClockInLog",
      "/api/attendance/getClockInLogByDate",
      "/api/attendance/daily/ledger/getLedgerDetails",
      "/api/attendance/att/summary/page",
      "/api/attendance/att/sequential/page",
      "/api/attendance/att/sequential/detail",
      "/api/attendance/att/beforeStat/page",
      "/api/attendance/getWorkOmitByPage",
      "/api/attendance/getWorkOmitDetails/page",
      "/api/attendance/getWorkOvertimeLedgerPage",
      "/api/attendance/getWorkOvertimeLedgerDetailsPage",
      "/api/attendance/att/leavePost/ledger/page",
      "/api/attendance/att/Holiday/balance/page",
      "/api/attendance/att/Holiday/balance/record/page",
      "/api/attendance/att/askLeave/ledger/page",
      "/api/attendance/att/scheduling/hand/page",
      "/api/attendance/att/duty/page",
      "/api/attendance/attendanceLog/page",
      "/api/flow/process/instance/historical/page",
    ]);
    for (const call of calls) {
      const params = new URL(call.url, "http://localhost").searchParams;
      expect(call.method).toBe("GET");
      expect(params.get("pageNumber")).toBe("2");
      expect(params.get("pageSize")).toBe("20");
      expect(params.get("keyword")).toBe("考勤 甲");
      expect(params.get("period")).toBe(query.period);
    }
  });

  test("审批记录查询与导出保留过滤字段，旧审批列表保留 userId", async () => {
    const { api, calls } = fixture();
    await api.attendanceApprovePage({
      pageNumber: 1,
      pageSize: 10,
      businessType: "LEAVE",
      period: "2026-09",
      sceneCode: "LEAVE",
      userId: 7,
    });
    await api.flowApprovalRecordPage({
      pageNumber: 1,
      pageSize: 20,
      applicationCode: "ATTENDANCE_MANAGEMENT",
      businessType: "OVERTIME",
      organizationId: "d1",
      submitTime: "2026-09",
      businessTime: "2026-08",
      status: "APPROVED",
      username: "张三",
    });
    expect(calls[0]?.url).toContain("/api/attendance/att/getApproveByUserPage?");
    expect(calls[0]?.url).toContain("userId=7");
    expect(calls[1]?.url).toContain("/api/attendance/att/approve/record/page?");
    const params = new URL(calls[1]!.url, "http://localhost").searchParams;
    expect(params.get("applicationCode")).toBe("ATTENDANCE_MANAGEMENT");
    expect(params.get("organizationId")).toBe("d1");
    expect(params.get("status")).toBe("APPROVED");
    expect(params.get("username")).toBe("张三");
  });

  test("导出和模板下载保留 GET/POST、请求体和 Blob", async () => {
    const blob = new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const { api, calls } = fixture(blob);
    const results = await Promise.all([
      api.clockInLedgerExport(query),
      api.clockInRecordExport(query),
      api.DayLedgerExport(query, "p1"),
      api.SummaryLedgerExport(query),
      api.SequentialLedgerExport(query),
      api.beforeStatExport(query),
      api.supplementLedgerExport(query),
      api.supplementLedgerDetailExport(query),
      api.overtimeLedgerExport(query),
      api.overtimeDetailExport(query),
      api.offDutyLedgerExport(query),
      api.leaveBalanceExport(query),
      api.exportHandleLog(query),
      api.staffSchedulingExport(query),
      api.staffSchedulingDownLoad(query),
      api.staffDutyExport(query),
      api.staffDutyDownLoad(query),
      api.holidayBalanceDownLoad({ holidayIdList: ["h1", 2], initTemplate: true }),
      api.flowApprovalRecordExport({
        applicationCode: "ATTENDANCE_MANAGEMENT",
        businessType: undefined,
        organizationId: undefined,
        submitTime: undefined,
        businessTime: undefined,
        status: undefined,
        username: undefined,
      }),
    ]);
    expect(results.every((result) => result.data === blob)).toBe(true);
    expect(calls.map((call) => [call.method, call.url.split("?")[0]])).toEqual([
      ["GET", "/api/attendance/ledger/getClockInLedgerExcel"],
      ["GET", "/api/attendance/clockIn/getClockInLogExcel"],
      ["GET", "/api/attendance/daily/ledger/getLedgerDetailsExcel"],
      ["GET", "/api/attendance/att/summary/export"],
      ["GET", "/api/attendance/att/sequential/export"],
      ["GET", "/api/attendance/att/beforeStat/export"],
      ["GET", "/api/attendance/getWorkOmitByPage/excel"],
      ["GET", "/api/attendance/getWorkOmitDetails/excel"],
      ["GET", "/api/attendance/getWorkOvertimeLedgerExcel"],
      ["GET", "/api/attendance/getWorkOvertimeLedgerDetailsExcel"],
      ["GET", "/api/attendance/att/leavePost/ledger/export"],
      ["GET", "/api/attendance/att/Holiday/balance/export"],
      ["GET", "/api/attendance/attendanceLog/export"],
      ["POST", "/api/attendance/att/scheduling/export"],
      ["POST", "/api/attendance/att/scheduling/template/download"],
      ["POST", "/api/attendance/att/duty/export"],
      ["POST", "/api/attendance/att/duty/template/download"],
      ["POST", "/api/attendance/att/holiday/balance/template/download"],
      ["GET", "/api/attendance/att/approve/record/export"],
    ]);
    expect(calls[2]?.init?.headers).toEqual({ permission: "p1" });
    expect(calls[13]?.body).toEqual(query);
    expect(calls[17]?.body).toEqual({ holidayIdList: ["h1", 2], initTemplate: true });
  });

  test("三个导入保持 FormData 并让浏览器提供 multipart boundary", async () => {
    const { api, calls } = fixture();
    const form = new FormData();
    const file = new Blob(["csv"], { type: "text/csv" });
    form.append("file", file, "排班.csv");
    form.append("month", "2026-09");
    await api.staffSchedulingImport(form);
    await api.staffDutyImport(form);
    await api.holidayBalanceImport({ file, init: true, ruleNames: "年假,调休" });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/attendance/att/scheduling/template/import",
      "/api/attendance/att/duty/template/import",
      "/api/attendance/att/Holiday/balance/import",
    ]);
    expect(calls[0]?.body).toBe(form);
    expect(calls[1]?.body).toBe(form);
    expect(calls[2]?.body).toBeInstanceOf(FormData);
    const holiday = calls[2]?.body as FormData;
    expect(holiday.get("file")).toBeInstanceOf(Blob);
    expect(holiday.get("init")).toBe("true");
    expect(holiday.get("ruleNames")).toBe("年假,调休");
    expect(calls.every((call) => call.init === undefined)).toBe(true);
  });

  test("假期余额和打卡状态操作保留大小写、PUT 及请求包装", async () => {
    const { api, calls } = fixture();
    await api.leaveBalanceUpdate({ id: "b1", value: 8 });
    await api.leaveBalanceCancel({ id: "r1", effective: false });
    await api.getStaffLeaveBalance({ staffId: "u1", holidayRuleId: "1701796472990040066", unit: "小时" });
    await api.exportStaffLeave(query);
    await api.clockInRecordStatusUpdate("c1");
    await api.clockInRecordInsert({ staffId: "u1", clockInTime: "2026-09-01 08:00:00" });
    expect(calls[0]).toMatchObject({ method: "PUT", url: "/api/attendance/att/Holiday/balance/edit", body: { id: "b1", value: 8 } });
    expect(calls[1]?.url).toContain("/api/attendance/att/holiday/balance/record/effective?");
    expect(calls[2]?.url).toContain("/api/attendance/att/Holiday/balance/total?");
    expect(calls[2]?.url).toContain("holidayRuleId=1701796472990040066");
    expect(calls[3]).toMatchObject({ method: "POST", url: "/api/attendance/att/askLeave/ledger/export", body: { params: query } });
    expect(calls[4]).toMatchObject({ method: "PUT", url: "/api/attendance/update/clockIn/c1", body: {} });
    expect(calls[5]?.url).toBe("/api/attendance/add/clockIn");
  });

  test("消息标签按旧场景传递，保存 sceneConfigDTOS，通知方式按场景过滤", async () => {
    const { api, calls } = fixture();
    for (const label of ["START_CLOCK", "END_CLOCK", "假期到期提醒"]) {
      await api.getnewmessage({ businessType: "ATTENDANCE_MANAGEMENT", label });
    }
    const payload = {
      businessType: "ATTENDANCE_MANAGEMENT",
      sceneConfigDTOS: [
        { label: "假期到期提醒", sceneCode: "HOLIDAY_BALANCE_EXPIRE", value: 3, noticeWays: [{ noticeWay: "CHANNEL_SITE" }] },
      ],
    };
    await api.addnewmessage(payload);
    await api.getNoticeCode("HOLIDAY_BALANCE_EXPIRE");
    await api.satmsgconfigs({ satMsgDefineCodes: "START_CLOCK" });
    await api.satmsgconfig({ params: [] });
    await api.addsatmsgconfig({ params: [] });
    expect(calls.slice(0, 3).map((call) => new URL(call.url, "http://localhost").searchParams.get("label"))).toEqual([
      "START_CLOCK",
      "END_CLOCK",
      "假期到期提醒",
    ]);
    expect(calls[3]).toMatchObject({ method: "POST", url: "/api/bracing/message/addConfig", body: payload });
    expect(calls[4]?.url).toBe("/api/message2/sat-msg-scene-receive/code/HOLIDAY_BALANCE_EXPIRE");
    expect(calls[5]?.url).toContain("/api/message/sat-msg-configs/?");
    expect(calls[6]?.method).toBe("PUT");
    expect(calls[7]?.method).toBe("POST");
    const paths: string[] = [];
    const options = createAttendanceClient({
      get: async (url) => {
        paths.push(url);
        return {
          code: 200,
          data: url.includes("sat-msg-channels")
            ? [
                { channelCode: "SMS", channelName: "短信" },
                { channelCode: "SITE", channelName: "站内信" },
              ]
            : { channelCodes: ["SITE"] },
        };
      },
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => ({}),
    });
    expect(await options.sceneNotificationMethod("START_CLOCK")).toEqual([{ label: "站内信", value: "SITE" }]);
    expect(paths).toEqual(["/api/message2/sat-msg-channels", "/api/message2/sat-msg-scene-receive/code/START_CLOCK"]);
  });

  test("人员、设备、区域、字典和租户辅助接口使用真实服务", async () => {
    const { api, calls } = fixture();
    await api.getUserPage({ pageNumber: 1, pageSize: 30, keyword: "张", organizationId: "d1", appointmentId: "a1" });
    await api.deptList();
    await api.getPositionList();
    await api.getAppointmentList();
    await api.getRoleList();
    await api.getDeviceInstancePageAll({ pageNumber: 1, pageSize: 20, tagCodes: ["t1"], anyAreaId: "a1" }, "tenant1");
    await api.getIotProductCategoryTree("tenant1");
    await api.getProductListAll();
    await api.getCustomerTagListAll({ status: 1 });
    await api.getAreaTree();
    await api.getDictionaryByItem({ itemCode: "ATTENDANCE", tenant: "tenant1" });
    await api.getDictionaryItemByCode({ code: "KEYWORD_ALIAS" });
    await api.getTenantInfo("tenant1");
    expect(calls[0]?.url).toContain("/api/ouaa/authenticated/user-under-tenant/page?");
    expect(calls[0]?.url).toContain("enabled=true");
    expect(calls[0]?.url).toContain("appointmentId=a1");
    expect(calls.slice(1, 5).map((call) => call.url)).toEqual([
      "/api/ouaa/authenticated/organizations/list?enabled=true",
      "/api/ouaa/authenticated/position/list?enabled=true",
      "/api/ouaa/appointment/page?enabled=true&pageNumber=1&pageSize=1000",
      "/api/ouaa/authenticated/role/list-by-product",
    ]);
    expect(calls[5]).toMatchObject({
      method: "POST",
      url: "/api/device-center/device/instance/page",
      body: { pageNumber: 1, pageSize: 20, tagCodes: ["t1"], anyAreaId: "a1" },
      init: { headers: { tenant: "tenant1" } },
    });
    expect(calls.slice(6).map((call) => call.url.split("?")[0])).toEqual([
      "/api/device-center/iot/product/category-tree",
      "/api/device-center/things/product/list/all",
      "/api/device-center/tag/customer/list",
      "/api/mdata/area/list",
      "/api/dictionary/getDataDictionaryByItem",
      "/api/dictionary/getDictionaryItemByCode/KEYWORD_ALIAS",
      "/api/ouaa/tenant-under-tenant/tenant1",
    ]);
    expect(calls[10]?.init?.headers).toEqual({ tenant: "tenant1" });
  });

  test("旧设备和节假日接口以及字典查询完整保留", async () => {
    const { api, calls } = fixture();
    await api.getHolidayApi(2026, 9);
    await api.getDeviceList(query);
    await api.getEquipmentAccountList(query);
    await api.getDeviceGenre();
    await api.getCascadeDictionaryItem("ATTENDANCE");
    await api.getDataDictionaryByItemPage("HOLIDAY");
    await api.getHolidayList();
    await api.getHolidayRuleNotLimit();
    expect(calls.map((call) => call.url.split("?")[0])).toEqual([
      "/api/attendance/att/scheduling/rule/legal/holidays",
      "/api/device/device/instance/list-page",
      "/api/device-supervise/device-account/page",
      "/api/device/device/genre/search",
      "/api/dictionary/getCascadeDictionaryItem",
      "/api/dictionary/getDataDictionaryByItemPage",
      "/api/attendance/att/legal/holiday/list",
      "/api/attendance/att/holiday/rule/notLimit/list",
    ]);
    expect(calls[0]?.url).toEndWith("year=2026&month=9");
  });

  test("查询保留空串、数组与嵌套字段，业务响应不重复解包", async () => {
    const url = attendanceUrl("/attendance/example", {
      empty: "",
      omit: undefined,
      nil: null,
      flag: false,
      count: 0,
      ids: ["a", "b"],
      filter: { name: "甲" },
    });
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("empty")).toBe("");
    expect(params.has("omit")).toBe(false);
    expect(params.has("nil")).toBe(false);
    expect(params.get("flag")).toBe("false");
    expect(params.get("count")).toBe("0");
    expect(params.getAll("ids[]")).toEqual(["a", "b"]);
    expect(params.get("filter[name]")).toBe("甲");
    const response = { code: 412, data: { message: "人员重复" }, message: "预校验失败", error: null, timestamp: 1 };
    expect(await fixture(response).api.attendanceGroupPreChecked({ ...group, id: undefined })).toBe(response);
  });

  test("导出错误响应不能伪装为成功文件", async () => {
    await expect(fixture({ code: 500, data: null, message: "导出失败" }).api.DayLedgerExport(query)).rejects.toThrow("导出失败");
  });
});
