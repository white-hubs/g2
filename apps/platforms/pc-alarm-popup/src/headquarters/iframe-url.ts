import type { HeadquartersMarketConfig } from "@g2-contract/headquarters-market";

export function buildHeadquartersIframeUrl(config: HeadquartersMarketConfig, businessKey: string): string {
  const base = String(config.url ?? "").replace(/\/+$/, "");
  const account = encodeURIComponent(String(config.account ?? ""));
  const password = encodeURIComponent(String(config.password ?? ""));
  const key = encodeURIComponent(businessKey);
  return `${base}/apps/@ghcloud/cube-alarm-modal?client_id=${account}&client_secret=${password}&businessKey=${key}`;
}

export function parseHeadquartersAlarmPayload(msgData: Record<string, unknown>): Record<string, unknown> | null {
  const raw = msgData.businessPrincipal;
  if (typeof raw !== "string") {
    return null;
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}
