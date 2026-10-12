import type { FileVO } from "@g2-contract/safety-personnel";
import { Image, LinkOutlined } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { type PropType, defineComponent } from "vue";

import { downloadAttachment, isImageFile, toImageSrc } from "../../../utils/key-personnel/file-attachment";

import styles from "./file-attachment-link.module.css";

export const FileAttachmentLink = defineComponent({
  props: {
    file: { type: Object as PropType<FileVO>, required: true },
    /** 图片附件是否内联预览（监管上报记录等场景） */
    previewImage: { type: Boolean, default: false },
  },
  setup(props) {
    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      downloadAttachment(props.file);
    };

    return () => {
      const url = toImageSrc(props.file);
      if (props.previewImage && isImageFile(props.file) && url) {
        return (
          <div class={styles.imagePreview}>
            <Image
              src={url}
              aria-label={props.file.name ?? "图片附件"}
              width={72}
              height={72}
              style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "6px" }}
            />
          </div>
        );
      }

      return (
        <a class={styles.link} href="#" title={props.file.name ?? "下载附件"} onClick={onClick}>
          <LinkOutlined />
          <span>{props.file.name ?? "附件"}</span>
        </a>
      );
    };
  },
});
