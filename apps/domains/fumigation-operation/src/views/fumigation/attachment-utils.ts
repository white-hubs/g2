import type { FumigationAttachment } from "./state";

export const FUMIGATION_ATTACHMENT_SCENE_CODE = "FUMIGATION_OPERATION_ATTACHMENT";

export interface ReadonlyUploadFile {
  id: string;
  name: string;
  path: string;
  suffix: string;
  size: number;
  type: string;
  businessKey: string | null;
  refCount: number;
}

export const toReadonlyUploadFiles = (attachments: FumigationAttachment[] | undefined): ReadonlyUploadFile[] =>
  (attachments ?? [])
    .filter((file) => file.id !== "" || file.name !== "" || file.path != null || file.fileVO != null)
    .map((file, index) => {
      const fileVO = file.fileVO;
      const id = String(fileVO?.id ?? file.id ?? index);
      const suffix = fileVO?.suffix ?? file.suffix ?? "";
      return {
        id,
        name: fileVO?.name ?? file.name ?? "附件",
        path: fileVO?.path ?? file.path ?? "",
        suffix,
        size: Number(fileVO?.size ?? file.size ?? 0),
        type: fileVO?.type ?? suffix,
        businessKey: fileVO?.businessKey == null ? null : String(fileVO.businessKey),
        refCount: 0,
      };
    });
