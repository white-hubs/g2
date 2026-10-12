import type { AiInspectionAnalyzeResult, InspectionStandardVO } from "@g2-contract/inspection-ai";
import { describe, expect, test } from "bun:test";

import { buildInspectionAnalyzeData, flattenStandardItems, normalizeImages, resolveOverallResult } from "./inspection-result-normalizer";

describe("inspection-result-normalizer", () => {
  test("normalizes string images to array", () => {
    expect(normalizeImages(" https://example.com/a.jpg ")).toEqual(["https://example.com/a.jpg"]);
  });

  test("normalizes string array images", () => {
    expect(normalizeImages(["a.jpg", "", " b.jpg "])).toEqual(["a.jpg", "b.jpg"]);
  });

  test("resolves overall result rules", () => {
    expect(resolveOverallResult({ normalCount: 2, abnormalCount: 0, unrecognizedCount: 0 })).toBe("normal");
    expect(resolveOverallResult({ normalCount: 1, abnormalCount: 1, unrecognizedCount: 0 })).toBe("abnormal");
    expect(resolveOverallResult({ normalCount: 0, abnormalCount: 0, unrecognizedCount: 2 })).toBe("unrecognized");
    expect(resolveOverallResult({ normalCount: 1, abnormalCount: 0, unrecognizedCount: 1 })).toBe("partial");
  });

  test("fills missing, invalid, unmatched and low confidence items as unrecognized", () => {
    const result = buildInspectionAnalyzeData(createBuildInput(), {
      targetName: "1号配电房",
      items: [
        createAiItem("standard_1", "item_1", "0", "正常", false, 0.91),
        createAiItem("standard_1", "item_2", "missing", "不存在", false, 0.9),
        createAiItem("standard_1", "item_3", "0", "正常", false, 0.49),
        createAiItem("standard_1", "unknown_item", "0", "正常", false, 0.99),
      ],
    });

    expect(result.totalCount).toBe(4);
    expect(result.normalItems).toHaveLength(1);
    expect(result.unrecognizedItems).toHaveLength(1);
    expect(result.normalItems[0]?.standardItems).toHaveLength(1);
    expect(result.normalItems[0]?.standardItems[0]?.result?.itemName).toBe("正常");
    expect(result.unrecognizedItems[0]?.standardItems).toHaveLength(3);
    const unrecognizedItem = result.unrecognizedItems[0]?.standardItems.find((item) => item.itemId === "item_3");
    expect(unrecognizedItem?.recognitionStatus).toBe("unrecognized");
    expect(unrecognizedItem?.problemDescription).toContain("模型未能可靠识别");
    expect(unrecognizedItem?.evidence).toBe("图片证据");
    expect(unrecognizedItem?.confidence).toBe(0.49);
    expect(unrecognizedItem?.needManualReview).toBe(true);
    expect(result.normalCount).toBe(1);
    expect(result.unrecognizedCount).toBe(3);
  });

  test("marks abnormal and low-confidence normal items for manual review", () => {
    const result = buildInspectionAnalyzeData(createBuildInput(), {
      targetName: "1号配电房",
      items: [
        createAiItem("standard_1", "item_1", "0", "正常", false, 0.79),
        createAiItem("standard_1", "item_2", "1", "异常", true, 0.88),
        createAiItem("standard_1", "item_3", "0", "正常", false, 0.9),
        createAiItem("standard_1", "item_4", "0", "正常", false, 0.9),
      ],
    });

    expect(result.normalItems[0]?.standardItems[0]?.result?.itemName).toBe("正常");
    expect(result.normalItems[0]?.needManualReview).toBe(true);
    expect(result.abnormalItems[0]?.standardItems[0]?.result?.itemName).toBe("异常");
    expect(result.abnormalItems[0]?.needManualReview).toBe(true);
    expect(result.abnormalCount).toBe(1);
    expect(result.normalCount).toBe(3);
  });

  test("indexes raw backend fields with standardId/id and itemId/id fallbacks", () => {
    const items = flattenStandardItems([
      {
        id: "standard_id_fallback",
        name: "标准名称",
        standardItems: [
          {
            id: "item_id_fallback",
            content: "检查内容",
            resultVO: {
              id: "result_1",
              name: "巡检结果",
              options: [{ itemName: "正常", itemValue: "0", errorFlag: false }],
            },
          },
        ],
      },
    ]);

    expect(items[0]?.standardId).toBe("standard_id_fallback");
    expect(items[0]?.standardName).toBe("标准名称");
    expect(items[0]?.itemId).toBe("item_id_fallback");
    expect(items[0]?.itemName).toBe("检查内容");
  });

  test("dedupes safety tips from all standards into response top level", () => {
    const result = buildInspectionAnalyzeData(
      {
        targetName: "1号配电房",
        images: ["a.jpg"],
        standardVOS: [
          {
            standardId: "standard_1",
            standardName: "标准 1",
            safetyTips: ["佩戴安全帽", " 断电后操作 ", "佩戴安全帽"],
            standardItems: [],
          },
          {
            standardId: "standard_2",
            standardName: "标准 2",
            safetyTips: ["断电后操作", "保持通道畅通"],
            standardItems: [],
          },
        ],
      },
      {
        targetName: "1号配电房",
        items: [],
      },
    );

    expect(result.safetyTips).toEqual(["佩戴安全帽", "断电后操作", "保持通道畅通"]);
  });
});

function createBuildInput() {
  return {
    targetName: "1号配电房",
    images: ["a.jpg"],
    standardVOS: [
      {
        standardId: "standard_1",
        standardName: "配电房日常巡检标准",
        standardItems: [1, 2, 3, 4].map((index) => ({
          itemId: `item_${index}`,
          itemName: `巡检项 ${index}`,
          resultVO: {
            id: "result_1",
            name: "巡检结果",
            options: [
              {
                itemName: "正常",
                itemValue: "0",
                errorFlag: false,
              },
              {
                itemName: "异常",
                itemValue: "1",
                errorFlag: true,
              },
            ],
          },
        })),
      },
    ] satisfies InspectionStandardVO[],
  };
}

function createAiItem(
  standardId: string,
  itemId: string,
  itemValue: string,
  itemName: string,
  errorFlag: boolean,
  confidence: number,
): AiInspectionAnalyzeResult["items"][number] {
  return {
    standardId,
    itemId,
    recognitionStatus: "recognized",
    matchedResult: {
      itemName,
      itemValue,
      errorFlag,
    },
    problemDescription: errorFlag ? "发现异常" : "",
    evidence: "图片证据",
    confidence,
  };
}
