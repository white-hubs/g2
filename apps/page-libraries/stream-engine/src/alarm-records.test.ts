import { expect, test } from "bun:test";

import { alarmRecordDetailPath, alarmRecordPeriod, alarmRecordTime } from "./alarm-records";

test("alarm queries turn a time-only range into today's full period", () => {
  const now = new Date(2026, 8, 28, 10, 0, 0);
  expect(alarmRecordPeriod(["08:00:00", "17:30:00"], now)).toBe("2026-09-28 08:00:00,2026-09-28 17:30:00");
  expect(alarmRecordPeriod(["2026-09-27 08:00:00", "2026-09-28 17:30:00"], now)).toBe("2026-09-27 08:00:00,2026-09-28 17:30:00");
  expect(alarmRecordPeriod([null, "17:30:00"], now)).toBeUndefined();
});

test("alarm details use a registered G2 route and preserve all legacy query keys", () => {
  const row = { id: "alarm/1", businessKey: "business/1", alarmStatus: "ALARM_HANDLER" };
  expect(alarmRecordDetailPath(row, ["/d/security-monitor/alarmDetail"])).toBe(
    "/d/security-monitor/alarmDetail?id=alarm%2F1&businessKey=business%2F1&alarmStatus=ALARM_HANDLER&type=detail",
  );
  expect(alarmRecordDetailPath(row)).toBe(
    "/portal/genericEquipmentMonitor/alarmDetail?id=alarm%2F1&businessKey=business%2F1&alarmStatus=ALARM_HANDLER&type=detail",
  );
  expect(alarmRecordDetailPath({ businessKey: "business-2" })).toBe(
    "/portal/genericEquipmentMonitor/alarmDetail?id=business-2&businessKey=business-2&alarmStatus=&type=detail",
  );
  expect(alarmRecordDetailPath({})).toBeUndefined();
});

test("alarm time renders both epoch timestamps and legacy formatted strings", () => {
  expect(alarmRecordTime(new Date(2026, 8, 28, 8, 30, 0).getTime())).toBe("2026-09-28 08:30");
  expect(alarmRecordTime("2026-09-28 08:30:00")).toBe("2026-09-28 08:30");
});
