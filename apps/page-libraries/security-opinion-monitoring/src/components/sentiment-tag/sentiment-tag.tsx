import type { Sentiment } from "@g2-contract/security-opinion";
import { Tag } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent } from "vue";

import { SENTIMENT_LABEL } from "../../constants";

import styles from "./sentiment-tag.module.css";

const COLOR_MAP: Record<Sentiment, string> = {
  positive: "success",
  neutral: "processing",
  negative: "error",
  unknown: "default",
};

const normalizeSentiment = (value?: string): Sentiment => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "positive" || normalized === "neutral" || normalized === "negative" ? normalized : "unknown";
};

export const SentimentTag = defineComponent({
  props: {
    sentiment: { type: String, default: "unknown" },
  },
  setup(props) {
    return () => {
      const sentiment = normalizeSentiment(props.sentiment);
      return (
        <Tag color={COLOR_MAP[sentiment]} class={styles.tag}>
          {SENTIMENT_LABEL[sentiment]}
        </Tag>
      );
    };
  },
});
