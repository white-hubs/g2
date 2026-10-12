import type { DomainContext } from "@g2-composition/contract";

type DateApi = typeof import("@g2-platform/date/api");
let dateApi: DateApi | undefined;

export async function installFormAuditDateApi(ctx: DomainContext): Promise<void> {
  dateApi = await ctx.loadRuntimeCommon<DateApi>("datePlatform", "api");
}

export function formatTimestamp(...args: Parameters<DateApi["formatTimestamp"]>): ReturnType<DateApi["formatTimestamp"]> {
  if (!dateApi) throw new Error("form-audit datePlatform Runtime Common 尚未加载");
  return dateApi.formatTimestamp(...args);
}
