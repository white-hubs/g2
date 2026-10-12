import { describe, expect, test } from "bun:test";

import { EmergencyPlanContentExtractorService } from "./emergency-plan-content-extractor.service";
import type { KnowledgeDocumentParserProxyService } from "@/services/proxy/ai-application/knowledge-document-parser-proxy.service";
import type { FileProxyService } from "@/services/proxy/file/file-proxy.service";

describe("EmergencyPlanContentExtractorService", () => {
  test("富文本转换为语义文本块且不保留脚本", async () => {
    const service = createService();
    const result = await service.extract({
      sourceType: "RICH_TEXT",
      contentHtml: "<h2>人员疏散</h2><p>立即通知人员</p><ul><li>关闭设备</li></ul><script>ignore()</script>",
      fileName: "火灾预案.docx",
      planContext: { name: "火灾预案" },
    });

    expect(result.sourceType).toBe("RICH_TEXT");
    expect(result.fileName).toBe("火灾预案.html");
    expect(result.digest).toHaveLength(64);
    expect(result.chunks[0]?.text).toContain("人员疏散\n立即通知人员\n- 关闭设备");
    expect(result.chunks[0]?.text).not.toContain("ignore");
  });

  test("文件预览按 chunkIndex 输出完整文本块", async () => {
    const service = createService(
      {
        getFile: async () => ({
          bytes: new TextEncoder().encode("plan"),
          fileName: "预案.docx",
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      },
      {
        preview: async () => ({
          data: {
            chunkCount: 2,
            items: [
              { chunkIndex: 1, text: "第二步", headingPath: ["处置流程"], pageNo: 2 },
              { chunkIndex: 0, text: "第一步", heading_path: ["处置流程"], page_no: 1 },
            ],
          },
        }),
      },
    );
    const result = await service.extract({ sourceType: "FILE", fileId: "file-1", planContext: { name: "火灾预案" } });
    expect(result.chunks.map((item) => item.text)).toEqual(["第一步", "第二步"]);
    expect(result.chunks[0]).toEqual({ index: 0, text: "第一步", headingPath: ["处置流程"], pageNo: 1 });
  });

  test("知识库拒绝格式时返回明确业务错误", async () => {
    const parseError = new Error("unsupported");
    Object.assign(parseError, { status: 415 });
    const service = createService(
      { getFile: async () => ({ bytes: new Uint8Array([1]), fileName: "旧预案.doc", contentType: "application/msword" }) },
      {
        preview: async () => {
          throw parseError;
        },
      },
    );
    await expect(service.extract({ sourceType: "FILE", fileId: "file-2", planContext: { name: "旧预案" } })).rejects.toEqual(
      expect.objectContaining({ code: "UNSUPPORTED_FILE_TYPE" }),
    );
  });
});

function createService(
  fileProxy: Partial<FileProxyService> = {},
  parserProxy: Partial<KnowledgeDocumentParserProxyService> = {},
): EmergencyPlanContentExtractorService {
  return new EmergencyPlanContentExtractorService(fileProxy as FileProxyService, parserProxy as KnowledgeDocumentParserProxyService);
}
