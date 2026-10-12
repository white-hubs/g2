/**
 * file 服务面契约：静态文件元数据门面（纯类型；ADR-0057）。
 */

/** `@g2-client/file` 经 `ensureClient` 返回的业务 API。 */
export interface FileClient {
  /** Multipart upload through the BFF to the legacy file/file endpoint. */
  uploadBusinessFile: (payload: { file: Blob; businessKey: string }) => Promise<BusinessFile>;
  /** `GET /api/file/file/{fileId}` */
  getFile: (fileId: string) => Promise<unknown>;
  /** `GET /api/file/file-info/{fileId}` */
  getFileInfo: (fileId: string) => Promise<unknown>;
  /** `POST /api/file/upload` */
  uploadFile: (payload?: unknown) => Promise<unknown>;
}

export interface BusinessFile {
  id?: string;
  path: string;
  name?: string | null;
}

export interface SceneFile {
  id: string;
  name?: string | null;
  path?: string | null;
}
export interface FileClient {
  uploadSceneFile: (payload: { file: Blob; businessKey: string; sceneCode: string; useTemporary?: boolean }) => Promise<SceneFile>;
  /** 按旧文件服务契约持久化场景附件。 */
  persistSceneFiles: (sceneCode: string, fileIds: string[]) => Promise<void>;
}
