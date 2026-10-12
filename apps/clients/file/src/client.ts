import type { PlatformContext } from "@g2-composition/contract";
import type { BusinessFile, FileClient, SceneFile } from "@g2-contract/file";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export function createFileClient(http: HttpClient): FileClient {
  return {
    async uploadBusinessFile(payload) {
      const form = new FormData();
      form.append("file", payload.file);
      form.append("businessKey", payload.businessKey);
      const result = await http.post("/gw-bff/file/upload", form);
      const data = result !== null && typeof result === "object" && "data" in result ? result.data : result;
      if (!data || typeof data !== "object" || !("path" in data) || typeof data.path !== "string" || !data.path)
        throw new Error("上传文件未返回文件地址");
      return data as BusinessFile;
    },
    async uploadSceneFile(payload) {
      const form = new FormData();
      form.append("file", payload.file);
      form.append("businessKey", payload.businessKey);
      form.append("sceneCode", payload.sceneCode);
      const result = await http.post(payload.useTemporary ? "/api/file/upload/temporary" : "/api/file/file", form);
      const data = result && typeof result === "object" && "data" in result ? result.data : result;
      if (!data || typeof data !== "object" || !("id" in data) || data.id == null) throw new Error("上传附件未返回文件 ID");
      return data as SceneFile;
    },
    async persistSceneFiles(sceneCode, fileIds) {
      await http.post("/api/file/induce/single/body", { sceneCode, fileIdList: fileIds });
    },
    getFile: (fileId) => http.get(`/api/file/file/${encodeURIComponent(fileId)}`),
    getFileInfo: (fileId) => http.get(`/api/file/file-info/${encodeURIComponent(fileId)}`),
    uploadFile: (payload) => http.post(`/api/file/upload`, payload),
  };
}

export async function create(ctx: PlatformContext): Promise<FileClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFileClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { FileClient };
