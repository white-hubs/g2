import type { FileVO, HazardAttachmentVO } from "@g2-contract/hazard-governance";
import { computed, defineComponent, type PropType } from "vue";

import { HazardFileUpload as FileUpload } from "./file-upload";

type FileUploadType = "text" | "picture" | "picture-card";

export type ReadonlyDisplayFile = Partial<FileVO> &
  Partial<HazardAttachmentVO> & {
    downloadUrl?: string;
    endpointPath?: string;
    file?: Partial<FileVO>;
    fileInfo?: Partial<FileVO>;
    fileName?: string;
    filePath?: string;
    fileUrl?: string;
    previewUrl?: string;
    url?: string;
  };

const readFileId = (file: ReadonlyDisplayFile, index: number): string | number =>
  file.id ?? file.fileId ?? file.file?.id ?? file.fileInfo?.id ?? index;

const readFileName = (file: ReadonlyDisplayFile, index: number): string =>
  file.name ?? file.fileName ?? file.file?.name ?? file.fileInfo?.name ?? String(readFileId(file, index));

const readFilePath = (file: ReadonlyDisplayFile): string =>
  file.path ??
  file.filePath ??
  file.fileUrl ??
  file.url ??
  file.previewUrl ??
  file.downloadUrl ??
  file.endpointPath ??
  file.file?.path ??
  file.file?.endpointPath ??
  file.fileInfo?.path ??
  file.fileInfo?.endpointPath ??
  "";

const normalizeFile = (file: ReadonlyDisplayFile, index: number): FileVO => ({
  ...file,
  id: readFileId(file, index),
  name: readFileName(file, index),
  path: readFilePath(file),
  size: file.size ?? file.fileSize ?? file.file?.size ?? file.fileInfo?.size ?? 0,
  suffix: file.suffix ?? file.file?.suffix ?? file.fileInfo?.suffix,
  type: file.type ?? file.file?.type ?? file.fileInfo?.type,
  businessKey: file.businessKey ?? null,
});

export const ReadonlyFileUpload = defineComponent({
  name: "ReadonlyFileUpload",
  props: {
    files: {
      type: Array as PropType<ReadonlyDisplayFile[]>,
      default: () => [],
    },
    type: {
      type: String as PropType<FileUploadType>,
      default: "picture-card",
    },
    emptyText: {
      type: String,
      default: "暂无文件",
    },
  },
  setup: (props) => {
    const fileList = computed(() => props.files.map(normalizeFile));

    return () =>
      fileList.value.length > 0 ? (
        <FileUpload value={fileList.value} readonly multiple type={props.type} showText={false} />
      ) : (
        <div class="hazard-file-empty">{props.emptyText}</div>
      );
  },
});
