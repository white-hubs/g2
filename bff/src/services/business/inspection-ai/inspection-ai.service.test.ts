import { describe, expect, test } from "bun:test";

import { InspectionAiService } from "./inspection-ai.service";
import type { InspectionFlowAnalyzeInput } from "./inspection-flow.service";

describe("InspectionAiService", () => {
  test("aggregates inspection detail and flow result", async () => {
    const standardVOS = [
      {
        standardId: "standard_1",
        standardName: "公司大门日常巡检标准",
        standardItems: [
          {
            itemId: "item_1",
            itemName: "检查大门是否关闭",
            resultVO: {
              id: "result_1",
              name: "巡检结果",
              options: [
                { itemName: "正常", itemValue: "0", errorFlag: false },
                { itemName: "异常", itemValue: "1", errorFlag: true },
              ],
            },
          },
        ],
      },
    ];
    const calls: {
      performInspection?: unknown;
      flowInput?: InspectionFlowAnalyzeInput;
    } = {};
    const service = new InspectionAiService(
      {
        performInspection: async (payload: { id: string; objId: string }) => {
          calls.performInspection = payload;
          return {
            targetName: "公司大门",
            standardVOS,
          };
        },
      } as never,
      {
        analyzeInspection: async (input: InspectionFlowAnalyzeInput) => {
          calls.flowInput = input;
          return {
            targetName: input.targetName,
            items: [
              {
                standardId: "standard_1",
                itemId: "item_1",
                recognitionStatus: "recognized",
                matchedResult: { itemName: "正常", itemValue: "0", errorFlag: false },
                problemDescription: "",
                evidence: "图片中大门处于关闭状态",
                confidence: 0.91,
              },
            ],
          };
        },
      } as never,
    );

    const result = await service.analyzeInspectionImage(
      {
        id: "task_1",
        objId: "obj_1",
        images: "file_1",
      },
      "trace_1",
    );

    expect(calls.performInspection).toEqual({ id: "task_1", objId: "obj_1" });
    expect(calls.flowInput?.targetName).toBe("公司大门");
    expect(calls.flowInput?.standardVOS).toBe(standardVOS);
    expect(calls.flowInput?.imageFileId).toBe("file_1");
    expect(result.targetName).toBe("公司大门");
    expect(result.images).toEqual(["file_1"]);
    expect(result.normalCount).toBe(1);
    expect(result.normalItems[0]?.standardItems[0]?.result?.itemValue).toBe("0");
  });
});
