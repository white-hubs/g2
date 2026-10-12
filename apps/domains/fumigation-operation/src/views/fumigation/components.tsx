import { Tag } from "@g2-platform/pc-ui";
import { defineComponent } from "vue";

import { toReadonlyUploadFiles, FUMIGATION_ATTACHMENT_SCENE_CODE } from "./attachment-utils";
import { WORK_STATUS_META, type CheckStatus, type FumigationAttachment, type WorkStatus } from "./state";
import { FileUpload } from "@/compat/app-design";

export const StatusTag = (props: { status: WorkStatus }): JSX.Element => {
  const meta = WORK_STATUS_META[props.status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const CheckTag = (props: { status: CheckStatus }): JSX.Element => {
  const color = props.status === "passed" ? "green" : props.status === "failed" ? "red" : "default";
  const label = props.status === "passed" ? "通过" : props.status === "failed" ? "未通过" : "待校验";
  return <Tag color={color}>{label}</Tag>;
};

export const InfoItem = (props: { label: string; value: string | number | JSX.Element }): JSX.Element => (
  <div class="fumigation-info-item">
    <div class="fumigation-info-label">{props.label}</div>
    <div class="fumigation-info-value">{props.value}</div>
  </div>
);

export const SectionTitle = (props: { title: string; extra?: JSX.Element | undefined }): JSX.Element => (
  <div class="fumigation-section-title">
    <span>{props.title}</span>
    {props.extra}
  </div>
);

export const EmptyBlock = (props: { text: string }): JSX.Element => <div class="fumigation-empty">{props.text}</div>;

export const FixedActionFooter = defineComponent({
  name: "FixedActionFooter",
  setup(_, { slots }) {
    return (): JSX.Element => <div class="fumigation-footer-actions is-fixed-actions">{slots.default?.()}</div>;
  },
});

export const AttachmentReadonlyPanel = (props: { attachments?: FumigationAttachment[] | undefined }): JSX.Element => {
  const files = toReadonlyUploadFiles(props.attachments);
  if (files.length === 0) {
    return <EmptyBlock text="暂无附件" />;
  }
  return <FileUpload value={files} readonly multiple showText type="text" sceneCode={FUMIGATION_ATTACHMENT_SCENE_CODE} />;
};
