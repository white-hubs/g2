import { describe, expect, test } from "bun:test";

import { buildAlarmHandlePayload, buildHandleDictionaryQuery, mapAlarmReasons, parseHandleUploadConfig } from "./alarm-handle.model";

describe("alarm-handle.model", () => {
  test("buildHandleDictionaryQuery uses applicationCode suffix", () => {
    expect(buildHandleDictionaryQuery("DOORMANAGE")).toEqual({
      itemCode: "DOORMANAGE_ALARM_HANDLER_SUBMIT_CONFIG",
      code: "uploadPicConfig",
    });
  });

  test("parseHandleUploadConfig reads requirePic and watermark", () => {
    expect(
      parseHandleUploadConfig([
        {
          variable: JSON.stringify({ requirePic: true, watermark: ["location", "timestamp"] }),
        },
      ]),
    ).toEqual({
      requirePic: true,
      watermarkParts: ["location", "timestamp"],
    });
  });

  test("mapAlarmReasons normalizes alarm-center reasons", () => {
    expect(mapAlarmReasons([{ id: "1", reason: "设备故障" }])).toEqual([{ label: "设备故障", value: "1", isNew: false }]);
  });

  test("buildAlarmHandlePayload maps existing/new/custom reasons", () => {
    const options = [
      { label: "已有原因", value: "r1", isNew: false },
      { label: "新增原因", value: 100, isNew: true },
    ];
    expect(
      buildAlarmHandlePayload(
        {
          alarmHandlerResult: "ALARM_ACTUAL",
          alarmHandlerResultRemark: "ok",
          alarmReasonValue: "r1",
          fileVOS: [{ id: "f1" }],
        },
        options,
      ),
    ).toMatchObject({
      alarmHandlerResult: "ALARM_ACTUAL",
      alarmReason: { id: "r1" },
      fileVOS: [{ id: "f1" }],
    });
    expect(
      buildAlarmHandlePayload(
        {
          alarmHandlerResult: "ALARM_IMPRACTICAL",
          alarmHandlerResultRemark: "",
          alarmReasonValue: 100,
          fileVOS: [],
        },
        options,
      ).alarmReason,
    ).toEqual({ reason: "新增原因" });
    expect(
      buildAlarmHandlePayload(
        {
          alarmHandlerResult: "ALARM_IMPRACTICAL",
          alarmHandlerResultRemark: "",
          alarmReasonValue: "自由输入",
          fileVOS: [],
        },
        options,
      ),
    ).toMatchObject({
      alarmReasonName: "自由输入",
      alarmReason: null,
    });
  });
});
