/** 委外维修 Domain 的基础路径与 OUAA 应用码。 */
export const OUTSOURCE_REPAIR_BASE_PATH = "/d/outsource-repair";

export interface OutsourceRepairRuntime {
  applicationCode: string;
  basePath: string;
}

export function resolveOutsourceRepairRuntime(options?: { applicationCode?: unknown; basePath?: string }): OutsourceRepairRuntime {
  const applicationCode =
    typeof options?.applicationCode === "string" && options.applicationCode.trim() ? options.applicationCode.trim() : "OUTSOURCE_REPAIR";
  return { applicationCode, basePath: options?.basePath ?? OUTSOURCE_REPAIR_BASE_PATH };
}
