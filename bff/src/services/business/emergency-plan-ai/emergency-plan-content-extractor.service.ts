import { Injectable } from "@dangao/bun-server";
import type { EmergencyPlanSourceType, EmergencyPlanTaskDecomposeRequest } from "@g2-contract/emergency-plan-ai";

import { EmergencyPlanAiError } from "./emergency-plan-ai.error";
import { KnowledgeDocumentParserProxyService } from "@/services/proxy/ai-application/knowledge-document-parser-proxy.service";
import { FileProxyService } from "@/services/proxy/file/file-proxy.service";

const RICH_TEXT_CHUNK_SIZE = 4_000;
export interface EmergencyPlanDocumentChunk {
  index: number;
  headingPath: string[];
  pageNo: number | null;
  text: string;
}
export interface ExtractedEmergencyPlanContent {
  sourceType: EmergencyPlanSourceType;
  fileName: string;
  digest: string;
  chunks: EmergencyPlanDocumentChunk[];
}

@Injectable()
export class EmergencyPlanContentExtractorService {
  public constructor(
    private readonly fileProxyService: FileProxyService,
    private readonly knowledgeDocumentParserProxyService: KnowledgeDocumentParserProxyService,
  ) {}

  public async extract(request: EmergencyPlanTaskDecomposeRequest): Promise<ExtractedEmergencyPlanContent> {
    return request.sourceType === "RICH_TEXT" ? this.extractRichText(request) : this.extractFile(request);
  }
  private async extractRichText(request: EmergencyPlanTaskDecomposeRequest): Promise<ExtractedEmergencyPlanContent> {
    const html = request.contentHtml?.trim() || "";
    if (!html) throw new EmergencyPlanAiError("INVALID_SOURCE", "预案正文不能为空");
    const text = htmlToSemanticText(html);
    if (!text) throw new EmergencyPlanAiError("DOCUMENT_EMPTY", "预案正文未提取到有效内容");
    return {
      sourceType: "RICH_TEXT",
      fileName: normalizeRichTextName(request.fileName, request.planContext.name),
      digest: await sha256(new TextEncoder().encode(html)),
      chunks: splitTextIntoChunks(text, RICH_TEXT_CHUNK_SIZE),
    };
  }
  private async extractFile(request: EmergencyPlanTaskDecomposeRequest): Promise<ExtractedEmergencyPlanContent> {
    const fileId = request.fileId?.trim() || "";
    if (!fileId) throw new EmergencyPlanAiError("INVALID_SOURCE", "预案文件ID不能为空");
    const downloaded = await this.fileProxyService.getFile(fileId);
    const fileName = normalizeUploadedFileName(request.fileName || downloaded.fileName, fileId);
    const file = new File([copyArrayBuffer(downloaded.bytes)], fileName, { type: downloaded.contentType || inferMimeType(fileName) });
    let preview: unknown;
    try {
      preview = await this.knowledgeDocumentParserProxyService.preview(file);
    } catch (error) {
      throw normalizeDocumentPreviewError(error);
    }
    const chunks = normalizePreviewChunks(preview);
    if (!chunks.length) throw new EmergencyPlanAiError("DOCUMENT_EMPTY", "预案文件未解析出有效文本内容");
    const chunkCount = readPreviewChunkCount(preview);
    if (chunkCount !== null && chunkCount > chunks.length)
      throw new EmergencyPlanAiError("DOCUMENT_PARSE_INCOMPLETE", "知识库预览未返回预案文件的全部文本分段");
    return { sourceType: "FILE", fileName, digest: await sha256(downloaded.bytes), chunks };
  }
}

function htmlToSemanticText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(?:p|div|li|h[1-6]|tr|table|section|article|blockquote)>/gi, "\n")
      .replace(/<\/(?:td|th)>/gi, "\t")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (matched, entity: string) => {
    const normalized = entity.toLowerCase();
    try {
      if (normalized.startsWith("#x")) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
      if (normalized.startsWith("#")) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    } catch {
      return matched;
    }
    return named[normalized] ?? matched;
  });
}
function splitTextIntoChunks(text: string, maxChars: number): EmergencyPlanDocumentChunk[] {
  const chunks: EmergencyPlanDocumentChunk[] = [];
  let current = "";
  for (const paragraph of text.split("\n")) {
    if (current && current.length + paragraph.length + 1 > maxChars) {
      chunks.push(createChunk(chunks.length, current));
      current = "";
    }
    if (paragraph.length <= maxChars) {
      current = current ? `${current}\n${paragraph}` : paragraph;
      continue;
    }
    if (current) {
      chunks.push(createChunk(chunks.length, current));
      current = "";
    }
    for (let start = 0; start < paragraph.length; start += maxChars)
      chunks.push(createChunk(chunks.length, paragraph.slice(start, start + maxChars)));
  }
  if (current) chunks.push(createChunk(chunks.length, current));
  return chunks;
}
function createChunk(index: number, text: string): EmergencyPlanDocumentChunk {
  return { index, headingPath: [], pageNo: null, text };
}
function normalizePreviewChunks(value: unknown): EmergencyPlanDocumentChunk[] {
  return findPreviewItems(value)
    .map((item, sourceIndex) => normalizePreviewChunk(item, sourceIndex))
    .filter((item): item is EmergencyPlanDocumentChunk & { sourceIndex: number } => item !== null)
    .toSorted((left, right) => left.index - right.index || left.sourceIndex - right.sourceIndex)
    .map(({ sourceIndex: _sourceIndex, ...item }, index) => ({ ...item, index }));
}
function findPreviewItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = readRecord(value);
  if (!record) return [];
  for (const key of ["items", "chunks", "segments"]) if (Array.isArray(record[key])) return record[key];
  for (const key of ["data", "result", "output"]) {
    const nested = findPreviewItems(record[key]);
    if (nested.length) return nested;
  }
  return [];
}
function readPreviewChunkCount(value: unknown): number | null {
  const record = readRecord(value);
  if (!record) return null;
  const count = readInteger(record.chunkCount ?? record.chunk_count);
  if (count !== null) return count;
  for (const key of ["data", "result", "output"]) {
    const nested = readPreviewChunkCount(record[key]);
    if (nested !== null) return nested;
  }
  return null;
}
function normalizePreviewChunk(value: unknown, sourceIndex: number): (EmergencyPlanDocumentChunk & { sourceIndex: number }) | null {
  const record = readRecord(value);
  if (!record) return null;
  const text = readText(record.text ?? record.content ?? record.pageContent ?? record.page_content);
  if (!text) return null;
  return {
    index: readInteger(record.chunkIndex ?? record.chunk_index ?? record.orderInSection ?? record.order_in_section) ?? sourceIndex,
    headingPath: readStringArray(record.headingPath ?? record.heading_path),
    pageNo: readInteger(record.pageNo ?? record.page_no),
    text,
    sourceIndex,
  };
}
function normalizeDocumentPreviewError(error: unknown): EmergencyPlanAiError {
  if (error instanceof EmergencyPlanAiError) return error;
  const status = readHttpStatus(error);
  if (status === 413) return new EmergencyPlanAiError("DOCUMENT_TOO_LARGE", "预案文件超过知识库解析大小限制");
  if (status === 400 || status === 415 || status === 422)
    return new EmergencyPlanAiError("UNSUPPORTED_FILE_TYPE", "知识库暂不支持该预案文件格式或文件内容无法识别");
  if (error instanceof Error && (error.name === "AbortError" || /timed?\s*out|timeout|超时/i.test(error.message)))
    return new EmergencyPlanAiError("DOCUMENT_PREVIEW_TIMEOUT", "预案文件解析超时");
  return new EmergencyPlanAiError("DOCUMENT_PARSE_FAILED", "预案文件内容解析失败");
}
function readHttpStatus(value: unknown): number | null {
  if (value instanceof Response) return value.status;
  const record = readRecord(value);
  return typeof record?.status === "number" ? record.status : null;
}
function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function readText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}
function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
function normalizeRichTextName(value: string | null | undefined, planName: string): string {
  const name = sanitizeFileName(value || planName || "预案正文").replace(/\.(?:docx?|html?|pdf|txt)$/i, "");
  return name.toLowerCase().endsWith(".html") ? name : `${name}.html`;
}
function normalizeUploadedFileName(value: string | null | undefined, fileId: string): string {
  return sanitizeFileName(value || fileId);
}
function sanitizeFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, "_") || "预案文件";
}
function inferMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return (
    {
      csv: "text/csv",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pdf: "application/pdf",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }[extension || ""] || "application/octet-stream"
  );
}
function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copyArrayBuffer(bytes)));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}
