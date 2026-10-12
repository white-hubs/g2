import { FILE_BUCKET } from "@/constants";
import { getFileClient } from "@/domain-context";
import { normalizeUploadPath } from "@/utils/file-url";

export async function uploadRiskControlFile(file: Blob, sceneCode: string): Promise<{ id: string; path: string }> {
  const client = await getFileClient();
  const result = await client.uploadFile({
    businessKey: FILE_BUCKET,
    sceneCode,
    file,
  });
  const data = result && typeof result === "object" && "data" in result ? (result as { data?: unknown }).data : result;
  const record = data && typeof data === "object" ? (data as { id?: unknown; path?: unknown }) : {};
  return {
    id: record.id != null ? String(record.id) : "",
    path: normalizeUploadPath(typeof record.path === "string" ? record.path : ""),
  };
}
