import { Inject, CONFIG_SERVICE_TOKEN, ConfigService, Injectable } from "@dangao/bun-server";
import type { BusinessFile } from "@g2-contract/file";

import { ProxyClient } from "@/clients/proxy-client";
import { requireUpstreamUrl, unwrapUpstreamResponse } from "@/services/upstream-response";

interface FileBase64Response {
  base64?: string;
  data?:
    | string
    | {
        base64?: string;
        bytes?: number[];
      };
  result?:
    | string
    | {
        base64?: string;
        bytes?: number[];
      };
  bytes?: number[];
}

export interface FileDownloadResult {
  bytes: Uint8Array;
  fileName: string | null;
  contentType: string | null;
}

@Injectable()
export class FileProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.fileServiceUrl") || "";
  }

  public async getFileBase64(fileId: string): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/file/getFileBase64/${encodeURIComponent(fileId)}`;
    const response = await this.proxyClient.get<FileBase64Response | string>(url, {
      passthroughError: true,
    });
    const base64 = normalizeFileBase64Response(response.data);
    if (!base64) {
      throw new Error(`文件 ${fileId} 未返回 base64 数据`);
    }
    return base64;
  }

  public async uploadBusinessFile(form: FormData): Promise<BusinessFile> {
    if (!(form.get("file") instanceof Blob) || typeof form.get("businessKey") !== "string" || !String(form.get("businessKey")).trim()) {
      throw Response.json({ message: "上传必须包含 file 和 businessKey" }, { status: 400 });
    }
    const base = requireUpstreamUrl(this.baseUrl, "fileServiceUrl");
    const response = await this.proxyClient.request(`${base}/file`, { method: "POST", body: form, passthroughError: true });
    const data = unwrapUpstreamResponse<BusinessFile>(response.data);
    if (!data || typeof data.path !== "string" || !data.path) throw Response.json({ message: "文件上游未返回文件地址" }, { status: 502 });
    return data;
  }

  public async getFileByte(fileId: string): Promise<Uint8Array> {
    return (await this.getFile(fileId)).bytes;
  }

  /** 保留 ghcloud BFF 的文件下载元数据，供预案 AI 文件解析使用。 */
  public async getFile(fileId: string): Promise<FileDownloadResult> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/file/getByte/${encodeURIComponent(fileId)}`;
    const response = await this.proxyClient.get<ArrayBuffer>(url, {
      passthroughError: true,
      responseType: "arrayBuffer",
    });
    const bytes = normalizeFileByteResponse(response.data, response.headers);
    if (bytes.byteLength === 0) {
      throw new Error(`文件 ${fileId} 未返回字节数据`);
    }
    return {
      bytes,
      fileName: readContentDispositionFileName(response.headers.get("Content-Disposition")),
      contentType: normalizeContentType(response.headers.get("Content-Type")),
    };
  }
}

function readContentDispositionFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded).trim() || null;
    } catch {
      return encoded.trim() || null;
    }
  }
  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || null;
}

function normalizeContentType(contentType: string | null): string | null {
  const value = contentType?.split(";", 1)[0]?.trim() || "";
  return value && value !== "application/json" ? value : null;
}

function normalizeFileBase64Response(response: FileBase64Response | string): string {
  if (typeof response === "string") {
    return response;
  }
  return response.base64 || normalizeNestedBase64(response.data) || normalizeNestedBase64(response.result) || "";
}

function normalizeNestedBase64(value: FileBase64Response["data"]): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.base64 || "";
}

function normalizeFileByteResponse(response: ArrayBuffer, headers: Headers): Uint8Array {
  const contentType = headers.get("Content-Type") || "";
  const bytes = new Uint8Array(response);
  if (!contentType.includes("application/json")) {
    return bytes;
  }

  try {
    const json = JSON.parse(new TextDecoder().decode(bytes)) as FileBase64Response | number[] | string;
    return normalizeJsonByteResponse(json);
  } catch {
    return bytes;
  }
}

function normalizeJsonByteResponse(response: FileBase64Response | number[] | string): Uint8Array {
  if (Array.isArray(response)) {
    return Uint8Array.from(response);
  }
  if (typeof response === "string") {
    return Uint8Array.from(Buffer.from(stripDataUrlPrefix(response), "base64"));
  }
  if (Array.isArray(response.bytes)) {
    return Uint8Array.from(response.bytes);
  }
  const nestedBytes = normalizeNestedBytes(response.data) || normalizeNestedBytes(response.result);
  if (nestedBytes) {
    return nestedBytes;
  }
  const base64 = normalizeFileBase64Response(response);
  return base64 ? Uint8Array.from(Buffer.from(stripDataUrlPrefix(base64), "base64")) : new Uint8Array();
}

function normalizeNestedBytes(value: FileBase64Response["data"]): Uint8Array | null {
  if (value && typeof value === "object" && Array.isArray(value.bytes)) {
    return Uint8Array.from(value.bytes);
  }
  return null;
}

function stripDataUrlPrefix(value: string): string {
  const index = value.indexOf(",");
  return value.startsWith("data:") && index >= 0 ? value.slice(index + 1) : value;
}
