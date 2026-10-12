import { describe, expect, test } from "bun:test";

import {
  buildInspectionFlowRunPayload,
  InspectionFlowService,
  normalizeFlowFileRef,
  parseFlowAnalyzeResult,
} from "./inspection-flow.service";

describe("InspectionFlowService helpers", () => {
  test("normalizes flow upload file references", () => {
    expect(
      normalizeFlowFileRef({
        filePath: "flow-1/image.jpg",
        name: "image.jpg",
        mime: "image/jpeg",
      }),
    ).toEqual({
      file_path: "flow-1/image.jpg",
      filePath: "flow-1/image.jpg",
      path: "flow-1/image.jpg",
      name: "image.jpg",
      mime: "image/jpeg",
    });

    expect(normalizeFlowFileRef({ id: "file-id" }).file_path).toBe("file-id");
  });

  test("builds flow run payload with string query and without params", () => {
    const payload = buildInspectionFlowRunPayload(
      {
        id: "task_1",
        objId: "obj_1",
        targetName: "公司大门",
        images: ["file_1"],
        standardVOS: [],
        safetyTips: ["佩戴安全帽"],
      },
      [
        {
          file_path: "flow-1/image.jpg",
          filePath: "flow-1/image.jpg",
        },
      ],
    );

    expect(payload).toEqual({
      input: {
        query: JSON.stringify({
          id: "task_1",
          objId: "obj_1",
          targetName: "公司大门",
          images: ["file_1"],
          standardVOS: [],
          safetyTips: ["佩戴安全帽"],
        }),
        files: [
          {
            file_path: "flow-1/image.jpg",
            filePath: "flow-1/image.jpg",
          },
        ],
      },
      inputType: "chat",
      outputType: "chat",
    });
    expect(typeof (payload.input as { query: unknown }).query).toBe("string");
    expect(JSON.stringify(payload)).not.toContain('"params"');
  });

  test("parses flow output from object and markdown json text", () => {
    expect(
      parseFlowAnalyzeResult({
        data: {
          items: [
            {
              standardId: "standard_1",
              itemId: "item_1",
              recognitionStatus: "recognized",
              matchedResult: { itemName: "正常", itemValue: "0", errorFlag: false },
              problemDescription: "",
              evidence: "图片证据",
              confidence: 0.9,
            },
          ],
        },
      }).items,
    ).toHaveLength(1);

    expect(
      parseFlowAnalyzeResult({
        output: '```json\n{"items":[]}\n```',
      }).items,
    ).toEqual([]);

    expect(
      parseFlowAnalyzeResult({
        raw: {
          outputs: [
            {
              outputText: '{"items":[]}',
            },
          ],
        },
      }).items,
    ).toEqual([]);
  });
});

describe("InspectionFlowService", () => {
  test("reads inspectStandGenerate flow id and runs the standard generation flow", async () => {
    const calls: unknown[] = [];
    const service = new InspectionFlowService(
      {
        getDataDictionaryByItem: async (query: unknown) => {
          calls.push(["dictionary", query]);
          return [{ variable: '{"inspectStandGenerate":"stand-flow-1"}' }];
        },
      } as never,
      {} as never,
      {
        runFlow: async (flowId: string, payload: unknown) => {
          calls.push(["run", flowId, payload]);
          return { output: "generated standards" };
        },
      } as never,
    );

    const result = await service.generateInspectionStandards({
      targetName: "一号仓",
      supplement: "重点检查消防设施",
    });

    expect(calls).toEqual([
      ["dictionary", { itemCode: "BUSINESS_AI_FLOW", code: "INSPECTION_AI_FLOW" }],
      [
        "run",
        "stand-flow-1",
        {
          input: "一号仓\n重点检查消防设施",
          inputType: "chat",
          outputType: "chat",
        },
      ],
    ]);
    expect(result).toEqual({ output: "generated standards" });
  });

  test("reads inspectExecute flow id, uploads file bytes, and runs flow", async () => {
    const calls: string[] = [];
    const service = new InspectionFlowService(
      {
        getDataDictionaryByItem: async () => {
          calls.push("dictionary");
          return [{ variable: '{"inspectExecute":"9001"}' }];
        },
      } as never,
      {
        getFileByte: async (fileId: string) => {
          calls.push(`file:${fileId}`);
          return new Uint8Array([1, 2, 3]);
        },
      } as never,
      {
        uploadFlowFile: async (flowId: string, file: File) => {
          calls.push(`upload:${flowId}:${file.name}:${file.type}`);
          return {
            file_path: "flow-9001/file_1.jpg",
            name: file.name,
            mime: file.type,
          };
        },
        runFlow: async (flowId: string, payload: unknown) => {
          calls.push(`run:${flowId}:${JSON.stringify(payload).includes('"params"') ? "params" : "no-params"}`);
          return {
            items: [
              {
                standardId: "standard_1",
                itemId: "item_1",
                recognitionStatus: "recognized",
                matchedResult: { itemName: "正常", itemValue: "0", errorFlag: false },
                problemDescription: "",
                evidence: "图片证据",
                confidence: 0.9,
              },
            ],
          };
        },
      } as never,
    );

    const result = await service.analyzeInspection({
      id: "task_1",
      objId: "obj_1",
      imageFileId: "file_1",
      targetName: "公司大门",
      standardVOS: [
        {
          standardId: "standard_1",
          safetyTips: ["佩戴安全帽"],
          standardItems: [],
        },
      ],
      traceId: "trace_1",
    });

    expect(calls).toEqual(["dictionary", "file:file_1", "upload:9001:file_1.jpg:image/jpeg", "run:9001:no-params"]);
    expect(result.items).toHaveLength(1);
  });

  test("throws when inspectExecute is missing", async () => {
    const service = new InspectionFlowService(
      { getDataDictionaryByItem: async () => [{ variable: '{"inspectStandGenerate":"1"}' }] } as never,
      { getFileByte: async () => new Uint8Array([1]) } as never,
      {} as never,
    );

    await expect(
      service.analyzeInspection({
        id: "task_1",
        objId: "obj_1",
        imageFileId: "file_1",
        targetName: "公司大门",
        standardVOS: [],
        traceId: "trace_1",
      }),
    ).rejects.toThrow("未配置巡检执行分析流程");
  });

  test("does not accept numeric inspectExecute flow id to avoid precision loss", async () => {
    const service = new InspectionFlowService(
      { getDataDictionaryByItem: async () => [{ variable: '{"inspectExecute":2057349297535479800}' }] } as never,
      { getFileByte: async () => new Uint8Array([1]) } as never,
      {} as never,
    );

    await expect(
      service.analyzeInspection({
        id: "task_1",
        objId: "obj_1",
        imageFileId: "file_1",
        targetName: "公司大门",
        standardVOS: [],
        traceId: "trace_1",
      }),
    ).rejects.toThrow("未配置巡检执行分析流程");
  });
});
