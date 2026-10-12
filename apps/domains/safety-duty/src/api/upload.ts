import type { FileClient } from "@g2-contract/file";

import { getSafetyDutyContext } from "../domain-context";
export async function uploadDutyEvidence(payload: { file: File; businessKey: string; sceneCode: string }) {
  const client = await getSafetyDutyContext().ensureClient<FileClient>("fileClient");
  const config = (window as Window & { config?: { feature?: { useUploadTemporary?: boolean } } }).config;
  return client.uploadSceneFile({ ...payload, useTemporary: config?.feature?.useUploadTemporary });
}
