import { expect, test } from "bun:test";

import { attendanceHrLinks } from "./attendance-hr-properties";
import { ATTENDANCE_CONTROLS, HR_CONTROLS, attendanceHrDefaults, validateAttendanceHrControl } from "./components/attendance-hr-catalog";

test("attendance and HR catalogs retain all legacy entries, including repeated control types", () => {
  expect(ATTENDANCE_CONTROLS).toHaveLength(18);
  expect(HR_CONTROLS).toHaveLength(12);
  expect(ATTENDANCE_CONTROLS.filter((entry) => entry.id === "VacationDate")).toHaveLength(2);
  expect(ATTENDANCE_CONTROLS.filter((entry) => entry.id === "ChangeClass")).toHaveLength(2);
  expect(ATTENDANCE_CONTROLS.filter((entry) => entry.id === "ChangePerson")).toHaveLength(2);
  expect(attendanceHrDefaults(HR_CONTROLS[3]!)).toMatchObject({ value: { accessControl: true, accessControlRows: [] } });
  expect(attendanceHrDefaults(HR_CONTROLS[4]!)).toMatchObject({ value: { parkingControl: true, parkingControlRows: [] } });
  expect(attendanceHrDefaults(HR_CONTROLS[6]!)).toMatchObject({ value: [], props: { multiple: false } });
});

test("linked attendance controls keep configurable source fields", () => {
  expect(attendanceHrLinks("VacationLength")).toEqual([
    { key: "params", label: "请假类型" },
    { key: "params2", label: "请假时间" },
  ]);
  expect(attendanceHrLinks("VacationDate", "请假时间")).toEqual([{ key: "params", label: "请假类型" }]);
  expect(attendanceHrLinks("VacationDate", "销假时间")).toEqual([{ key: "params", label: "关联请假单" }]);
  expect(attendanceHrLinks("ChangeClass", "被换班次")).toEqual([
    { key: "params1", label: "换班类型" },
    { key: "params", label: "被换班人员" },
    { key: "params2", label: "被换班日期" },
  ]);
  expect(attendanceHrLinks("SickLeaveInput")).toEqual([{ key: "params", label: "考勤时间" }]);
});

test("permission and service period validation follows legacy business rules", () => {
  const access = { name: "AccessPermission", props: {} };
  const parking = { name: "ParkingPermission", props: {} };
  const period = { name: "ServicePeriod", props: { params: "category" } };
  expect(validateAttendanceHrControl(access, { accessControl: true, accessControlRows: [] }, {})).toBe(
    "开启门禁权限必须选择开启权限的门禁设备",
  );
  expect(validateAttendanceHrControl(access, { accessControl: false, accessControlRows: [] }, {})).toBeUndefined();
  expect(validateAttendanceHrControl(parking, { parkingControl: true, parkingControlRows: [] }, {})).toBe(
    "开启停车权限必须选择开启权限的停车设备",
  );
  expect(
    validateAttendanceHrControl(period, { radioValue: "unlimited", date: "" }, { category: { label: "驻场人员", value: "ZCRY" } }),
  ).toBe("驻场人员必须选择有期限");
  expect(validateAttendanceHrControl(period, { radioValue: "limited", date: "" }, { category: "ZCRY" })).toBe("请选择期限时间");
  expect(validateAttendanceHrControl(period, { radioValue: "limited", date: "2026-12-01" }, { category: "ZCRY" })).toBeUndefined();
});
