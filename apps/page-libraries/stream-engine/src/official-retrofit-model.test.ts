import { describe, expect, test } from "bun:test";

import {
  OFFICIAL_CONTROLS,
  RETROFIT_CONTROLS,
  RETROFIT_CONFIRM_OPTIONS,
  normalizeBusinessChoices,
  resolveDeviceProperties,
  selectedDeviceId,
  workStatusFromProgress,
} from "./official-retrofit-model";

describe("行政与更新改造控件契约", () => {
  test("旧目录 8 个行政项与 5 个更新改造项完整保留", () => {
    expect(OFFICIAL_CONTROLS.map((item) => item.id)).toEqual([
      "OfficialSealList",
      "FocusWorkTypeList",
      "FocusWork",
      "FocusWorkList",
      "FocusWorkStatusList",
      "FocusWorkRequirement",
      "FocusWorkCompleteTime",
      "WorkList",
    ]);
    expect(RETROFIT_CONTROLS.map((item) => item.id)).toEqual([
      "DeviceSelect",
      "DeviceStatus",
      "DeviceChangeStatus",
      "RetrofitConfirmSelect",
      "SolutionResult",
    ]);
  });

  test("事项状态与完成进度联动阈值保持 100", () => {
    expect(workStatusFromProgress(null)).toBeNull();
    expect(workStatusFromProgress("99")?.id).toBe("ACTIVE");
    expect(workStatusFromProgress(100)?.id).toBe("FINISHED");
  });

  test("设备快照把枚举值映射为标签，并保留数值零", () => {
    expect(selectedDeviceId([{ id: "D-1" }])).toBe("D-1");
    expect(
      resolveDeviceProperties({
        productPropVoList: [
          { propCode: "mode", propName: "运行模式", dataType: "enum", unitName: "", dataConstraint: [{ value: "1", label: "自动" }] },
          { propCode: "pressure", propName: "压力", unitName: "Pa" },
        ],
        snapshots: [
          { key: "mode", value: "1" },
          { key: "pressure", value: 0 },
        ],
      }),
    ).toEqual([
      { name: "运行模式", unitName: "", value: "自动" },
      { name: "压力", unitName: "Pa", value: 0 },
    ]);
  });

  test("改造确认结果使用旧流程枚举值", () => {
    expect(RETROFIT_CONFIRM_OPTIONS).toEqual([
      { id: "CONFIRMED", name: "确认维修" },
      { id: "NO_PROCESS", name: "暂不处理" },
    ]);
  });

  test("行政选项保留旧接口附加字段", () => {
    expect(normalizeBusinessChoices([{ id: 3 as unknown as string, name: "事项", code: "FOCUS" }])).toEqual([
      { id: "3", name: "事项", code: "FOCUS" },
    ]);
  });
});
