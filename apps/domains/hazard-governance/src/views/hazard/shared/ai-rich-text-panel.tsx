import { computed, defineComponent } from "vue";
import type { PropType } from "vue";

import { Card } from "@/pc-ui-runtime";

import "./ai-rich-text-panel.less";

const RICH_TEXT_MEDIA_TAG_PATTERN = /<(img|video|audio|table|ul|ol|li|br)\b/i;

export const sanitizeAiRichText = (html: string): string =>
  html
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, "");

export const hasAiRichTextContent = (html?: string): boolean => {
  if (!html) {
    return false;
  }
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0 || RICH_TEXT_MEDIA_TAG_PATTERN.test(html)
  );
};

export const AiRichTextPanel = defineComponent({
  name: "AiRichTextPanel",
  props: {
    content: { type: String, default: "" },
    title: { type: String, required: true },
    meta: { type: String, default: "" },
    hint: { type: String, default: "" },
    icon: { type: String, default: "✦" },
    panelClass: { type: String, default: "" },
    tone: { type: String as PropType<"blue" | "green">, default: "blue" },
    variant: { type: String as PropType<"card" | "plain">, default: "card" },
  },
  setup: (props) => {
    const sanitizedContent = computed(() => sanitizeAiRichText(props.content));
    const visible = computed(() => hasAiRichTextContent(sanitizedContent.value));

    const renderInner = (): JSX.Element => (
      <>
        <div class="hazard-ai-rich-text-panel-head">
          <strong>
            <span>{props.icon}</span>
            {props.title}
          </strong>
          {props.meta ? <em>{props.meta}</em> : null}
        </div>
        <div class="hazard-ai-rich-text-panel-body" innerHTML={sanitizedContent.value} />
        {props.hint ? <p class="hazard-ai-rich-text-panel-hint">{props.hint}</p> : null}
      </>
    );

    return () => {
      if (!visible.value) {
        return null;
      }
      const panelClass = [
        "hazard-ai-rich-text-panel",
        `hazard-ai-rich-text-panel-${props.variant}`,
        `hazard-ai-rich-text-panel-${props.tone}`,
        props.panelClass,
      ]
        .filter(Boolean)
        .join(" ");

      return props.variant === "card" ? (
        <Card class={panelClass}>{renderInner()}</Card>
      ) : (
        <section class={panelClass}>{renderInner()}</section>
      );
    };
  },
});
