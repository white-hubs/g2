import type { DomainContext } from "@g2-composition/contract";

type DateApi = typeof import("@g2-platform/date/api");
let dateApi: DateApi | undefined;

export async function installWorkOrderCenterDateApi(ctx: DomainContext): Promise<void> {
  dateApi = await ctx.loadRuntimeCommon<DateApi>("datePlatform", "api");
}

export function formatTimestamp(...args: Parameters<DateApi["formatTimestamp"]>): ReturnType<DateApi["formatTimestamp"]> {
  if (!dateApi) throw new Error("work-order-center datePlatform Runtime Common 尚未加载");
  return dateApi.formatTimestamp(...args);
}
