import { expect, test } from "bun:test";

import { createAttendanceHrClient } from "./attendance-hr-client";

test("attendance and HR controls preserve legacy API paths and query names", async () => {
  const urls: string[] = [];
  const client = createAttendanceHrClient({
    get: async (url) => {
      urls.push(url);
      return { data: url.includes("page") ? { records: [], total: 0 } : [] };
    },
  });
  await client.listHolidayRules();
  await client.getHolidayDetailType("half/day");
  await client.getVacationBalance({ staffId: "s-1", holidayRuleId: "h-1", unit: "小时" });
  await client.calculateVacationDuration({ businessType: "ASK_LEAVE", staffId: "s-1", holidayRuleId: "h-1", period: "a,b" });
  await client.pageCancellationLeaveForms({ pageNumber: 2, pageSize: 10 });
  await client.listClockInLogs({ userId: "s-1", clockInDate: "2026-09-24", abnormal: true });
  await client.listExchangeClasses({ staffId: "s-1", workType: "ARRANGE", day: "2026-09-24" });
  await client.getOvertimeDuration({ workOvertimeType: "WORK", period: "a,b" });
  await client.listOvertimeCompensations({ workOvertimeType: "WORK" });
  await client.getLeavePostDuration({ postStartTime: "a", postEndTime: "b" });
  await client.getAwayBusinessDuration({ startTime: "a", endTime: "b" });
  await client.getAttendanceStatistic({ type: "SICK_LEAVE", userId: "s-1", period: "a,b" });
  await client.listPositions();
  await client.pageAppointments();
  await client.listPersonnelCategories();
  await client.listRoles();
  await client.listDoorTypes();
  await client.pageDoorDevices({ pageNumber: 1, pageSize: 10, type: "D" });
  await client.pageParkingLots({ pageNumber: 1, pageSize: 10, keyword: "A" });
  await client.listPermissionAreas();

  expect(urls).toContain("/api/attendance/att/holiday/rule/list");
  expect(urls).toContain("/api/attendance/detail/type/half%2Fday");
  expect(urls).toContain("/api/attendance/att/Holiday/balance/total?staffId=s-1&holidayRuleId=h-1&unit=%E5%B0%8F%E6%97%B6");
  expect(urls).toContain("/api/attendance/att/askLeave/calcDuration?businessType=ASK_LEAVE&staffId=s-1&holidayRuleId=h-1&period=a%2Cb");
  expect(urls).toContain("/api/attendance/att/askLeaveFrom/cancelAskFrom/page?pageNumber=2&pageSize=10");
  expect(urls).toContain("/api/attendance/getClockInLogByDate?userId=s-1&clockInDate=2026-09-24&abnormal=true");
  expect(urls).toContain("/api/attendance/att/exchange/classes?staffId=s-1&workType=ARRANGE&day=2026-09-24");
  expect(urls).toContain("/api/attendance/work/overtime/duration?workOvertimeType=WORK&period=a%2Cb");
  expect(urls).toContain("/api/attendance/work/overtime/compensation?workOvertimeType=WORK");
  expect(urls).toContain("/api/attendance/att/leavePost/duration?postStartTime=a&postEndTime=b");
  expect(urls).toContain("/api/attendance/att/awayBusiness/duration?startTime=a&endTime=b");
  expect(urls).toContain("/api/attendance/personnel/getClockInDetailsByUserId?type=SICK_LEAVE&userId=s-1&period=a%2Cb");
  expect(urls).toContain("/api/ouaa/authenticated/position/list?enabled=true");
  expect(urls).toContain("/api/ouaa/appointment/page?enable=true&pageNumber=1&pageSize=1000");
  expect(urls).toContain("/api/personnel/staff-type/list");
  expect(urls).toContain("/api/ouaa/authenticated/role/list-by-product?enabled=true");
  expect(urls).toContain("/api/door/getDoorType");
  expect(urls).toContain("/api/door/getDoorDevicePage?pageNumber=1&pageSize=10&type=D&applicationCode=DOORMANAGE");
  expect(urls).toContain("/api/park-management/parking-infos-page?pageNumber=1&pageSize=10&keyword=A");
  expect(urls).toContain("/api/mdata/area/list");
});

test("attendance client unwraps a page and propagates service errors", async () => {
  const client = createAttendanceHrClient({
    get: async (url) => {
      if (url.includes("staff-type")) return { code: 500, message: "分类读取失败" };
      return { data: { records: [{ id: "lot-1" }], total: 16 } };
    },
  });
  expect(await client.pageParkingLots({ pageNumber: 1 })).toEqual({ records: [{ id: "lot-1" }], total: 16 });
  expect(client.listPersonnelCategories()).rejects.toThrow("分类读取失败");
});
