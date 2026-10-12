import { expect, test } from "bun:test";

import {
  effectiveWorkPermitItems,
  mergeWorkPermitItems,
  normalizeWorkPermitFormValues,
  parseWorkPermitRecognition,
} from "./permit-parking-model";

test("switching work permit type refreshes remote items and preserves confirmations only for matching ids", () => {
  const selected = [
    { id: "old", itemName: "旧检查项", confirmResult: "NORMAL" as const },
    { id: "shared", itemName: "旧名称", confirmResult: "ABNORMAL" as const, description: "需整改", attachments: [{ id: "image-1" }] },
    { id: "manual", itemName: "现场新增", custom: true },
  ];
  const remote = [
    { id: "shared", itemName: "新名称" },
    { id: "new", itemName: "新检查项" },
  ];
  expect(mergeWorkPermitItems(remote, selected)).toEqual([
    { id: "shared", itemName: "旧名称", confirmResult: "ABNORMAL", description: "需整改", attachments: [{ id: "image-1" }] },
    { id: "new", itemName: "新检查项", attachments: [] },
    { id: "manual", itemName: "现场新增", custom: true },
  ]);
});

test("empty manual work permit items are omitted from submission data", () => {
  expect(
    effectiveWorkPermitItems([
      { id: "1", itemName: "远端项" },
      { id: "2", custom: true, itemName: "   " },
      { id: "3", custom: true, itemName: "  现场检查  " },
    ]),
  ).toEqual([
    { id: "1", itemName: "远端项", attachments: [] },
    { id: "3", custom: true, itemName: "现场检查", attachments: [] },
  ]);
});

test("submission normalization reaches work permit items inside grouped rows without mutating editor values", () => {
  const items = [{ id: "sections", name: "GroupList", props: { items: [{ id: "checks", name: "WorkPermitRiskCheckItems" }] } }];
  const values = {
    unrelated: "保留",
    sections: [
      {
        checks: [
          { id: "blank", custom: true, itemName: "  " },
          { id: "filled", custom: true, itemName: "  现场确认 " },
        ],
        rowName: "第一组",
      },
    ],
  };
  expect(normalizeWorkPermitFormValues(items, values)).toEqual({
    unrelated: "保留",
    sections: [{ checks: [{ id: "filled", custom: true, itemName: "现场确认", attachments: [] }], rowName: "第一组" }],
  });
  expect(values.sections[0]?.checks).toHaveLength(2);
});

test("AI recognition distinguishes failed, unrecognized, and confirmed results", () => {
  expect(parseWorkPermitRecognition({ data: { callResult: "FAILED", failureReason: "图片不清晰" } })).toEqual({
    status: "FAILED",
    message: "图片不清晰",
  });
  expect(parseWorkPermitRecognition({ result: { hazards: [] } })).toEqual({
    status: "UNRECOGNIZED",
    message: "未识别到明确结果，请手动确认",
  });
  expect(parseWorkPermitRecognition({ hazards: [{ disposalSuggestion: "立即隔离" }] })).toEqual({
    status: "SUCCESS",
    result: "ABNORMAL",
    description: "立即隔离",
  });
  expect(parseWorkPermitRecognition({ confirmResult: "NORMAL", hazards: [] })).toEqual({
    status: "SUCCESS",
    result: "NORMAL",
    description: "AI识别异常，请现场复核",
  });
});
