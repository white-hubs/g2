import type { FileVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { AiRichTextPanel } from "../../shared/ai-rich-text-panel";
import { ReadonlyFileUpload } from "../../shared/readonly-file-upload";
import { renderValue, splitTextLines } from "../detail-utils";
import { DownOutlined } from "@/pc-ui-runtime";

export const LedgerStepCard = (props: {
  index: number;
  title: string;
  meta?: string | undefined;
  locked?: boolean;
  children?: VNodeChild | VNodeChild[] | null | undefined;
}): VNodeChild => (
  <section class={["hazard-ledger-step-card", props.locked ? "hazard-ledger-step-card-locked" : ""].filter(Boolean).join(" ")}>
    <header class="hazard-ledger-step-card-head">
      <div class="hazard-ledger-step-title">
        <span>{props.index}</span>
        <strong>{props.title}</strong>
        {props.meta ? <em>{props.meta}</em> : null}
      </div>
      <DownOutlined />
    </header>
    {props.children ? <div class="hazard-ledger-step-body">{props.children}</div> : null}
  </section>
);

export const DetailField = (props: { label: string; value?: string | number | boolean | VNodeChild | null | undefined }): VNodeChild => (
  <div class="hazard-ledger-detail-field">
    <span>{props.label}</span>
    <strong>
      {typeof props.value === "object" && props.value !== null
        ? props.value
        : renderValue(props.value as string | number | boolean | null | undefined)}
    </strong>
  </div>
);

export const DetailGrid = (props: { children?: VNodeChild | VNodeChild[] | undefined }): VNodeChild => (
  <div class="hazard-ledger-detail-grid">{props.children}</div>
);

export const TextBlock = (props: { label: string; value?: string | undefined; ordered?: boolean }): VNodeChild | null => {
  const lines = splitTextLines(props.value);
  if (lines.length === 0 && !props.value) {
    return null;
  }
  const list = props.ordered ? (
    <ol>
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ol>
  ) : (
    <p>{renderValue(props.value)}</p>
  );
  return (
    <div class="hazard-ledger-text-block">
      <span>{props.label}</span>
      {list}
    </div>
  );
};

export const FileBlock = (props: { label: string; files?: FileVO[] | undefined; emptyText?: string | undefined }): VNodeChild => (
  <div class="hazard-ledger-file-block">
    <span>{props.label}</span>
    <ReadonlyFileUpload files={props.files ?? []} emptyText={props.emptyText ?? "暂无照片"} />
  </div>
);

export const InlineAiPanel = (props: {
  title: string;
  content?: string | undefined;
  meta?: string | undefined;
  hint?: string | undefined;
}): VNodeChild | null => (
  <AiRichTextPanel
    variant="plain"
    title={props.title}
    meta={props.meta ?? ""}
    hint={props.hint ?? ""}
    content={props.content ?? ""}
    panelClass="hazard-ledger-ai-panel"
  />
);
