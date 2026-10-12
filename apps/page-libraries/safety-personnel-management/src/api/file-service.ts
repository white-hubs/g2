import type { FileVO } from "@g2-contract/safety-personnel";

import type { OSSFile } from "../components/file-upload";
import { toOssPreviewPath } from "../utils/file-url";
import { services, unwrapResponse } from "./safety-personnel";

function fileInfoToPath(info: { path?: string | null; endpointPath?: string | null }): string {
  return toOssPreviewPath({ path: info.path ?? undefined, endpointPath: info.endpointPath ?? undefined });
}

export const GLOBAL_SCENE_CODE = {
  securityKeyPersonPhoto: "KEY::PERSON_SECURITY_KEY_PERSON_PHOTO",
  securityKeyPersonAttachment: "KEY::PERSON_SECURITY_KEY_PERSON_ATTACHMENT",
  securityKeyPersonReportAttachment: "KEY::PERSON_SECURITY_KEY_PERSON_REPORT_ATTACHMENT",
};
export function getCubeFileService() {
  return {
    async getFileInfo(id: string): Promise<FileVO> {
      return unwrapResponse(await (await services().file()).getFileInfo(id));
    },
  };
}

/** 将安委会附件（FileVO）转为 FileUpload 回显 */
export async function committeeAttachmentsToOssFiles(attachments: FileVO[]): Promise<OSSFile[]> {
  const list: OSSFile[] = [];
  for (const a of attachments) {
    if (a.id == null) {
      continue;
    }
    let path = toOssPreviewPath(a);
    if (!path) {
      try {
        const info = await getCubeFileService().getFileInfo(String(a.id));
        path = fileInfoToPath(info as { path?: string; endpointPath?: string });
      } catch {
        path = "";
      }
    }
    list.push({
      businessKey: null,
      id: String(a.id),
      name: a.name ?? "",
      path,
      refCount: a.refCount ?? 0,
      size: a.size ?? 0,
      suffix: a.suffix ?? "",
      type: a.type ?? "",
    });
  }
  return list;
}

/** 将证书附件转为 FileUpload 回显 */
export async function certAttachmentToOssFiles(attachment?: FileVO, attachmentFileId?: string): Promise<OSSFile[]> {
  if (attachment?.id != null) {
    return committeeAttachmentsToOssFiles([attachment]);
  }
  if (!attachmentFileId) {
    return [];
  }
  try {
    const info = await getCubeFileService().getFileInfo(String(attachmentFileId));
    return [
      {
        businessKey: null,
        id: String(attachmentFileId),
        name: info.name ?? "",
        path: fileInfoToPath(info as { path?: string; endpointPath?: string }),
        refCount: info.refCount ?? 0,
        size: info.size ?? 0,
        suffix: info.suffix ?? "",
        type: info.type ?? "",
      },
    ];
  } catch {
    return [];
  }
}
