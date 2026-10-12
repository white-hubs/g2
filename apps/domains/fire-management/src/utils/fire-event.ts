export type FireEventType = "alarm" | "info" | "fault";

export const FIRE_EVENT_TAG_COLOR: Record<FireEventType, "gold" | "blue" | "red"> = {
  alarm: "gold",
  info: "blue",
  fault: "red",
};

export const FIRE_EVENT_ROW_BACKGROUND: Record<FireEventType, string> = {
  alarm: "#fffbe6",
  info: "#f0f5ff",
  fault: "#fff5f5",
};

export const normalizeFireEventType = (value?: string): FireEventType => {
  const normalized = value?.trim().toLocaleLowerCase();
  if (normalized === "alarm" || normalized === "fault") return normalized;
  return "info";
};
