import { expect, test } from "bun:test";

import { designFormData, initialDesignValues, missingDesignField, parseDesignFields } from "./process-design-form";

const definition = JSON.stringify({
  list: [
    { type: "input", label: "处理说明", model: "remark", controlType: "BUSINESS_CONTROL", options: { required: true } },
    { type: "checkbox", label: "问题类型", model: "kinds", options: { options: [{ label: "漏水", value: "leak" }] } },
    { type: "date", label: "完成日期", model: "finishDate", options: {} },
    { type: "rate", label: "满意度", model: "score", options: {} },
    { type: "select", label: "责任方", model: "owner", options: { mode: "multiple", remoteFunc: "loadOwner", remote: true } },
    { label: "缺少 model 应被忽略", type: "input", options: {} },
  ],
});

test("解析自定义表单设计并生成初值", () => {
  const fields = parseDesignFields(definition);
  expect(fields.map((item) => item.model)).toEqual(["remark", "kinds", "finishDate", "score", "owner"]);
  expect(initialDesignValues(fields)).toEqual({
    remark: undefined,
    kinds: [],
    finishDate: undefined,
    score: undefined,
    owner: [],
  });
  expect(parseDesignFields("不是 JSON")).toEqual([]);
  expect(parseDesignFields()).toEqual([]);
});

test("提交结构与旧页 formData 约定一致", () => {
  const fields = parseDesignFields(definition);
  const payload = designFormData(fields, {
    remark: "已处理",
    kinds: ["leak"],
    finishDate: "2024-03-05 10:20:30",
    score: undefined,
    owner: ["a"],
  });
  expect(payload[0]).toEqual({
    label: "处理说明",
    key: "remark",
    value: "已处理",
    formItemType: "input",
    options: "",
    mode: "",
    remoteFunc: "",
    remote: false,
    controlType: "BUSINESS_CONTROL",
  });
  expect(payload[1]?.value).toBe(JSON.stringify(["leak"]));
  expect(payload[1]?.options).toBe(JSON.stringify([{ label: "漏水", value: "leak" }]));
  expect(payload[2]?.value).toBe("2024-03-05");
  expect(payload[3]?.value).toBe(0);
  expect(payload[4]).toMatchObject({ mode: "multiple", remoteFunc: "loadOwner", remote: true, value: JSON.stringify(["a"]) });
});

test("必填字段为空时可定位到具体字段", () => {
  const fields = parseDesignFields(definition);
  expect(missingDesignField(fields, { remark: "" })?.model).toBe("remark");
  expect(missingDesignField(fields, { remark: "ok" })).toBeUndefined();
});
