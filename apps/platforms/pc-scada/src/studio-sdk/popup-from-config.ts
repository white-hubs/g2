import type { ElementInstance } from "../../vendor/core";
import type { ScadaPopupEvent } from "./types";

/**
 * Normalizes ActionExecutor `showPopup` params into {@link ScadaPopupEvent}.
 * When only `contentId` is set (typical studio config), `content` is empty so the host can render a custom body.
 */
export function scadaPopupFromActionConfig(raw: Record<string, unknown>): ScadaPopupEvent {
  const contentId = typeof raw.contentId === "string" && raw.contentId.trim() ? raw.contentId.trim() : undefined;
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "提示";
  let content: string;
  if (typeof raw.content === "string") {
    content = raw.content;
  } else if (typeof raw.message === "string") {
    content = raw.message;
  } else if (contentId) {
    content = "";
  } else {
    content = JSON.stringify(raw);
  }
  return { title, content, contentId, raw };
}

export function enrichScadaPopupWithSource(base: ScadaPopupEvent, source: ElementInstance): ScadaPopupEvent {
  return {
    ...base,
    sourceElement: {
      id: source.id,
      type: source.type,
      name: source.label,
      deviceNo: source.deviceId,
      props: source.props ?? {},
    },
    deviceBinding: source.deviceBinding === "required" ? "required" : "off",
  };
}
